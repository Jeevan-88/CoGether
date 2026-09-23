-- Migration 010: CoWatch Provider Capabilities & Factual Content Refinement

-- 1. Extend Providers table with explicit capability flags
ALTER TABLE cowatch.providers ADD COLUMN IF NOT EXISTS official_url TEXT;
ALTER TABLE cowatch.providers ADD COLUMN IF NOT EXISTS embed_supported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cowatch.providers ADD COLUMN IF NOT EXISTS official_player_supported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cowatch.providers ADD COLUMN IF NOT EXISTS sync_supported BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE cowatch.providers ADD COLUMN IF NOT EXISTS companion_mode_supported BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE cowatch.providers ADD COLUMN IF NOT EXISTS screen_share_supported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cowatch.providers ADD COLUMN IF NOT EXISTS extension_supported BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE cowatch.providers ADD COLUMN IF NOT EXISTS drm_protected BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cowatch.providers ADD COLUMN IF NOT EXISTS region_restricted BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Update Provider Capabilities
UPDATE cowatch.providers SET
  official_url = NULL,
  embed_supported = TRUE,
  official_player_supported = TRUE,
  sync_supported = TRUE,
  companion_mode_supported = FALSE,
  screen_share_supported = TRUE,
  extension_supported = FALSE,
  drm_protected = FALSE,
  region_restricted = FALSE,
  requires_account = FALSE
WHERE id = 'cogether_hosted';

UPDATE cowatch.providers SET
  official_url = 'https://archive.org',
  embed_supported = TRUE,
  official_player_supported = TRUE,
  sync_supported = TRUE,
  companion_mode_supported = FALSE,
  screen_share_supported = TRUE,
  extension_supported = FALSE,
  drm_protected = FALSE,
  region_restricted = FALSE,
  requires_account = FALSE
WHERE id = 'public_domain';

UPDATE cowatch.providers SET
  official_url = 'https://www.youtube.com',
  embed_supported = TRUE,
  official_player_supported = TRUE,
  sync_supported = TRUE,
  companion_mode_supported = TRUE,
  screen_share_supported = TRUE,
  extension_supported = FALSE,
  drm_protected = FALSE,
  region_restricted = FALSE,
  requires_account = FALSE
WHERE id = 'youtube';

UPDATE cowatch.providers SET
  official_url = 'https://www.netflix.com',
  embed_supported = FALSE,
  official_player_supported = FALSE,
  sync_supported = TRUE,
  companion_mode_supported = TRUE,
  screen_share_supported = FALSE,
  extension_supported = TRUE,
  drm_protected = TRUE,
  region_restricted = TRUE,
  requires_account = TRUE
WHERE id = 'netflix';

UPDATE cowatch.providers SET
  official_url = 'https://www.primevideo.com',
  embed_supported = FALSE,
  official_player_supported = FALSE,
  sync_supported = TRUE,
  companion_mode_supported = TRUE,
  screen_share_supported = FALSE,
  extension_supported = TRUE,
  drm_protected = TRUE,
  region_restricted = TRUE,
  requires_account = TRUE
WHERE id = 'prime_video';

UPDATE cowatch.providers SET
  official_url = 'https://www.disneyplus.com',
  embed_supported = FALSE,
  official_player_supported = FALSE,
  sync_supported = TRUE,
  companion_mode_supported = TRUE,
  screen_share_supported = FALSE,
  extension_supported = TRUE,
  drm_protected = TRUE,
  region_restricted = TRUE,
  requires_account = TRUE
WHERE id = 'disney_plus';

UPDATE cowatch.providers SET
  official_url = 'https://www.hotstar.com',
  embed_supported = FALSE,
  official_player_supported = FALSE,
  sync_supported = TRUE,
  companion_mode_supported = TRUE,
  screen_share_supported = FALSE,
  extension_supported = TRUE,
  drm_protected = TRUE,
  region_restricted = TRUE,
  requires_account = TRUE
WHERE id = 'jiohotstar';

UPDATE cowatch.providers SET
  official_url = 'https://www.crunchyroll.com',
  embed_supported = FALSE,
  official_player_supported = FALSE,
  sync_supported = TRUE,
  companion_mode_supported = TRUE,
  screen_share_supported = FALSE,
  extension_supported = TRUE,
  drm_protected = TRUE,
  region_restricted = TRUE,
  requires_account = TRUE
WHERE id = 'crunchyroll';

UPDATE cowatch.providers SET
  official_url = 'https://www.icc-cricket.com',
  embed_supported = FALSE,
  official_player_supported = FALSE,
  sync_supported = TRUE,
  companion_mode_supported = TRUE,
  screen_share_supported = FALSE,
  extension_supported = TRUE,
  drm_protected = TRUE,
  region_restricted = TRUE,
  requires_account = TRUE
WHERE id = 'sports_broadcaster';

-- 3. Replace AI Marketing Descriptions with Human-Readable Factual Content Descriptions
UPDATE cowatch.contents SET description = 'A short animated fantasy film.' WHERE id = 'sintel';
UPDATE cowatch.contents SET description = 'A short animated comedy film.' WHERE id = 'big-buck-bunny';
UPDATE cowatch.contents SET description = 'A short science fiction film set in dystopian Amsterdam.' WHERE id = 'tears-of-steel';
UPDATE cowatch.contents SET description = 'Independent horror film directed by George A. Romero.' WHERE id = 'night-of-the-living-dead-1968';
UPDATE cowatch.contents SET description = 'Silent comedy film directed by Buster Keaton.' WHERE id = 'the-general-1926';
UPDATE cowatch.contents SET description = 'Silent science fiction drama directed by Fritz Lang.' WHERE id = 'metropolis-1927';
UPDATE cowatch.contents SET description = 'Silent German Expressionist vampire film directed by F.W. Murnau.' WHERE id = 'nosferatu-1922';
UPDATE cowatch.contents SET description = 'Romantic mystery comedy starring Audrey Hepburn and Cary Grant.' WHERE id = 'charade-1963';
UPDATE cowatch.contents SET description = 'Espionage thriller directed by Alfred Hitchcock.' WHERE id = 'the-39-steps-1935';
UPDATE cowatch.contents SET description = '24/7 instrumental stream for study and focus.' WHERE id = 'yt-lofi-hip-hop';
UPDATE cowatch.contents SET description = 'Deep space astronomy documentary.' WHERE id = 'yt-cosmos-documentary';
UPDATE cowatch.contents SET description = 'Slice-of-life anime short series.' WHERE id = 'anime-muse-licensed';
UPDATE cowatch.contents SET description = 'Dark fantasy anime series. Requires Crunchyroll subscription.' WHERE id = 'anime-crunchyroll-companion';
UPDATE cowatch.contents SET description = 'Cricket match center and ball-by-ball commentary.' WHERE id = 'sports-icc-cricket';
UPDATE cowatch.contents SET description = 'Live timing hub and telemetry companion.' WHERE id = 'sports-f1-race-center';
UPDATE cowatch.contents SET description = 'Science fiction drama series. Requires Netflix subscription.' WHERE id = 'netflix-stranger-things';
