/**
 * Central User & Identity Service
 * Authoritative lifecycle orchestrator for passwordless email OTP,
 * Argon2id password authentication, RFC 6238 TOTP Multi-Factor Authentication,
 * Google OAuth with safe account linking, profiles, and sessions.
 */

const { db } = require('../../packages/database');
const { getConfig } = require('../../packages/config');
const { 
  normalizeEmail, generateOtp, hashOtp, verifyOtpHash,
  signToken, verifyToken, createSession, verifyGoogleIdToken,
  validatePassword, hashPassword, verifyPassword, dummyVerifyPassword,
  encryptSecret, decryptSecret, generateMfaEnrollment, verifyMfaToken,
  generateRecoveryCodes, hashRecoveryCode, verifyRecoveryCode,
  revokeAllUserSessions
} = require('../../packages/auth');
const { profileService } = require('./profileService');
const { emailService } = require('./emailService');
const { logger } = require('../../packages/observability');

class UserService {
  async requestEmailOtp(rawEmail, requestedPurpose = 'signup') {
    const email = normalizeEmail(rawEmail);
    if (!email || !email.includes('@')) {
      return { success: false, error: 'INVALID_EMAIL', message: 'Valid email address is required' };
    }

    const config = getConfig();
    const resendInterval = config.auth.otpResendIntervalSeconds || 60;
    const otpTtl = config.auth.otpExpiresInSeconds || 600; // 10 minutes

    // 1. Enforce resend throttling: check if an unconsumed OTP was created recently for this email
    const recentOtp = await db.query(
      `SELECT created_at FROM identity.email_otps 
       WHERE email_normalized = $1 
         AND consumed_at IS NULL
         AND created_at > NOW() - ($2 || ' seconds')::interval 
       ORDER BY created_at DESC LIMIT 1`,
      [email, resendInterval]
    );

    if (recentOtp.rows.length > 0) {
      const elapsedMs = Date.now() - new Date(recentOtp.rows[0].created_at).getTime();
      const retryAfter = Math.max(1, Math.ceil((resendInterval * 1000 - elapsedMs) / 1000));
      return {
        success: false,
        error: 'RESEND_TOO_FREQUENT',
        message: `Please wait ${retryAfter} seconds before requesting a new code`,
        retryAfterSeconds: retryAfter
      };
    }

    // 2. Determine accurate purpose & validate user existence for the purpose
    const existingUser = await db.query(
      `SELECT user_id FROM identity.emails WHERE email_normalized = $1`,
      [email]
    );
    const hasAccount = existingUser.rows.length > 0;

    if (requestedPurpose === 'login' && !hasAccount) {
      return {
        success: false,
        error: 'ACCOUNT_NOT_FOUND',
        message: 'No account found with this email address. Please sign up first.'
      };
    }

    if (requestedPurpose === 'signup' && hasAccount) {
      return {
        success: false,
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists. Please log in.'
      };
    }

    const purpose = requestedPurpose === 'reset_password'
      ? 'reset_password'
      : (hasAccount ? 'login' : 'signup');

    // 3. Generate cryptographic 6-digit OTP and compute HMAC hash
    const rawOtp = generateOtp();
    const otpHash = hashOtp(rawOtp, email, purpose);

    // 4. Invalidate older unconsumed OTPs for this email and purpose to keep table clean
    await db.query(
      `UPDATE identity.email_otps 
       SET consumed_at = NOW() 
       WHERE email_normalized = $1 AND purpose = $2 AND consumed_at IS NULL`,
      [email, purpose]
    ).catch(() => {});

    // 5. Store hashed OTP in PostgreSQL
    await db.query(
      `INSERT INTO identity.email_otps 
       (email_normalized, otp_hash, purpose, expires_at, attempt_count)
       VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::interval, 0)`,
      [email, otpHash, purpose, otpTtl]
    );

    // 6. Deliver through email provider
    const sendResult = await emailService.sendOtpEmail({ to: email, otp: rawOtp, purpose });
    if (!sendResult || !sendResult.success) {
      // Clean up the un-sent OTP so no orphan/phantom passcode remains in database
      await db.query(
        `DELETE FROM identity.email_otps WHERE email_normalized = $1 AND otp_hash = $2`,
        [email, otpHash]
      ).catch(() => {});

      return {
        success: false,
        error: sendResult?.error || 'EMAIL_DELIVERY_FAILED',
        message: sendResult?.message || 'Failed to dispatch verification passcode email.'
      };
    }

    return {
      success: true,
      email,
      purpose,
      expiresInSeconds: otpTtl,
      message: `Passcode sent to ${email}`
    };
  }

