/**
 * Passwordless Cryptographic OTP Engine
 * Generates cryptographically secure 6-digit OTPs and computes/verifies
 * salted SHA-256 hashes using timing-safe comparisons. Plaintext OTPs
 * are never stored at rest.
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

function hashOtp(rawOtp, customSalt = null) {
  const config = getConfig();
  const salt = customSalt || config.auth.otpSalt || 'cogether-otp-salt-production-secure';
  return crypto.createHash('sha256').update(`${salt}:${rawOtp}`).digest('hex');
}

function verifyOtpHash(rawOtp, expectedHash, customSalt = null) {
  if (!rawOtp || !expectedHash) return false;
  const computedHash = hashOtp(String(rawOtp).trim(), customSalt);

  const bufA = Buffer.from(computedHash, 'hex');
  const bufB = Buffer.from(expectedHash, 'hex');

  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  normalizeEmail,
  generateOtp,
  hashOtp,
  verifyOtpHash
};
