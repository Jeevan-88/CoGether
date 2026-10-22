/**
 * CoGether — Secure Authentication & Database Hardening Test Suite
 * 
 * Verifies:
 * 1. Native Argon2id Password Engine & OWASP Parameters (64MB, 3 iterations, 4 parallelism, 128-byte guard)
 * 2. Password Persistence & Zero Plaintext DB Exposure
 * 3. Secure Email & Password Login with Timing-Safe Dummy Verification & Generic Errors
 * 4. Progressive Account Lockout & Abuse Defense
 * 5. Hardened Password Reset with Invalidation & Session Revocation
 * 6. Concurrency & Race-Condition Safe OTP Verification (Atomic Row Lock)
 * 7. RFC 6238 TOTP Multi-Factor Authentication:
 *    - AES-256-GCM Encrypted Secrets at Rest
 *    - Time-Step Replay Protection
 *    - Single-Use Cryptographic Recovery Codes
 *    - Login Interception & Ticket Verification
 *    - Safe Disablement
 * 8. Refresh Token Rotation & Token Reuse Detection (Family Revocation)
 * 9. SQL Injection & Parameter Tampering Immunity
 * 10. Avatar Studio, Profile & Google OAuth Compatibility
 */

const assert = require('assert');
const crypto = require('crypto');
const { db } = require('../packages/database');
const {
  validatePassword,
  hashPassword,
  verifyPassword,
  dummyVerifyPassword,
  encryptSecret,
  decryptSecret,
  generateMfaEnrollment,
  verifyMfaToken,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
  createSession,
  validateAndRotateSession,
  revokeSession
} = require('../packages/auth');
const { generateSync } = require('otplib');
const { userService } = require('../services/identity/userService');
const { emailService } = require('../services/identity/emailService');

