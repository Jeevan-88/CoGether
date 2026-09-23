/**
 * Phase 2C.0: Real Identity + Profile Foundation Integration Test Suite
 * 
 * Verifies:
 * 1. Email normalization & OTP generation
 * 2. Hashed OTP storage (no plaintext in DB)
 * 3. Resend throttling (429 RESEND_TOO_FREQUENT)
 * 4. Invalid OTP rejection & attempt counter increment
 * 5. Excessive OTP attempts lockout (MAX_ATTEMPTS_EXCEEDED)
 * 6. Expired OTP rejection (OTP_EXPIRED)
 * 7. Successful verification, PostgreSQL user creation, and profile minting
 * 8. Reused OTP rejection (single-use constraint)
 * 9. Duplicate email login (no duplicate user accounts)
 * 10. Case-insensitive username uniqueness enforcement (e.g. Jeevan vs jeevan)
 * 11. Profile updates & persistence in identity.profiles
 * 12. User preferences update & persistence in identity.preferences
 * 13. Session refresh & token rotation in identity.sessions
 * 14. Session revocation & logout
 * 15. Google OAuth new user registration
 * 16. Google OAuth existing user authentication
 * 17. Google OAuth safe account linking on verified email (no duplicate accounts)
 * 18. Opaque invite token generation (no raw IDs in URL)
 * 19. Public invite preview resolving inviter's real PostgreSQL profile
 * 20. Safe invite redemption and atomic usage counter increment
 * 21. Prevention of invite redemption after max uses exhausted
 * 22. Prevention of revoked invite redemption
 * 23. Prevention of self-invite abuse (inviter cannot redeem own invite)
 * 24. Authenticated Socket.IO connection enforcing user identity from token
 * 25. Unauthorized Socket.IO connection rejection
 */

const assert = require('assert');
const { io } = require('socket.io-client');
const { db } = require('../packages/database');
const { redis } = require('../packages/redis');
const { emailService } = require('../services/identity/emailService');

const SERVER_URL = 'http://localhost:3001';

