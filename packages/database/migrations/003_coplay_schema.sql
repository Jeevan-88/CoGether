-- Migration 003: CoPlay Catalog, Game Sessions & Authoritative Leaderboards

CREATE TABLE IF NOT EXISTS coplay.games (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  category VARCHAR(100) NOT NULL DEFAULT 'Arcade',
  thumb_url TEXT,
  game_url TEXT NOT NULL,
  is_multiplayer BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coplay.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(100) NOT NULL,
  game_id VARCHAR(100) NOT NULL REFERENCES coplay.games(id) ON DELETE CASCADE,
  host_user_id VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS coplay.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES coplay.game_sessions(id) ON DELETE CASCADE,
  game_id VARCHAR(100) NOT NULL REFERENCES coplay.games(id) ON DELETE CASCADE,
  user_id VARCHAR(100) NOT NULL,
  score BIGINT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coplay.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(100) NOT NULL,
  game_id VARCHAR(100) NOT NULL REFERENCES coplay.games(id),
  challenger_id VARCHAR(100) NOT NULL,
  opponent_id VARCHAR(100) NOT NULL,
  winner_id VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coplay_scores_game_score ON coplay.scores(game_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_coplay_sessions_room ON coplay.game_sessions(room_id);
