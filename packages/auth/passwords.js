/**
 * Argon2id Password Hashing & Verification Engine
 * Strictly follows OWASP Password Storage Cheat Sheet recommendations:
 * - Algorithm: Argon2id
 * - Memory cost: 65,536 KiB (64 MB)
 * - Iterations (time cost): 3
 * - Parallelism: 4 threads
 * - Pre-hash length guard (max 128 bytes) to prevent resource exhaustion DoS
 */

const argon2 = require('argon2');
const { getConfig } = require('../config');
const { logger } = require('../observability');

// Precomputed static Argon2id hash for constant-time dummy verification on non-existent users
const DUMMY_ARGON2_HASH = '$argon2id$v=19$m=65536,p=4,t=3$c29tZXNhbHQxMjM0NTY3OA$m1K8uN7vTqYkQn3uWf6yHj8mP0vR4xT6yU8iO0pA2sD';

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'PASSWORD_REQUIRED', message: 'Password is required' };
  }

  const len = password.length;
  if (len < 8) {
    return { valid: false, error: 'PASSWORD_TOO_SHORT', message: 'Password must be at least 8 characters long' };
  }

  if (len > 128) {
    return { valid: false, error: 'PASSWORD_TOO_LONG', message: 'Password cannot exceed 128 characters' };
  }

  // Ensure password has reasonable complexity (at least one letter and one number)
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return {
      valid: false,
      error: 'PASSWORD_TOO_WEAK',
      message: 'Password must contain at least one letter and one number'
    };
  }

  return { valid: true };
}

async function hashPassword(password) {
  const validation = validatePassword(password);
  if (!validation.valid) {
    throw new Error(validation.message || 'Invalid password according to policy');
  }

  const config = getConfig();
  const argonConfig = config.auth.password?.argon2 || {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  };

  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: argonConfig.memoryCost,
      timeCost: argonConfig.timeCost,
      parallelism: argonConfig.parallelism
    });
  } catch (err) {
    logger.error('Failed to hash password with Argon2id', { error: err.message });
    throw new Error('PASSWORD_HASHING_FAILED');
  }
}

async function verifyPassword(password, hash) {
  if (!password || !hash || typeof password !== 'string' || typeof hash !== 'string') {
    return false;
  }

  // Pre-hash length guard to prevent DoS via excessively large password payloads
  if (password.length > 128) {
    return false;
  }

  // Guard against malformed or non-Argon2 hash strings
  if (!hash.startsWith('$argon2id$') && !hash.startsWith('$argon2i$')) {
    return false;
  }

  try {
    return await argon2.verify(hash, password);
  } catch (err) {
    logger.warn('Argon2 password verification exception', { error: err.message });
    return false;
  }
}

async function dummyVerifyPassword(password) {
  try {
    const candidate = typeof password === 'string' && password.length <= 128 ? password : 'invalid-dummy-password';
    await argon2.verify(DUMMY_ARGON2_HASH, candidate).catch(() => {});
  } catch (_e) {}
  return false;
}

module.exports = {
  validatePassword,
  hashPassword,
  verifyPassword,
  dummyVerifyPassword
};