  async verifyEmailOtp(rawEmail, rawOtp, userDetails = {}, metadata = {}) {
    const email = normalizeEmail(rawEmail);
    if (!email || !rawOtp) {
      return { success: false, error: 'EMAIL_AND_OTP_REQUIRED', message: 'Email and verification code are required' };
    }

    const config = getConfig();
    const maxAttempts = config.auth.otpMaxAttempts || 5;

    // Concurrency-safe atomic transaction with row-level locking (FOR UPDATE)
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch latest unconsumed OTP for this email with row lock to prevent race conditions
      const targetPurpose = userDetails.purpose || null;
      let query = `SELECT id, otp_hash, purpose, expires_at, attempt_count, created_at 
                   FROM identity.email_otps 
                   WHERE email_normalized = $1 AND consumed_at IS NULL`;
      const queryParams = [email];
      if (targetPurpose) {
        query += ` AND purpose = $2`;
        queryParams.push(targetPurpose);
      }
      query += ` ORDER BY created_at DESC LIMIT 1 FOR UPDATE`;
      const otpLookup = await client.query(query, queryParams);

      if (otpLookup.rows.length === 0) {
        await client.query('COMMIT');
        return { 
          success: false, 
          error: 'NO_ACTIVE_OTP_FOUND', 
          message: 'No active verification code found for this email. Please request a new code.' 
        };
      }

      const otpRow = otpLookup.rows[0];

      // Check expiration
      if (new Date(otpRow.expires_at) <= new Date()) {
        await client.query('COMMIT');
        return { 
          success: false, 
          error: 'OTP_EXPIRED', 
          message: 'Verification code has expired. Please request a new code.' 
        };
      }

      // Check brute-force attempts
      if (otpRow.attempt_count >= maxAttempts) {
        await client.query('COMMIT');
        return { 
          success: false, 
          error: 'MAX_ATTEMPTS_EXCEEDED', 
          message: 'Maximum verification attempts exceeded. Please request a new passcode.' 
        };
      }

      // Timing-safe comparison bound to email and purpose
      const isValid = verifyOtpHash(rawOtp, otpRow.otp_hash, email, otpRow.purpose);
      if (!isValid) {
        const newAttempts = otpRow.attempt_count + 1;
        await client.query(
          `UPDATE identity.email_otps SET attempt_count = $1 WHERE id = $2`,
          [newAttempts, otpRow.id]
        );
        await client.query('COMMIT');

        const remaining = Math.max(0, maxAttempts - newAttempts);
        return {
          success: false,
          error: 'INVALID_OTP',
          message: remaining > 0 
            ? `Invalid passcode. ${remaining} attempt(s) remaining.` 
            : 'Invalid passcode. Maximum attempts exceeded. Request a new code.',
          attemptsRemaining: remaining
        };
      }

      // 2. Consume OTP atomically and invalidate any remaining active OTPs for this email
      await client.query(
        `UPDATE identity.email_otps SET consumed_at = NOW() WHERE id = $1`,
        [otpRow.id]
      );
      await client.query(
        `UPDATE identity.email_otps SET consumed_at = NOW() 
         WHERE email_normalized = $1 AND consumed_at IS NULL AND id != $2`,
        [email, otpRow.id]
      );

      // Handle optional password for signup/set password
      let passwordHash = null;
      if (userDetails.password) {
        const validation = validatePassword(userDetails.password);
        if (!validation.valid) {
          await client.query('ROLLBACK');
          return { success: false, error: validation.error, message: validation.message };
        }
        passwordHash = await hashPassword(userDetails.password);
      }

      // 3. Resolve user identity
      const emailLookup = await client.query(
        `SELECT user_id FROM identity.emails WHERE email_normalized = $1`,
        [email]
      );

      // Enforce: login must only authenticate existing accounts, never auto-create
      if ((otpRow.purpose === 'login' || targetPurpose === 'login') && emailLookup.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'No account found with this email address. Please sign up.'
        };
      }

      let userId;
      let isNewUser = false;

      if (emailLookup.rows.length > 0) {
        userId = emailLookup.rows[0].user_id;

        // If a password was provided, update password_hash as well
        if (passwordHash) {
          await client.query(
            `UPDATE identity.users 
             SET password_hash = $1, failed_login_attempts = 0, lockout_until = NULL,
                 last_login_at = NOW(), updated_at = NOW() 
             WHERE id = $2`,
            [passwordHash, userId]
          );
        } else {
          await client.query(
            `UPDATE identity.users 
             SET failed_login_attempts = 0, lockout_until = NULL,
                 last_login_at = NOW(), updated_at = NOW() 
             WHERE id = $1`,
            [userId]
          );
        }
      } else {
        isNewUser = true;

        // Create new user with optional Argon2id password hash
        const displayName = userDetails.displayName || email.split('@')[0];
        const userRes = await client.query(
          `INSERT INTO identity.users 
           (status, display_name, email, password_hash, last_login_at, created_at, updated_at)
           VALUES ('active', $1, $2, $3, NOW(), NOW(), NOW())
           RETURNING id`,
          [displayName, email, passwordHash]
        );
        userId = userRes.rows[0].id;

        // Record primary email
        await client.query(
          `INSERT INTO identity.emails (user_id, email_normalized, is_primary, verified_at)
           VALUES ($1, $2, true, NOW())`,
          [userId, email]
        );

        // Record identity
        await client.query(
          `INSERT INTO identity.identities (user_id, provider, provider_subject, provider_email)
           VALUES ($1, 'email', $2, $2)`,
          [userId, email]
        );

        // Resolve unique username
        let chosenUsername;
        if (userDetails.username) {
          const valid = profileService.validateUsername(userDetails.username);
          if (!valid.valid) {
            await client.query('ROLLBACK');
            return { success: false, error: 'INVALID_USERNAME', message: valid.error };
          }
          const available = await profileService.isUsernameAvailable(valid.normalized, null, client);
          if (!available) {
            await client.query('ROLLBACK');
            return { success: false, error: 'USERNAME_ALREADY_TAKEN', message: 'That username is already taken. Please choose another.' };
          }
          chosenUsername = valid.cleanUsername;
        } else {
          chosenUsername = await profileService.generateUniqueUsername(email.split('@')[0], client);
        }

        // Create Profile
        await profileService.createProfile(
          userId,
          {
            username: chosenUsername,
            displayName: userDetails.displayName || [userDetails.firstName, userDetails.lastName].filter(Boolean).join(' ').trim() || chosenUsername,
            firstName: userDetails.firstName || null,
            lastName: userDetails.lastName || null,
            avatarUrl: userDetails.avatarUrl || null,
            avatarConfig: userDetails.avatarConfig || null,
            bio: userDetails.bio || null
          },
          client
        );

        // Create Preferences
        await profileService.createPreferences(
          userId,
          {
            primaryInterest: userDetails.primaryInterest || 'all',
            interests: userDetails.interests || [],
            timezone: userDetails.timezone || 'UTC',
            language: userDetails.language || 'en'
          },
          client
        );

        // Create default entitlement
        await client.query(
          `INSERT INTO identity.entitlements (user_id, tier, status)
           VALUES ($1, 'free', 'active')`,
          [userId]
        );
      }

