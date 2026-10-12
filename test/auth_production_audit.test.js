/**
 * CoGether Authentication Production Audit & Verification Test Suite
 * 
 * Verifies End-to-End Real Authentication:
 * A. Request OTP with valid email succeeds (stores hashed OTP in DB).
 * B. Request OTP throttled if requested again within resend interval (429).
 * C. Request OTP with invalid email fails (400).
 * D. Verify OTP with correct code succeeds, creates user in DB, creates profile, sets session, returns tokens.
 * E. Verify OTP with incorrect code fails, decrements attempts.
 * F. Verify OTP lockout after max attempts exceeded (429).
 * G. Verify expired OTP fails (400 OTP_EXPIRED).
 * H. GET /api/v1/me with valid Bearer token returns full user context.
 * I. GET /api/v1/me with invalid or expired token returns 401.
 * J. POST /api/v1/auth/refresh rotates session and issues new access token.
 * K. POST /api/v1/auth/logout revokes session, subsequent refresh fails.
 * L. Fail-closed email service: when real email delivery fails or unconfigured in prod/staging, request-otp returns 503 and cleans up OTP.
 * M. CORS Origin verification: validates *.vercel.app, cogether.tech with credentials.
 */

const assert = require('assert');
const { db } = require('../packages/database');
const { emailService } = require('../services/identity/emailService');
const { userService } = require('../services/identity/userService');

const SERVER_URL = 'http://localhost:3001';

