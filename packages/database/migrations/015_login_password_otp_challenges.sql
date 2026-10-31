-- Migration 015: Server-side Password-Bound Login Challenges
-- Enforces mandatory password verification before issuing login OTPs.

CREATE TABLE IF NOT EXISTS identity.login_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_token VARCHAR(255) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  email_normalized VARCHAR(255) NOT NULL,
  otp_id UUID REFERENCES identity.email_otps(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_challenges_token ON identity.login_challenges(challenge_token);
CREATE INDEX IF NOT EXISTS idx_login_challenges_lookup ON identity.login_challenges(challenge_token, expires_at, consumed_at);
CREATE INDEX IF NOT EXISTS idx_login_challenges_user ON identity.login_challenges(user_id, created_at);
