/**
 * CoGether Unified Authentication, Profile Sync & Lifecycle Routes
 * Handles: Signup, Email Verification, Resend Verification, Password Login,
 * Session Refresh Rotation, Logout, Forgot/Reset Password, Onboarding, /me, and Account Deletion.
 */

const express = require('express');
const crypto = require('crypto');
const { db } = require('../../packages/database');
const { redis } = require('../../packages/redis');
const { getConfig } = require('../../packages/config');
const { logger } = require('../../packages/observability');
const {
  signToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  createSession,
  validateAndRotateSession,
  revokeSession,
  revokeAllUserSessions
} = require('../../packages/auth');
const { profileService } = require('../../services/identity/profileService');
const {
  sendVerificationLinkEmail,
  sendPasswordResetLinkEmail
} = require('../../services/identity/transactionalEmail');

const router = express.Router();

const FRONTEND_URL = (
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://www.cogether.tech' : 'http://localhost:5173')
).replace(/\/+$/, '');

function isProdCookieEnv() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.NODE_ENV === 'staging' ||
    process.env.FORCE_SECURE_COOKIES === 'true'
  );
}

function getAuthCookieOptions(maxAgeMs) {
  const isProdLike = isProdCookieEnv();
  return {
    httpOnly: true,
    secure: isProdLike,
    // Cross-subdomain cookies (www.cogether.tech <-> api.cogether.tech) require SameSite=None + Secure
    sameSite: isProdLike ? 'none' : 'lax',
    path: '/',
    ...(typeof maxAgeMs === 'number' ? { maxAge: maxAgeMs } : {})
  };
}

function extractCookie(req, name) {
  if (req.cookies && req.cookies[name]) {
    return req.cookies[name];
  }
  const cookieHeader = req.headers?.cookie || req.get?.('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

function getClientIp(req) {
  return String(req.headers?.['x-forwarded-for'] || req.ip || 'unknown').split(',')[0].trim();
}

async function checkRateLimit(key, limit, windowSec) {
  try {
    const res = await redis.consumeRateLimit(`auth_route:${key}`, limit, windowSec);
    return res.allowed;
  } catch {
    return true;
  }
}

function validateStrongPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must include both uppercase and lowercase letters.' };
  }
  if (!/[0-9!@#$%^&*(),.?":{}|<>_-]/.test(password)) {
    return { valid: false, message: 'Password must include at least one number or special character.' };
  }
  return { valid: true };
}

function normalizeEmailAddress(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || row.display_name || row.email?.split('@')[0] || 'Member',
    displayName: row.display_name || row.name || row.email?.split('@')[0] || 'Member',
    email: row.email || null,
    isVerified: Boolean(row.is_verified),
    onboardingCompleted: Boolean(row.onboarding_completed),
    role: row.role || 'USER',
    avatarUrl: row.avatar_url || null,
    createdAt: row.created_at || null
  };
}

function slugifyHandle(input) {
  const cleaned = String(input || 'member')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 18);
  return cleaned.length >= 3 ? cleaned : `member${cleaned}`;
}

