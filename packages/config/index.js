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
      jwtExpiresInSeconds: parseInt(env.JWT_EXPIRES_IN_SECONDS || '900', 10),
      refreshTokenExpiresInSeconds: parseInt(env.REFRESH_TOKEN_EXPIRES_IN_SECONDS || '604800', 10),
      guestExpiresIn: env.GUEST_EXPIRES_IN || '24h',
      otpExpiresInSeconds: parseInt(env.OTP_EXPIRES_IN_SECONDS || '600', 10),
      otpMaxAttempts: parseInt(env.OTP_MAX_ATTEMPTS || '5', 10),
      otpResendIntervalSeconds: parseInt(env.OTP_RESEND_INTERVAL_SECONDS || '60', 10),
      otpSalt: env.OTP_SALT || 'cogether-otp-salt-production-secure',
      google: {
        clientId: env.GOOGLE_CLIENT_ID || null,
        clientSecret: env.GOOGLE_CLIENT_SECRET || null,
        redirectUri: env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback'
      },
      email: {
        provider: env.EMAIL_PROVIDER || 'console_test',
        apiKey: env.RESEND_API_KEY || env.SENDGRID_API_KEY || null,
        fromEmail: env.FROM_EMAIL || 'auth@cogether.app',
        smtpHost: env.SMTP_HOST || null,
        smtpPort: parseInt(env.SMTP_PORT || '587', 10),
        smtpUser: env.SMTP_USER || null,
        smtpPass: env.SMTP_PASS || null
      },
      clientUrl: env.CLIENT_URL || 'http://localhost:5173',
      cookieSecret: env.COOKIE_SECRET || jwtSecret,
      invites: {
        defaultMaxUses: parseInt(env.INVITE_DEFAULT_MAX_USES || '10', 10),
        defaultExpiresInHours: parseInt(env.INVITE_DEFAULT_EXPIRES_HOURS || '48', 10),
        maxAllowedUses: parseInt(env.INVITE_MAX_ALLOWED_USES || '100', 10),
        allowSelfRedemption: false
      }
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
    storage: {
      provider: env.STORAGE_PROVIDER || (env.S3_BUCKET ? 's3' : 'local'),
      s3: {
        bucket: env.S3_BUCKET || null,
        region: env.S3_REGION || 'us-east-1',
        endpoint: env.S3_ENDPOINT || null,
        accessKeyId: env.AWS_ACCESS_KEY_ID || null,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || null,
        publicUrlBase: env.S3_PUBLIC_URL_BASE || null
      }
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
      jwtSecret: '***REDACTED***',
      otpSalt: '***REDACTED***',
      cookieSecret: '***REDACTED***',
      google: {
        ...cfg.auth.google,
        clientSecret: cfg.auth.google.clientSecret ? '***REDACTED***' : null
      },
      email: {
        ...cfg.auth.email,
        apiKey: cfg.auth.email.apiKey ? '***REDACTED***' : null,
        smtpPass: cfg.auth.email.smtpPass ? '***REDACTED***' : null
      }
    },
    storage: {
      ...cfg.storage,
      s3: {
        ...cfg.storage?.s3,
        secretAccessKey: cfg.storage?.s3?.secretAccessKey ? '***REDACTED***' : null
      }
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
