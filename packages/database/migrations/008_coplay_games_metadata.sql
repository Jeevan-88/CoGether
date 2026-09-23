-- Migration 008: CoPlay Production Metadata & Favorites Schema
-- Extends coplay.games with licensing, controls, and launch specifications
-- Adds coplay.favorites backed by central PostgreSQL identity

-- 1. Extend coplay.games with production-grade metadata
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS provider VARCHAR(100) NOT NULL DEFAULT 'External Feed';
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS game_mode VARCHAR(50) NOT NULL DEFAULT 'SINGLE_PLAYER';
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS launch_type VARCHAR(50) NOT NULL DEFAULT 'DIRECT_EMBED';
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS license_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW';
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS distribution_status VARCHAR(50) NOT NULL DEFAULT 'UNAVAILABLE';
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS controls JSONB DEFAULT '{}'::jsonb;
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS orientation VARCHAR(20) NOT NULL DEFAULT 'any';
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS max_players INT NOT NULL DEFAULT 1;
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS source_repository TEXT;
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS provider_game_id VARCHAR(100);
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS launch_url TEXT;
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS fullscreen_supported BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS camera_supported BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS supports_challenge BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS supports_local_multiplayer BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS supports_online_multiplayer BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE coplay.games ADD COLUMN IF NOT EXISTS supports_score_telemetry BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE coplay.games 
SET license_status = 'PENDING_REVIEW', 
    distribution_status = 'UNAVAILABLE', 
    provider = 'External Feed' 
WHERE id NOT IN ('2048', 'hextris', 'block-puzzle', 'clumsy-bird');

-- 2. Performance indexes on queryable catalog facets
CREATE INDEX IF NOT EXISTS idx_coplay_games_provider ON coplay.games(provider);
CREATE INDEX IF NOT EXISTS idx_coplay_games_game_mode ON coplay.games(game_mode);
CREATE INDEX IF NOT EXISTS idx_coplay_games_license_status ON coplay.games(license_status);
CREATE INDEX IF NOT EXISTS idx_coplay_games_distribution_status ON coplay.games(distribution_status);

