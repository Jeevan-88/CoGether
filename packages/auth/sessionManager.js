/**
 * Persistent Session & Refresh Token Manager
 * Stores hashed refresh tokens in PostgreSQL (identity.sessions).
 * Implements token rotation, token reuse detection, and instant revocation.
 */

const crypto = require('crypto');
const { db } = require('../database');
const { getConfig } = require('../config');
const { logger } = require('../observability');

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

  // Token Reuse Detection (OWASP Recommendation):
  // If an already-revoked refresh token is presented, someone may have intercepted it.
  // Invalidate ALL active sessions for this user to protect the account.
  if (session.revoked_at) {
    logger.warn('Refresh token reuse detected; revoking all sessions for compromised account', {
      userId: session.user_id,
      sessionId: session.id
    });
    await revokeAllUserSessions(session.user_id).catch(() => {});
    return {
      valid: false,
      error: 'SESSION_ALREADY_REVOKED',
      code: 'TOKEN_REUSE_DETECTED',
      message: 'Security violation: Refresh token reuse detected. All active sessions have been terminated.'
    };
  }

  if (new Date(session.expires_at) <= new Date()) {
    return { valid: false, error: 'SESSION_EXPIRED', message: 'Session has expired. Please sign in again.' };
  }

  // Rotate refresh token atomically within a transaction
  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = hashRefreshToken(newRawRefreshToken);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Revoke old token
    await client.query(
      `UPDATE identity.sessions 
       SET revoked_at = NOW() 
       WHERE id = $1`,
      [session.id]
    );

    // Issue new rotated session
    const newSessionRes = await client.query(
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

    await client.query('COMMIT');

    return {
      valid: true,
      userId: session.user_id,
      newRefreshToken: newRawRefreshToken,
      expiresAt: newSessionRes.rows[0].expires_at
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('Failed to rotate session atomically', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

async function revokeSession(rawRefreshToken, expectedUserId = null) {
  if (!rawRefreshToken) return false;
  const tokenHash = hashRefreshToken(rawRefreshToken);

  let query = `UPDATE identity.sessions SET revoked_at = NOW() WHERE refresh_token_hash = $1 AND revoked_at IS NULL`;
  const params = [tokenHash];

  if (expectedUserId) {
    query += ` AND user_id = $2`;
    params.push(expectedUserId);
  }

  query += ` RETURNING id`;

  const res = await db.query(query, params);
  return res.rows.length > 0;
}

async function revokeAllUserSessions(userId) {
  if (!userId) return false;
  const res = await db.query(
    `UPDATE identity.sessions 
     SET revoked_at = NOW() 
     WHERE user_id = $1 AND revoked_at IS NULL
     RETURNING id`,
    [userId]
  );
  return res.rows.length > 0;
}

module.exports = {
  generateRefreshToken,
  hashRefreshToken,
  createSession,
  validateAndRotateSession,
  revokeSession,
  revokeAllUserSessions
};
