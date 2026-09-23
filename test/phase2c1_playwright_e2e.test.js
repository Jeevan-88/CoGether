/**
 * Phase 2C.1: Real External Auth + Production Identity Verification
 * Playwright End-to-End Test Suite
 * 
 * Verifies:
 * 1. Real sign-up flow (email OTP) inside headless Chromium
 * 2. Refresh token rotation & session tracking
 * 3. Logout and session revocation in PostgreSQL
 * 4. Re-login with existing email (ensuring zero duplicate user rows)
 * 5. Profile & Avatar update persistence in PostgreSQL
 * 6. Multi-user invite creation, preview, and redemption across two real users
 * 7. Socket.IO connection authentication via server-side session token
 */

const assert = require('assert');
const { chromium } = require('playwright');
const { io } = require('socket.io-client');
const { db } = require('../packages/database');
const { emailService } = require('../services/identity/emailService');
const { inviteService } = require('../services/identity/inviteService');

const CLIENT_URL = 'http://localhost:5173';
const SERVER_URL = 'http://localhost:3001';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTestOtp(email) {
  const data = emailService.getLastSentOtpForTest(email);
  if (!data) return null;
  return typeof data === 'object' ? data.otp : data;
}

async function runPlaywrightE2ETests() {
  console.log('🎭 Starting Phase 2C.1 Playwright E2E Identity Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  let browser;
  let context1;
  let page1;

  let user1Email = `playwright_u1_${Date.now()}@example.com`;
  let user1DisplayName = 'Playwright Alice';
  let user1Handle = `pw_alice_${Date.now().toString().slice(-4)}`;
  let user1Id = null;
  let user1AccessToken = null;
  let user1RefreshToken = null;
  let inviteToken = null;

  let user2Email = `playwright_u2_${Date.now()}@example.com`;
  let user2DisplayName = 'Playwright Bob';
  let user2Id = null;
  let user2AccessToken = null;

  async function testStep(name, fn) {
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

  try {
    browser = await chromium.launch({ headless: true });
    context1 = await browser.newContext();
    page1 = await context1.newPage();

    // ── STEP 1: Real Browser Sign-up Flow (Email OTP) ──
    console.log('── [1/7] Real Browser Sign-up Flow via Email OTP ──');
    await testStep('Loads client and opens AuthModal in Chromium', async () => {
      await page1.goto(CLIENT_URL, { waitUntil: 'domcontentloaded' });
      await page1.waitForSelector('.btn-login-rect', { timeout: 10000 });
      await page1.click('.btn-login-rect');
      await page1.waitForSelector('.auth-id-card', { timeout: 5000 });
    });

    await testStep('Submits email and requests single-use OTP passcode', async () => {
      await page1.fill('input[type="email"]', user1Email);
      await page1.fill('input[placeholder="Alex Rivera"]', user1DisplayName);
      await page1.fill('input[placeholder="alex_rivera"]', user1Handle);
      await page1.click('button.auth-submit-btn');

      // Wait for OTP step
      await page1.waitForSelector('input[placeholder="000000"]', { timeout: 10000 });
    });

    await testStep('Enters verified OTP and authenticates user into session', async () => {
      await sleep(300);
      const otp = getTestOtp(user1Email);
      assert(otp && otp.length === 6, `Expected 6-digit OTP for ${user1Email}, got: ${otp}`);

      await page1.fill('input[placeholder="000000"]', otp);
      await page1.click('button.auth-submit-btn');

      // Wait for user badge in Navbar
      await page1.waitForSelector('.user-nav-badge', { timeout: 10000 });
      const badgeText = await page1.textContent('.user-nav-badge');
      assert(badgeText.includes(user1DisplayName), `Badge should contain ${user1DisplayName}, got ${badgeText}`);

      // Verify tokens stored in browser localStorage
      user1AccessToken = await page1.evaluate(() => localStorage.getItem('cogether_access_token'));
      user1RefreshToken = await page1.evaluate(() => localStorage.getItem('cogether_refresh_token'));
      assert(user1AccessToken, 'Expected access token in localStorage');
      assert(user1RefreshToken, 'Expected refresh token in localStorage');

      // Verify in PostgreSQL database
      const dbUser = await db.query(
        'SELECT u.id, u.status, p.display_name, p.username FROM identity.users u JOIN identity.profiles p ON u.id = p.user_id WHERE p.username = $1',
        [user1Handle.toLowerCase()]
      );
      assert.strictEqual(dbUser.rows.length, 1);
      user1Id = dbUser.rows[0].id;
      assert.strictEqual(dbUser.rows[0].display_name, user1DisplayName);
    });

    // ── STEP 2: Refresh Token Rotation ──
    console.log('\n── [2/7] Refresh Token Rotation & Session Invalidation ──');
    await testStep('Rotates refresh token via /api/v1/auth/refresh', async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: user1RefreshToken })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert(data.accessToken, 'Expected new access token');
      assert(data.refreshToken, 'Expected new refresh token');
      assert.notStrictEqual(data.refreshToken, user1RefreshToken, 'Refresh token must be rotated');

      // Verify old refresh token cannot be reused (rotation security)
      const replayRes = await fetch(`${SERVER_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: user1RefreshToken })
      });
      assert.strictEqual(replayRes.status, 401, 'Reused refresh token must be rejected');

      // Update active tokens
      user1AccessToken = data.accessToken;
      user1RefreshToken = data.refreshToken;
      await page1.evaluate(({ at, rt }) => {
        localStorage.setItem('cogether_access_token', at);
        localStorage.setItem('cogether_refresh_token', rt);
      }, { at: user1AccessToken, rt: user1RefreshToken });
    });

    // ── STEP 3: Logout and Session Revocation ──
    console.log('\n── [3/7] Logout & Session Revocation in PostgreSQL ──');
    await testStep('Logs out from UI and revokes session in database', async () => {
      // Open Profile Modal
      await page1.click('.user-nav-badge');
      await page1.waitForSelector('.auth-logout-btn', { timeout: 5000 });
      await page1.click('.auth-logout-btn');

      // Verify returned to logged out state
      await page1.waitForSelector('.btn-login-rect', { timeout: 10000 });
      const clearedToken = await page1.evaluate(() => localStorage.getItem('cogether_access_token'));
      assert(!clearedToken, 'Access token should be cleared on logout');

      // Direct PostgreSQL verification that session was revoked
      const sessionRes = await db.query(
        'SELECT revoked_at FROM identity.sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [user1Id]
      );
      assert(sessionRes.rows.length > 0);
      assert(sessionRes.rows[0].revoked_at !== null, 'Session revoked_at must be populated');

      // API call with revoked token must fail with 401
      const meRes = await fetch(`${SERVER_URL}/api/v1/me`, {
        headers: { 'Authorization': `Bearer ${user1AccessToken}` }
      });
      assert.strictEqual(meRes.status, 401, 'Revoked token must be rejected with 401');
    });

    // ── STEP 4: Re-Login with Existing Email (Zero Duplicate Users) ──
    console.log('\n── [4/7] Re-Login with Existing Email & No Duplicates ──');
    await testStep('Re-authenticates existing user and verifies single user record', async () => {
      // Age previous OTP to bypass 60s cooldown in automated integration test
      await db.query(
        "UPDATE identity.email_otps SET created_at = NOW() - interval '2 minutes' WHERE email_normalized = $1",
        [user1Email.toLowerCase()]
      );

      await page1.click('.btn-login-rect');
      await page1.waitForSelector('.auth-id-card', { timeout: 5000 });
      await page1.fill('input[type="email"]', user1Email);
      await page1.click('button.auth-submit-btn');

      await page1.waitForSelector('input[placeholder="000000"]', { timeout: 10000 });
      await sleep(300);
      const reLoginOtp = getTestOtp(user1Email);
      assert(reLoginOtp, 'Expected new OTP for re-login');

      await page1.fill('input[placeholder="000000"]', reLoginOtp);
      await page1.click('button.auth-submit-btn');

      await page1.waitForSelector('.user-nav-badge', { timeout: 10000 });
      user1AccessToken = await page1.evaluate(() => localStorage.getItem('cogether_access_token'));
      user1RefreshToken = await page1.evaluate(() => localStorage.getItem('cogether_refresh_token'));

      // Check PostgreSQL: ensure exactly 1 user row exists for this identity
      const countRes = await db.query(
        'SELECT COUNT(*) as count FROM identity.identities WHERE provider_email = $1',
        [user1Email.toLowerCase()]
      );
      assert.strictEqual(parseInt(countRes.rows[0].count, 10), 1, 'There must never be duplicate user accounts');
    });

    // ── STEP 5: Profile Update & Avatar Persistence in PostgreSQL ──
    console.log('\n── [5/7] Profile Updates & Avatar Storage Persistence ──');
    await testStep('Updates bio and uploads avatar to storage abstraction', async () => {
      // 1. Upload avatar via POST /api/v1/me/avatar
      const testAvatarBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const avatarRes = await fetch(`${SERVER_URL}/api/v1/me/avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1AccessToken}`
        },
        body: JSON.stringify({
          image: testAvatarBase64,
          mimeType: 'image/png'
        })
      });
      assert.strictEqual(avatarRes.status, 200);
      const avatarData = await avatarRes.json();
      assert.strictEqual(avatarData.success, true);
      assert(avatarData.avatarUrl.includes('/uploads/avatars/avatar_'), `Avatar URL invalid: ${avatarData.avatarUrl}`);

      // 2. Update bio via /api/v1/me/profile
      const testBio = 'E2E Verified WebRTC Architect & Staff SRE';
      const profileRes = await fetch(`${SERVER_URL}/api/v1/me/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1AccessToken}`
        },
        body: JSON.stringify({
          displayName: 'Alice Architect',
          bio: testBio,
          avatarUrl: avatarData.avatarUrl
        })
      });
      assert.strictEqual(profileRes.status, 200);

      // 3. Direct PostgreSQL verification
      const pgProfile = await db.query(
        'SELECT display_name, bio, avatar_url FROM identity.profiles WHERE user_id = $1',
        [user1Id]
      );
      assert.strictEqual(pgProfile.rows[0].display_name, 'Alice Architect');
      assert.strictEqual(pgProfile.rows[0].bio, testBio);
      assert(pgProfile.rows[0].avatar_url.includes('/uploads/avatars/avatar_'));
    });

    // ── STEP 6: Multi-User Invite Lifecycle Across Two Users ──
    console.log('\n── [6/7] Multi-User Invite Lifecycle (Creation, Preview, Redemption) ──');
    await testStep('User 1 generates an invite token', async () => {
      const inviteRes = await fetch(`${SERVER_URL}/api/v1/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1AccessToken}`
        },
        body: JSON.stringify({
          maxUses: 5,
          expiresInHours: 24,
          resourceType: 'room',
          resourceId: 'squad-room-alpha'
        })
      });
      assert.strictEqual(inviteRes.status, 201);
      const inviteData = await inviteRes.json();
      assert.strictEqual(inviteData.success, true);
      const token = inviteData.token || inviteData.invite?.token || inviteData.inviteToken;
      assert(token, 'Expected invite token');
      inviteToken = token;
      assert(inviteToken.length >= 24, 'Token must be a secure opaque string');
    });

    await testStep('Second user fetches public invite preview without authentication', async () => {
      const previewRes = await fetch(`${SERVER_URL}/api/v1/invites/${inviteToken}`);
      assert.strictEqual(previewRes.status, 200);
      const preview = await previewRes.json();
      assert.strictEqual(preview.success, true);
      assert.strictEqual(preview.invite.valid, true);
      assert.strictEqual(preview.invite.inviter.displayName, 'Alice Architect');
      assert.strictEqual(preview.invite.maxUses, 5);
      assert.strictEqual(preview.invite.usesCount, 0);
    });

    await testStep('User 2 registers and redeems User 1 invite token', async () => {
      // 1. User 2 requests OTP
      const u2ReqRes = await fetch(`${SERVER_URL}/api/v1/auth/email/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user2Email, purpose: 'signup' })
      });
      assert.strictEqual(u2ReqRes.status, 200);

      // 2. Retrieve User 2 OTP and verify
      await sleep(300);
      const u2Otp = getTestOtp(user2Email);
      assert(u2Otp, 'Expected OTP for User 2');

      const u2VerifyRes = await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user2Email,
          otp: u2Otp,
          displayName: user2DisplayName
        })
      });
      assert.strictEqual(u2VerifyRes.status, 200);
      const u2Data = await u2VerifyRes.json();
      user2Id = u2Data.user.id;
      user2AccessToken = u2Data.accessToken;

      // 3. User 2 redeems invite token
      const redeemRes = await fetch(`${SERVER_URL}/api/v1/invites/${inviteToken}/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user2AccessToken}`
        }
      });
      assert.strictEqual(redeemRes.status, 200);
      const redeemData = await redeemRes.json();
      assert.strictEqual(redeemData.success, true);
      assert.strictEqual(redeemData.redeemed, true);

      // 4. Verify PostgreSQL persistence
      const pgRedemption = await db.query(
        'SELECT r.redeemed_by_user_id, i.used_count FROM identity.invite_redemptions r JOIN identity.invites i ON r.invite_id = i.id WHERE i.token_hash = $1',
        [inviteService.hashToken(inviteToken)]
      );
      assert.strictEqual(pgRedemption.rows.length, 1);
      assert.strictEqual(pgRedemption.rows[0].redeemed_by_user_id, user2Id);
      assert.strictEqual(pgRedemption.rows[0].used_count, 1);

      // 5. Verify User 1 cannot self-redeem own invite
      const selfRedeemRes = await fetch(`${SERVER_URL}/api/v1/invites/${inviteToken}/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1AccessToken}`
        }
      });
      assert.strictEqual(selfRedeemRes.status, 400, 'Self-redemption must be prohibited');
    });

    // ── STEP 7: Socket.IO Session Authentication ──
    console.log('\n── [7/7] Socket.IO Connection Authenticated via Session Token ──');
    await testStep('Socket.IO connects successfully with valid session token', async () => {
      const socket = io(SERVER_URL, {
        auth: { token: user1AccessToken },
        transports: ['websocket'],
        reconnection: false
      });

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          socket.disconnect();
          reject(new Error('Socket connection timed out'));
        }, 5000);

        socket.on('connect', () => {
          clearTimeout(timer);
          assert(socket.id, 'Expected socket id on connect');
          socket.disconnect();
          resolve();
        });

        socket.on('connect_error', (err) => {
          clearTimeout(timer);
          socket.disconnect();
          reject(err);
        });
      });
    });

    await testStep('Socket.IO rejects connection without token or with forged token', async () => {
      const socket = io(SERVER_URL, {
        auth: { token: 'forged.invalid.jwt.signature' },
        transports: ['websocket'],
        reconnection: false
      });

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          socket.disconnect();
          reject(new Error('Expected rejection but connected or hung'));
        }, 5000);

        socket.on('connect', () => {
          clearTimeout(timer);
          socket.disconnect();
          reject(new Error('Socket connected with forged token!'));
        });

        socket.on('connect_error', (err) => {
          clearTimeout(timer);
          assert(
            err.message.includes('AUTHENTICATION_FAILED') || err.message.includes('Authentication error') || err.message.includes('AUTHENTICATION_REQUIRED'),
            `Expected auth error, got: ${err.message}`
          );
          socket.disconnect();
          resolve();
        });
      });
    });

  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log(`\n=======================================================`);
  console.log(`Phase 2C.1 Playwright E2E Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPlaywrightE2ETests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