async function runAuthAuditSuite() {
  console.log('🛡️ Starting CoGether Production Auth Audit Test Suite...\n');
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

  // ── 1. Request OTP & DB Storage ─────────────────────────────────────────
  console.log('── [1/5] Request OTP, DB Hashing, Throttling & Validation ──');

  const testEmail1 = `prod_test_${Date.now()}@example.com`;
  let testOtp1 = null;

  await check('A. Request OTP with valid email succeeds and stores hashed OTP in DB', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail1, purpose: 'signup' })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.email, testEmail1.toLowerCase());

    // Verify DB storage: must be hashed, not plain text
    const rows = await db.query(
      `SELECT otp_hash, attempt_count, expires_at FROM identity.email_otps WHERE email_normalized = $1`,
      [testEmail1.toLowerCase()]
    );
    assert.strictEqual(rows.rows.length, 1);
    assert.strictEqual(rows.rows[0].otp_hash.length, 64, 'SHA-256 hash expected');

    const lastSent = emailService.getLastSentOtpForTest(testEmail1);
    assert.ok(lastSent, 'Expected test delivery hook to hold OTP');
    testOtp1 = lastSent.otp;
    assert.notStrictEqual(rows.rows[0].otp_hash, testOtp1, 'Plaintext OTP must NEVER be stored');
  });

  await check('B. Request OTP throttled if requested again within resend interval (429)', async () => {
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

  await check('C. Request OTP with invalid email fails (400)', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'notanemail' })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'INVALID_EMAIL');
  });

  // ── 2. OTP Verification & User/Profile Creation ─────────────────────────
  console.log('\n── [2/5] OTP Verification, Brute-Force Lockout & Expiration ──');

  const testEmail2 = `brute_test_${Date.now()}@example.com`;
  let testOtp2 = null;

  await check('Setup OTP for brute-force and verification tests', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail2 })
    });
    assert.strictEqual(res.status, 200);
    testOtp2 = emailService.getLastSentOtpForTest(testEmail2).otp;
  });

  await check('E. Verify OTP with incorrect code fails, decrements attempts', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail2, otp: '999999' })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'INVALID_OTP');
    assert.strictEqual(data.attemptsRemaining, 4);
  });

  await check('F. Verify OTP lockout after max attempts exceeded (429)', async () => {
    for (let i = 0; i < 4; i++) {
      await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail2, otp: '111111' })
      });
    }

    // 6th attempt: lockout
    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail2, otp: testOtp2 })
    });

    assert.strictEqual(res.status, 429);
    const data = await res.json();
    assert.strictEqual(data.error, 'MAX_ATTEMPTS_EXCEEDED');
  });

  await check('G. Verify expired OTP fails (400 OTP_EXPIRED)', async () => {
    const expiredEmail = `expired_${Date.now()}@example.com`;
    await fetch(`${SERVER_URL}/api/v1/auth/email/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: expiredEmail })
    });
    const expOtp = emailService.getLastSentOtpForTest(expiredEmail).otp;

    // Manually set expires_at in the past
    await db.query(
      `UPDATE identity.email_otps SET expires_at = NOW() - INTERVAL '1 minute' WHERE email_normalized = $1`,
      [expiredEmail.toLowerCase()]
    );

    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: expiredEmail, otp: expOtp })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'OTP_EXPIRED');
  });

  let authUserTokens = null;
  await check('D. Verify OTP with correct code succeeds, creates user in DB, profile, session, returns tokens', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail1,
        otp: testOtp1,
        displayName: 'Production Member',
        username: 'prodmember_' + Date.now().toString().slice(-4)
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.accessToken, 'Access token required');
    assert.ok(data.refreshToken, 'Refresh token required');
    assert.ok(data.user?.id, 'User ID required');
    assert.strictEqual(data.profile?.displayName, 'Production Member');

    // Verify session stored in PostgreSQL
    const sessRow = await db.query(
      `SELECT id, user_id, revoked_at FROM identity.sessions WHERE user_id = $1`,
      [data.user.id]
    );
    assert.strictEqual(sessRow.rows.length, 1);
    assert.strictEqual(sessRow.rows[0].revoked_at, null);

    authUserTokens = data;
  });

  // ── 3. Session Restore (/api/v1/me), Refresh & Logout ───────────────────
  console.log('\n── [3/5] Session Restore (/api/v1/me), Token Rotation & Revocation ──');

  await check('H. GET /api/v1/me with valid Bearer token returns full user context', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/me`, {
      headers: { Authorization: `Bearer ${authUserTokens.accessToken}` }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.id, authUserTokens.user.id);
    assert.strictEqual(data.primaryEmail, testEmail1.toLowerCase());
    assert.strictEqual(data.profile.displayName, 'Production Member');
    assert.ok(data.preferences, 'Preferences object expected');
    assert.ok(data.entitlement, 'Entitlement expected');
  });

  await check('I. GET /api/v1/me with invalid or expired token returns 401', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/me`, {
      headers: { Authorization: 'Bearer invalid.token.payload' }
    });

    assert.strictEqual(res.status, 401);
  });

  let rotatedTokens = null;
  await check('J. POST /api/v1/auth/refresh rotates session and issues new access token', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: authUserTokens.refreshToken })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.accessToken);
    assert.ok(data.refreshToken);
    assert.notStrictEqual(data.refreshToken, authUserTokens.refreshToken, 'Refresh token must be rotated');

    // Old refresh token must now be revoked in identity.sessions
    const oldRes = await fetch(`${SERVER_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: authUserTokens.refreshToken })
    });
    assert.strictEqual(oldRes.status, 401);
    const oldData = await oldRes.json();
    assert.strictEqual(oldData.error, 'SESSION_ALREADY_REVOKED');

    rotatedTokens = data;
  });

  await check('K. POST /api/v1/auth/logout revokes session, subsequent refresh fails', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rotatedTokens.accessToken}`
      },
      body: JSON.stringify({ refreshToken: rotatedTokens.refreshToken })
    });

    assert.strictEqual(res.status, 200);

    // Subsequent refresh must fail
    const refreshAfterLogout = await fetch(`${SERVER_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rotatedTokens.refreshToken })
    });
    assert.strictEqual(refreshAfterLogout.status, 401);
  });

  // ── 4. Fail-Closed Email Service Invariant ───────────────────────────────
  console.log('\n── [4/5] Fail-Closed Email Service Verification ──');

  await check('L. In production/staging, if email sending fails or is unconfigured, requestEmailOtp returns error and deletes orphan OTP', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const prodFailEmail = `prodfail_${Date.now()}@example.com`;
      const result = await userService.requestEmailOtp(prodFailEmail);

      assert.strictEqual(result.success, false, 'Expected requestEmailOtp to fail closed when email delivery is unconfigured in production');
      assert.strictEqual(result.error, 'EMAIL_SERVICE_NOT_CONFIGURED');

      // Verify NO orphan OTP remains in the database
      const rows = await db.query(
        `SELECT id FROM identity.email_otps WHERE email_normalized = $1`,
        [prodFailEmail.toLowerCase()]
      );
      assert.strictEqual(rows.rows.length, 0, 'Orphan OTP must be cleaned up on delivery failure');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  // ── 5. CORS Origin Configuration ─────────────────────────────────────────
  console.log('\n── [5/5] CORS Dynamic Origin & Cross-Origin Credentials ──');

  await check('M. CORS allows Vercel preview domain with credentials: true', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/session`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://cogether-frontend-preview-123.vercel.app',
        'Access-Control-Request-Method': 'POST'
      }
    });

    assert.strictEqual(res.headers.get('access-control-allow-origin'), 'https://cogether-frontend-preview-123.vercel.app');
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
    assert.notStrictEqual(res.headers.get('access-control-allow-origin'), '*', 'CORS origin must never be wildcard with credentials');
  });

  await check('M2. CORS allows production domain https://cogether.tech with credentials: true', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/session`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://cogether.tech',
        'Access-Control-Request-Method': 'POST'
      }
    });

    assert.strictEqual(res.headers.get('access-control-allow-origin'), 'https://cogether.tech');
    assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
  });

  await check('M3. CORS blocks unauthorized foreign origin', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/session`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://malicious-site.attacker.com',
        'Access-Control-Request-Method': 'POST'
      }
    });

    // Blocked origin should not have access-control-allow-origin
    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert.ok(!allowOrigin || allowOrigin !== 'https://malicious-site.attacker.com');
  });

  console.log(`\n======================================================`);
  console.log(`AUTH AUDIT SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAuthAuditSuite().catch((err) => {
  console.error('Fatal error running Auth Audit Suite:', err);
  process.exit(1);
});