-- 3. Player Favorites Table (backed by central identity.users)
CREATE TABLE IF NOT EXISTS coplay.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  game_id VARCHAR(100) NOT NULL REFERENCES coplay.games(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_coplay_favorites_user_game UNIQUE (user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_coplay_favorites_user_id ON coplay.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_coplay_favorites_game_id ON coplay.favorites(game_id);

-- 4. Seed / Upsert the 4 Authoritative Local Open-Source Games
INSERT INTO coplay.games (
  id, title, description, instructions, category, thumb_url, game_url,
  is_multiplayer, tags, active, provider, game_mode, launch_type,
  license_status, distribution_status, controls, orientation, max_players,
  source_repository, provider_game_id, launch_url, fullscreen_supported,
  camera_supported, supports_challenge, supports_local_multiplayer,
  supports_online_multiplayer, supports_score_telemetry
) VALUES 
(
  '2048',
  '2048',
  'Slide and merge numbered tiles on a 4x4 grid to reach the 2048 tile. Fast, lightweight, and addictive.',
  'Use arrow keys or WASD to slide tiles across the board. Tiles with the same number merge into one when they collide.',
  'puzzle',
  '/games/thumbnails/2048.svg',
  '/games/2048/index.html',
  FALSE,
  ARRAY['puzzle', 'solo', 'challenge', 'popular'],
  TRUE,
  'CoGether Open Source',
  'SINGLE_PLAYER',
  'LOCAL_SOURCE',
  'LICENSE_VERIFIED',
  'AVAILABLE',
  '{"p1": "Arrow Keys or WASD to slide tiles in 4 directions", "description": "Swipe or Arrow Keys."}'::jsonb,
  'any',
  1,
  'https://github.com/gabrielecirulli/2048',
  '2048',
  '/games/2048/index.html',
  TRUE,
  TRUE,
  TRUE,
  FALSE,
  FALSE,
  TRUE
),
(
  'hextris',
  'Hextris',
  'Fast-paced hexagonal puzzle game. Rotate the central hexagon to match 3 or more blocks of the same color!',
  'Press Left/Right arrow keys or A/D to rotate the hexagon. Clear lines before blocks cross the outer perimeter boundary.',
  'puzzle',
  '/games/thumbnails/hextris.svg',
  '/games/hextris/index.html',
  FALSE,
  ARRAY['puzzle', 'arcade', 'challenge', 'popular'],
  TRUE,
  'CoGether Open Source',
  'SINGLE_PLAYER',
  'LOCAL_SOURCE',
  'LICENSE_VERIFIED',
  'AVAILABLE',
  '{"p1": "Left/Right Arrow Keys or A/D to rotate hexagon", "description": "Rotate hexagon to match 3 colors."}'::jsonb,
  'any',
  1,
  'https://github.com/Hextris/hextris',
  'hextris',
  '/games/hextris/index.html',
  TRUE,
  TRUE,
  TRUE,
  FALSE,
  FALSE,
  TRUE
),
(
  'block-puzzle',
  'Block Puzzle',
  'Classic falling-blocks puzzle game. Position and rotate blocks to clear full horizontal lines and rack up points.',
  'Use Left/Right to steer, Up to rotate, Down to soft drop, and Spacebar to instant drop and clear lines.',
  'puzzle',
  '/games/thumbnails/block-puzzle.svg',
  '/games/block-puzzle/index.html',
  FALSE,
  ARRAY['puzzle', 'retro', 'challenge'],
  TRUE,
  'CoGether Open Source',
  'SINGLE_PLAYER',
  'LOCAL_SOURCE',
  'LICENSE_VERIFIED',
  'AVAILABLE',
  '{"p1": "Left/Right Arrow to move, Up to rotate, Down to soft drop, Space to hard drop", "description": "Standard falling-block keyboard bindings."}'::jsonb,
  'any',
  1,
  'https://github.com/jakesgordon/javascript-tetris',
  'block-puzzle',
  '/games/block-puzzle/index.html',
  TRUE,
  TRUE,
  TRUE,
  FALSE,
  FALSE,
  TRUE
),
(
  'clumsy-bird',
  'Clumsy Bird',
  'Retro 8-bit tap-to-fly arcade runner. Flap your wings, navigate between pipes, and set the high score!',
  'Press Spacebar or Left Click to flap wings and gain altitude. Timing is critical to thread the gap between obstacles.',
  'runners',
  '/games/thumbnails/clumsy-bird.svg',
  '/games/clumsy-bird/index.html',
  FALSE,
  ARRAY['runner', 'arcade', 'challenge'],
  TRUE,
  'CoGether Open Source',
  'SINGLE_PLAYER',
  'LOCAL_SOURCE',
  'LICENSE_VERIFIED',
  'AVAILABLE',
  '{"p1": "Spacebar or Left Click to flap wings", "description": "Tap or Spacebar to fly."}'::jsonb,
  'portrait',
  1,
  'https://github.com/ellisonleao/clumsy-bird',
  'clumsy-bird',
  '/games/clumsy-bird/index.html',
  TRUE,
  TRUE,
  TRUE,
  FALSE,
  FALSE,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  instructions = EXCLUDED.instructions,
  category = EXCLUDED.category,
  thumb_url = EXCLUDED.thumb_url,
  game_url = EXCLUDED.game_url,
  provider = EXCLUDED.provider,
  game_mode = EXCLUDED.game_mode,
  launch_type = EXCLUDED.launch_type,
  license_status = EXCLUDED.license_status,
  distribution_status = EXCLUDED.distribution_status,
  controls = EXCLUDED.controls,
  orientation = EXCLUDED.orientation,
  max_players = EXCLUDED.max_players,
  source_repository = EXCLUDED.source_repository,
  provider_game_id = EXCLUDED.provider_game_id,
  launch_url = EXCLUDED.launch_url,
  fullscreen_supported = EXCLUDED.fullscreen_supported,
  camera_supported = EXCLUDED.camera_supported,
  supports_challenge = EXCLUDED.supports_challenge,
  supports_score_telemetry = EXCLUDED.supports_score_telemetry,
  active = TRUE,
  updated_at = NOW();