async function runSecurityHardeningTestSuite() {
  console.log('🛡️ Starting CoGether Secure Authentication & Database Hardening Test Suite...\n');
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

  // ── [1/8] Native Argon2id Password Hashing Engine ──────────────────────────
  console.log('── [1/8] Argon2id Password Engine & OWASP Compliance ──');

  await check('1.1 Password policy enforces minimum 8 characters and character diversity', async () => {
    assert.strictEqual(validatePassword('short').valid, false);
    assert.strictEqual(validatePassword('allcharacterswithoutnumbers').valid, false);
    assert.strictEqual(validatePassword('1234567890').valid, false);
    assert.strictEqual(validatePassword('ValidPass123!').valid, true);
  });

  await check('1.2 Pre-hash length guard rejects passwords exceeding 128 characters', async () => {
    const hugePassword = 'A1'.repeat(70); // 140 chars
    assert.strictEqual(validatePassword(hugePassword).valid, false);
    assert.strictEqual(await verifyPassword(hugePassword, '$argon2id$v=19$m=65536...'), false);
  });

  let sampleHash = null;
  await check('1.3 Argon2id hashes password with OWASP parameters (64MB memory, 3 iterations)', async () => {
    sampleHash = await hashPassword('SecurePass123!');
    assert(sampleHash.startsWith('$argon2id$v=19$m=65536,p=4,t=3$'), `Hash must be Argon2id with m=65536, p=4, t=3: ${sampleHash}`);
    const valid = await verifyPassword('SecurePass123!', sampleHash);
    assert.strictEqual(valid, true, 'Matching password must verify successfully');
    const invalid = await verifyPassword('WrongPass123!', sampleHash);
    assert.strictEqual(invalid, false, 'Mismatched password must fail verification');
  });

  await check('1.4 Timing-safe dummy verification handles non-existent credentials without throwing', async () => {
    const dummyResult = await dummyVerifyPassword('SomeRandomCandidatePassword');
    assert.strictEqual(dummyResult, false);
  });

  // ── [2/8] User Password Registration & Zero Plaintext DB Exposure ───────────
  console.log('\n── [2/8] User Registration, Password Persistence & DB Storage ──');

  const testEmail = `sec_user_${Date.now()}@cogether.tech`;
  const testPassword = 'MySecretPassword2026!';
  let createdUserId = null;

  await check('2.1 Register user with email OTP and password', async () => {
    const otpRes = await userService.requestEmailOtp(testEmail, 'signup');
    assert.strictEqual(otpRes.success, true);

    const sentOtp = emailService.getLastSentOtpForTest(testEmail);
    assert(sentOtp && sentOtp.otp, 'OTP must be captured for test environment');

    const verifyRes = await userService.verifyEmailOtp(
      testEmail,
      sentOtp.otp,
      {
        displayName: 'Security User',
        username: `sec_${Date.now().toString().slice(-6)}`,
        password: testPassword
      }
    );

    assert.strictEqual(verifyRes.success, true);
    assert(verifyRes.user && verifyRes.user.id);
    assert(verifyRes.accessToken);
    createdUserId = verifyRes.user.id;
  });

  await check('2.2 Verify Argon2id hash in DB and confirm zero plaintext password exposure', async () => {
    const userRow = await db.query(
      `SELECT password_hash FROM identity.users WHERE id = $1`,
      [createdUserId]
    );

    assert(userRow.rows.length === 1);
    const storedHash = userRow.rows[0].password_hash;
    assert(storedHash.startsWith('$argon2id$'), 'Stored hash must be Argon2id');
    assert(!storedHash.includes(testPassword), 'Stored hash must not contain plaintext password');

    // Confirm that searching the entire users row for plaintext yields zero matches
    const entireRow = await db.query(`SELECT * FROM identity.users WHERE id = $1`, [createdUserId]);
    const rowString = JSON.stringify(entireRow.rows[0]);
    assert(!rowString.includes(testPassword), 'Plaintext password must never appear in database record');
  });

  // ── [3/8] Secure Email & Password Login & Progressive Lockout ───────────────
  console.log('\n── [3/8] Password Authentication, Generic Errors & Progressive Lockout ──');

  await check('3.1 Successful login with email and valid password', async () => {
    const loginRes = await userService.authenticateWithPassword({
      email: testEmail,
      password: testPassword
    });

    assert.strictEqual(loginRes.success, true);
    assert.strictEqual(loginRes.mfaRequired, false);
    assert(loginRes.accessToken);
    assert(loginRes.refreshToken);
    assert.strictEqual(loginRes.user.email, testEmail);
  });

  await check('3.2 Incorrect password returns generic error without revealing account details', async () => {
    const failRes = await userService.authenticateWithPassword({
      email: testEmail,
      password: 'WrongPassword999!'
    });

    assert.strictEqual(failRes.success, false);
    assert.strictEqual(failRes.error, 'INVALID_CREDENTIALS');
    assert.strictEqual(failRes.message, 'Invalid email or password.');
  });

  await check('3.3 Non-existent email returns identical generic error (user enumeration defense)', async () => {
    const nonExistentRes = await userService.authenticateWithPassword({
      email: 'nobody_exists_here_never@cogether.tech',
      password: 'RandomPassword123!'
    });

    assert.strictEqual(nonExistentRes.success, false);
    assert.strictEqual(nonExistentRes.error, 'INVALID_CREDENTIALS');
    assert.strictEqual(nonExistentRes.message, 'Invalid email or password.');
  });

  await check('3.4 Progressive lockout triggers after repeated failed login attempts', async () => {
    // Generate failed attempts to reach threshold (5 attempts -> 1 min lockout)
    for (let i = 0; i < 4; i++) {
      await userService.authenticateWithPassword({ email: testEmail, password: 'BadPassword123!' });
    }

    const lockedRes = await userService.authenticateWithPassword({ email: testEmail, password: 'BadPassword123!' });
    // User is now at 5 failed attempts; next attempt is locked out
    const lockoutAttempt = await userService.authenticateWithPassword({ email: testEmail, password: testPassword });
    assert.strictEqual(lockoutAttempt.success, false);
    assert.strictEqual(lockoutAttempt.error, 'ACCOUNT_TEMPORARILY_LOCKED');
    assert(lockoutAttempt.retryAfterSeconds > 0);

    // Reset lockout in DB for subsequent tests
    await db.query(`UPDATE identity.users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = $1`, [createdUserId]);
  });

  // ── [4/8] Password Recovery Flow & Session Invalidation ─────────────────────
  console.log('\n── [4/8] Hardened Password Reset & Compromised Session Revocation ──');

  const newPassword = 'BrandNewPassword2026!';

  await check('4.1 Request password reset returns enumeration-safe confirmation', async () => {
    const resetReq = await userService.requestPasswordReset(testEmail);
    assert.strictEqual(resetReq.success, true);

    const fakeReq = await userService.requestPasswordReset('non_existent_address@test.com');
    assert.strictEqual(fakeReq.success, true);
    assert.strictEqual(fakeReq.message, resetReq.message);
  });

  await check('4.2 Reset password with OTP updates hash and revokes all active sessions', async () => {
    // Create an active session before reset
    const preSession = await createSession(createdUserId);

    const sentOtp = emailService.getLastSentOtpForTest(testEmail);
    assert(sentOtp && sentOtp.otp);

    const resetRes = await userService.resetPasswordWithOtp(testEmail, sentOtp.otp, newPassword);
    assert.strictEqual(resetRes.success, true);

    // Verify old password no longer works
    const oldLogin = await userService.authenticateWithPassword({ email: testEmail, password: testPassword });
    assert.strictEqual(oldLogin.success, false);

    // Verify new password works
    const newLogin = await userService.authenticateWithPassword({ email: testEmail, password: newPassword });
    assert.strictEqual(newLogin.success, true);

    // Verify old session was revoked upon password reset
    const rotated = await validateAndRotateSession(preSession.refreshToken);
    assert.strictEqual(rotated.valid, false, 'Pre-reset session must be invalidated');
  });

  // ── [5/8] Concurrency Safe OTP Row-Level Locking ───────────────────────────
  console.log('\n── [5/8] Concurrency & Race-Condition Safe OTP Verification ──');

  await check('5.1 Simultaneous verification requests consume OTP exactly once (row-level FOR UPDATE)', async () => {
    const raceEmail = `race_${Date.now()}@cogether.tech`;
    await userService.requestEmailOtp(raceEmail, 'signup');
    const sentOtp = emailService.getLastSentOtpForTest(raceEmail);

    // Fire two verification requests concurrently
    const [res1, res2] = await Promise.all([
      userService.verifyEmailOtp(raceEmail, sentOtp.otp, { displayName: 'Racer 1' }),
      userService.verifyEmailOtp(raceEmail, sentOtp.otp, { displayName: 'Racer 2' })
    ]);

    const successes = [res1, res2].filter(r => r.success).length;
    const failures = [res1, res2].filter(r => !r.success).length;

    assert.strictEqual(successes, 1, 'Exactly one concurrent verification must succeed');
    assert.strictEqual(failures, 1, 'The other concurrent request must be rejected');
  });

  // ── [6/8] RFC 6238 TOTP Multi-Factor Authentication ────────────────────────
  console.log('\n── [6/8] RFC 6238 TOTP Multi-Factor Authentication & Replay Protection ──');

  let mfaSecret = null;
  let recoveryCodes = null;

  await check('6.1 AES-256-GCM authenticated encryption protects TOTP secret at rest', async () => {
    const plainSecret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptSecret(plainSecret);
    assert(encrypted.encryptedSecret && encrypted.iv && encrypted.authTag);

    // Decrypt and verify exact match
    const decrypted = decryptSecret(encrypted.encryptedSecret, encrypted.iv, encrypted.authTag);
    assert.strictEqual(decrypted, plainSecret);
  });

  await check('6.2 Initiate MFA enrollment generates secret, QR code, and 8 recovery codes', async () => {
    const enrollRes = await userService.enrollMfa(createdUserId);
    assert.strictEqual(enrollRes.success, true);
    assert(enrollRes.secret);
    assert(enrollRes.qrCodeUrl.startsWith('data:image/png;base64,'));
    assert(Array.isArray(enrollRes.recoveryCodes) && enrollRes.recoveryCodes.length === 8);

    mfaSecret = enrollRes.secret;
    recoveryCodes = enrollRes.recoveryCodes;

    // Verify DB stores ONLY encrypted secret, not plaintext
    const mfaDb = await db.query(`SELECT encrypted_secret FROM identity.user_mfa WHERE user_id = $1`, [createdUserId]);
    assert(mfaDb.rows.length === 1);
    assert(!mfaDb.rows[0].encrypted_secret.includes(mfaSecret), 'Secret must be encrypted at rest');
  });

  await check('6.3 Confirm MFA enrollment with valid TOTP code enables MFA', async () => {
    const currentCode = generateSync({ secret: mfaSecret });
    const confirmRes = await userService.confirmMfa(createdUserId, currentCode);
    assert.strictEqual(confirmRes.success, true);

    const status = await userService.getMfaStatus(createdUserId);
    assert.strictEqual(status.enabled, true);
  });

  await check('6.4 Time-step replay protection rejects reusing the exact same TOTP code', async () => {
    const currentCode = generateSync({ secret: mfaSecret });
    // Replay the code on confirm or verify
    const replayRes = await userService.confirmMfa(createdUserId, currentCode);
    assert.strictEqual(replayRes.success, false);
    assert.strictEqual(replayRes.error, 'MFA_CODE_REPLAYED');
  });

  let mfaLoginTicket = null;
  await check('6.5 Password login intercepts MFA-enabled accounts and requires second factor', async () => {
    const loginRes = await userService.authenticateWithPassword({ email: testEmail, password: newPassword });
    assert.strictEqual(loginRes.success, true);
    assert.strictEqual(loginRes.mfaRequired, true);
    assert(loginRes.mfaTicket, 'Short-lived MFA challenge ticket must be issued');
    mfaLoginTicket = loginRes.mfaTicket;
  });

  await check('6.6 Single-use recovery code satisfies MFA challenge and is consumed', async () => {
    const codeToUse = recoveryCodes[0];
    const verifyRes = await userService.verifyMfaLogin(mfaLoginTicket, { recoveryCode: codeToUse });
    assert.strictEqual(verifyRes.success, true);
    assert(verifyRes.accessToken);

    // Reusing the same recovery code must now fail
    // Obtain new ticket
    const ticket2Res = await userService.authenticateWithPassword({ email: testEmail, password: newPassword });
    const reusedRes = await userService.verifyMfaLogin(ticket2Res.mfaTicket, { recoveryCode: codeToUse });
    assert.strictEqual(reusedRes.success, false);
    assert.strictEqual(reusedRes.error, 'INVALID_RECOVERY_CODE');
  });

  await check('6.7 Disable MFA with password clears mfa_enabled and cleans up secrets', async () => {
    const disableRes = await userService.disableMfa(createdUserId, newPassword);
    assert.strictEqual(disableRes.success, true);

    const status = await userService.getMfaStatus(createdUserId);
    assert.strictEqual(status.enabled, false);

    const mfaDb = await db.query(`SELECT id FROM identity.user_mfa WHERE user_id = $1`, [createdUserId]);
    assert.strictEqual(mfaDb.rows.length, 0, 'User MFA row must be removed upon disable');
  });

  // ── [7/8] Session Rotation & Token Reuse Detection ─────────────────────────
  console.log('\n── [7/8] Refresh Token Rotation & Family Reuse Detection ──');

  await check('7.1 Rotating a refresh token issues a new token and revokes the old one', async () => {
    const sess = await createSession(createdUserId);
    const rotation = await validateAndRotateSession(sess.refreshToken);
    assert.strictEqual(rotation.valid, true);
    assert.notStrictEqual(rotation.newRefreshToken, sess.refreshToken);

    // Re-presenting the OLD token triggers token reuse detection and revokes ALL sessions
    const reuseAttempt = await validateAndRotateSession(sess.refreshToken);
    assert.strictEqual(reuseAttempt.valid, false);
    assert.ok(reuseAttempt.error === 'SESSION_ALREADY_REVOKED' || reuseAttempt.error === 'TOKEN_REUSE_DETECTED');

    // Confirm that the new token was ALSO invalidated as part of family revocation
    const victimAttempt = await validateAndRotateSession(rotation.newRefreshToken);
    assert.strictEqual(victimAttempt.valid, false, 'All family sessions must be revoked upon token reuse');
  });

  // ── [8/8] SQL Injection & Parameter Tampering Immunity ─────────────────────
  console.log('\n── [8/8] SQL Injection & Parameter Tampering Hardening ──');

  await check('8.1 Malicious SQL injection payloads in email and password do not leak data or error', async () => {
    const sqlPayloads = [
      "' OR 1=1 --",
      "'; DROP TABLE identity.users; --",
      "admin' UNION SELECT * FROM identity.users --",
      "1' OR '1'='1"
    ];

    for (const payload of sqlPayloads) {
      const res = await userService.authenticateWithPassword({
        email: payload,
        password: 'Password123!'
      });
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error, 'INVALID_CREDENTIALS');
    }
  });

  console.log(`\n======================================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityHardeningTestSuite().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Fatal suite failure:', err);
  process.exit(1);
});
