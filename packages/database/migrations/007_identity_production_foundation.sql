-- Migration 007: Production-Oriented Real Identity, Profile & Invite Foundation

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enhance or update identity.users
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE identity.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE identity.users ALTER COLUMN display_name DROP NOT NULL;
ALTER TABLE identity.users ALTER COLUMN display_name SET DEFAULT '';
ALTER TABLE identity.users ALTER COLUMN email DROP NOT NULL;

-- 3. Third-party and federated identities (Google, Email, etc.)
CREATE TABLE IF NOT EXISTS identity.identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'email' | 'google'
  provider_subject VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_identities_provider_subject UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_identities_user_id ON identity.identities(user_id);
CREATE INDEX IF NOT EXISTS idx_identities_provider_email ON identity.identities(provider, provider_email);

-- 4. Verified and secondary emails
CREATE TABLE IF NOT EXISTS identity.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  email_normalized VARCHAR(255) NOT NULL UNIQUE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emails_user_id ON identity.emails(user_id);

-- 5. User Profiles (authoritative display and handle identity)
CREATE TABLE IF NOT EXISTS identity.profiles (
  user_id UUID PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  username_normalized VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username_normalized ON identity.profiles(username_normalized);

-- 6. User Preferences & Settings
CREATE TABLE IF NOT EXISTS identity.preferences (
  user_id UUID PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  primary_interest VARCHAR(100),
  interests TEXT[] DEFAULT '{}',
  timezone VARCHAR(100) DEFAULT 'UTC',
  language VARCHAR(20) DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Secure Single-Use Hashed Email OTPs
CREATE TABLE IF NOT EXISTS identity.email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_normalized VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) NOT NULL DEFAULT 'signup', -- 'signup' | 'login' | 'email_verification'
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempt_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_lookup ON identity.email_otps(email_normalized, expires_at);
CREATE INDEX IF NOT EXISTS idx_email_otps_created_at ON identity.email_otps(created_at);

-- 8. Persistent User Sessions & Refresh Tokens
CREATE TABLE IF NOT EXISTS identity.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address VARCHAR(45),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON identity.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON identity.sessions(refresh_token_hash);

-- 9. Secure Opaque Invites
CREATE TABLE IF NOT EXISTS identity.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  destination_type VARCHAR(50) NOT NULL DEFAULT 'room', -- 'room' | 'coplay' | 'cowatch' | 'coshop'
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_token_hash ON identity.invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_invites_inviter_user ON identity.invites(inviter_user_id, created_at);

-- 10. Invite Redemptions (tracks exact users who redeemed)
CREATE TABLE IF NOT EXISTS identity.invite_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID NOT NULL REFERENCES identity.invites(id) ON DELETE CASCADE,
  redeemed_by_user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_invite_redemption UNIQUE (invite_id, redeemed_by_user_id)
);

CREATE INDEX IF NOT EXISTS idx_invite_redemptions_invite ON identity.invite_redemptions(invite_id);
CREATE INDEX IF NOT EXISTS idx_invite_redemptions_user ON identity.invite_redemptions(redeemed_by_user_id);