async function ensureAndLoadFullContext(userRow, preferredName = null) {
  const safeName =
    preferredName ||
    userRow.display_name ||
    userRow.name ||
    (userRow.email ? userRow.email.split('@')[0] : 'Member');

  // 1. Ensure primary email record in identity.emails
  if (userRow.email) {
    try {
      await db.query(
        `INSERT INTO identity.emails (user_id, email_normalized, is_primary, verified_at)
         VALUES ($1, $2, TRUE, $3)
         ON CONFLICT (email_normalized) DO NOTHING`,
        [userRow.id, normalizeEmailAddress(userRow.email), userRow.is_verified ? new Date() : null]
      );
    } catch (err) {
      logger.debug('Skipped identity.emails sync fallback', { error: err.message });
    }
  }

  // 2. Ensure identity.profiles record (auto-create on first login or signup)
  let profile = null;
  try {
    profile = await profileService.getProfileByUserId(userRow.id);
    if (!profile) {
      const baseHandle = slugifyHandle(safeName);
      const uniqueHandle = `${baseHandle}_${crypto.randomBytes(2).toString('hex')}`;
      try {
        profile = await profileService.createProfile(userRow.id, {
          username: uniqueHandle,
          displayName: safeName,
          avatarUrl: userRow.avatar_url || null,
          avatarConfig: { seed: uniqueHandle }
        });
      } catch {
        const retryHandle = `${baseHandle}_${crypto.randomBytes(3).toString('hex')}`;
        profile = await profileService.createProfile(userRow.id, {
          username: retryHandle,
          displayName: safeName,
          avatarUrl: userRow.avatar_url || null,
          avatarConfig: { seed: retryHandle }
        });
      }
    }
  } catch (err) {
    logger.warn('Profile auto-provisioning fallback', { error: err.message });
    profile = {
      userId: userRow.id,
      username: slugifyHandle(safeName),
      displayName: safeName,
      avatarUrl: userRow.avatar_url || null,
      avatarConfig: { seed: userRow.id }
    };
  }

  // 3. Ensure preferences
  let preferences = { theme: 'obsidian', camAutoMerge: true, camSize: 'M', notificationsEnabled: true };
  try {
    const existingPref = await profileService.getPreferences(userRow.id);
    if (existingPref) {
      preferences = existingPref;
    } else {
      preferences = await profileService.createPreferences(userRow.id);
    }
  } catch {
    // Use clean defaults when table unavailable
  }

  // 4. Ensure entitlement
  let entitlement = { tier: 'FREE', planCode: 'free', status: 'active', expiresAt: null, isPro: false };
  try {
    const entRes = await db.query(
      `SELECT tier, plan_code, status, expires_at FROM identity.entitlements WHERE user_id = $1 LIMIT 1`,
      [userRow.id]
    );
    if (entRes.rows.length > 0) {
      const e = entRes.rows[0];
      const activeNotExpired = !e.expires_at || new Date(e.expires_at) > new Date();
      const isPro = (e.tier === 'KEYPASS_PRO' || e.plan_code === 'keypass_monthly') && e.status === 'active' && activeNotExpired;
      entitlement = {
        tier: e.tier || 'FREE',
        planCode: e.plan_code || 'free',
        status: e.status || 'active',
        expiresAt: e.expires_at || null,
        isPro
      };
    } else {
      await db.query(
        `INSERT INTO identity.entitlements (user_id, tier, plan_code, status)
         VALUES ($1, 'FREE', 'free', 'active')
         ON CONFLICT (user_id) DO NOTHING`,
        [userRow.id]
      );
    }
  } catch {
    // Use baseline free tier if table not migrated yet
  }

  const sanitizedUser = sanitizeUser(userRow);
  if (!sanitizedUser.avatarUrl && profile?.avatarUrl) {
    sanitizedUser.avatarUrl = profile.avatarUrl;
  }

  return {
    user: sanitizedUser,
    profile,
    preferences,
    entitlement,
    onboardingCompleted: Boolean(userRow.onboarding_completed)
  };
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers?.authorization || req.get?.('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const token = bearer || extractCookie(req, 'cogether_access');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in.'
      });
    }

    const verified = verifyToken(token);
    const decoded = verified?.valid ? verified.claims : null;
    if (!decoded || (!decoded.userId && !decoded.sub && !decoded.id)) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Your session token is invalid or expired.'
      });
    }

    req.user = {
      id: decoded.userId || decoded.sub || decoded.id,
      email: decoded.email || null,
      role: decoded.role || 'USER',
      isVerified: Boolean(decoded.isVerified),
      isGuest: Boolean(decoded.isGuest)
    };
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Session verification failed. Please log in again.'
    });
  }
}

async function findUserByEmail(emailNormalized) {
  const byDirect = await db.query(
    `SELECT * FROM identity.users WHERE email = $1 LIMIT 1`,
    [emailNormalized]
  );
  if (byDirect.rows.length > 0) {
    return byDirect.rows[0];
  }

  // Fallback check via identity.emails table (users registered via OTP/Google flow)
  try {
    const byEmailTable = await db.query(
      `SELECT u.* FROM identity.users u
       INNER JOIN identity.emails e ON e.user_id = u.id
       WHERE e.email_normalized = $1
       LIMIT 1`,
      [emailNormalized]
    );
    if (byEmailTable.rows.length > 0) {
      const found = byEmailTable.rows[0];
      if (!found.email) found.email = emailNormalized;
      return found;
    }
  } catch {
    // Ignore in simulated DB
  }
  return null;
}

