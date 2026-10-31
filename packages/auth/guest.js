/**
 * Guest Session Minter & Lifecycle Validator
 * Issues signed ephemeral guest tokens allowing frictionless participation
 * for a strictly enforced maximum of five minutes (300 seconds).
 * Backed by persistent PostgreSQL records in identity.guest_sessions.
 */

const crypto = require('crypto');
const { signToken } = require('./jwt');
const { PlanTiers } = require('../contracts');
const { db } = require('../database');
const { logger } = require('../observability');

// Strictly enforce 5 minutes (300 seconds) session duration for guests
const GUEST_SESSION_DURATION_SECONDS = 300;

function createGuestSession({ displayName = 'Guest', expiresInSeconds = GUEST_SESSION_DURATION_SECONDS } = {}) {
  // Cap at 300 seconds max to prevent any client-requested extension
  const duration = Math.min(Math.max(1, expiresInSeconds), GUEST_SESSION_DURATION_SECONDS);
  const guestId = 'gst_' + crypto.randomBytes(8).toString('hex');
  const safeName = (displayName || 'Guest').trim().substring(0, 50) || 'Guest';

  const expiresAtDate = new Date(Date.now() + duration * 1000);
  const expiresAt = expiresAtDate.toISOString();

  // Persist guest session in PostgreSQL database
  const dbPromise = db.query(
    `INSERT INTO identity.guest_sessions (id, guest_id, display_name, expires_at, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
    [guestId, safeName, expiresAt]
  );
  dbPromise.catch((err) => {
    logger.warn('Guest session database persistence notice', { error: err.message });
  });

  const claims = {
    sub: guestId,
    displayName: safeName,
    isGuest: true,
    tier: PlanTiers.FREE,
    guestExpiresAt: expiresAt,
    permissions: [
      'room:join',
      'room:chat',
      'game:play',
      'watch:view',
      'shop:browse'
    ]
  };

  const token = signToken(claims, { expiresInSeconds: duration });

  return {
    user: {
      id: guestId,
      displayName: safeName,
      isGuest: true,
      tier: PlanTiers.FREE,
      expiresAt,
      durationSeconds: duration
    },
    token,
    expiresAt,
    durationSeconds: duration,
    dbPromise
  };
}

/**
 * Validate that a guest session is active and not expired in PostgreSQL.
 */
async function validateGuestSession(guestId) {
  if (!guestId || typeof guestId !== 'string') {
    return { valid: false, error: 'INVALID_GUEST_ID' };
  }

  try {
    const res = await db.query(
      `SELECT guest_id, display_name, expires_at 
       FROM identity.guest_sessions 
       WHERE guest_id = $1`,
      [guestId]
    );

    if (res.rows.length === 0) {
      // Session record not found
      return { valid: false, error: 'GUEST_SESSION_NOT_FOUND' };
    }

    const session = res.rows[0];
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now >= expiresAt) {
      return { valid: false, error: 'GUEST_SESSION_EXPIRED', expiresAt: session.expires_at };
    }

    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    return {
      valid: true,
      guestId: session.guest_id,
      displayName: session.display_name,
      expiresAt: session.expires_at,
      remainingSeconds
    };
  } catch (err) {
    logger.error('Error validating guest session in database', { error: err.message });
    return { valid: false, error: 'DB_ERROR' };
  }
}

module.exports = {
  GUEST_SESSION_DURATION_SECONDS,
  createGuestSession,
  validateGuestSession
};
