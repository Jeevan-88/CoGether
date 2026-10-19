-- Migration 012: Add first_name, last_name, and avatar_config (JSONB) to identity.profiles
-- Supports the multi-step CoGether signup journey, structured SVG avatar studio configuration, and digital member card.

ALTER TABLE identity.profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(60);
ALTER TABLE identity.profiles ADD COLUMN IF NOT EXISTS last_name VARCHAR(60);
ALTER TABLE identity.profiles ADD COLUMN IF NOT EXISTS avatar_config JSONB DEFAULT NULL;
