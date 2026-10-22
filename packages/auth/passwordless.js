/**
 * Passwordless Cryptographic OTP Engine
 * Generates cryptographically secure 6-digit OTPs and computes/verifies
 * keyed HMAC-SHA-256 hashes using timing-safe comparisons.
 * Plaintext OTPs are never stored at rest.
 */

const crypto = require('crypto');
const { getConfig } = require('../config');

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function generateOtp() {
  // Cryptographically uniform 6-digit integer in [100000, 999999]
  return crypto.randomInt(100000, 1000000).toString();
}

function getOtpHmacKey() {
  const config = getConfig();
  const key = config.auth.otpHmacKey;
  if (!key) {
    if (config.isProd || config.isStaging) {
      throw new Error('FATAL: OTP_HMAC_KEY is required in production/staging environments');
    }
    return 'cogether-dev-otp-hmac-key-never-use-in-production-32bytes!';
  }
  return key;
}

/**
 * Computes a keyed HMAC-SHA-256 digest bound to the user's normalized email and purpose
 */
function hashOtp(rawOtp, email = '', purpose = 'signup') {
  if (!rawOtp) {
    throw new Error('rawOtp is required for hashing');
  }
  const key = getOtpHmacKey();
  const cleanOtp = String(rawOtp).trim();
  const cleanEmail = normalizeEmail(email);
  const cleanPurpose = String(purpose || 'signup').trim().toLowerCase();

  const payload = cleanEmail ? `${cleanPurpose}:${cleanEmail}:${cleanOtp}` : cleanOtp;
  return crypto.createHmac('sha256', key).update(payload).digest('hex');
}

/**
 * Timing-safe verification of an OTP against its stored hash
 */
function verifyOtpHash(rawOtp, expectedHash, email = '', purpose = 'signup') {
  if (!rawOtp || !expectedHash) return false;

  const cleanOtp = String(rawOtp).trim();
  const computedHash = hashOtp(cleanOtp, email, purpose);

  const bufA = Buffer.from(computedHash, 'hex');
  const bufB = Buffer.from(expectedHash, 'hex');

  if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
    return true;
  }

  // Fallback for legacy salt-based hashes created before HMAC upgrade
  try {
    const config = getConfig();
    const legacySalt = config.auth.otpSalt || 'cogether-otp-salt-production-secure';
    const legacyHash = crypto.createHash('sha256').update(`${legacySalt}:${cleanOtp}`).digest('hex');
    const legacyBuf = Buffer.from(legacyHash, 'hex');
    if (legacyBuf.length === bufB.length && crypto.timingSafeEqual(legacyBuf, bufB)) {
      return true;
    }
  } catch (_e) {}

  return false;
}

module.exports = {
  normalizeEmail,
  generateOtp,
  hashOtp,
  verifyOtpHash
};
