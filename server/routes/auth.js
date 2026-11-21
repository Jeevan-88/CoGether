/**
 * Production-Standard Authentication Router
 * Implements complete User Registration, Argon2id Login, Refresh Token Rotation,
 * Email Verification Tokens, Password Reset, and Session Management.
 */

const express = require('express');
const crypto = require('crypto');
const { db } = require('../../packages/database');
const { getConfig } = require('../../packages/config');
const { logger } = require('../../packages/observability');
const { redis } = require('../../packages/redis');
const {
  validatePassword,
  hashPassword,
  verifyPassword,
  dummyVerifyPassword
} = require('../../packages/auth/passwords');
const { signToken, verifyToken } = require('../../packages/auth/jwt');
const {
  createSession,
  validateAndRotateSession,
  revokeSession,
  revokeAllUserSessions,
  hashRefreshToken
} = require('../../packages/auth/sessionManager');

const router = express.Router();

// Helper: Cookie Options
function getAuthCookieOptions(maxAgeMs) {
  const cfg = getConfig();
  const isProdLike = process.env.NODE_ENV === 'production' || 
                     process.env.NODE_ENV === 'staging' || 
                     cfg.isProd;
  return {
    httpOnly: true,
    secure: isProdLike,
    sameSite: isProdLike ? 'strict' : 'lax',
    path: '/',
    maxAge: maxAgeMs
  };
}

// Helper: Rate Limiter
async function checkRateLimit(key, limit, windowSec) {
  try {
    const res = await redis.consumeRateLimit(key, limit, windowSec);
    return res.allowed;
  } catch (_e) {
    return true; // fail-open in local offline dev
  }
}

// Helper: Password Policy Validation (Min 8 chars, 1 uppercase, 1 number, 1 special char)
function validateStrongPassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password cannot exceed 128 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

