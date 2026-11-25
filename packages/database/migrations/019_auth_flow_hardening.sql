-- ============================================================================
-- Migration 019: Auth Flow Hardening (Nullable unverified emails.verified_at)
-- ============================================================================

-- Allow unverified accounts created via /api/v1/auth/signup to register their
-- normalized email in identity.emails with verified_at = NULL until verified.
ALTER TABLE identity.emails
  ALTER COLUMN verified_at DROP NOT NULL;
