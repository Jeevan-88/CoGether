/**
 * Privacy-Respecting Analytics & Error Telemetry Routes
 * Persists sanitized product usage & client error telemetry without storing PII/secrets.
 */

const express = require('express');
const { db } = require('../../packages/database');
const { redis } = require('../../packages/redis');
const { logger } = require('../../packages/observability');

const router = express.Router();

const SENSITIVE_KEY_PATTERN = /(password|token|secret|cookie|authorization|otp|key|hash)/i;

function sanitizePayload(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 2) return {};
  const clean = {};
  for (const [k, v] of Object.entries(obj).slice(0, 20)) {
    if (SENSITIVE_KEY_PATTERN.test(k)) continue;
    if (typeof v === 'string') {
      clean[k] = v.slice(0, 240);
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      clean[k] = v;
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      clean[k] = sanitizePayload(v, depth + 1);
    }
  }
  return clean;
}

function getClientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.ip || 'unknown').split(',')[0].trim();
}

router.post('/analytics', async (req, res) => {
  try {
    const ip = getClientIp(req);
    const rl = await redis.consumeRateLimit(`telemetry:analytics:${ip}`, 90, 60).catch(() => ({ allowed: true }));
    if (!rl.allowed) {
      return res.status(429).json({ success: false, error: 'RATE_LIMITED' });
    }

    const body = req.body || {};
    const events = Array.isArray(body.events) ? body.events.slice(0, 15) : [body];

    for (const item of events) {
      const eventName = String(item?.event || item?.eventType || '').trim().slice(0, 64);
      if (!eventName) continue;
      const payload = sanitizePayload(item?.properties || item?.payload || {});
      logger.info('Client analytics event', { eventName, payload });

      if (!db.isSimulated) {
        db.query(
          `INSERT INTO audit.telemetry_events (event_type, user_id, payload)
           VALUES ($1, $2, $3::jsonb)`,
          [eventName, item?.userId || null, JSON.stringify(payload)]
        ).catch(() => {});
      }
    }

    return res.status(202).json({ success: true });
  } catch (err) {
    logger.warn('Analytics telemetry error', { error: err.message });
    return res.status(202).json({ success: true });
  }
});

router.post('/error', async (req, res) => {
  try {
    const ip = getClientIp(req);
    const rl = await redis.consumeRateLimit(`telemetry:error:${ip}`, 30, 60).catch(() => ({ allowed: true }));
    if (!rl.allowed) {
      return res.status(429).json({ success: false, error: 'RATE_LIMITED' });
    }

    const { message, name, url, context, stack } = req.body || {};
    const cleanPayload = {
      name: String(name || 'ClientError').slice(0, 80),
      message: String(message || 'Unknown error').slice(0, 500),
      url: String(url || '').slice(0, 240),
      stackPreview: String(stack || '').slice(0, 800),
      context: sanitizePayload(context || {})
    };

    logger.error('Client ErrorBoundary/Runtime report', cleanPayload);

    if (!db.isSimulated) {
      db.query(
        `INSERT INTO audit.telemetry_events (event_type, user_id, payload)
         VALUES ($1, NULL, $2::jsonb)`,
        ['client_error', JSON.stringify(cleanPayload)]
      ).catch(() => {});
    }

    return res.status(202).json({ success: true });
  } catch (err) {
    logger.warn('Error telemetry ingest failed', { error: err.message });
    return res.status(202).json({ success: true });
  }
});

module.exports = { telemetryRouter: router };
