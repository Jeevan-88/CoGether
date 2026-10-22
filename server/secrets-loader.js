const {
  SecretsManagerClient,
  GetSecretValueCommand
} = require('@aws-sdk/client-secrets-manager');

const REGION = process.env.AWS_REGION || 'ap-south-2';
const APP_SECRET_ID = 'cogether/stage/app';
const RDS_SECRET_ID = 'rds!db-64711d1e-0eea-4860-81ff-3384900bba32';

const RDS_HOST = 'cogether-stage-db.c78q88msuvhi.ap-south-2.rds.amazonaws.com';
const RDS_PORT = 5432;
const RDS_DATABASE = 'postgres';

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

  const client = new SecretsManagerClient({ region: REGION });

  const appSecret = await getSecret(client, APP_SECRET_ID);
  const rdsSecret = await getSecret(client, RDS_SECRET_ID);

  if (!appSecret.REDIS_URL || !appSecret.JWT_SECRET) {
    throw new Error('Staging app secret is missing REDIS_URL or JWT_SECRET');
  }

  if (!rdsSecret.username || !rdsSecret.password) {
    throw new Error('RDS secret is missing username or password');
  }

  const username = encodeURIComponent(rdsSecret.username);
  const password = encodeURIComponent(rdsSecret.password);

  process.env.REDIS_URL = appSecret.REDIS_URL;
  process.env.JWT_SECRET = appSecret.JWT_SECRET;
  process.env.RESEND_API_KEY = appSecret.RESEND_API_KEY;
  if (appSecret.FROM_EMAIL) {
    process.env.FROM_EMAIL = appSecret.FROM_EMAIL;
  }
  if (appSecret.OTP_HMAC_KEY || appSecret.OTP_SECRET) {
    process.env.OTP_HMAC_KEY = appSecret.OTP_HMAC_KEY || appSecret.OTP_SECRET;
  }
  if (appSecret.MFA_ENCRYPTION_KEY) {
    process.env.MFA_ENCRYPTION_KEY = appSecret.MFA_ENCRYPTION_KEY;
  }
  process.env.DATABASE_URL =
    `postgresql://${username}:${password}@${RDS_HOST}:${RDS_PORT}/${RDS_DATABASE}`;
  process.env.DATABASE_SSL = 'true';
}

module.exports = { loadStagingSecrets };
