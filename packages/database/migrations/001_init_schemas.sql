-- Migration 001: Initialize Logical Schemas for CoGether Platform
-- Strict domain isolation without cross-schema foreign keys

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS coplay;
CREATE SCHEMA IF NOT EXISTS cowatch;
CREATE SCHEMA IF NOT EXISTS coshop;
CREATE SCHEMA IF NOT EXISTS costudy;
CREATE SCHEMA IF NOT EXISTS platform;

-- Schema migration tracking table
CREATE TABLE IF NOT EXISTS platform.schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