// ── 1. SIGNUP ─────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit(`signup:${ip}`, 15, 60))) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many signup attempts. Please wait a minute and try again.'
      });
    }

    const { name, displayName, email, password } = req.body || {};
    const normalizedEmail = normalizeEmailAddress(email);

    if (!normalizedEmail || !isValidEmailFormat(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Please provide a valid email address.'
      });
    }

    const pwCheck = validateStrongPassword(password);
    if (!pwCheck.valid) {
      return res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: pwCheck.message
      });
    }

    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists. Try signing in instead.'
      });
    }

    const safeName = String(name || displayName || normalizedEmail.split('@')[0]).trim().slice(0, 80);
    const passwordHash = await hashPassword(password);

    const insertRes = await db.query(
      `INSERT INTO identity.users (email, name, display_name, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [normalizedEmail, safeName, safeName, passwordHash, 'USER']
    );

    const createdUser = insertRes.rows[0];
    if (!createdUser.email) createdUser.email = normalizedEmail;
    createdUser.name = createdUser.name || safeName;
    createdUser.display_name = createdUser.display_name || safeName;

    const fullContext = await ensureAndLoadFullContext(createdUser, safeName);

    // Issue Email Verification Token
    const verifyTokenValue = crypto.randomBytes(32).toString('hex');
    await db.query(
      `INSERT INTO identity.verification_tokens (identifier, token, type, expires_at)
       VALUES ($1, $2, 'EMAIL_VERIFY', NOW() + INTERVAL '24 hours')`,
      [normalizedEmail, verifyTokenValue]
    );

    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(verifyTokenValue)}&email=${encodeURIComponent(normalizedEmail)}`;
    const emailDelivery = await sendVerificationLinkEmail({
      to: normalizedEmail,
      verifyUrl,
      name: safeName
    });

    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[Auth] Verification URL generated for ${normalizedEmail}: ${verifyUrl}`);
      console.log(`\n=======================================================`);
      console.log(`✉️ [MOCK EMAIL VERIFICATION] To: ${normalizedEmail}`);
      console.log(`👉 Link: ${verifyUrl}`);
      console.log(`=======================================================\n`);
    }

    return res.status(201).json({
      success: true,
      user: fullContext.user,
      profile: fullContext.profile,
      preferences: fullContext.preferences,
      entitlement: fullContext.entitlement,
      onboardingCompleted: fullContext.onboardingCompleted,
      verificationEmailSent: emailDelivery.success,
      message: emailDelivery.success
        ? 'Account created! Please check your inbox to verify your email address.'
        : 'Account created! Email delivery is not configured yet—you can sign in now and verify once Resend/SMTP is active.'
    });
  } catch (err) {
    logger.error('Signup failed', { error: err.message });
    return res.status(500).json({
      success: false,
      error: 'SIGNUP_FAILED',
      message: 'Unable to create your account right now. Please try again.'
    });
  }
});

// ── 2. EMAIL VERIFICATION & RESEND ────────────────────────────────────────
async function verifyEmailTokenHandler(emailInput, tokenInput) {
  const normalizedEmail = normalizeEmailAddress(emailInput);
  const rawToken = String(tokenInput || '').trim();
  if (!normalizedEmail || !rawToken) {
    return { status: 400, body: { success: false, error: 'VALIDATION_ERROR', message: 'Email and verification token are required.' } };
  }

  const tokenRes = await db.query(
    `SELECT * FROM identity.verification_tokens
     WHERE identifier = $1 AND token = $2 AND type = 'EMAIL_VERIFY'
     LIMIT 1`,
    [normalizedEmail, rawToken]
  );

  if (tokenRes.rows.length === 0) {
    return {
      status: 400,
      body: { success: false, error: 'INVALID_TOKEN', message: 'This verification link is invalid or has already been used.' }
    };
  }

  const record = tokenRes.rows[0];
  if (record.expires_at && new Date(record.expires_at) <= new Date()) {
    await db.query(`DELETE FROM identity.verification_tokens WHERE id = $1`, [record.id]).catch(() => {});
    return {
      status: 400,
      body: { success: false, error: 'TOKEN_EXPIRED', message: 'Verification link expired. Request a new verification email.' }
    };
  }

  await db.query(`UPDATE identity.users SET is_verified = TRUE, updated_at = NOW() WHERE email = $1`, [normalizedEmail]);
  await db.query(`UPDATE identity.emails SET verified_at = NOW() WHERE email_normalized = $1`, [normalizedEmail]).catch(() => {});
  await db.query(`DELETE FROM identity.verification_tokens WHERE id = $1`, [record.id]);

  return {
    status: 200,
    body: {
      success: true,
      message: 'Email verified successfully! You can continue to your CoGether dashboard.'
    }
  };
}

router.post('/verify-email', async (req, res) => {
  try {
    const { email, token } = req.body || {};
    const outcome = await verifyEmailTokenHandler(email, token);
    return res.status(outcome.status).json(outcome.body);
  } catch (err) {
    logger.error('Verify email failed', { error: err.message });
    return res.status(500).json({ success: false, error: 'VERIFY_FAILED', message: 'Unable to verify email.' });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const outcome = await verifyEmailTokenHandler(req.query?.email, req.query?.token);
    return res.status(outcome.status).json(outcome.body);
  } catch (err) {
    logger.error('GET verify email failed', { error: err.message });
    return res.status(500).json({ success: false, error: 'VERIFY_FAILED', message: 'Unable to verify email.' });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const ip = getClientIp(req);
    const { email: bodyEmail } = req.body || {};

    let targetEmail = normalizeEmailAddress(bodyEmail);
    if (!targetEmail) {
      const authHeader = req.headers?.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : extractCookie(req, 'cogether_access');
      const verified = token ? verifyToken(token) : null;
      const decoded = verified?.valid ? verified.claims : null;
      if (decoded?.email) targetEmail = normalizeEmailAddress(decoded.email);
    }

    if (!targetEmail || !isValidEmailFormat(targetEmail)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'A valid email address is required to resend verification.'
      });
    }

    if (!(await checkRateLimit(`resend_verify:${ip}:${targetEmail}`, 3, 600))) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Please wait a few minutes before requesting another verification email.'
      });
    }

    const user = await findUserByEmail(targetEmail);
    if (!user) {
      return res.json({
        success: true,
        message: 'If your account exists and is unverified, a verification link has been sent.'
      });
    }

    if (user.is_verified) {
      return res.json({
        success: true,
        alreadyVerified: true,
        message: 'Your email address is already verified.'
      });
    }

    const verifyTokenValue = crypto.randomBytes(32).toString('hex');
    await db.query(
      `INSERT INTO identity.verification_tokens (identifier, token, type, expires_at)
       VALUES ($1, $2, 'EMAIL_VERIFY', NOW() + INTERVAL '24 hours')`,
      [targetEmail, verifyTokenValue]
    );

    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(verifyTokenValue)}&email=${encodeURIComponent(targetEmail)}`;
    const delivery = await sendVerificationLinkEmail({
      to: targetEmail,
      verifyUrl,
      name: user.display_name || user.name
    });

    if (!delivery.success) {
      return res.status(503).json({
        success: false,
        error: 'EMAIL_PROVIDER_UNCONFIGURED',
        message: 'Email delivery failed because RESEND_API_KEY or SMTP credentials are not configured on the backend.'
      });
    }

    return res.json({
      success: true,
      message: 'Verification email sent! Please check your inbox and spam folder.'
    });
  } catch (err) {
    logger.error('Resend verification error', { error: err.message });
    return res.status(500).json({ success: false, error: 'RESEND_FAILED', message: 'Unable to resend verification email.' });
  }
});

