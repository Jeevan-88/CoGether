-- Migration 004: CoWatch Cinema Rooms & Playback State

CREATE TABLE IF NOT EXISTS cowatch.watch_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(100) UNIQUE NOT NULL,
  video_source VARCHAR(50) NOT NULL DEFAULT 'youtube',
  video_id VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  current_time_seconds DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  is_playing BOOLEAN NOT NULL DEFAULT FALSE,
  playback_rate DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  last_sync_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cowatch.playback_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  video_id VARCHAR(255) NOT NULL,
  duration_watched_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cowatch_room_id ON cowatch.watch_rooms(room_id);
