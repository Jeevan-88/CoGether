/**
 * CoGether Configuration Module
 * Validates runtime environment variables, enforces production requirements,
 * and prevents secret leakage.
 */

function loadConfig(env = process.env) {
  const nodeEnv = (env.NODE_ENV || 'development').toLowerCase();
  const isProd = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  const port = parseInt(env.PORT || '3001', 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT configuration: ${env.PORT}`);
  }

  // Enforce strong secrets in production
  let jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    if (isProd) {
      throw new Error('FATAL: JWT_SECRET environment variable is required in production');
    }
    jwtSecret = 'cogether-dev-fallback-secret-never-use-in-production-32bytes-min!';
  }

  const databaseUrl = env.DATABASE_URL || 'postgresql://cogether_user:cogether_secret_dev_pass@127.0.0.1:5432/cogether_db';
  const redisUrl = env.REDIS_URL || 'redis://127.0.0.1:6379';

  const config = {
    env: nodeEnv,
    isProd,
    isTest,
    server: {
      port,
      host: env.HOST || '0.0.0.0',
      corsOrigin: env.CORS_ORIGIN || '*'
    },
    auth: {
      jwtSecret,
      jwtExpiresIn: env.JWT_EXPIRES_IN || '15m',
      guestExpiresIn: env.GUEST_EXPIRES_IN || '24h'
    },
    database: {
      url: databaseUrl,
      ssl: env.DATABASE_SSL === 'true',
      poolMax: parseInt(env.DATABASE_POOL_MAX || '20', 10),
      poolIdleTimeoutMs: parseInt(env.DATABASE_IDLE_TIMEOUT_MS || '30000', 10)
    },
    redis: {
      url: redisUrl,
      enabled: env.REDIS_ENABLED !== 'false'
    },
    observability: {
      serviceName: env.SERVICE_NAME || 'cogether-platform',
      logLevel: env.LOG_LEVEL || (isProd ? 'info' : 'debug')
    }
  };

  return Object.freeze(config);
}

let activeConfig = null;

function getConfig() {
  if (!activeConfig) {
    activeConfig = loadConfig();
  }
  return activeConfig;
}

/**
 * Returns a sanitized copy of configuration with secrets masked for safe logging.
 */
function getSanitizedConfig(cfg = getConfig()) {
  return {
    ...cfg,
    auth: {
      ...cfg.auth,
      jwtSecret: '***REDACTED***'
    },
    database: {
      ...cfg.database,
      url: cfg.database.url.replace(/:([^:@]+)@/, ':***REDACTED***@')
    },
    redis: {
      ...cfg.redis,
      url: cfg.redis.url.replace(/:([^:@]+)@/, ':***REDACTED***@')
    }
  };
}

module.exports = {
  loadConfig,
  getConfig,
  getSanitizedConfig
};