// ── 3. LOGIN ──────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    // Allow explicit callers requesting strict OTP challenge flow to delegate to server.js handler
    if (req.body?.requireOtpChallenge === true) {
      return next();
    }

    const ip = getClientIp(req);
    if (!(await checkRateLimit(`login:${ip}`, 25, 60))) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many sign-in attempts. Please wait a minute and try again.'
      });
    }

    const { email, password, rememberMe, directLogin } = req.body || {};
    const normalizedEmail = normalizeEmailAddress(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email and password are required.'
      });
    }

    const user = await findUserByEmail(normalizedEmail);
    // Preserve strict OTP challenge contract for CI/userService OTP-registered accounts when directLogin/rememberMe isn't requested
    if (!directLogin && rememberMe === undefined && user && user.name == null) {
      return next();
    }
    if (!user || !user.password_hash) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    const activeLock = user.lock_until || user.lockout_until;
    if (activeLock && new Date(activeLock) > new Date()) {
      return res.status(423).json({
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: 'Account temporarily locked due to repeated failed attempts. Try again in 15 minutes.'
      });
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      const nextAttempts = (user.failed_login_attempts || 0) + 1;
      await db.query(
        `UPDATE identity.users SET failed_login_attempts = failed_login_attempts + 1, updated_at = NOW() WHERE email = $1`,
        [normalizedEmail]
      );
      if (nextAttempts >= 5) {
        const lockDate = new Date(Date.now() + 15 * 60 * 1000);
        await db.query(
          `UPDATE identity.users SET lock_until = $1, updated_at = NOW() WHERE email = $2`,
          [lockDate, normalizedEmail]
        );
      }
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    await db.query(
      `UPDATE identity.users SET failed_login_attempts = 0, lock_until = NULL, last_login_at = NOW(), updated_at = NOW() WHERE email = $1`,
      [normalizedEmail]
    );
    user.failed_login_attempts = 0;
    user.lock_until = null;

    if (!user.email) user.email = normalizedEmail;
    const fullContext = await ensureAndLoadFullContext(user);

    const session = await createSession(user.id, {
      userAgent: req.headers?.['user-agent'],
      ipAddress: ip
    });

    const accessToken = signToken({
      userId: user.id,
      email: normalizedEmail,
      role: user.role || 'USER',
      isVerified: Boolean(user.is_verified)
    });

    const refreshMaxAgeMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    res.cookie('cogether_access', accessToken, getAuthCookieOptions(15 * 60 * 1000));
    res.cookie('cogether_refresh', session.refreshToken, getAuthCookieOptions(refreshMaxAgeMs));

    return res.status(200).json({
      success: true,
      user: fullContext.user,
      profile: fullContext.profile,
      preferences: fullContext.preferences,
      entitlement: fullContext.entitlement,
      onboardingCompleted: fullContext.onboardingCompleted,
      accessToken,
      refreshToken: session.refreshToken
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    return res.status(500).json({
      success: false,
      error: 'LOGIN_FAILED',
      message: 'Unable to sign in right now. Please try again.'
    });
  }
});

