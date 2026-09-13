/**
 * CoGether Shared Platform Contracts & Schema Definitions
 * Defines strong types, DTO structures, and runtime validation helpers.
 */

const PlanTiers = Object.freeze({
  FREE: 'free',
  PRO: 'pro',
  TEAMS: 'teams'
});

const RoomTypes = Object.freeze({
  VIDEO: 'video',
  PLAY: 'play',
  WATCH: 'watch',
  SHOP: 'shop',
  STUDY: 'study'
});

const OutboxStatus = Object.freeze({
  PENDING: 'pending',
  PUBLISHED: 'published',
  FAILED: 'failed'
});

/**
 * Validates whether an object contains required string fields.
 */
function validateRequiredFields(obj, requiredFields) {
  if (!obj || typeof obj !== 'object') {
    return { valid: false, error: 'Payload must be a non-null object' };
  }
  const missing = [];
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    return { valid: false, error: `Missing required field(s): ${missing.join(', ')}` };
  }
  return { valid: true };
}

/**
 * Validates a Guest Session creation payload.
 */
function validateGuestSessionInput(input) {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid input payload' };
  }
  const displayName = (input.displayName || '').trim();
  if (displayName.length > 50) {
    return { valid: false, error: 'displayName must be <= 50 characters' };
  }
  return { valid: true, data: { displayName: displayName || 'Guest' } };
}

/**
 * Validates a Game Score submission payload.
 */
function validateGameScorePayload(payload) {
  const check = validateRequiredFields(payload, ['gameId', 'score']);
  if (!check.valid) return check;

  if (typeof payload.score !== 'number' || isNaN(payload.score) || payload.score < 0) {
    return { valid: false, error: 'Score must be a positive number' };
  }

  return {
    valid: true,
    data: {
      gameId: String(payload.gameId).trim(),
      score: Math.floor(payload.score),
      sessionId: payload.sessionId ? String(payload.sessionId).trim() : null,
      metadata: payload.metadata || {}
    }
  };
}

/**
 * Validates an Affiliate Click recording payload.
 */
function validateAffiliateClickPayload(payload) {
  const check = validateRequiredFields(payload, ['productId', 'retailerId', 'targetUrl']);
  if (!check.valid) return check;

  return {
    valid: true,
    data: {
      productId: String(payload.productId).trim(),
      retailerId: String(payload.retailerId).trim().toLowerCase(),
      targetUrl: String(payload.targetUrl).trim(),
      userId: payload.userId ? String(payload.userId).trim() : null
    }
  };
}

/**
 * Builds a standardized CloudEvents compliant domain event envelope.
 */
function buildDomainEvent({ eventType, aggregateId, aggregateType, data, traceId = null, producer = 'cogether-platform' }) {
  if (!eventType || !aggregateId) {
    throw new Error('eventType and aggregateId are required to build a DomainEvent');
  }
  return {
    eventId: 'evt_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36),
    eventType,
    aggregateId: String(aggregateId),
    aggregateType: aggregateType || 'generic',
    schemaVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    traceId,
    producer,
    data
  };
}

module.exports = {
  PlanTiers,
  RoomTypes,
  OutboxStatus,
  validateRequiredFields,
  validateGuestSessionInput,
  validateGameScorePayload,
  validateAffiliateClickPayload,
  buildDomainEvent
};
