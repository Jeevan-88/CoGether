const { signToken, verifyToken } = require('./jwt');
const { createGuestSession } = require('./guest');
const { authenticateToken, requireEntitlement, hasSufficientTier, TIER_RANK } = require('./entitlements');
const { normalizeEmail, generateOtp, hashOtp, verifyOtpHash } = require('./passwordless');
const { createSession, validateAndRotateSession, revokeSession, revokeAllUserSessions } = require('./sessionManager');
const { generateOAuthState, getGoogleAuthUrl, verifyGoogleIdToken, exchangeCodeForTokens } = require('./googleOAuth');

module.exports = {
  // JWT
  signToken,
  verifyToken,
  createGuestSession,
  authenticateToken,
  requireEntitlement,
  hasSufficientTier,
  TIER_RANK,

  // Passwordless OTP
  normalizeEmail,
  generateOtp,
  hashOtp,
  verifyOtpHash,

  // Sessions
  createSession,
  validateAndRotateSession,
  revokeSession,
  revokeAllUserSessions,

  // Google OAuth
  generateOAuthState,
  getGoogleAuthUrl,
  verifyGoogleIdToken,
  exchangeCodeForTokens
};
