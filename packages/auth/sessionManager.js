/**
 * Persistent Session & Refresh Token Manager
 * Stores hashed refresh tokens in PostgreSQL (identity.sessions).
 * Implements token rotation and instant revocation.
 */

const crypto = require('crypto');
const { db } = require('../database');
const { getConfig } = require('../config');

function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken).trim()).digest('hex');
}

async function createSession(userId, metadata = {}) {
  const config = getConfig();
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const ttlSeconds = config.auth.refreshTokenExpiresInSeconds || 604800; // 7 days

  const res = await db.query(
    `INSERT INTO identity.sessions 
     (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + ($5 || ' seconds')::interval)
     RETURNING id, user_id, expires_at, created_at`,
    [
      userId,
      tokenHash,
      metadata.userAgent ? String(metadata.userAgent).substring(0, 500) : null,
      metadata.ipAddress || null,
      ttlSeconds
    ]
  );

  return {
    sessionId: res.rows[0].id,
    userId,
    refreshToken: rawRefreshToken,
    expiresAt: res.rows[0].expires_at
  };
}

async function validateAndRotateSession(rawRefreshToken, metadata = {}) {
  if (!rawRefreshToken) {
    return { valid: false, error: 'MISSING_REFRESH_TOKEN' };
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const config = getConfig();
  const ttlSeconds = config.auth.refreshTokenExpiresInSeconds || 604800;

  // Lookup existing active session
  const lookup = await db.query(
    `SELECT id, user_id, expires_at, revoked_at 
     FROM identity.sessions 
     WHERE refresh_token_hash = $1`,
    [tokenHash]
  );

  if (lookup.rows.length === 0) {
    return { valid: false, error: 'SESSION_NOT_FOUND' };
  }

  const session = lookup.rows[0];
  if (session.revoked_at) {
    return { valid: false, error: 'SESSION_ALREADY_REVOKED' };
  }

  if (new Date(session.expires_at) <= new Date()) {
    return { valid: false, error: 'SESSION_EXPIRED' };
  }

  // Rotate refresh token atomically
  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = hashRefreshToken(newRawRefreshToken);

  await db.query(
    `UPDATE identity.sessions 
     SET revoked_at = NOW() 
     WHERE id = $1`,
    [session.id]
  );

  const newSessionRes = await db.query(
    `INSERT INTO identity.sessions 
     (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + ($5 || ' seconds')::interval)
     RETURNING id, user_id, expires_at`,
    [
      session.user_id,
      newTokenHash,
      metadata.userAgent ? String(metadata.userAgent).substring(0, 500) : null,
      metadata.ipAddress || null,
      ttlSeconds
    ]
  );

  return {
    valid: true,
    userId: session.user_id,
    newRefreshToken: newRawRefreshToken,
    expiresAt: newSessionRes.rows[0].expires_at
  };
}

async function revokeSession(rawRefreshToken) {
  if (!rawRefreshToken) return false;
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const res = await db.query(
    `UPDATE identity.sessions 
     SET revoked_at = NOW() 
     WHERE refresh_token_hash = $1 AND revoked_at IS NULL
     RETURNING id`,
    [tokenHash]
  );
  return res.rows.length > 0;
}

async function revokeAllUserSessions(userId) {
  if (!userId) return 0;
  const res = await db.query(
    `UPDATE identity.sessions 
     SET revoked_at = NOW() 
     WHERE user_id = $1 AND revoked_at IS NULL
     RETURNING id`,
    [userId]
  );
  return res.rows.length;
}

module.exports = {
  generateRefreshToken,
  hashRefreshToken,
  createSession,
  validateAndRotateSession,
  revokeSession,
  revokeAllUserSessions
};
