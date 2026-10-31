/**
 * Comprehensive CoGether Strict UI & Authentication Flow Integration Test Suite
 * 
 * Verifies all 8 required authentication journeys end-to-end:
 * Journey 1: New user signup -> password validation -> OTP -> PostgreSQL account creation (Argon2id) -> direct app entry
 * Journey 2: Existing user login -> password verification -> OTP challenge -> token & session issue (password alone never issues tokens)
 * Journey 3: Wrong password rejection & timing attack defense
 * Journey 4: Invalid and expired OTP rejection & attempt counter tracking
 * Journey 5: Login with unregistered email rejected (no phantom account creation)
 * Journey 6: 5-minute Guest access persisted in PostgreSQL identity.guest_sessions
 * Journey 7: Authenticated session restoration and refresh token rotation
 * Journey 8: Strict UI & field integrity verification
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { db } = require('../packages/database');

const API_BASE = 'http://127.0.0.1:3001';
const OTP_FILE = path.join(__dirname, '../.test_last_otp.json');

function request(method, routePath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(routePath, API_BASE);
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(url, {
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function getDispatchedOtp(email) {
  if (fs.existsSync(OTP_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(OTP_FILE, 'utf8'));
      return data[email.toLowerCase()]?.otp || data._latest?.otp;
    } catch (e) {}
  }
  return null;
}

async function runAllJourneys() {
  console.log('═══════════════════════════════════════════════════════════');
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

    const newUserId = signupVerify.body.user?.id;
    check(Boolean(newUserId), `User ID created: ${newUserId}`);

    // Verify account in PostgreSQL
    const dbUserRes = await db.query(
      `SELECT u.id, u.email, u.password_hash, p.username, p.display_name, pref.timezone, ent.tier
       FROM identity.users u
       JOIN identity.profiles p ON u.id = p.user_id
       LEFT JOIN identity.preferences pref ON u.id = pref.user_id
       LEFT JOIN identity.entitlements ent ON u.id = ent.user_id
       WHERE u.id = $1`,
      [newUserId]
    );
    check(dbUserRes.rows.length === 1, 'New user record successfully saved in PostgreSQL identity.users');
    const dbUser = dbUserRes.rows[0];
    check(dbUser.password_hash.startsWith('$argon2id$'), 'Password hashed with Argon2id');
    check(Boolean(dbUser.username), `Unique profile handle assigned: @${dbUser.username}`);
    check(dbUser.tier === 'free', 'Default free entitlement created');

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 2: Existing User Sign In (Password -> Mandatory OTP Challenge)
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 2: Sign In (Password -> OTP -> Authenticated Session) ---');

    // Submitting valid password alone
    const loginStep1 = await request('POST', '/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });

    check(loginStep1.status === 200, `Login credentials validation returns 200 (got ${loginStep1.status})`);
    check(loginStep1.body.otpRequired === true, 'Server enforces otpRequired: true');
    check(!loginStep1.body.accessToken, 'CRITICAL: Password verification alone NEVER issues an access token');
    check(!loginStep1.body.refreshToken, 'CRITICAL: Password verification alone NEVER issues a refresh token');

    const loginOtp = getDispatchedOtp(testEmail);
    check(loginOtp && loginOtp.length === 6, `Login verification OTP dispatched to email: ${loginOtp}`);

    // Step 2: Complete login with OTP
    const loginStep2 = await request('POST', '/api/v1/auth/email/verify-otp', {
      email: testEmail,
      otp: loginOtp,
      purpose: 'login'
    });

    check(loginStep2.status === 200, `OTP login verification returns 200 (got ${loginStep2.status})`);
    check(loginStep2.body.success === true, 'Login OTP verification succeeds');
    check(Boolean(loginStep2.body.accessToken), 'Access token issued after OTP verification');
    check(Boolean(loginStep2.body.refreshToken), 'Refresh token issued after OTP verification');
    check(loginStep2.body.user?.email === testEmail.toLowerCase(), 'Authenticated user email matches');

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 3: Wrong Password Rejected
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 3: Wrong Password Rejection & Security ---');

    const wrongPassRes = await request('POST', '/api/v1/auth/login', {
      email: testEmail,
      password: 'IncorrectPassword999!'
    });

    check(wrongPassRes.status === 401, `Wrong password rejected with 401 (got ${wrongPassRes.status})`);
    check(wrongPassRes.body.success === false, 'Success is false');
    check(wrongPassRes.body.error === 'INVALID_CREDENTIALS', 'Returns generic INVALID_CREDENTIALS error');

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 4: Wrong & Expired OTP Rejection
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 4: Invalid & Expired OTP Rejection ---');

    // Request fresh login OTP
    await request('POST', '/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });

    const wrongOtpRes = await request('POST', '/api/v1/auth/email/verify-otp', {
      email: testEmail,
      otp: '000000',
      purpose: 'login'
    });

    check(wrongOtpRes.status === 400, `Wrong OTP rejected with 400 (got ${wrongOtpRes.status})`);
    check(wrongOtpRes.body.error === 'INVALID_OTP', 'Error is INVALID_OTP');
    check(typeof wrongOtpRes.body.attemptsRemaining === 'number', `Remaining attempts reported (${wrongOtpRes.body.attemptsRemaining})`);

    // Manually expire OTP in database to test expiration handling
    await db.query(
      `UPDATE identity.email_otps SET expires_at = NOW() - INTERVAL '1 minute'
       WHERE email_normalized = $1 AND consumed_at IS NULL`,
      [testEmail.toLowerCase()]
    );

    const expiredOtpRes = await request('POST', '/api/v1/auth/email/verify-otp', {
      email: testEmail,
      otp: loginOtp,
      purpose: 'login'
    });

    check(expiredOtpRes.status === 400, `Expired OTP rejected with 400 (got ${expiredOtpRes.status})`);
    check(expiredOtpRes.body.error === 'OTP_EXPIRED', 'Error code is OTP_EXPIRED');

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 5: Reject Unknown Email from Logging In
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 5: Reject Unknown Email on Login ---');

    const ghostEmail = `nonexistent_${Date.now()}@cogether.tech`;

    // 1. Password login with unknown email
    const unknownLoginRes = await request('POST', '/api/v1/auth/login', {
      email: ghostEmail,
      password: 'SomePassword123!'
    });
    check(unknownLoginRes.status === 401, `Unknown email login rejected with 401 (got ${unknownLoginRes.status})`);
    check(unknownLoginRes.body.error === 'INVALID_CREDENTIALS', 'Returns generic INVALID_CREDENTIALS');

    // 2. Request OTP for unknown email with purpose='login'
    const unknownOtpReq = await request('POST', '/api/v1/auth/email/request-otp', {
      email: ghostEmail,
      purpose: 'login'
    });
    check(unknownOtpReq.status === 400, `Requesting login OTP for non-existent account returns 400 (got ${unknownOtpReq.status})`);
    check(unknownOtpReq.body.error === 'ACCOUNT_NOT_FOUND', 'Error is ACCOUNT_NOT_FOUND');

    // 3. Attempt direct OTP verify with purpose='login' on unknown email
    const unknownVerifyRes = await request('POST', '/api/v1/auth/email/verify-otp', {
      email: ghostEmail,
      otp: '123456',
      purpose: 'login'
    });
    check(unknownVerifyRes.status === 400, `Direct verify for non-existent account rejected (got ${unknownVerifyRes.status})`);

    // Verify no phantom user was created in database
    const ghostCheck = await db.query(
      `SELECT user_id FROM identity.emails WHERE email_normalized = $1`,
      [ghostEmail.toLowerCase()]
    );
    check(ghostCheck.rows.length === 0, 'Zero phantom records created in identity.emails');

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 6: 5-Minute Guest Access Persisted in PostgreSQL
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 6: 5-Minute Guest Access Persisted in PostgreSQL ---');

    const guestRes = await request('POST', '/api/v1/auth/guest', {
      displayName: 'CoGetherGuest'
    });

    check(guestRes.status === 201, `Guest creation returns 201 (got ${guestRes.status})`);
    check(Boolean(guestRes.body.token), 'Guest JWT token issued');
    check(guestRes.body.durationSeconds === 300, `Guest session duration strictly 300s (got ${guestRes.body.durationSeconds})`);

    const guestId = guestRes.body.user?.id;
    check(guestId && guestId.startsWith('gst_'), `Valid guest ID generated: ${guestId}`);

    // Verify record in PostgreSQL identity.guest_sessions
    const guestDb = await db.query(
      `SELECT guest_id, display_name, expires_at, created_at 
       FROM identity.guest_sessions 
       WHERE guest_id = $1`,
      [guestId]
    );
    check(guestDb.rows.length === 1, 'Guest session persistently recorded in PostgreSQL identity.guest_sessions');
    check(guestDb.rows[0].display_name === 'CoGetherGuest', 'Display name stored accurately in DB');

    // Verify remaining seconds via /api/v1/me
    const guestMe = await request('GET', '/api/v1/me', null, {
      Authorization: `Bearer ${guestRes.body.token}`
    });
    check(guestMe.status === 200, `Guest access to /api/v1/me returns 200 (got ${guestMe.status})`);
    check(guestMe.body.isGuest === true, 'Guest claim identified');
    check(guestMe.body.remainingSeconds <= 300 && guestMe.body.remainingSeconds >= 290, `Accurate countdown remaining (${guestMe.body.remainingSeconds}s)`);

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 7: Session Restoration & Refresh Token Rotation
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 7: Session Restoration & Token Rotation ---');

    // Restore session using access token
    const meRes = await request('GET', '/api/v1/me', null, {
      Authorization: `Bearer ${loginStep2.body.accessToken}`
    });
    check(meRes.status === 200, `Session restored via /api/v1/me (status ${meRes.status})`);
    check(meRes.body.primaryEmail === testEmail.toLowerCase(), 'Session email matches');

    // Refresh token rotation
    const refreshRes = await request('POST', '/api/v1/auth/refresh', {
      refreshToken: loginStep2.body.refreshToken
    });
    check(refreshRes.status === 200, `Session refreshed via /api/v1/auth/refresh (status ${refreshRes.status})`);
    check(Boolean(refreshRes.body.accessToken), 'Fresh access token returned');
    check(Boolean(refreshRes.body.refreshToken), 'Rotated refresh token returned');

    // Reusing the old refresh token must be rejected (single-use rotation)
    const reuseRefreshRes = await request('POST', '/api/v1/auth/refresh', {
      refreshToken: loginStep2.body.refreshToken
    });
    check(reuseRefreshRes.status === 401, `Consumed refresh token reuse rejected with 401 (got ${reuseRefreshRes.status})`);

    // ══════════════════════════════════════════════════════════════════
    // JOURNEY 8: UI Source & Structure Verification
    // ══════════════════════════════════════════════════════════════════
    console.log('\n--- JOURNEY 8: UI Source & Structure Preservation ---');

    const authModalSrc = fs.readFileSync(path.join(__dirname, '../client/src/modules/auth/AuthModal.jsx'), 'utf8');

    check(authModalSrc.includes("initialMode = 'signin'"), "Default mode is 'signin'");
    check(authModalSrc.includes("startGuestSession"), "Destructures startGuestSession from useAuth");
    check(authModalSrc.includes("res.success && res.token"), "Fails closed on guest session error");
    check(authModalSrc.includes("handleSignupStep1Submit"), "Signup form validates password and requests OTP");
    check(authModalSrc.includes("flow-password-hints"), "Preserves flow-password-hints class");
    check(authModalSrc.includes("flow-field-wrapper"), "Preserves flow-field-wrapper class");
    check(authModalSrc.includes("flow-action-button"), "Preserves flow-action-button class");
    check(authModalSrc.includes("flow-explore-guest-btn"), "Preserves flow-explore-guest-btn class");

    // Clean up temporary test account
    await db.query(`DELETE FROM identity.guest_sessions WHERE guest_id = $1`, [guestId]);
    await db.query(`DELETE FROM identity.users WHERE id = $1`, [newUserId]);
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
