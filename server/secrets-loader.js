const {
  SecretsManagerClient,
  GetSecretValueCommand
} = require('@aws-sdk/client-secrets-manager');

const REGION = process.env.AWS_REGION || 'ap-south-1';
const PRIMARY_APP_SECRET_ID = process.env.APP_SECRET_ID || 'cogether/staging/app';
const FALLBACK_APP_SECRET_ID = process.env.APP_SECRET_FALLBACK_ID || null;
const RDS_SECRET_ID = process.env.RDS_SECRET_ID || null;

async function getSecret(client, secretId) {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );

  if (!response.SecretString) {
    throw new Error(`Secret ${secretId} has no SecretString`);
  }

  return JSON.parse(response.SecretString);
}

async function loadStagingSecrets() {
  if (process.env.NODE_ENV !== 'staging') return;

  if (!PRIMARY_APP_SECRET_ID) {
    console.warn('[Secrets] APP_SECRET_ID is not configured; skipping Secrets Manager lookup');
    return;
  }

  const client = new SecretsManagerClient({ region: REGION });

  let appSecret = null;
  try {
    appSecret = await getSecret(client, PRIMARY_APP_SECRET_ID);
  } catch (err) {
    if (FALLBACK_APP_SECRET_ID) {
      console.warn(`[Secrets] Primary secret ${PRIMARY_APP_SECRET_ID} not found, trying fallback ${FALLBACK_APP_SECRET_ID}:`, err.message);
      try {
        appSecret = await getSecret(client, FALLBACK_APP_SECRET_ID);
      } catch (fallbackErr) {
        throw new Error(`Failed to load staging secrets from ${PRIMARY_APP_SECRET_ID} and ${FALLBACK_APP_SECRET_ID}: ${fallbackErr.message}`);
      }
    } else {
      throw new Error(`Failed to load staging secrets from ${PRIMARY_APP_SECRET_ID}: ${err.message}`);
    }
  }

  // Populate environment variables safely without printing values
  if (appSecret.REDIS_URL) process.env.REDIS_URL = appSecret.REDIS_URL;
  if (appSecret.JWT_SECRET) process.env.JWT_SECRET = appSecret.JWT_SECRET;
  if (appSecret.RESEND_API_KEY) process.env.RESEND_API_KEY = appSecret.RESEND_API_KEY;
  if (appSecret.FROM_EMAIL) process.env.FROM_EMAIL = appSecret.FROM_EMAIL;
  if (appSecret.OTP_HMAC_KEY || appSecret.OTP_SECRET) {
    process.env.OTP_HMAC_KEY = appSecret.OTP_HMAC_KEY || appSecret.OTP_SECRET;
  }
  if (appSecret.MFA_ENCRYPTION_KEY) process.env.MFA_ENCRYPTION_KEY = appSecret.MFA_ENCRYPTION_KEY;

  // Twilio credentials (prefer API Key + Secret over root Auth Token)
  if (appSecret.TWILIO_ACCOUNT_SID) process.env.TWILIO_ACCOUNT_SID = appSecret.TWILIO_ACCOUNT_SID;
  if (appSecret.TWILIO_API_KEY) process.env.TWILIO_API_KEY = appSecret.TWILIO_API_KEY;
  if (appSecret.TWILIO_API_SECRET) process.env.TWILIO_API_SECRET = appSecret.TWILIO_API_SECRET;
  if (appSecret.TWILIO_AUTH_TOKEN) process.env.TWILIO_AUTH_TOKEN = appSecret.TWILIO_AUTH_TOKEN;

  // Direct DATABASE_URL or RDS Secret resolution
  if (appSecret.DATABASE_URL) {
    process.env.DATABASE_URL = appSecret.DATABASE_URL;
    process.env.DATABASE_SSL = 'true';
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
      }
    } catch (rdsErr) {
      console.warn('[Secrets] Could not resolve standalone RDS secret:', rdsErr.message);
    }
  } else {
    console.warn('[Secrets] Neither DATABASE_URL nor (RDS_SECRET_ID + RDS_HOST) configured; skipping database URL resolution');
  }
}

module.exports = { loadStagingSecrets };