// Middleware: Require Auth (Supports Bearer token and HttpOnly cookie with auto-refresh)
async function requireAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.cogether_access) {
    token = req.cookies.cogether_access;
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.valid) {
      req.user = decoded.claims || decoded;
      return next();
    }
  }

  // Attempt auto-refresh via refresh cookie if access token is expired
  const refreshToken = (req.cookies && req.cookies.cogether_refresh) || req.body?.refreshToken;
  if (refreshToken) {
    const rotation = await validateAndRotateSession(refreshToken, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });

    if (rotation && rotation.valid) {
      const newAccessToken = signToken({
        sub: rotation.userId,
        email: rotation.email,
        role: rotation.role || 'USER'
      }, { expiresInSeconds: 900 });

      res.cookie('cogether_access', newAccessToken, getAuthCookieOptions(15 * 60 * 1000));
      res.cookie('cogether_refresh', rotation.refreshToken, getAuthCookieOptions(7 * 24 * 60 * 60 * 1000));
      req.user = { sub: rotation.userId, email: rotation.email, role: rotation.role || 'USER' };
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: 'UNAUTHORIZED',
    message: 'Authentication required. Please log in.'
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SIGNUP: POST /api/v1/auth/signup
// ─────────────────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const ip = req.ip || '127.0.0.1';
    const allowed = await checkRateLimit(`rate:auth:signup:${ip}`, 10, 60);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many signup attempts. Please try again later.'
      });
    }

    const { name, email, password } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Name is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Valid email address is required' });
    }

    const pwValidation = validateStrongPassword(password);
    if (!pwValidation.valid) {
      return res.status(400).json({ success: false, error: 'WEAK_PASSWORD', message: pwValidation.message });
    }

    // Check duplicate email
    const existing = await db.query('SELECT id FROM identity.users WHERE email = $1', [cleanEmail]);
    if (existing.rows && existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists.'
      });
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(password);
    const cleanName = name.trim();

    // Insert user
    const insertRes = await db.query(
      `INSERT INTO identity.users (email, name, display_name, password_hash, is_verified, role)
       VALUES ($1, $2, $3, $4, FALSE, 'USER')
       RETURNING id, email, name, is_verified, role, created_at`,
      [cleanEmail, cleanName, cleanName, passwordHash]
    );

    const newUser = insertRes.rows[0] || {
      id: crypto.randomUUID(),
      email: cleanEmail,
      name: cleanName,
      is_verified: false,
      role: 'USER',
      created_at: new Date()
    };

    // Generate single-use email verification token (24-hour expiration)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await db.query(
      `INSERT INTO identity.verification_tokens (identifier, token, type, expires_at)
       VALUES ($1, $2, 'EMAIL_VERIFY', NOW() + INTERVAL '24 hours')`,
      [cleanEmail, verificationToken]
    );

    // Mock verification link logged to console
    const clientUrl = getConfig().server?.clientUrl || 'http://localhost:5173';
    const verificationUrl = `${clientUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(cleanEmail)}`;
    logger.info(`[Auth] Verification URL generated for ${cleanEmail}: ${verificationUrl}`);
    console.log(`\n=======================================================`);
    console.log(`✉️ [MOCK EMAIL VERIFICATION] To: ${cleanEmail}`);
    console.log(`👉 Link: ${verificationUrl}`);
    console.log(`=======================================================\n`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please verify your email to continue.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        isVerified: newUser.is_verified,
        role: newUser.role
      }
    });
  } catch (err) {
    logger.error('Signup error', { error: err.message });
    res.status(500).json({ success: false, error: 'SIGNUP_FAILED', message: 'Internal server error during registration' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. VERIFY EMAIL: POST /api/v1/auth/verify-email
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.body || {};
    if (!token || !email) {
      return res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'Token and email are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const tokenRes = await db.query(
      `SELECT id, expires_at FROM identity.verification_tokens
       WHERE identifier = $1 AND token = $2 AND type = 'EMAIL_VERIFY' AND expires_at > NOW()`,
      [cleanEmail, token]
    );

    if (!tokenRes.rows || tokenRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Verification link is invalid or has expired.'
      });
    }

    // Mark user verified
    await db.query('UPDATE identity.users SET is_verified = TRUE, updated_at = NOW() WHERE email = $1', [cleanEmail]);
    // Consume token
    await db.query('DELETE FROM identity.verification_tokens WHERE id = $1', [tokenRes.rows[0].id]);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You may now log in.'
    });
  } catch (err) {
    logger.error('Email verification error', { error: err.message });
    res.status(500).json({ success: false, error: 'VERIFICATION_FAILED', message: 'Internal server error verifying email' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. LOGIN: POST /api/v1/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const ip = req.ip || '127.0.0.1';
    const allowed = await checkRateLimit(`rate:auth:login:${ip}`, 20, 60);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please wait 1 minute.'
      });
    }

    const { email, password, rememberMe } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_CREDENTIALS',
        message: 'Email and password are required'
      });
    }

    // Lookup user
    const userRes = await db.query(
      `SELECT id, email, name, display_name, password_hash, is_verified, role, failed_login_attempts, lock_until, avatar_url, created_at
       FROM identity.users
       WHERE email = $1`,
      [cleanEmail]
    );

    const user = userRes.rows && userRes.rows[0];

    // Check account lockout
    if (user && user.lock_until && new Date(user.lock_until) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.lock_until).getTime() - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${waitMinutes} minute(s).`
      });
    }

    // Verify Password safely (using constant-time dummy verification if user not found)
    let passwordMatches = false;
    if (user && user.password_hash) {
      passwordMatches = await verifyPassword(password, user.password_hash);
    } else {
      await dummyVerifyPassword(password);
    }

    if (!user || !passwordMatches) {
      if (user) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        if (attempts >= 5) {
          await db.query(
            `UPDATE identity.users
             SET failed_login_attempts = $1, lock_until = NOW() + INTERVAL '15 minutes', updated_at = NOW()
             WHERE id = $2`,
            [attempts, user.id]
          );
        } else {
          await db.query(
            `UPDATE identity.users SET failed_login_attempts = $1, updated_at = NOW() WHERE id = $2`,
            [attempts, user.id]
          );
        }
      }
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    // Reset failed attempts upon successful authentication
    await db.query(
      `UPDATE identity.users SET failed_login_attempts = 0, lock_until = NULL, updated_at = NOW() WHERE id = $1`,
      [user.id]
    );

    // Issue tokens: Short-lived Access Token (15 mins) & Long-lived Refresh Token (7 days)
    const accessToken = signToken({
      sub: user.id,
      email: user.email,
      role: user.role || 'USER'
    }, { expiresInSeconds: 15 * 60 });

    const sessionMetadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: ip
    };

    const session = await createSession(user.id, sessionMetadata);

    // Set secure HttpOnly cookies
    const refreshTtlMs = rememberMe ? (30 * 24 * 60 * 60 * 1000) : (7 * 24 * 60 * 60 * 1000);
    res.cookie('cogether_access', accessToken, getAuthCookieOptions(15 * 60 * 1000));
    res.cookie('cogether_refresh', session.refreshToken, getAuthCookieOptions(refreshTtlMs));

    const safeUser = {
      id: user.id,
      name: user.name || user.display_name,
      email: user.email,
      isVerified: Boolean(user.is_verified),
      role: user.role || 'USER',
      avatarUrl: user.avatar_url || null,
      createdAt: user.created_at
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: safeUser,
      accessToken,
      refreshToken: session.refreshToken,
      tokens: {
        accessToken,
        refreshToken: session.refreshToken
      }
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ success: false, error: 'LOGIN_FAILED', message: 'Internal server error during login' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. REFRESH: POST /api/v1/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const rawRefreshToken = (req.cookies && req.cookies.cogether_refresh) || req.body?.refreshToken;

    if (!rawRefreshToken) {
      return res.status(401).json({
        success: false,
        error: 'NO_REFRESH_TOKEN',
        message: 'Refresh token is required'
      });
    }

    const rotation = await validateAndRotateSession(rawRefreshToken, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });

    if (!rotation || !rotation.valid) {
      res.clearCookie('cogether_access', { path: '/' });
      res.clearCookie('cogether_refresh', { path: '/' });
      return res.status(401).json({
        success: false,
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Session has expired or was revoked. Please log in again.'
      });
    }

    // Fetch user details for token payload
    const userRes = await db.query(
      `SELECT id, email, role, is_verified, name, display_name FROM identity.users WHERE id = $1`,
      [rotation.userId]
    );
    const user = userRes.rows && userRes.rows[0];

    const newAccessToken = signToken({
      sub: rotation.userId,
      email: user?.email,
      role: user?.role || 'USER'
    }, { expiresInSeconds: 15 * 60 });

    const rotatedRefreshToken = rotation.newRefreshToken || rotation.refreshToken;
    res.cookie('cogether_access', newAccessToken, getAuthCookieOptions(15 * 60 * 1000));
    res.cookie('cogether_refresh', rotatedRefreshToken, getAuthCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: rotatedRefreshToken,
      tokens: {
        accessToken: newAccessToken,
        refreshToken: rotatedRefreshToken
      }
    });
  } catch (err) {
    logger.error('Refresh token error', { error: err.message });
    res.status(500).json({ success: false, error: 'REFRESH_FAILED', message: 'Internal server error refreshing session' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. LOGOUT: POST /api/v1/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  try {
    const rawRefreshToken = (req.cookies && req.cookies.cogether_refresh) || req.body?.refreshToken;
    if (rawRefreshToken) {
      await revokeSession(rawRefreshToken).catch(() => {});
    }

    res.clearCookie('cogether_access', { path: '/' });
    res.clearCookie('cogether_refresh', { path: '/' });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    logger.error('Logout error', { error: err.message });
    res.status(500).json({ success: false, error: 'LOGOUT_FAILED', message: 'Internal server error during logout' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. FORGOT PASSWORD: POST /api/v1/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const ip = req.ip || '127.0.0.1';
    const allowed = await checkRateLimit(`rate:auth:forgot:${ip}`, 5, 60);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many password reset requests. Please wait.'
      });
    }

    const { email } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (cleanEmail) {
      const userRes = await db.query('SELECT id, email FROM identity.users WHERE email = $1', [cleanEmail]);
      if (userRes.rows && userRes.rows.length > 0) {
        // Generate single-use token with 1-hour expiration
        const resetToken = crypto.randomBytes(32).toString('hex');
        await db.query(
          `INSERT INTO identity.verification_tokens (identifier, token, type, expires_at)
           VALUES ($1, $2, 'PASSWORD_RESET', NOW() + INTERVAL '1 hour')`,
          [cleanEmail, resetToken]
        );

        const clientUrl = getConfig().server?.clientUrl || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(cleanEmail)}`;
        logger.info(`[Auth] Password reset link generated: ${resetUrl}`);
        console.log(`\n=======================================================`);
        console.log(`🔑 [PASSWORD RESET URL] To: ${cleanEmail}`);
        console.log(`👉 Link: ${resetUrl}`);
        console.log(`=======================================================\n`);
      }
    }

    // Enumeration-safe generic response
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent.'
    });
  } catch (err) {
    logger.error('Forgot password error', { error: err.message });
    res.status(500).json({ success: false, error: 'FORGOT_PASSWORD_FAILED', message: 'Unable to process reset request.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. RESET PASSWORD: POST /api/v1/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, newPassword } = req.body || {};
    if (!token || !email || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Token, email, and new password are required'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const pwValidation = validateStrongPassword(newPassword);
    if (!pwValidation.valid) {
      return res.status(400).json({ success: false, error: 'WEAK_PASSWORD', message: pwValidation.message });
    }

    // Verify token validity
    const tokenRes = await db.query(
      `SELECT id FROM identity.verification_tokens
       WHERE identifier = $1 AND token = $2 AND type = 'PASSWORD_RESET' AND expires_at > NOW()`,
      [cleanEmail, token]
    );

    if (!tokenRes.rows || tokenRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Password reset link is invalid or has expired.'
      });
    }

    // Hash new password and update user
    const newHash = await hashPassword(newPassword);
    const updateRes = await db.query(
      `UPDATE identity.users
       SET password_hash = $1, failed_login_attempts = 0, lock_until = NULL, updated_at = NOW()
       WHERE email = $2
       RETURNING id`,
      [newHash, cleanEmail]
    );

    // Delete used reset token
    await db.query('DELETE FROM identity.verification_tokens WHERE id = $1', [tokenRes.rows[0].id]);

    // Invalidate all active sessions for security
    if (updateRes.rows && updateRes.rows[0]) {
      await revokeAllUserSessions(updateRes.rows[0].id).catch(() => {});
    }

    res.clearCookie('cogether_access', { path: '/' });
    res.clearCookie('cogether_refresh', { path: '/' });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    logger.error('Reset password error', { error: err.message });
    res.status(500).json({ success: false, error: 'RESET_FAILED', message: 'Internal server error resetting password' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. GET CURRENT USER: GET /api/v1/auth/me
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id;
    const userRes = await db.query(
      `SELECT id, email, name, display_name, is_verified, role, avatar_url, created_at
       FROM identity.users
       WHERE id = $1`,
      [userId]
    );

    const user = userRes.rows && userRes.rows[0];
    if (!user) {
      return res.status(404).json({ success: false, error: 'USER_NOT_FOUND', message: 'User record not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name || user.display_name,
        email: user.email,
        isVerified: Boolean(user.is_verified),
        role: user.role || 'USER',
        avatarUrl: user.avatar_url || null,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    logger.error('Get me error', { error: err.message });
    res.status(500).json({ success: false, error: 'GET_ME_FAILED', message: 'Internal server error fetching user profile' });
  }
});

module.exports = { authRouter: router, requireAuth };
