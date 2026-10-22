-- Migration 013: Secure Authentication, Argon2id Passwords, and TOTP Multi-Factor Authentication
-- Fully backward-compatible, non-destructive schema hardening.

-- 1. Ensure public.schema_migrations exists for tracked, idempotent migration execution
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Harden identity.users with password, MFA, and progressive rate-limiting columns
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ;

-- 3. Dedicated Encrypted TOTP Multi-Factor Authentication Storage
CREATE TABLE IF NOT EXISTS identity.user_mfa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  encrypted_secret TEXT NOT NULL,
  iv VARCHAR(64) NOT NULL,
  auth_tag VARCHAR(64) NOT NULL,
  confirmed_at TIMESTAMPTZ,
  last_used_timestep BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_mfa_user_id UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_mfa_user_id ON identity.user_mfa(user_id);

-- 4. Hashed Single-Use MFA Recovery Codes
CREATE TABLE IF NOT EXISTS identity.user_mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  code_hash VARCHAR(255) NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_recovery_code UNIQUE (user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS idx_mfa_recovery_user ON identity.user_mfa_recovery_codes(user_id, consumed_at);

-- 5. Indexes for fast OTP lookups by purpose and expiration
CREATE INDEX IF NOT EXISTS idx_email_otps_email_purpose ON identity.email_otps(email_normalized, purpose, expires_at);