// ── 4. REFRESH TOKEN ROTATION ─────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const incomingToken = req.body?.refreshToken || extractCookie(req, 'cogether_refresh');
    if (!incomingToken) {
      return res.status(401).json({
        success: false,
        error: 'MISSING_REFRESH_TOKEN',
        message: 'Refresh token missing.'
      });
    }

    const rotation = await validateAndRotateSession(incomingToken, {
      userAgent: req.headers?.['user-agent'],
      ipAddress: getClientIp(req)
    });

    if (!rotation || !rotation.valid) {
      return res.status(401).json({
        success: false,
        error: rotation?.error || 'INVALID_REFRESH_TOKEN',
        message: rotation?.message || 'Session expired or invalid. Please log in again.'
      });
    }

    const userRes = await db.query(`SELECT * FROM identity.users WHERE id = $1 LIMIT 1`, [rotation.userId]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Account no longer exists.'
      });
    }

    const user = userRes.rows[0];
    const fullContext = await ensureAndLoadFullContext(user);

    const accessToken = signToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'USER',
      isVerified: Boolean(user.is_verified)
    });

    res.cookie('cogether_access', accessToken, getAuthCookieOptions(15 * 60 * 1000));
    res.cookie('cogether_refresh', rotation.newRefreshToken, getAuthCookieOptions(7 * 24 * 60 * 60 * 1000));

    return res.json({
      success: true,
      accessToken,
      refreshToken: rotation.newRefreshToken,
      user: fullContext.user,
      profile: fullContext.profile,
      preferences: fullContext.preferences,
      entitlement: fullContext.entitlement,
      onboardingCompleted: fullContext.onboardingCompleted
    });
  } catch (err) {
    logger.error('Session refresh failed', { error: err.message });
    return res.status(401).json({
      success: false,
      error: 'REFRESH_FAILED',
      message: 'Session refresh failed.'
    });
  }
});