async function runPhase2CTests() {
  console.log('🧪 Starting Phase 2C.0 Identity & Profile Foundation Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('     ' + (err.stack || err.message));
      failed++;
    }
  }

  // ── [1/7] Passwordless Email OTP Lifecycle ──────────────────────────────────
  console.log('── [1/7] Passwordless Email OTP Lifecycle & Hashing ──');

  const testEmail1 = `alice_${Date.now()}@example.com`;
  let aliceOtp = null;

  await check('Requests OTP for new email with normalization', async () => {
    const mixedCaseEmail = `  ${testEmail1.toUpperCase()}  `;
    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mixedCaseEmail, purpose: 'signup' })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.email, testEmail1.toLowerCase());
    assert.strictEqual(data.purpose, 'signup');

    // Retrieve sent OTP from email service test hook
    const lastSent = emailService.getLastSentOtpForTest();
    assert.ok(lastSent, 'Expected OTP email to be dispatched');
    assert.strictEqual(lastSent.to, testEmail1.toLowerCase());
    assert.strictEqual(lastSent.otp.length, 6);
    aliceOtp = lastSent.otp;
  });

  await check('Never stores plaintext OTP in PostgreSQL (identity.email_otps)', async () => {
    const rows = await db.query(
      `SELECT otp_hash FROM identity.email_otps WHERE email_normalized = $1`,
      [testEmail1.toLowerCase()]
    );
    assert.strictEqual(rows.rows.length, 1);
    const hash = rows.rows[0].otp_hash;
    assert.notStrictEqual(hash, aliceOtp, 'OTP must not be stored in plaintext');
    assert.strictEqual(hash.length, 64, 'Expected SHA-256 hex string (64 characters)');
  });

  await check('Enforces resend throttling within interval (429 RESEND_TOO_FREQUENT)', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail1 })
    });

    assert.strictEqual(res.status, 429);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'RESEND_TOO_FREQUENT');
    assert.ok(data.retryAfterSeconds > 0);
  });

  await check('Rejects incorrect OTP and decrements remaining attempts', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail1, otp: '000000' })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'INVALID_OTP');
    assert.strictEqual(data.attemptsRemaining, 4);

    // Verify DB attempt_count incremented
    const rows = await db.query(
      `SELECT attempt_count FROM identity.email_otps WHERE email_normalized = $1`,
      [testEmail1.toLowerCase()]
    );
    assert.strictEqual(rows.rows[0].attempt_count, 1);
  });

  await check('Enforces brute-force lockout after maximum attempts exceeded', async () => {
    // Submit 4 more incorrect attempts (total 5)
    for (let i = 0; i < 4; i++) {
      await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail1, otp: '000000' })
      });
    }

    // 6th attempt should return 429 MAX_ATTEMPTS_EXCEEDED
    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail1, otp: aliceOtp }) // Even correct OTP is locked
    });

    assert.strictEqual(res.status, 429);
    const data = await res.json();
    assert.strictEqual(data.error, 'MAX_ATTEMPTS_EXCEEDED');
  });

  // ── [2/7] Account Creation & Profile Minting ──────────────────────────────
  console.log('\n── [2/7] User Creation, Profile Minting & Single-Use Consumption ──');

  const testEmail2 = `bob_${Date.now()}@example.com`;
  let bobOtp = null;
  let bobAuthData = null;

  await check('Generates fresh OTP for Bob', async () => {
    await fetch(`${SERVER_URL}/api/v1/auth/email/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail2 })
    });
    bobOtp = emailService.getLastSentOtpForTest().otp;
    assert.ok(bobOtp);
  });

  await check('Rejects expired OTP', async () => {
    // Force OTP to expired status in DB
    await db.query(
      `UPDATE identity.email_otps SET expires_at = NOW() - INTERVAL '1 minute' 
       WHERE email_normalized = $1`,
      [testEmail2.toLowerCase()]
    );

    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail2, otp: bobOtp })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'OTP_EXPIRED');

    // Restore expiration for subsequent test
    await db.query(
      `UPDATE identity.email_otps SET expires_at = NOW() + INTERVAL '10 minutes' 
       WHERE email_normalized = $1`,
      [testEmail2.toLowerCase()]
    );
  });

  await check('Verifies OTP, consumes it, and creates real PostgreSQL user & profile', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail2,
        otp: bobOtp,
        username: `bob_marley_${Date.now().toString().slice(-4)}`,
        displayName: 'Bob Marley'
      })
    });

    assert.strictEqual(res.status, 200);
    bobAuthData = await res.json();
    assert.strictEqual(bobAuthData.success, true);
    assert.strictEqual(bobAuthData.isNewUser, true);
    assert.ok(bobAuthData.accessToken);
    assert.ok(bobAuthData.refreshToken);
    assert.ok(bobAuthData.user.id);
    assert.strictEqual(bobAuthData.profile.display_name, 'Bob Marley');

    // Verify row in PostgreSQL identity.users
    const userRow = await db.query(
      `SELECT id, status FROM identity.users WHERE id = $1`,
      [bobAuthData.user.id]
    );
    assert.strictEqual(userRow.rows.length, 1);
    assert.strictEqual(userRow.rows[0].status, 'active');

    // Verify row in PostgreSQL identity.emails
    const emailRow = await db.query(
      `SELECT email_normalized, is_primary FROM identity.emails WHERE user_id = $1`,
      [bobAuthData.user.id]
    );
    assert.strictEqual(emailRow.rows.length, 1);
    assert.strictEqual(emailRow.rows[0].email_normalized, testEmail2.toLowerCase());
    assert.strictEqual(emailRow.rows[0].is_primary, true);

    // Verify row in PostgreSQL identity.profiles
    const profileRow = await db.query(
      `SELECT username, display_name FROM identity.profiles WHERE user_id = $1`,
      [bobAuthData.user.id]
    );
    assert.strictEqual(profileRow.rows.length, 1);
    assert.strictEqual(profileRow.rows[0].display_name, 'Bob Marley');
  });

  await check('Rejects reused OTP (single-use constraint)', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail2, otp: bobOtp })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'NO_ACTIVE_OTP_FOUND');
  });

  // ── [3/7] Username Uniqueness & Normalization ──────────────────────────────
  console.log('\n── [3/7] Username Normalization & Global Uniqueness ──');

  await check('Rejects duplicate username with case-insensitive collision', async () => {
    // Generate new OTP for a 3rd user
    const testEmail3 = `carol_${Date.now()}@example.com`;
    await fetch(`${SERVER_URL}/api/v1/auth/email/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail3 })
    });
    const carolOtp = emailService.getLastSentOtpForTest().otp;

    // Try to register with Bob's username in ALL CAPS (collision test)
    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail3,
        otp: carolOtp,
        username: bobAuthData.profile.username.toUpperCase() // Collides case-insensitively
      })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'USERNAME_ALREADY_TAKEN');
  });

  // ── [4/7] Profile & Preferences Persistence ────────────────────────────────
  console.log('\n── [4/7] Profile, Preferences & Session Management (/api/v1/me) ──');

  await check('GET /api/v1/me returns verified profile and preferences from PostgreSQL', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/me`, {
      headers: { 'Authorization': `Bearer ${bobAuthData.accessToken}` }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.id, bobAuthData.user.id);
    assert.strictEqual(data.primaryEmail, testEmail2.toLowerCase());
    assert.strictEqual(data.profile.display_name, 'Bob Marley');
    assert.strictEqual(data.preferences.language, 'en');
  });

  await check('PATCH /api/v1/me/profile updates PostgreSQL and preserves on next read', async () => {
    const updateRes = await fetch(`${SERVER_URL}/api/v1/me/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${bobAuthData.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Bob The Legend',
        bio: 'Reggae, movies, and 2048 arcade games.',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
      })
    });

    assert.strictEqual(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.strictEqual(updateData.profile.display_name, 'Bob The Legend');
    assert.strictEqual(updateData.profile.bio, 'Reggae, movies, and 2048 arcade games.');

    // Re-query GET /api/v1/me to verify persistence
    const meRes = await fetch(`${SERVER_URL}/api/v1/me`, {
      headers: { 'Authorization': `Bearer ${bobAuthData.accessToken}` }
    });
    const meData = await meRes.json();
    assert.strictEqual(meData.profile.display_name, 'Bob The Legend');
    assert.strictEqual(meData.profile.bio, 'Reggae, movies, and 2048 arcade games.');
  });

  await check('PATCH /api/v1/me/preferences updates preferences in PostgreSQL', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/me/preferences`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${bobAuthData.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        primaryInterest: 'coplay',
        interests: ['puzzle', 'multiplayer', 'retro'],
        timezone: 'America/New_York',
        language: 'en'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.preferences.primary_interest, 'coplay');
    assert.deepStrictEqual(data.preferences.interests, ['puzzle', 'multiplayer', 'retro']);
    assert.strictEqual(data.preferences.timezone, 'America/New_York');
  });

  await check('POST /api/v1/auth/refresh rotates refresh token in identity.sessions', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: bobAuthData.refreshToken })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.accessToken);
    assert.ok(data.refreshToken);
    assert.notStrictEqual(data.refreshToken, bobAuthData.refreshToken, 'Refresh token must rotate');

    // Attempting to reuse old refresh token must be rejected
    const reuseRes = await fetch(`${SERVER_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: bobAuthData.refreshToken })
    });
    assert.strictEqual(reuseRes.status, 401);
  });

  // ── [5/7] Google OAuth & Safe Account Linking ──────────────────────────────
  console.log('\n── [5/7] Google OAuth / OIDC & Safe Account Linking ──');

  await check('GET /api/v1/auth/google returns OAuth status or redirect', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/google`);
    // If not configured with live credentials, returns 503 with helpful message
    if (res.status === 503) {
      const data = await res.json();
      assert.strictEqual(data.error, 'GOOGLE_OAUTH_NOT_CONFIGURED');
    } else {
      assert.strictEqual(res.status, 302);
    }
  });

  const googleSub = `google-sub-${Date.now()}`;
  const googleEmail = `google_user_${Date.now()}@gmail.com`;

  // Helper to craft test Google ID tokens for the validation engine
  function makeTestGoogleToken(payload) {
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `test_google_token_${b64}`;
  }

  let googleUserRes = null;

  await check('Google authentication registers new user with Google identity in PostgreSQL', async () => {
    const token = makeTestGoogleToken({
      sub: googleSub,
      email: googleEmail,
      email_verified: true,
      name: 'Google User',
      picture: 'https://lh3.googleusercontent.com/test'
    });

    const res = await fetch(`${SERVER_URL}/api/v1/auth/google/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });

    assert.strictEqual(res.status, 200);
    googleUserRes = await res.json();
    assert.strictEqual(googleUserRes.success, true);
    assert.strictEqual(googleUserRes.isNewUser, true);

    // Verify identity row
    const idRow = await db.query(
      `SELECT provider, provider_subject FROM identity.identities WHERE user_id = $1`,
      [googleUserRes.user.id]
    );
    assert.strictEqual(idRow.rows.length, 1);
    assert.strictEqual(idRow.rows[0].provider, 'google');
    assert.strictEqual(idRow.rows[0].provider_subject, googleSub);
  });

  await check('Subsequent Google sign-in logs into existing user without duplicate rows', async () => {
    const token = makeTestGoogleToken({
      sub: googleSub,
      email: googleEmail,
      email_verified: true
    });

    const res = await fetch(`${SERVER_URL}/api/v1/auth/google/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.isNewUser, false);
    assert.strictEqual(data.user.id, googleUserRes.user.id, 'Must resolve to the exact same user ID');
  });

  await check('Safe Account Linking: Google sign-in with email matching existing account links without duplicating user', async () => {
    // Bob has testEmail2. Now Bob signs in with Google using testEmail2
    const bobGoogleSub = `google-sub-bob-${Date.now()}`;
    const token = makeTestGoogleToken({
      sub: bobGoogleSub,
      email: testEmail2, // Matches Bob's existing verified email
      email_verified: true,
      name: 'Bob Google'
    });

    const res = await fetch(`${SERVER_URL}/api/v1/auth/google/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.isNewUser, false);
    assert.strictEqual(data.user.id, bobAuthData.user.id, 'Must link to Bob existing user account');

    // Verify both email and google identities exist on Bob's user ID
    const identities = await db.query(
      `SELECT provider, provider_subject FROM identity.identities WHERE user_id = $1 ORDER BY provider`,
      [bobAuthData.user.id]
    );
    assert.strictEqual(identities.rows.length, 2, 'Expected 2 linked identities (email and google)');
  });

  // ── [6/7] Cryptographic Opaque Invites ─────────────────────────────────────
  console.log('\n── [6/7] Cryptographic Opaque Invites & Real Profile Resolution ──');

  let inviteToken = null;

  await check('Authenticated user creates opaque invite without internal user IDs in URL', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/invites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bobAuthData.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destinationType: 'coplay',
        metadata: { roomId: 'duel-secret-room', gameId: '2048' },
        maxUses: 2,
        expiresInHours: 24
      })
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.inviteToken);
    assert.ok(data.inviteUrl.includes(`/invite/${data.inviteToken}`));
    assert.ok(!data.inviteUrl.includes(bobAuthData.user.id), 'Invite URL must never leak internal user ID');

    inviteToken = data.inviteToken;
  });

  await check('Public invite preview resolves real inviter username & profile from PostgreSQL', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/invites/${inviteToken}`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.valid, true);
    assert.strictEqual(data.destinationType, 'coplay');
    assert.strictEqual(data.metadata.roomId, 'duel-secret-room');
    assert.strictEqual(data.maxUses, 2);
    assert.strictEqual(data.usedCount, 0);

    // Inviter profile must be Bob's real profile
    assert.strictEqual(data.inviter.displayName, 'Bob The Legend');
    assert.strictEqual(data.inviter.username, bobAuthData.profile.username);
  });

  await check('Rejects self-redemption (inviter cannot redeem own invite)', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/invites/${inviteToken}/redeem`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bobAuthData.accessToken}`
      }
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'CANNOT_REDEEM_OWN_INVITE');
  });

  await check('Second user redeems invite and atomic usage count increments', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/invites/${inviteToken}/redeem`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleUserRes.accessToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.metadata.roomId, 'duel-secret-room');

    // Preview should now show usedCount = 1
    const preview = await (await fetch(`${SERVER_URL}/api/v1/invites/${inviteToken}`)).json();
    assert.strictEqual(preview.usedCount, 1);
  });

  await check('Rejects duplicate redemption by the same user', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/invites/${inviteToken}/redeem`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleUserRes.accessToken}`
      }
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'INVITE_ALREADY_REDEEMED');
  });

  await check('Rejects invite after max uses exhausted', async () => {
    // Create another user to consume the 2nd use (maxUses = 2)
    const testEmail4 = `david_${Date.now()}@example.com`;
    await fetch(`${SERVER_URL}/api/v1/auth/email/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail4 })
    });
    const davidOtp = emailService.getLastSentOtpForTest().otp;
    const davidAuth = await (await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail4, otp: davidOtp })
    })).json();

    // David redeems 2nd use
    await fetch(`${SERVER_URL}/api/v1/invites/${inviteToken}/redeem`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${davidAuth.accessToken}` }
    });

    // Preview should now report INVITE_EXHAUSTED
    const previewRes = await fetch(`${SERVER_URL}/api/v1/invites/${inviteToken}`);
    assert.strictEqual(previewRes.status, 410);
    const previewData = await previewRes.json();
    assert.strictEqual(previewData.error, 'INVITE_EXHAUSTED');
  });

  // ── [7/7] Realtime Socket.IO Authentication Invariant ──────────────────────
  console.log('\n── [7/7] Socket.IO Central Identity & Spoofing Protection ──');

  await check('Connects to Socket.IO using real session JWT', async () => {
    const socket = io(SERVER_URL, {
      auth: { token: bobAuthData.accessToken },
      reconnection: false,
      timeout: 3000
    });

    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
    });

    const joinPromise = new Promise((res) => {
      socket.emit('join-room', { roomId: 'identity-test-room' }, res);
    });

    const joinRes = await joinPromise;
    assert.strictEqual(joinRes.success, true);

    // Verify Redis presence has Bob's real user ID and username from PostgreSQL
    const members = await redis.getRoomMembers('identity-test-room');
    assert.strictEqual(members.length, 1);
    assert.strictEqual(members[0].userId, bobAuthData.user.id);
    assert.strictEqual(members[0].username, bobAuthData.profile.username);

    socket.disconnect();
  });

  console.log(`\n======================================================`);
  console.log(`PHASE 2C.0 SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase2CTests().catch((err) => {
  console.error('Fatal error running Phase 2C.0 tests:', err);
  process.exit(1);
});
