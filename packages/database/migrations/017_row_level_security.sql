-- Migration 017: Row Level Security (RLS) Policies
-- Enforces row-level isolation for users, active sessions, and verification tokens.

-- 1. Enable Row Level Security on core identity tables
ALTER TABLE identity.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.verification_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they already exist
DROP POLICY IF EXISTS user_read_own_record ON identity.users;
DROP POLICY IF EXISTS user_update_own_record ON identity.users;
DROP POLICY IF EXISTS session_manage_own_records ON identity.sessions;
DROP POLICY IF EXISTS verification_tokens_service_only ON identity.verification_tokens;

-- 3. Policy: Users can only read their own user record
-- (Falls back safely if current_setting is unset, or if executing as database administrator)
CREATE POLICY user_read_own_record ON identity.users
  FOR SELECT
  USING (
    current_user IN ('postgres', 'cogether_admin')
    OR id = NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  );

-- 4. Policy: Users can only update their own user record
CREATE POLICY user_update_own_record ON identity.users
  FOR UPDATE
  USING (
    current_user IN ('postgres', 'cogether_admin')
    OR id = NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  )
  WITH CHECK (
    current_user IN ('postgres', 'cogether_admin')
    OR id = NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  );

-- 5. Policy: Users can only manage (select, delete) their own sessions
CREATE POLICY session_manage_own_records ON identity.sessions
  FOR ALL
  USING (
    current_user IN ('postgres', 'cogether_admin')
    OR user_id = NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  );

-- 6. Policy: Verification tokens are strictly service-role accessible
CREATE POLICY verification_tokens_service_only ON identity.verification_tokens
  FOR ALL
  USING (
    current_user IN ('postgres', 'cogether_admin', 'cogether_user')
  );