// ── 5. LOGOUT ─────────────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken || extractCookie(req, 'cogether_refresh');
    if (refreshToken) {
      await revokeSession(refreshToken).catch(() => {});
    }

    const clearOpts = getAuthCookieOptions();
    delete clearOpts.maxAge;
    res.clearCookie('cogether_access', clearOpts);
    res.clearCookie('cogether_refresh', clearOpts);

    return res.json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (err) {
    logger.error('Logout error', { error: err.message });
    return res.status(500).json({ success: false, error: 'LOGOUT_FAILED', message: 'Failed to sign out.' });
  }
});

// ── 6. FORGOT & RESET PASSWORD ────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit(`forgot:${ip}`, 8, 300))) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many reset requests. Please wait a few minutes.'
      });
    }

    const normalizedEmail = normalizeEmailAddress(req.body?.email);
    const genericMsg = 'If an account with that email exists, password reset instructions have been dispatched.';

    if (!normalizedEmail || !isValidEmailFormat(normalizedEmail)) {
      return res.json({ success: true, message: genericMsg });
    }

    const user = await findUserByEmail(normalizedEmail);
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      await db.query(
        `INSERT INTO identity.verification_tokens (identifier, token, type, expires_at)
         VALUES ($1, $2, 'PASSWORD_RESET', NOW() + INTERVAL '1 hour')`,
        [normalizedEmail, resetToken]
      );

      const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(normalizedEmail)}`;
      await sendPasswordResetLinkEmail({
        to: normalizedEmail,
        resetUrl,
        name: user.display_name || user.name
      });

      if (process.env.NODE_ENV !== 'production') {
        logger.info(`[Auth] Password reset link generated: ${resetUrl}`);
        console.log(`\n=======================================================`);
        console.log(`🔑 [PASSWORD RESET URL] To: ${normalizedEmail}`);
        console.log(`👉 Link: ${resetUrl}`);
        console.log(`=======================================================\n`);
      }
    }

    return res.json({ success: true, message: genericMsg });
  } catch (err) {
    logger.error('Forgot password failed', { error: err.message });
    return res.status(500).json({ success: false, error: 'FORGOT_PASSWORD_FAILED', message: 'Unable to process reset request.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password, newPassword } = req.body || {};
    const normalizedEmail = normalizeEmailAddress(email);
    const finalPassword = password || newPassword;
    const rawToken = String(token || '').trim();

    if (!normalizedEmail || !rawToken || !finalPassword) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email, reset token, and new password are required.'
      });
    }

    const pwCheck = validateStrongPassword(finalPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: pwCheck.message
      });
    }

    const tokenRes = await db.query(
      `SELECT * FROM identity.verification_tokens
       WHERE identifier = $1 AND token = $2 AND type = 'PASSWORD_RESET'
       LIMIT 1`,
      [normalizedEmail, rawToken]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or already used password reset link.'
      });
    }

    const tokenRecord = tokenRes.rows[0];
    if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) <= new Date()) {
      await db.query(`DELETE FROM identity.verification_tokens WHERE id = $1`, [tokenRecord.id]).catch(() => {});
      return res.status(400).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'This password reset link has expired. Please request a new one.'
      });
    }

    const newHash = await hashPassword(finalPassword);
    const updatedRes = await db.query(
      `UPDATE identity.users
       SET password_hash = $1, failed_login_attempts = 0, lock_until = NULL, updated_at = NOW()
       WHERE email = $2
       RETURNING id`,
      [newHash, normalizedEmail]
    );

    await db.query(`DELETE FROM identity.verification_tokens WHERE id = $1`, [tokenRecord.id]);
    if (updatedRes.rows[0]?.id) {
      await revokeAllUserSessions(updatedRes.rows[0].id).catch(() => {});
    }

    return res.json({
      success: true,
      message: 'Your password has been updated. Please sign in with your new password.'
    });
  } catch (err) {
    logger.error('Reset password error', { error: err.message });
    return res.status(500).json({ success: false, error: 'RESET_PASSWORD_FAILED', message: 'Failed to reset password.' });
  }
});

// ── 7. AUTHENTICATED USER PROFILE & ONBOARDING ────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userRes = await db.query(`SELECT * FROM identity.users WHERE id = $1 LIMIT 1`, [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User account not found.'
      });
    }

    const fullContext = await ensureAndLoadFullContext(userRes.rows[0]);
    return res.json({
      success: true,
      user: fullContext.user,
      profile: fullContext.profile,
      preferences: fullContext.preferences,
      entitlement: fullContext.entitlement,
      onboardingCompleted: fullContext.onboardingCompleted
    });
  } catch (err) {
    logger.error('GET /me error', { error: err.message });
    return res.status(500).json({ success: false, error: 'PROFILE_FETCH_FAILED', message: 'Failed to load profile.' });
  }
});

router.post('/onboarding', requireAuth, async (req, res) => {
  try {
    const { username, displayName, avatarUrl, avatarConfig, primaryInterest } = req.body || {};
    const userId = req.user.id;

    let normalizedHandle = null;
    if (username) {
      const check = profileService.validateUsername(username);
      if (!check.valid) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_USERNAME',
          message: check.message || 'Username must be 3-20 alphanumeric/underscore characters.'
        });
      }
      normalizedHandle = check.normalized;
      const available = await profileService.isUsernameAvailable(normalizedHandle, userId);
      if (!available) {
        return res.status(409).json({
          success: false,
          error: 'USERNAME_TAKEN',
          message: `@${normalizedHandle} is already taken. Try another handle.`
        });
      }
    }

    const updatedProfile = await profileService.updateProfile(userId, {
      ...(normalizedHandle ? { username: normalizedHandle } : {}),
      ...(displayName ? { displayName: String(displayName).trim().slice(0, 60) } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      ...(avatarConfig ? { avatarConfig } : {})
    });

    const cleanInterest = primaryInterest ? String(primaryInterest).trim().slice(0, 64) : null;
    try {
      await db.query(
        `UPDATE identity.users
         SET onboarding_completed = TRUE,
             onboarding_interest = COALESCE($1, onboarding_interest),
             display_name = COALESCE($2, display_name),
             updated_at = NOW()
         WHERE id = $3`,
        [cleanInterest, displayName ? String(displayName).trim().slice(0, 60) : null, userId]
      );
      if (cleanInterest) {
        await db.query(
          `UPDATE identity.profiles SET primary_interest = $1, updated_at = NOW() WHERE user_id = $2`,
          [cleanInterest, userId]
        ).catch(() => {});
      }
    } catch (colErr) {
      // Fallback if 018 migration columns aren't created yet
      logger.debug('Onboarding column update fallback', { error: colErr.message });
    }

    const userRes = await db.query(`SELECT * FROM identity.users WHERE id = $1 LIMIT 1`, [userId]);
    const userObj = userRes.rows[0] ? sanitizeUser(userRes.rows[0]) : { id: userId, email: req.user.email, role: req.user.role };
    userObj.onboardingCompleted = true;

    return res.json({
      success: true,
      user: userObj,
      profile: {
        ...updatedProfile,
        primaryInterest: cleanInterest || updatedProfile?.primaryInterest || null
      },
      onboardingCompleted: true
    });
  } catch (err) {
    logger.error('Onboarding update error', { error: err.message });
    return res.status(500).json({ success: false, error: 'ONBOARDING_FAILED', message: 'Could not save onboarding preferences.' });
  }
});

// ── 8. DELETE ACCOUNT ─────────────────────────────────────────────────────
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    await revokeAllUserSessions(userId).catch(() => {});
    await db.query(`DELETE FROM identity.users WHERE id = $1`, [userId]);

    const clearOpts = getAuthCookieOptions();
    delete clearOpts.maxAge;
    res.clearCookie('cogether_access', clearOpts);
    res.clearCookie('cogether_refresh', clearOpts);

    logger.info(`[Auth] Account permanently deleted for user: ${userId}`);
    return res.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.'
    });
  } catch (err) {
    logger.error('Delete account failed', { error: err.message });
    return res.status(500).json({
      success: false,
      error: 'DELETE_ACCOUNT_FAILED',
      message: 'Failed to permanently delete account.'
    });
  }
});

module.exports = { authRouter: router, requireAuth };
