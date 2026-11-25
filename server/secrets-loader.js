const crypto = require('crypto');
const {
  SecretsManagerClient,
  GetSecretValueCommand
} = require('@aws-sdk/client-secrets-manager');

const REGION = process.env.AWS_REGION || 'ap-south-2';
const PRIMARY_APP_SECRET_ID = process.env.APP_SECRET_ID || 'cogether/stage/app';
const FALLBACK_APP_SECRET_ID = process.env.APP_SECRET_FALLBACK_ID || 'cogether/staging/app';
const R2_SECRET_ID = process.env.R2_SECRET_ID || 'cogether/stage/r2';
const RDS_SECRET_ID = process.env.RDS_SECRET_ID || null;

async function getSecret(client, secretId) {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );

  if (!response.SecretString) {
    throw new Error(`Secret ${secretId} has no SecretString`);
  }

  try {
    return JSON.parse(response.SecretString);
  } catch (_parseErr) {
    throw new Error(`Secret ${secretId} does not contain valid JSON payload`);
  }
}

async function loadStagingSecrets() {
  if (process.env.NODE_ENV !== 'staging') return;

  if (!PRIMARY_APP_SECRET_ID) {
    throw new Error('FATAL: APP_SECRET_ID environment variable is required in staging environment');
  }

  const client = new SecretsManagerClient({ region: REGION });

  let appSecret = null;
  try {
    appSecret = await getSecret(client, PRIMARY_APP_SECRET_ID);
  } catch (err) {
    if (FALLBACK_APP_SECRET_ID) {
      console.warn(`[Secrets] Primary secret ${PRIMARY_APP_SECRET_ID} unavailable, attempting fallback ${FALLBACK_APP_SECRET_ID}`);
      try {
        appSecret = await getSecret(client, FALLBACK_APP_SECRET_ID);
      } catch (fallbackErr) {
        throw new Error(`FATAL: Failed to load staging secrets from ${PRIMARY_APP_SECRET_ID} and ${FALLBACK_APP_SECRET_ID}: ${fallbackErr.name || 'LookupError'}`);
      }
    } else {
      throw new Error(`FATAL: Failed to load staging secrets from ${PRIMARY_APP_SECRET_ID}: ${err.name || 'LookupError'}`);
    }
  }

  if (!appSecret || typeof appSecret !== 'object') {
    throw new Error('FATAL: Staging secret payload is empty or not an object');
  }

  if (!appSecret.JWT_SECRET && !process.env.JWT_SECRET) {
    throw new Error('FATAL: Critical secret JWT_SECRET missing from Secrets Manager payload');
  }

  const resolvedJwtSecret = appSecret.JWT_SECRET || process.env.JWT_SECRET;
  process.env.JWT_SECRET = resolvedJwtSecret;

  // Use explicit OTP/MFA keys when present, or derive 32-byte HMAC subkeys safely without booting down
  if (appSecret.OTP_HMAC_KEY || appSecret.OTP_SECRET) {
    process.env.OTP_HMAC_KEY = appSecret.OTP_HMAC_KEY || appSecret.OTP_SECRET;
  } else if (!process.env.OTP_HMAC_KEY) {
    console.warn('[Secrets] OTP_HMAC_KEY not present in app secret; deriving subkey from JWT_SECRET');
    process.env.OTP_HMAC_KEY = crypto.createHmac('sha256', resolvedJwtSecret).update('cogether-otp-hmac-v1').digest('hex').slice(0, 32);
  }

  if (appSecret.MFA_ENCRYPTION_KEY) {
    process.env.MFA_ENCRYPTION_KEY = appSecret.MFA_ENCRYPTION_KEY;
  } else if (!process.env.MFA_ENCRYPTION_KEY) {
    console.warn('[Secrets] MFA_ENCRYPTION_KEY not present in app secret; deriving 32-byte key from JWT_SECRET');
    process.env.MFA_ENCRYPTION_KEY = crypto.createHmac('sha256', resolvedJwtSecret).update('cogether-mfa-aes256-v1').digest('hex').slice(0, 32);
  }

  const optionalKeys = [
    'REDIS_URL', 'RESEND_API_KEY', 'FROM_EMAIL', 'EMAIL_PROVIDER',
    'FRONTEND_URL', 'CLIENT_URL', 'CORS_ORIGIN', 'FORCE_SECURE_COOKIES',
    'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET',
    'TURN_SERVER_URLS', 'TURN_STATIC_SECRET',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI',
    'TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY', 'TWILIO_API_SECRET', 'TWILIO_AUTH_TOKEN'
  ];
  for (const k of optionalKeys) {
    if (appSecret[k] && !process.env[k]) {
      process.env[k] = String(appSecret[k]);
    }
  }

  // Optional Cloudflare R2 credentials (e.g. cogether/stage/r2)
  if (!process.env.R2_ACCOUNT_ID && R2_SECRET_ID) {
    try {
      const r2Secret = await getSecret(client, R2_SECRET_ID);
      for (const rk of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_BASE_URL']) {
        if (r2Secret[rk] && !process.env[rk]) {
          process.env[rk] = String(r2Secret[rk]);
        }
      }
    } catch {
      // Non-fatal: R2 media storage is optional
    }
  }

  // Database URL or RDS Secret resolution
  if (appSecret.DATABASE_URL) {
    process.env.DATABASE_URL = appSecret.DATABASE_URL;
    process.env.DATABASE_SSL = 'true';
  } else if (process.env.DATABASE_URL) {
    process.env.DATABASE_SSL = process.env.DATABASE_SSL || 'true';
  } else if (RDS_SECRET_ID && process.env.RDS_HOST) {
    try {
      const rdsSecret = await getSecret(client, RDS_SECRET_ID);
      if (rdsSecret.username && rdsSecret.password) {
        const username = encodeURIComponent(rdsSecret.username);
        const password = encodeURIComponent(rdsSecret.password);
        const rdsHost = process.env.RDS_HOST;
        const rdsPort = process.env.RDS_PORT || 5432;
        const rdsDb = process.env.RDS_DATABASE || 'postgres';
        process.env.DATABASE_URL = `postgresql://${username}:${password}@${rdsHost}:${rdsPort}/${rdsDb}`;
        process.env.DATABASE_SSL = 'true';
      } else {
        throw new Error('RDS secret missing username or password');
      }
    } catch (rdsErr) {
      throw new Error(`FATAL: Failed to resolve standalone RDS secret: ${rdsErr.name || 'RDSError'}`);
    }
  } else {
    throw new Error('FATAL: Neither DATABASE_URL nor (RDS_SECRET_ID + RDS_HOST) configured; cannot initialize database');
  }
}

module.exports = { loadStagingSecrets };
