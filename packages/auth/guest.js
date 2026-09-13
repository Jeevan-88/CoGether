/**
 * Guest Session Minter
 * Issues signed ephemeral guest tokens allowing frictionless participation.
 */

const crypto = require('crypto');
const { signToken } = require('./jwt');
const { PlanTiers } = require('../contracts');

function createGuestSession({ displayName = 'Guest', expiresInSeconds = 86400 } = {}) {
  const guestId = 'gst_' + crypto.randomBytes(8).toString('hex');
  const safeName = displayName.trim().substring(0, 50) || 'Guest';

  const claims = {
    sub: guestId,
    displayName: safeName,
    isGuest: true,
    tier: PlanTiers.FREE,
    permissions: [
      'room:join',
      'room:chat',
      'game:play',
      'watch:view',
      'shop:browse'
    ]
  };

  const token = signToken(claims, { expiresInSeconds });

  return {
    user: {
      id: guestId,
      displayName: safeName,
      isGuest: true,
      tier: PlanTiers.FREE
    },
    token,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString()
  };
}

module.exports = {
  createGuestSession
};
