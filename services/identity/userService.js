/**
 * Central User & Identity Service
 * Authoritative lifecycle orchestrator for passwordless email OTP,
 * Google OAuth with safe account linking, profiles, and sessions.
 */

const { db } = require('../../packages/database');
const { getConfig } = require('../../packages/config');
const { 
  normalizeEmail, generateOtp, hashOtp, verifyOtpHash,
  signToken, createSession, verifyGoogleIdToken 
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

    // 1. Enforce resend throttling: check if an OTP was created recently for this email
    const recentOtp = await db.query(
      `SELECT created_at FROM identity.email_otps 
       WHERE email_normalized = $1 
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

    // 2. Check if user already exists to set accurate purpose
    const existingUser = await db.query(
      `SELECT user_id FROM identity.emails WHERE email_normalized = $1`,
      [email]
    );
    const purpose = existingUser.rows.length > 0 ? 'login' : requestedPurpose;

    // 3. Generate cryptographic 6-digit OTP and compute salt hash
    const rawOtp = generateOtp();
    const otpHash = hashOtp(rawOtp);

    // 4. Store hashed OTP in PostgreSQL
    await db.query(
      `INSERT INTO identity.email_otps 
       (email_normalized, otp_hash, purpose, expires_at, attempt_count)
       VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::interval, 0)`,
      [email, otpHash, purpose, otpTtl]
    );

    // 5. Deliver through email provider
    await emailService.sendOtpEmail({ to: email, otp: rawOtp, purpose });

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
      return { success: false, error: 'EMAIL_AND_OTP_REQUIRED' };
    }

    const config = getConfig();
    const maxAttempts = config.auth.otpMaxAttempts || 5;

    // 1. Fetch the latest active unconsumed OTP for this email
    const otpLookup = await db.query(
      `SELECT id, otp_hash, purpose, expires_at, attempt_count, created_at 
       FROM identity.email_otps 
       WHERE email_normalized = $1 AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (otpLookup.rows.length === 0) {
      return { success: false, error: 'NO_ACTIVE_OTP_FOUND', message: 'No active verification code found for this email. Request a new code.' };
    }

    const otpRow = otpLookup.rows[0];

    // Check expiration
    if (new Date(otpRow.expires_at) <= new Date()) {
      return { success: false, error: 'OTP_EXPIRED', message: 'Verification code has expired. Request a new code.' };
    }

    // Check brute-force attempts
    if (otpRow.attempt_count >= maxAttempts) {
      return { 
        success: false, 
        error: 'MAX_ATTEMPTS_EXCEEDED', 
        message: 'Maximum verification attempts exceeded. Please request a new passcode.' 
      };
    }

    // Timing-safe comparison
    const isValid = verifyOtpHash(rawOtp, otpRow.otp_hash);
    if (!isValid) {
      const newAttempts = otpRow.attempt_count + 1;
      await db.query(
        `UPDATE identity.email_otps SET attempt_count = $1 WHERE id = $2`,
        [newAttempts, otpRow.id]
      );

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

    // 2. Consume OTP and resolve user in a transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Consume OTP atomically
      await client.query(
        `UPDATE identity.email_otps SET consumed_at = NOW() WHERE id = $1`,
        [otpRow.id]
      );

      // Check if user already exists
      const emailLookup = await client.query(
        `SELECT user_id FROM identity.emails WHERE email_normalized = $1`,
        [email]
      );

      let userId;
      let isNewUser = false;

      if (emailLookup.rows.length > 0) {
        userId = emailLookup.rows[0].user_id;
        await client.query(
          `UPDATE identity.users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [userId]
        );
      } else {
        isNewUser = true;

        // Create new user
        const displayName = userDetails.displayName || email.split('@')[0];
        const userRes = await client.query(
          `INSERT INTO identity.users (status, display_name, email, last_login_at, created_at, updated_at)
           VALUES ('active', $1, $2, NOW(), NOW(), NOW())
           RETURNING id`,
          [displayName, email]
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
            displayName: userDetails.displayName || chosenUsername,
            avatarUrl: userDetails.avatarUrl || null,
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

      // 3. Issue persistent session & access JWT
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
        user: { id: userId, email },
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
      `SELECT u.id, u.status, u.created_at, u.last_login_at,
              p.username, p.display_name, p.avatar_url, p.bio,
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

    return {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      primaryEmail: emailsRes.rows[0]?.email_normalized || null,
      emails: emailsRes.rows,
      profile: {
        username: row.username,
        displayName: row.display_name,
        display_name: row.display_name,
        avatarUrl: row.avatar_url,
        avatar_url: row.avatar_url,
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
