/**
 * CoGether Authentication Strict UI & Security Flows Verification Suite
 * Verifies end-to-end security requirements:
 * 1. Step 1 Sign Up -> Password Validation -> OTP Verification -> DB Persistence & Instant Entry
 * 2. Sign In: Email + Password -> Server verifies password -> Server creates login challenge & dispatches OTP
 * 3. CRITICAL: Password verification alone NEVER issues tokens or cookies
 * 4. Login OTP verification without a password challenge MUST fail
 * 5. Requesting a login OTP directly without password verification MUST fail
 * 6. Reusing an already consumed login challenge MUST fail
 * 7. Expired challenges MUST fail
 * 8. Wrong password does NOT create a login challenge
 * 9. MFA-enabled accounts CANNOT bypass mandatory email OTP verification
 * 10. 5-Minute Guest Access persisted in PostgreSQL
 * 11. Strict UI source preservation (mode='signin', zero style changes)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { db } = require('../packages/database/client');
const { userService } = require('../services/identity/userService');
const { generateSync } = require('otplib');

const BASE_URL = 'http://localhost:3001';

async function request(method, endpoint, body = null, headers = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  let resBody = null;
  const text = await res.text();
  try {
    resBody = JSON.parse(text);
  } catch (e) {
    resBody = text;
  }
  return { status: res.status, headers: res.headers, body: resBody };
}

function getDispatchedOtp(email) {
  const otpFile = path.join(__dirname, '../.test_last_otp.json');
  if (!fs.existsSync(otpFile)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(otpFile, 'utf8'));
    return data[email.toLowerCase()]?.otp || data._latest?.otp || null;
  } catch (e) {
    return null;
  }
}

async function runAllJourneys() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🛡️ CoGether Comprehensive Authentication Flow Verification');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function check(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testEmail = `newuser_${timestamp}@cogether.tech`;
  const testPassword = 'Password123!';
  let createdUserId = null;
  let activeChallenge = null;
  let lastLoginOtp = null;
  let guestId = null;

  try {
    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 1: New User Sign Up Flow (Email + Password + OTP)
    // ══════════════════════════════════════════════════════════════════
    console.log('--- JOURNEY 1: New User Sign Up (Step 1 Password + Step 2 OTP -> PostgreSQL) ---');

    // Step 1: Request OTP for signup
    const signupOtpReq = await request('POST', '/api/v1/auth/email/request-otp', {
      email: testEmail,
      purpose: 'signup'
    });
    check(signupOtpReq.status === 200, `Signup request-otp returns 200 (got ${signupOtpReq.status})`);
    check(signupOtpReq.body.success === true, 'Signup request-otp succeeds');
    check(signupOtpReq.body.purpose === 'signup', 'Signup purpose set to signup');

    const signupOtp = getDispatchedOtp(testEmail);
    check(signupOtp && signupOtp.length === 6, `Dispatched 6-digit signup OTP found: ${signupOtp}`);

    // Step 2: Verify OTP with password provided
    const signupVerify = await request('POST', '/api/v1/auth/email/verify-otp', {
      email: testEmail,
      otp: signupOtp,
      password: testPassword,
      purpose: 'signup'
    });

    check(signupVerify.status === 200, `Signup verify-otp returns 200 (got ${signupVerify.status})`);
    check(signupVerify.body.success === true, 'Signup verification succeeds');
    check(signupVerify.body.isNewUser === true, 'Identified as new user');
    check(Boolean(signupVerify.body.accessToken), 'Access token issued directly');
    check(Boolean(signupVerify.body.refreshToken), 'Refresh token issued directly');

    createdUserId = signupVerify.body.user?.id;
    check(Boolean(createdUserId), `User ID created: ${createdUserId}`);

    // Verify account in PostgreSQL
    const dbUserRes = await db.query(
      `SELECT u.id, u.email, u.password_hash, p.username, p.display_name, pref.timezone, ent.tier
       FROM identity.users u
       JOIN identity.profiles p ON u.id = p.user_id
       LEFT JOIN identity.preferences pref ON u.id = pref.user_id
       LEFT JOIN identity.entitlements ent ON u.id = ent.user_id
       WHERE u.id = $1`,
      [createdUserId]
    );
    check(dbUserRes.rows.length === 1, 'New user record successfully saved in PostgreSQL identity.users');
    const dbUser = dbUserRes.rows[0];
    check(dbUser.password_hash.startsWith('$argon2id$'), 'Password hashed with Argon2id');
    check(Boolean(dbUser.username), `Unique profile handle assigned: @${dbUser.username}`);
    check(dbUser.tier === 'free', 'Default free entitlement created');

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 2: Password Sign In -> Login Challenge -> OTP Verification
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 2: Sign In (Password -> Login Challenge -> Email OTP -> Session) ---');

    // Submitting valid credentials
    const loginStep1 = await request('POST', '/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });

    check(loginStep1.status === 200, `Login credentials validation returns 200 (got ${loginStep1.status})`);
    check(loginStep1.body.otpRequired === true, 'Server enforces otpRequired: true');
    check(!loginStep1.body.accessToken, 'CRITICAL: Password verification alone NEVER issues an access token');
    check(!loginStep1.body.refreshToken, 'CRITICAL: Password verification alone NEVER issues a refresh token');
    check(Boolean(loginStep1.body.loginChallenge), 'Server generates and returns a single-use loginChallenge token');
    activeChallenge = loginStep1.body.loginChallenge;

    // Verify challenge persistence in PostgreSQL identity.login_challenges
    const challengeDb = await db.query(
      `SELECT id, user_id, email_normalized, otp_id, expires_at, consumed_at 
       FROM identity.login_challenges 
       WHERE challenge_token = $1`,
      [activeChallenge]
    );
    check(challengeDb.rows.length === 1, 'Login challenge persistently stored in PostgreSQL identity.login_challenges');
    check(challengeDb.rows[0].consumed_at === null, 'Challenge is initially unconsumed');
    check(challengeDb.rows[0].email_normalized === testEmail.toLowerCase(), 'Challenge bound to authenticated user email');

    lastLoginOtp = getDispatchedOtp(testEmail);
    check(lastLoginOtp && lastLoginOtp.length === 6, `Login verification OTP dispatched to email: ${lastLoginOtp}`);

    // ══════════════════════════════════════════════════════════════════
    // NEGATIVE TESTS: Strict Challenge & OTP Security Constraints
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- NEGATIVE TESTS: Attack Surface & Challenge Binding Hardening ---');

    // Negative Test A: Wrong password must NOT create a login challenge
    const wrongPassRes = await request('POST', '/api/v1/auth/login', {
      email: testEmail,
      password: 'IncorrectPassword999!'
    });
    check(wrongPassRes.status === 401, `Wrong password rejected with 401 (got ${wrongPassRes.status})`);
    check(wrongPassRes.body.error === 'INVALID_CREDENTIALS', 'Returns generic INVALID_CREDENTIALS error');
    check(!wrongPassRes.body.loginChallenge, 'Wrong password does NOT return a login challenge');

    // Negative Test B: Login OTP verification WITHOUT a password challenge must fail
    const noChallengeRes = await request('POST', '/api/v1/auth/email/verify-otp', {
      email: testEmail,
      otp: lastLoginOtp,
      purpose: 'login'
    });
    check(noChallengeRes.status === 401, `Verify without loginChallenge rejected with 401 (got ${noChallengeRes.status})`);
    check(noChallengeRes.body.error === 'LOGIN_CHALLENGE_REQUIRED', 'Error code is LOGIN_CHALLENGE_REQUIRED');

    // Negative Test C: Requesting a login OTP directly without password verification must fail
    const directOtpReq = await request('POST', '/api/v1/auth/email/request-otp', {
      email: testEmail,
      purpose: 'login'
    });
    check(directOtpReq.status === 401, `Direct request-otp for login rejected with 401 (got ${directOtpReq.status})`);
    check(directOtpReq.body.error === 'PASSWORD_REQUIRED', 'Error code is PASSWORD_REQUIRED');

    // Negative Test D: Wrong OTP rejected
    const wrongOtpRes = await request('POST', '/api/v1/auth/email/verify-otp', {
      email: testEmail,
      otp: '000000',
      purpose: 'login',
      loginChallenge: activeChallenge
    });
    check(wrongOtpRes.status === 400, `Wrong OTP rejected with 400 (got ${wrongOtpRes.status})`);
    check(wrongOtpRes.body.error === 'INVALID_OTP', 'Error is INVALID_OTP');

    // Negative Test E: Expired challenge must fail
    const expiredToken = 'lch_expired_test_' + Date.now();
    await db.query(
      `INSERT INTO identity.login_challenges (challenge_token, user_id, email_normalized, expires_at)
       VALUES ($1, $2, $3, NOW() - INTERVAL '5 minutes')`,
      [expiredToken, createdUserId, testEmail.toLowerCase()]
    );
    const expiredChallengeRes = await request('POST', '/api/v1/auth/email/verify-otp', {
      email: testEmail,
      otp: lastLoginOtp,
      purpose: 'login',
      loginChallenge: expiredToken
    });
    check(expiredChallengeRes.status === 401, `Expired challenge rejected with 401 (got ${expiredChallengeRes.status})`);
    check(expiredChallengeRes.body.error === 'CHALLENGE_EXPIRED', 'Error code is CHALLENGE_EXPIRED');

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 2 (Completion): Valid Password + Valid OTP + Valid Challenge -> SUCCESS
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 2 Completion: Valid Credentials + OTP + Challenge Verification ---');

    const validLoginRes = await request('POST', '/api/v1/auth/email/verify-otp', {
      email: testEmail,
      otp: lastLoginOtp,
      purpose: 'login',
      loginChallenge: activeChallenge
    });

    check(validLoginRes.status === 200, `OTP + challenge login verification returns 200 (got ${validLoginRes.status})`);
    check(validLoginRes.body.success === true, 'Login OTP verification succeeds');
    check(Boolean(validLoginRes.body.accessToken), 'Access token issued after OTP verification');
    check(Boolean(validLoginRes.body.refreshToken), 'Refresh token issued after OTP verification');
    check(validLoginRes.body.user?.email === testEmail.toLowerCase(), 'Authenticated user email matches');

    // Verify challenge was consumed in PostgreSQL
    const consumedChallengeDb = await db.query(
      `SELECT consumed_at FROM identity.login_challenges WHERE challenge_token = $1`,
      [activeChallenge]
    );
    check(consumedChallengeDb.rows[0]?.consumed_at !== null, 'Login challenge atomically marked consumed_at in PostgreSQL');

    // Negative Test F: Reusing an already consumed challenge must fail
    const reuseChallengeRes = await request('POST', '/api/v1/auth/email/verify-otp', {
      email: testEmail,
      otp: lastLoginOtp,
      purpose: 'login',
      loginChallenge: activeChallenge
    });
    check(reuseChallengeRes.status === 401, `Consumed challenge reuse rejected with 401 (got ${reuseChallengeRes.status})`);
    check(reuseChallengeRes.body.error === 'CHALLENGE_ALREADY_USED', 'Error code is CHALLENGE_ALREADY_USED');

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 3: MFA-Enabled Account CANNOT Bypass Email Verification
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 3: MFA Account Sequencing (Password -> Email OTP -> MFA TOTP -> Session) ---');

    // Enroll MFA for this user
    const enrollRes = await userService.enrollMfa(createdUserId);
    check(enrollRes.success === true, 'MFA enrollment initiated');
    const totpCode = generateSync({ secret: enrollRes.secret });
    const confirmMfa = await userService.confirmMfa(createdUserId, totpCode);
    check(confirmMfa.success === true, 'MFA confirmed and enabled in PostgreSQL');

    // Step 1 of login: Submit password
    const mfaLoginStep1 = await request('POST', '/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });
    check(mfaLoginStep1.status === 200, `MFA user password login returns 200 (got ${mfaLoginStep1.status})`);
    check(mfaLoginStep1.body.otpRequired === true, 'MFA user is FIRST required to verify email OTP (otpRequired: true)');
    check(!mfaLoginStep1.body.mfaTicket, 'MFA user is NOT given an MFA ticket before email OTP verification');
    check(!mfaLoginStep1.body.accessToken, 'MFA user receives NO session tokens on password alone');
    const mfaChallengeToken = mfaLoginStep1.body.loginChallenge;
    check(Boolean(mfaChallengeToken), 'MFA user receives a login challenge token');

    const mfaLoginOtp = getDispatchedOtp(testEmail);
    check(mfaLoginOtp && mfaLoginOtp.length === 6, `Fresh login OTP dispatched for MFA user: ${mfaLoginOtp}`);

    // Step 2 of login: Verify email OTP with challenge
    const mfaLoginStep2 = await request('POST', '/api/v1/auth/email/verify-otp', {
      email: testEmail,
      otp: mfaLoginOtp,
      purpose: 'login',
      loginChallenge: mfaChallengeToken
    });
    check(mfaLoginStep2.status === 200, `Email OTP verification returns 200 (got ${mfaLoginStep2.status})`);
    check(mfaLoginStep2.body.mfaRequired === true, 'After email OTP verification, server enforces mfaRequired: true');
    check(Boolean(mfaLoginStep2.body.mfaTicket), 'Short-lived MFA challenge ticket issued');
    check(!mfaLoginStep2.body.accessToken, 'Access token NOT issued yet (awaiting MFA TOTP)');

    // Step 3 of login: Verify MFA TOTP code (clear last_used_timestep to allow test verification in same 30s block)
    await db.query(`UPDATE identity.user_mfa SET last_used_timestep = 0 WHERE user_id = $1`, [createdUserId]);
    const currentTotp = generateSync({ secret: enrollRes.secret });
    const mfaFinal = await request('POST', '/api/v1/auth/mfa/verify', {
      mfaTicket: mfaLoginStep2.body.mfaTicket,
      code: currentTotp
    });
    check(mfaFinal.status === 200, `MFA TOTP verification returns 200 (got ${mfaFinal.status})`);
    check(Boolean(mfaFinal.body.accessToken), 'Access token issued after MFA verification');
    check(Boolean(mfaFinal.body.refreshToken), 'Refresh token issued after MFA verification');

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 4: Reject Unknown Email from Logging In
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 4: Reject Unknown Email on Login ---');

    const ghostEmail = `nonexistent_${Date.now()}@cogether.tech`;

    const unknownLoginRes = await request('POST', '/api/v1/auth/login', {
      email: ghostEmail,
      password: 'SomePassword123!'
    });
    check(unknownLoginRes.status === 401, `Unknown email login rejected with 401 (got ${unknownLoginRes.status})`);
    check(unknownLoginRes.body.error === 'INVALID_CREDENTIALS', 'Returns generic INVALID_CREDENTIALS');

    const unknownOtpReq = await request('POST', '/api/v1/auth/email/request-otp', {
      email: ghostEmail,
      purpose: 'login'
    });
    check(unknownOtpReq.status === 400, `Requesting login OTP for non-existent account returns 400 (got ${unknownOtpReq.status})`);
    check(unknownOtpReq.body.error === 'ACCOUNT_NOT_FOUND', 'Error is ACCOUNT_NOT_FOUND');

    const unknownVerifyRes = await request('POST', '/api/v1/auth/email/verify-otp', {
      email: ghostEmail,
      otp: '123456',
      purpose: 'login'
    });
    check(unknownVerifyRes.status === 400, `Direct verify for non-existent account rejected (got ${unknownVerifyRes.status})`);

    const ghostCheck = await db.query(
      `SELECT user_id FROM identity.emails WHERE email_normalized = $1`,
      [ghostEmail.toLowerCase()]
    );
    check(ghostCheck.rows.length === 0, 'Zero phantom records created in identity.emails');

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 5: 5-Minute Guest Access Persisted in PostgreSQL
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 5: 5-Minute Guest Access Persisted in PostgreSQL ---');

    const guestRes = await request('POST', '/api/v1/auth/guest', {
      displayName: 'CoGetherGuest'
    });

    check(guestRes.status === 201, `Guest creation returns 201 (got ${guestRes.status})`);
    check(Boolean(guestRes.body.token), 'Guest JWT token issued');
    check(guestRes.body.durationSeconds === 300, `Guest session duration strictly 300s (got ${guestRes.body.durationSeconds})`);

    guestId = guestRes.body.user?.id;
    check(guestId && guestId.startsWith('gst_'), `Valid guest ID generated: ${guestId}`);

    const guestDb = await db.query(
      `SELECT guest_id, display_name, expires_at, created_at 
       FROM identity.guest_sessions 
       WHERE guest_id = $1`,
      [guestId]
    );
    check(guestDb.rows.length === 1, 'Guest session persistently recorded in PostgreSQL identity.guest_sessions');
    check(guestDb.rows[0].display_name === 'CoGetherGuest', 'Display name stored accurately in DB');

    const guestMe = await request('GET', '/api/v1/me', null, {
      Authorization: `Bearer ${guestRes.body.token}`
    });
    check(guestMe.status === 200, `Guest access to /api/v1/me returns 200 (got ${guestMe.status})`);
    check(guestMe.body.isGuest === true, 'Guest claim identified');
    check(guestMe.body.remainingSeconds <= 300 && guestMe.body.remainingSeconds >= 290, `Accurate countdown remaining (${guestMe.body.remainingSeconds}s)`);

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 6: Session Restoration & Refresh Token Rotation
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 6: Session Restoration & Token Rotation ---');

    const meRes = await request('GET', '/api/v1/me', null, {
      Authorization: `Bearer ${mfaFinal.body.accessToken}`
    });
    check(meRes.status === 200, `Session restored via /api/v1/me (status ${meRes.status})`);
    check(meRes.body.primaryEmail === testEmail.toLowerCase(), 'Session email matches');

    const refreshRes = await request('POST', '/api/v1/auth/refresh', {
      refreshToken: mfaFinal.body.refreshToken
    });
    check(refreshRes.status === 200, `Session refreshed via /api/v1/auth/refresh (status ${refreshRes.status})`);
    check(Boolean(refreshRes.body.accessToken), 'Fresh access token returned');
    check(Boolean(refreshRes.body.refreshToken), 'Rotated refresh token returned');

    const reuseRefreshRes = await request('POST', '/api/v1/auth/refresh', {
      refreshToken: mfaFinal.body.refreshToken
    });
    check(reuseRefreshRes.status === 401, `Consumed refresh token reuse rejected with 401 (got ${reuseRefreshRes.status})`);

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 7: UI Source & Structure Verification
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 7: UI Source & Structure Preservation ---');

    const authModalSrc = fs.readFileSync(path.join(__dirname, '../client/src/modules/auth/AuthModal.jsx'), 'utf8');

    check(authModalSrc.includes("initialMode = 'signin'"), "Default mode is 'signin'");
    check(authModalSrc.includes("startGuestSession"), "Destructures startGuestSession from useAuth");
    check(authModalSrc.includes("res.success && res.token"), "Fails closed on guest session error");
    check(authModalSrc.includes("handleSignupStep1Submit"), "Signup form validates password and requests OTP");
    check(authModalSrc.includes("loginChallenge"), "AuthModal passes loginChallenge on OTP verification");
    check(!authModalSrc.includes("toggle-otp-signin-btn"), "Removed independent OTP-only option from normal Sign In interface");
    check(authModalSrc.includes("flow-password-hints"), "Preserves flow-password-hints class");
    check(authModalSrc.includes("flow-field-wrapper"), "Preserves flow-field-wrapper class");
    check(authModalSrc.includes("flow-action-button"), "Preserves flow-action-button class");
    check(authModalSrc.includes("flow-explore-guest-btn"), "Preserves flow-explore-guest-btn class");

    // Clean up temporary test account
    if (guestId) {
      await db.query(`DELETE FROM identity.guest_sessions WHERE guest_id = $1`, [guestId]);
    }
    if (createdUserId) {
      await db.query(`DELETE FROM identity.users WHERE id = $1`, [createdUserId]);
    }
    console.log('\n🧹 Temporary test records cleaned up from PostgreSQL.');

  } catch (err) {
    console.error('Unexpected error in test runner:', err);
    failed++;
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`📊 Total Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllJourneys();
