/**
 * Request Correlation & Tracing Middleware
 * Injects and propagates X-Request-Id and W3C TraceContext traceparent.
 */

const crypto = require('crypto');
const { logger } = require('./logger');

function generateTraceId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateSpanId() {
  return crypto.randomBytes(8).toString('hex');
}

function correlationMiddleware(req, res, next) {
  const startTime = process.hrtime.bigint();

  // 1. Correlation Request ID
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  // 2. OpenTelemetry W3C Trace Context
  let traceId;
  let parentSpanId;
  const traceparent = req.headers['traceparent'];

  if (traceparent && typeof traceparent === 'string') {
    const parts = traceparent.split('-');
    if (parts.length >= 3 && parts[1].length === 32) {
      traceId = parts[1];
      parentSpanId = parts[2];
    }
  }

  if (!traceId) {
    traceId = generateTraceId();
  }

  const spanId = generateSpanId();
  req.traceId = traceId;
  req.spanId = spanId;
  res.setHeader('X-Trace-Id', traceId);
  res.setHeader('traceparent', `00-${traceId}-${spanId}-01`);

  // Create request-scoped child logger
  req.log = logger.child({
    requestId,
    traceId,
    spanId
  });

  // Log on response completion
  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - startTime;
    const durationMs = Number(durationNs) / 1e6;

    const logEntry = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: parseFloat(durationMs.toFixed(2)),
      ip: req.ip || req.connection?.remoteAddress
    };

    if (res.statusCode >= 500) {
      req.log.error('HTTP Request 5xx Server Error', logEntry);
    } else if (res.statusCode >= 400) {
      req.log.warn('HTTP Request 4xx Client Warning', logEntry);
    } else {
      req.log.info('HTTP Request Completed', logEntry);
    }
  });

  next();
}

module.exports = {
  correlationMiddleware,
  generateTraceId,
  generateSpanId
};