      await client.query('COMMIT');

      // 4. Issue persistent session & access JWT
      const session = await createSession(userId, metadata);
      const profile = await profileService.getProfileByUserId(userId);
      const preferences = await profileService.getPreferences(userId);

      const accessToken = signToken({
        sub: userId,
        email,
        username: profile?.username || 'user',
        displayName: profile?.display_name || profile?.username || 'User',
        tier: 'free'
      });

      return {
        success: true,
        isNewUser,
        user: { id: userId, email, emailVerified: true },
        profile,
        preferences,
        accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt
      };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Error during OTP verification transaction', { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Secure Email & Argon2id Password Authentication
   * Features:
   * - Constant-time dummy verification against timing user enumeration
   * - Generic error responses that never disclose account existence
   * - Progressive lockout (1 min after 5 fails, 15 min after 10 fails)
   * - Seamless interception for RFC 6238 TOTP Multi-Factor Authentication
   */
  /**
   * Direct Registration with Email, Argon2id Password, Handle, and Profile Setup
   */
  async registerWithPassword({
    email: rawEmail,
    password,
    username,
    displayName,
    firstName,
    lastName,
    avatarUrl,
    avatarConfig,
    preferences,
    metadata = {}
  }) {
    if (!rawEmail || typeof rawEmail !== 'string') {
      return { success: false, error: 'EMAIL_REQUIRED', message: 'Email address is required.' };
    }

    const email = normalizeEmail(rawEmail);
    if (!email || !email.includes('@') || email.length < 5) {
      return { success: false, error: 'INVALID_EMAIL', message: 'Please provide a valid email address.' };
    }

    // Validate password
    const passValidation = validatePassword(password);
    if (!passValidation.valid) {
      return { success: false, error: passValidation.error, message: passValidation.message };
    }

    // Check if email already registered
    const existingEmail = await db.query(
      'SELECT user_id FROM identity.emails WHERE email_normalized = $1 LIMIT 1',
      [email]
    );
    if (existingEmail.rows.length > 0) {
      return {
        success: false,
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists. Please log in.'
      };
    }

    // Validate username if provided, or generate one
    let chosenUsername;
    if (username) {
      const valid = profileService.validateUsername(username);
      if (!valid.valid) {
        return { success: false, error: valid.error, message: valid.message || 'Invalid username handle.' };
      }
      const available = await profileService.isUsernameAvailable(valid.normalized);
      if (!available) {
        return {
          success: false,
          error: 'USERNAME_ALREADY_TAKEN',
          message: 'That username is already taken. Please choose another handle.'
        };
      }
      chosenUsername = valid.cleanUsername;
    } else {
      const baseName = (firstName || email.split('@')[0] || 'member').toLowerCase().replace(/[^a-z0-9_]/g, '');
      chosenUsername = await profileService.generateUniqueUsername(baseName || 'member');
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // Compute display name
    const computedDisplayName = displayName || [firstName, lastName].filter(Boolean).join(' ').trim() || chosenUsername;

    // Database transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Create User
      const userRes = await client.query(
        `INSERT INTO identity.users 
         (status, display_name, email, password_hash, last_login_at, created_at, updated_at)
         VALUES ('active', $1, $2, $3, NOW(), NOW(), NOW())
         RETURNING id, created_at`,
        [computedDisplayName, email, passwordHash]
      );
      const userId = userRes.rows[0].id;

      // 2. Primary Email
      await client.query(
        `INSERT INTO identity.emails (user_id, email_normalized, is_primary, verified_at, created_at)
         VALUES ($1, $2, true, NOW(), NOW())`,
        [userId, email]
      );

      // 3. Identity
      await client.query(
        `INSERT INTO identity.identities (user_id, provider, provider_subject, provider_email, created_at)
         VALUES ($1, 'password', $2, $2, NOW())`,
        [userId, email]
      );

      // 4. Profile
      await profileService.createProfile(
        userId,
        {
          username: chosenUsername,
          displayName: computedDisplayName,
          firstName: firstName || null,
          lastName: lastName || null,
          avatarUrl: avatarUrl || null,
          avatarConfig: avatarConfig || null,
          bio: null
        },
        client
      );

      // 5. Preferences (incorporates eligible guest preferences if passed)
      await profileService.createPreferences(
        userId,
        {
          primaryInterest: preferences?.primaryInterest || 'all',
          interests: preferences?.interests || [],
          timezone: preferences?.timezone || 'UTC',
          language: preferences?.language || 'en'
        },
        client
      );

      // 6. Entitlements
      await client.query(
        `INSERT INTO identity.entitlements (user_id, tier, status, created_at, updated_at)
         VALUES ($1, 'free', 'active', NOW(), NOW())`,
        [userId]
      );

      await client.query('COMMIT');

      // 7. Establish real authenticated session & tokens
      const session = await createSession(userId, metadata);
      const createdProfile = await profileService.getProfileByUserId(userId);
      const createdPreferences = await profileService.getPreferences(userId);

      const accessToken = signToken({
        sub: userId,
        email,
        username: createdProfile?.username || chosenUsername,
        displayName: createdProfile?.display_name || computedDisplayName,
        tier: 'free'
      });

      return {
        success: true,
        isNewUser: true,
        user: { id: userId, email, emailVerified: true, status: 'active', createdAt: userRes.rows[0].created_at },
        profile: createdProfile,
        preferences: createdPreferences,
        accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt
      };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Error during password registration transaction', { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  }

  async authenticateWithPassword({ email: rawEmail, password, otp = null, requireOtp = false, metadata = {} }) {
    if (!rawEmail || typeof rawEmail !== 'string') {
      return { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }
    if (!password || typeof password !== 'string' || password.length > 128) {
      await dummyVerifyPassword(password);
      return { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    const email = normalizeEmail(rawEmail);

    // Look up user by normalized email
    const userRes = await db.query(
      `SELECT u.id, u.status, u.password_hash, u.mfa_enabled, u.failed_login_attempts, u.lockout_until,
              p.username, p.display_name, e.tier as entitlement_tier
       FROM identity.emails em
       JOIN identity.users u ON u.id = em.user_id
       LEFT JOIN identity.profiles p ON u.id = p.user_id
       LEFT JOIN identity.entitlements e ON u.id = e.user_id
       WHERE em.email_normalized = $1
       LIMIT 1`,
      [email]
    );

    // User not found: execute dummy Argon2id verification to prevent user enumeration via timing
    if (userRes.rows.length === 0) {
      await dummyVerifyPassword(password);
      return { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    const user = userRes.rows[0];

    // Check account status
    if (user.status === 'suspended' || user.status === 'banned') {
      return { success: false, error: 'ACCOUNT_SUSPENDED', message: 'This account has been deactivated.' };
    }

    // Check progressive lockout
    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      const remainingSeconds = Math.ceil((new Date(user.lockout_until).getTime() - Date.now()) / 1000);
      return {
        success: false,
        error: 'ACCOUNT_TEMPORARILY_LOCKED',
        message: `Too many failed attempts. Please wait ${remainingSeconds} seconds before trying again.`,
        retryAfterSeconds: remainingSeconds
      };
    }

    // If user has not set a password (e.g., signed up via Google or legacy OTP)
    if (!user.password_hash) {
      await dummyVerifyPassword(password);
      return {
        success: false,
        error: 'NO_PASSWORD_SET',
        message: 'No password is set for this account. Please sign in with a one-time passcode or Google.'
      };
    }

    // Verify Argon2id password hash
    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      const nextFailed = (user.failed_login_attempts || 0) + 1;
      let lockoutInterval = null;
      if (nextFailed >= 10) {
        lockoutInterval = '15 minutes';
      } else if (nextFailed >= 5) {
        lockoutInterval = '1 minute';
      }

      if (lockoutInterval) {
        await db.query(
          `UPDATE identity.users 
           SET failed_login_attempts = $1, lockout_until = NOW() + ($2)::interval, updated_at = NOW() 
           WHERE id = $3`,
          [nextFailed, lockoutInterval, user.id]
        );
      } else {
        await db.query(
          `UPDATE identity.users 
           SET failed_login_attempts = $1, updated_at = NOW() 
           WHERE id = $2`,
          [nextFailed, user.id]
        );
      }

      return { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    // Password is valid: clear failed attempts
    await db.query(
      `UPDATE identity.users 
       SET failed_login_attempts = 0, lockout_until = NULL, last_login_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [user.id]
    );

    // If MFA is enabled, issue a short-lived MFA challenge ticket
    if (user.mfa_enabled) {
      const mfaTicket = signToken(
        { sub: user.id, email, type: 'mfa_challenge' },
        { expiresInSeconds: 300 }
      );
      return {
        success: true,
        mfaRequired: true,
        mfaTicket,
        message: 'Two-factor authentication code required.'
      };
    }

    // A password verification alone must NEVER issue an authenticated session!
    // When requireOtp is true and no OTP has been provided, dispatch a verification OTP to registered email
    if (requireOtp && !otp) {
      const otpSend = await this.requestEmailOtp(email, 'login');
      if (!otpSend.success) {
        return otpSend;
      }
      return {
        success: true,
        otpRequired: true,
        email,
        expiresInSeconds: otpSend.expiresInSeconds || 600,
        message: 'Passcode sent to registered email'
      };
    }

    // If OTP was provided, verify it bound to purpose 'login'
    if (otp) {
      return await this.verifyEmailOtp(email, otp, { purpose: 'login' }, metadata);
    }

    // Normal successful login (only when requireOtp is explicitly false)
    const session = await createSession(user.id, metadata);
    const profile = await profileService.getProfileByUserId(user.id);
    const preferences = await profileService.getPreferences(user.id);

    const accessToken = signToken({
      sub: user.id,
      email,
      username: profile?.username || user.username || 'user',
      displayName: profile?.display_name || user.display_name || 'User',
      tier: user.entitlement_tier || 'free'
    });

    return {
      success: true,
      mfaRequired: false,
      user: { id: user.id, email, emailVerified: true },
      profile,
      preferences,
      accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt
    };
  }

  /**
   * Request password reset passcode
   * Strict enumeration-safe behavior: always returns success to the requester.
   */
  async requestPasswordReset(rawEmail) {
    const email = normalizeEmail(rawEmail);
    if (!email || !email.includes('@')) {
      return {
        success: true,
        message: 'If an account exists with that email, a password reset passcode has been sent.'
      };
    }

    const userRes = await db.query(
      `SELECT user_id FROM identity.emails WHERE email_normalized = $1 LIMIT 1`,
      [email]
    );

    if (userRes.rows.length > 0) {
      // Invalidate existing reset OTPs
      await db.query(
        `UPDATE identity.email_otps 
         SET consumed_at = NOW() 
         WHERE email_normalized = $1 AND purpose = 'reset_password' AND consumed_at IS NULL`,
        [email]
      ).catch(() => {});

      const config = getConfig();
      const otpTtl = config.auth.otpExpiresInSeconds || 600;
      const rawOtp = generateOtp();
      const otpHash = hashOtp(rawOtp, email, 'reset_password');

      await db.query(
        `INSERT INTO identity.email_otps 
         (email_normalized, otp_hash, purpose, expires_at, attempt_count)
         VALUES ($1, $2, 'reset_password', NOW() + ($3 || ' seconds')::interval, 0)`,
        [email, otpHash, otpTtl]
      );

      await emailService.sendOtpEmail({ to: email, otp: rawOtp, purpose: 'reset_password' });
    }

    return {
      success: true,
      message: 'If an account exists with that email, a password reset passcode has been sent.'
    };
  }

  /**
   * Reset password with verified OTP
   */
  async resetPasswordWithOtp(rawEmail, rawOtp, newPassword) {
    const email = normalizeEmail(rawEmail);
    if (!email || !rawOtp || !newPassword) {
      return { success: false, error: 'MISSING_FIELDS', message: 'Email, passcode, and new password are required.' };
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, error: validation.error, message: validation.message };
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const otpLookup = await client.query(
        `SELECT id, otp_hash, expires_at, attempt_count 
         FROM identity.email_otps 
         WHERE email_normalized = $1 AND purpose = 'reset_password' AND consumed_at IS NULL
         ORDER BY created_at DESC LIMIT 1
         FOR UPDATE`,
        [email]
      );

      if (otpLookup.rows.length === 0) {
        await client.query('COMMIT');
        return { success: false, error: 'INVALID_RESET_OTP', message: 'Invalid or expired password reset passcode.' };
      }

      const otpRow = otpLookup.rows[0];

      if (new Date(otpRow.expires_at) <= new Date()) {
        await client.query('COMMIT');
        return { success: false, error: 'OTP_EXPIRED', message: 'Password reset passcode has expired.' };
      }

      if (otpRow.attempt_count >= 5) {
        await client.query('COMMIT');
        return { success: false, error: 'MAX_ATTEMPTS_EXCEEDED', message: 'Maximum attempts exceeded. Please request a new passcode.' };
      }

      const isValid = verifyOtpHash(rawOtp, otpRow.otp_hash, email, 'reset_password');
      if (!isValid) {
        await client.query(
          `UPDATE identity.email_otps SET attempt_count = attempt_count + 1 WHERE id = $1`,
          [otpRow.id]
        );
        await client.query('COMMIT');
        return { success: false, error: 'INVALID_RESET_OTP', message: 'Invalid password reset passcode.' };
      }

      // Consume OTP
      await client.query(
        `UPDATE identity.email_otps SET consumed_at = NOW() WHERE id = $1`,
        [otpRow.id]
      );

      // Find user
      const userRes = await client.query(
        `SELECT user_id FROM identity.emails WHERE email_normalized = $1 LIMIT 1`,
        [email]
      );

      if (userRes.rows.length === 0) {
        await client.query('COMMIT');
        return { success: false, error: 'USER_NOT_FOUND', message: 'No account associated with this email.' };
      }

      const userId = userRes.rows[0].user_id;
      const newHash = await hashPassword(newPassword);

      // Update password and reset lockout
      await client.query(
        `UPDATE identity.users 
         SET password_hash = $1, failed_login_attempts = 0, lockout_until = NULL, updated_at = NOW() 
         WHERE id = $2`,
        [newHash, userId]
      );

      await client.query('COMMIT');

      // Revoke all existing sessions for this user to prevent ongoing compromised sessions
      await revokeAllUserSessions(userId);

      return {
        success: true,
        message: 'Password has been successfully reset. Please log in with your new password.'
      };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Error during password reset', { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Set or update password for authenticated user
   */
  async setPassword(userId, newPassword, currentPassword = null) {
    if (!userId) {
      return { success: false, error: 'UNAUTHORIZED', message: 'User must be authenticated' };
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, error: validation.error, message: validation.message };
    }

    const userRes = await db.query(
      `SELECT password_hash FROM identity.users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return { success: false, error: 'USER_NOT_FOUND', message: 'User not found' };
    }

    const currentHash = userRes.rows[0].password_hash;
    if (currentHash) {
      if (!currentPassword) {
        return { success: false, error: 'CURRENT_PASSWORD_REQUIRED', message: 'Current password is required.' };
      }
      const ok = await verifyPassword(currentPassword, currentHash);
      if (!ok) {
        return { success: false, error: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect.' };
      }
    }

    const newHash = await hashPassword(newPassword);
    await db.query(
      `UPDATE identity.users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newHash, userId]
    );

    return { success: true, message: 'Password updated successfully.' };
  }

  /**
   * Get MFA Status
   */
  async getMfaStatus(userId) {
    if (!userId) return { enabled: false };
    const res = await db.query(
      `SELECT mfa_enabled FROM identity.users WHERE id = $1`,
      [userId]
    );
    return { enabled: Boolean(res.rows[0]?.mfa_enabled) };
  }

  /**
   * Start MFA Enrollment
   * Returns secret, QR code data URL, and 8 single-use recovery codes
   */
  async enrollMfa(userId) {
    if (!userId) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    const emailRes = await db.query(
      `SELECT email_normalized FROM identity.emails WHERE user_id = $1 AND is_primary = true LIMIT 1`,
      [userId]
    );
    const email = emailRes.rows[0]?.email_normalized || 'user@cogether.tech';

    const enrollment = await generateMfaEnrollment(email);

    // Save pending encrypted secret
    await db.query(
      `INSERT INTO identity.user_mfa 
       (user_id, encrypted_secret, iv, auth_tag, confirmed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NULL, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE 
       SET encrypted_secret = $2, iv = $3, auth_tag = $4, confirmed_at = NULL, updated_at = NOW()`,
      [userId, enrollment.encryptedSecret, enrollment.iv, enrollment.authTag]
    );

    // Store unconsumed recovery codes (hashed with HMAC-SHA256)
    await db.query(`DELETE FROM identity.user_mfa_recovery_codes WHERE user_id = $1`, [userId]);
    for (const code of enrollment.recoveryCodes) {
      const hash = hashRecoveryCode(code);
      await db.query(
        `INSERT INTO identity.user_mfa_recovery_codes (user_id, code_hash, created_at)
         VALUES ($1, $2, NOW())`,
        [userId, hash]
      );
    }

    return {
      success: true,
      secret: enrollment.secret,
      qrCodeUrl: enrollment.qrCodeUrl,
      recoveryCodes: enrollment.recoveryCodes
    };
  }

  /**
   * Confirm MFA Enrollment
   */
  async confirmMfa(userId, code) {
    if (!userId || !code) {
      return { success: false, error: 'CODE_REQUIRED', message: 'Verification code is required.' };
    }

    const mfaRes = await db.query(
      `SELECT encrypted_secret, iv, auth_tag, last_used_timestep 
       FROM identity.user_mfa WHERE user_id = $1`,
      [userId]
    );

    if (mfaRes.rows.length === 0) {
      return { success: false, error: 'MFA_NOT_INITIALIZED', message: 'MFA enrollment has not been initialized.' };
    }

    const row = mfaRes.rows[0];
    const secret = decryptSecret(row.encrypted_secret, row.iv, row.auth_tag);
    const verifyRes = verifyMfaToken({
      token: code,
      secret,
      lastUsedTimeStep: row.last_used_timestep || 0
    });

    if (!verifyRes.valid) {
      return { success: false, error: verifyRes.error, message: verifyRes.message };
    }

    await db.query(
      `UPDATE identity.user_mfa 
       SET confirmed_at = NOW(), last_used_timestep = $1, updated_at = NOW() 
       WHERE user_id = $2`,
      [verifyRes.timeStep, userId]
    );

    await db.query(
      `UPDATE identity.users SET mfa_enabled = true, updated_at = NOW() WHERE id = $1`,
      [userId]
    );

    return { success: true, message: 'Two-factor authentication successfully enabled.' };
  }

  /**
   * Verify MFA Login Challenge with TOTP code or Single-Use Recovery Code
   */
  async verifyMfaLogin(mfaTicket, { code, recoveryCode, metadata = {} }) {
    if (!mfaTicket) {
      return { success: false, error: 'MFA_TICKET_REQUIRED', message: 'MFA ticket is required.' };
    }

    const ticketVerification = verifyToken(mfaTicket);
    if (!ticketVerification.valid || ticketVerification.claims?.type !== 'mfa_challenge') {
      return { success: false, error: 'INVALID_MFA_TICKET', message: 'MFA session has expired or is invalid. Please sign in again.' };
    }

    const userId = ticketVerification.claims.sub;
    const email = ticketVerification.claims.email;

    if (code) {
      const mfaRes = await db.query(
        `SELECT encrypted_secret, iv, auth_tag, last_used_timestep 
         FROM identity.user_mfa WHERE user_id = $1`,
        [userId]
      );

      if (mfaRes.rows.length === 0) {
        return { success: false, error: 'MFA_NOT_CONFIGURED', message: 'MFA is not configured for this user.' };
      }

      const row = mfaRes.rows[0];
      const secret = decryptSecret(row.encrypted_secret, row.iv, row.auth_tag);
      const verifyRes = verifyMfaToken({
        token: code,
        secret,
        lastUsedTimeStep: row.last_used_timestep || 0
      });

      if (!verifyRes.valid) {
        return { success: false, error: verifyRes.error, message: verifyRes.message };
      }

      // Update timeStep for replay protection
      await db.query(
        `UPDATE identity.user_mfa SET last_used_timestep = $1, updated_at = NOW() WHERE user_id = $2`,
        [verifyRes.timeStep, userId]
      );
    } else if (recoveryCode) {
      // Find matching unconsumed recovery code
      const recRes = await db.query(
        `SELECT id, code_hash FROM identity.user_mfa_recovery_codes 
         WHERE user_id = $1 AND consumed_at IS NULL`,
        [userId]
      );

      let matchedId = null;
      for (const row of recRes.rows) {
        if (verifyRecoveryCode(recoveryCode, row.code_hash)) {
          matchedId = row.id;
          break;
        }
      }

      if (!matchedId) {
        return { success: false, error: 'INVALID_RECOVERY_CODE', message: 'Invalid or already used recovery code.' };
      }

      // Mark recovery code consumed
      await db.query(
        `UPDATE identity.user_mfa_recovery_codes SET consumed_at = NOW() WHERE id = $1`,
        [matchedId]
      );
    } else {
      return { success: false, error: 'MFA_CREDENTIAL_REQUIRED', message: 'Passcode or recovery code is required.' };
    }

    // Authentication complete: create session & access token
    const session = await createSession(userId, metadata);
    const profile = await profileService.getProfileByUserId(userId);
    const preferences = await profileService.getPreferences(userId);

    const accessToken = signToken({
      sub: userId,
      email,
      username: profile?.username || 'user',
      displayName: profile?.display_name || profile?.username || 'User',
      tier: 'free'
    });

    return {
      success: true,
      mfaRequired: false,
      user: { id: userId, email, emailVerified: true },
      profile,
      preferences,
      accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt
    };
  }

  /**
   * Disable MFA
   */
  async disableMfa(userId, passwordOrCode) {
    if (!userId || !passwordOrCode) {
      return { success: false, error: 'VERIFICATION_REQUIRED', message: 'Password or verification code is required to disable MFA.' };
    }

    const userRes = await db.query(
      `SELECT password_hash, mfa_enabled FROM identity.users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return { success: false, error: 'USER_NOT_FOUND' };
    }

    const user = userRes.rows[0];
    if (!user.mfa_enabled) {
      return { success: true, message: 'MFA is already disabled.' };
    }

    let authenticated = false;
    if (user.password_hash) {
      authenticated = await verifyPassword(passwordOrCode, user.password_hash);
    }

    if (!authenticated) {
      // Check if candidate is valid TOTP code
      const mfaRes = await db.query(
        `SELECT encrypted_secret, iv, auth_tag, last_used_timestep 
         FROM identity.user_mfa WHERE user_id = $1`,
        [userId]
      );
      if (mfaRes.rows.length > 0) {
        const row = mfaRes.rows[0];
        const secret = decryptSecret(row.encrypted_secret, row.iv, row.auth_tag);
        const res = verifyMfaToken({ token: passwordOrCode, secret, lastUsedTimeStep: row.last_used_timestep || 0 });
        if (res.valid) {
          authenticated = true;
        }
      }
    }

    if (!authenticated) {
      return { success: false, error: 'INVALID_VERIFICATION', message: 'Invalid password or verification code.' };
    }

    await db.query(`UPDATE identity.users SET mfa_enabled = false, updated_at = NOW() WHERE id = $1`, [userId]);
    await db.query(`DELETE FROM identity.user_mfa WHERE user_id = $1`, [userId]);
    await db.query(`DELETE FROM identity.user_mfa_recovery_codes WHERE user_id = $1`, [userId]);

    return { success: true, message: 'Two-factor authentication disabled successfully.' };
  }

  async authenticateGoogle(idToken, metadata = {}) {
    const verified = await verifyGoogleIdToken(idToken);
    if (!verified.valid) {
      return { success: false, error: 'INVALID_GOOGLE_TOKEN', details: verified.error };
    }

    const { sub: googleSub, email: googleEmail, email_verified, name, picture } = verified.claims;
    const normalizedEmail = normalizeEmail(googleEmail);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      let userId = null;
      let isNewUser = false;

      // 1. Check if Google identity already linked
      const idLookup = await client.query(
        `SELECT user_id FROM identity.identities 
         WHERE provider = 'google' AND provider_subject = $1`,
        [googleSub]
      );

      if (idLookup.rows.length > 0) {
        userId = idLookup.rows[0].user_id;
        await client.query(
          `UPDATE identity.users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [userId]
        );
      } else {
        // 2. Safe Account Linking: Check if verified email exists
        const emailLookup = await client.query(
          `SELECT user_id FROM identity.emails 
           WHERE email_normalized = $1 AND verified_at IS NOT NULL`,
          [normalizedEmail]
        );

        if (emailLookup.rows.length > 0) {
          // Link Google identity to existing user account (prevent duplicate user creation)
          userId = emailLookup.rows[0].user_id;
          await client.query(
            `INSERT INTO identity.identities 
             (user_id, provider, provider_subject, provider_email)
             VALUES ($1, 'google', $2, $3)
             ON CONFLICT (provider, provider_subject) DO NOTHING`,
            [userId, googleSub, normalizedEmail]
          );

          await client.query(
            `UPDATE identity.users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [userId]
          );
        } else {
          // 3. New user registration via Google
          isNewUser = true;
          const userDisplayName = name || normalizedEmail.split('@')[0];
          const userRes = await client.query(
            `INSERT INTO identity.users (status, display_name, email, last_login_at, created_at, updated_at)
             VALUES ('active', $1, $2, NOW(), NOW(), NOW())
             RETURNING id`,
            [userDisplayName, normalizedEmail]
          );
          userId = userRes.rows[0].id;

          await client.query(
            `INSERT INTO identity.emails (user_id, email_normalized, is_primary, verified_at)
             VALUES ($1, $2, true, NOW())`,
            [userId, normalizedEmail]
          );

          await client.query(
            `INSERT INTO identity.identities (user_id, provider, provider_subject, provider_email)
             VALUES ($1, 'google', $2, $3)`,
            [userId, googleSub, normalizedEmail]
          );

          const candidateUsername = await profileService.generateUniqueUsername(
            name || normalizedEmail.split('@')[0],
            client
          );

          await profileService.createProfile(
            userId,
            {
              username: candidateUsername,
              displayName: name || candidateUsername,
              avatarUrl: picture || null
            },
            client
          );

          await profileService.createPreferences(userId, {}, client);

          await client.query(
            `INSERT INTO identity.entitlements (user_id, tier, status)
             VALUES ($1, 'free', 'active')`,
            [userId]
          );
        }
      }

      await client.query('COMMIT');

      // Issue persistent session & access JWT
      const session = await createSession(userId, metadata);
      const profile = await profileService.getProfileByUserId(userId);
      const preferences = await profileService.getPreferences(userId);

      const accessToken = signToken({
        sub: userId,
        email: normalizedEmail,
        username: profile?.username || 'user',
        displayName: profile?.display_name || profile?.username || 'User',
        tier: 'free'
      });

      return {
        success: true,
        isNewUser,
        user: { id: userId, email: normalizedEmail },
        profile,
        preferences,
        accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt
      };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Error during Google authentication transaction', { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  }

  async getMeContext(userId) {
    if (!userId) return null;

    const userRes = await db.query(
      `SELECT u.id, u.status, u.created_at, u.last_login_at, u.mfa_enabled,
              p.username, p.display_name, p.first_name, p.last_name, p.avatar_url, p.avatar_config, p.bio,
              pref.primary_interest, pref.interests, pref.timezone, pref.language,
              e.tier as entitlement_tier
       FROM identity.users u
       LEFT JOIN identity.profiles p ON u.id = p.user_id
       LEFT JOIN identity.preferences pref ON u.id = pref.user_id
       LEFT JOIN identity.entitlements e ON u.id = e.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) return null;

    const row = userRes.rows[0];

    const emailsRes = await db.query(
      `SELECT email_normalized, is_primary, verified_at 
       FROM identity.emails 
       WHERE user_id = $1 ORDER BY is_primary DESC`,
      [userId]
    );

    const primaryEmailRow = emailsRes.rows[0] || null;

    return {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      mfaEnabled: Boolean(row.mfa_enabled),
      primaryEmail: primaryEmailRow?.email_normalized || null,
      emailVerified: Boolean(primaryEmailRow?.verified_at),
      emailVerifiedAt: primaryEmailRow?.verified_at || null,
      emails: emailsRes.rows,
      profile: {
        username: row.username,
        displayName: row.display_name,
        display_name: row.display_name,
        firstName: row.first_name || null,
        first_name: row.first_name || null,
        lastName: row.last_name || null,
        last_name: row.last_name || null,
        avatarUrl: row.avatar_url,
        avatar_url: row.avatar_url,
        avatarConfig: row.avatar_config || null,
        avatar_config: row.avatar_config || null,
        bio: row.bio
      },
      preferences: {
        primaryInterest: row.primary_interest,
        interests: row.interests || [],
        timezone: row.timezone,
        language: row.language
      },
      entitlement: {
        tier: row.entitlement_tier || 'free'
      }
    };
  }
}

const userService = new UserService();

module.exports = {
  userService,
  UserService
};
