-- ============================================================================
-- Migration 018: Onboarding Completion Flag, Keypass Entitlement Metadata & Costudy Progress
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS social;
CREATE SCHEMA IF NOT EXISTS audit;

ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_interest VARCHAR(64);

ALTER TABLE identity.profiles
  ADD COLUMN IF NOT EXISTS primary_interest VARCHAR(64);

ALTER TABLE identity.entitlements
  ADD COLUMN IF NOT EXISTS plan_code VARCHAR(64) NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(32),
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(160),
  ADD COLUMN IF NOT EXISTS amount_inr INTEGER;

DELETE FROM identity.entitlements a
USING identity.entitlements b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_identity_entitlements_user_id
  ON identity.entitlements(user_id);

CREATE TABLE IF NOT EXISTS social.costudy_progress (
  user_id UUID PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  active_mission TEXT,
  completed_missions JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit.telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(64) NOT NULL,
  user_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_type_created
  ON audit.telemetry_events(event_type, created_at DESC);
