-- Migration 016: Complete Production Authentication & Session Schema
-- Adds standardized User columns, RefreshToken sessions, and VerificationTokens.

-- 1. Extend identity.users with standard verification, role, and lockout attributes
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'USER';
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS lock_until TIMESTAMPTZ;
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;

-- Backfill name from display_name if null
UPDATE identity.users SET name = display_name WHERE name IS NULL AND display_name IS NOT NULL;

-- 2. Verification Tokens Table for Email Verification & Password Reset
CREATE TABLE IF NOT EXISTS identity.verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('EMAIL_VERIFY', 'PASSWORD_RESET')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_lookup 
  ON identity.verification_tokens(identifier, token, type);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires 
  ON identity.verification_tokens(expires_at);

-- 3. Ensure identity.sessions has token_hash column and indexes for fast session lookups
-- (identity.sessions already exists from migration 007 with refresh_token_hash)
ALTER TABLE identity.sessions ADD COLUMN IF NOT EXISTS token_hash VARCHAR(255);
UPDATE identity.sessions SET token_hash = refresh_token_hash WHERE token_hash IS NULL AND refresh_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash_lookup ON identity.sessions(token_hash);
