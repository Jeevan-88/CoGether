/**
 * TOTP Multi-Factor Authentication & Cryptographic Secret Protection Engine
 * Implements RFC 6238 TOTP with:
 * - Server-side AES-256-GCM authenticated encryption for secrets at rest
 * - Replay protection via epoch time-step tracking
 * - Cryptographically random single-use recovery codes
 * - QR code data URL generation
 */

const crypto = require('crypto');
const { generateSecret, generateSync, verifySync, generateURI } = require('otplib');
const QRCode = require('qrcode');
const { getConfig } = require('../config');
const { logger } = require('../observability');

function getDerivedEncryptionKey() {
  const config = getConfig();
  const rawKey = config.auth.mfaEncryptionKey || 'cogether-dev-mfa-aes256-key-32b-min!!';
  // Ensure exactly 32 bytes for AES-256
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypt a plaintext TOTP secret with AES-256-GCM
 */
function encryptSecret(plaintextSecret) {
  if (!plaintextSecret || typeof plaintextSecret !== 'string') {
    throw new Error('Plaintext secret is required for encryption');
  }

  const key = getDerivedEncryptionKey();
  const iv = crypto.randomBytes(12); // Recommended 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintextSecret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    encryptedSecret: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt an AES-256-GCM encrypted TOTP secret
 */
function decryptSecret(encryptedSecret, ivHex, authTagHex) {
  if (!encryptedSecret || !ivHex || !authTagHex) {
    throw new Error('Missing parameters for secret decryption');
  }

  const key = getDerivedEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedSecret, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a new TOTP secret and setup URI
 */
async function generateMfaEnrollment(email) {
  const secret = generateSecret();
  const issuer = 'CoGether';
  const label = email.trim().toLowerCase();

  const otpauthUri = generateURI({
    issuer,
    label,
    secret
  });

  const qrCodeUrl = await QRCode.toDataURL(otpauthUri, {
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });

  const encrypted = encryptSecret(secret);
  const recoveryCodes = generateRecoveryCodes(8);

  return {
    secret, // Returned to client ONLY during initial enrollment for manual entry
    otpauthUri,
    qrCodeUrl,
    encryptedSecret: encrypted.encryptedSecret,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    recoveryCodes // Returned to client once during enrollment for secure backup
  };
}

/**
 * Verify a 6-digit TOTP token against a secret with time-step replay protection
 */
function verifyMfaToken({ token, secret, lastUsedTimeStep = 0 }) {
  if (!token || !secret) {
    return { valid: false, error: 'TOKEN_AND_SECRET_REQUIRED' };
  }

  const cleanToken = String(token).trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken)) {
    return { valid: false, error: 'INVALID_TOKEN_FORMAT', message: 'MFA code must be exactly 6 digits.' };
  }

  try {
    const result = verifySync({
      token: cleanToken,
      secret: secret.trim()
    });

    if (!result || !result.valid) {
      return { valid: false, error: 'INVALID_MFA_CODE', message: 'Invalid authentication code. Please try again.' };
    }

    // Strict Replay Protection: Ensure timeStep is strictly greater than the last used time step
    const currentStep = result.timeStep;
    if (lastUsedTimeStep && currentStep <= lastUsedTimeStep) {
      logger.warn('MFA replay attempt detected and blocked', { currentStep, lastUsedTimeStep });
      return {
        valid: false,
        error: 'MFA_CODE_REPLAYED',
        message: 'This passcode was already used. Please wait for the next 30-second code.'
      };
    }

    return {
      valid: true,
      timeStep: currentStep
    };
  } catch (err) {
    logger.error('TOTP verification error', { error: err.message });
    return { valid: false, error: 'MFA_VERIFICATION_ERROR', message: err.message };
  }
}

/**
 * Generate cryptographically random recovery codes
 */
function generateRecoveryCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

/**
 * Hash a recovery code for secure database storage
 */
function hashRecoveryCode(code) {
  const normalized = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const config = getConfig();
  const key = config.auth.otpHmacKey || 'cogether-dev-otp-hmac-key-never-use-in-production-32bytes!';
  return crypto.createHmac('sha256', key).update(`mfa_recovery:${normalized}`).digest('hex');
}

/**
 * Verify a user-provided recovery code against stored hash
 */
function verifyRecoveryCode(rawCode, expectedHash) {
  if (!rawCode || !expectedHash) return false;
  const computed = hashRecoveryCode(rawCode);

  const bufA = Buffer.from(computed, 'hex');
  const bufB = Buffer.from(expectedHash, 'hex');

  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  encryptSecret,
  decryptSecret,
  generateMfaEnrollment,
  verifyMfaToken,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode
};
