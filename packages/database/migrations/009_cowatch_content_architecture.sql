-- Migration 009: CoWatch Content Architecture & Provider Model

-- 1. Providers Registry
CREATE TABLE IF NOT EXISTS cowatch.providers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  logo_url TEXT,
  embed_capability VARCHAR(50) NOT NULL, -- FULL_EMBED, AUTHORIZED_IFRAME, EXTERNAL_ONLY, COMPANION_ONLY
  official_api_status VARCHAR(50) NOT NULL, -- OFFICIAL_IFRAME_API, NO_PUBLIC_API, DEEP_LINK_ONLY
  drm_type VARCHAR(50) NOT NULL, -- NONE, SOFTWARE_WIDEVINE, HARDWARE_WIDEVINE_L1, FAIRPLAY, PLAYREADY
  screen_share_behavior VARCHAR(50) NOT NULL, -- ALLOWED, HARDWARE_BLACK_SCREEN, UNRELIABLE
  requires_account BOOLEAN NOT NULL DEFAULT FALSE,
  deep_link_template TEXT,
  terms_restriction_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Canonical Content Catalog
CREATE TABLE IF NOT EXISTS cowatch.contents (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail TEXT,
  backdrop TEXT,
  content_type VARCHAR(50) NOT NULL, -- MOVIE, SERIES, ANIME, SPORTS_LIVE, YOUTUBE_VIDEO, PUBLIC_DOMAIN
  genre VARCHAR(100),
  year INTEGER,
  duration INTEGER, -- duration in seconds
  language VARCHAR(50) DEFAULT 'en',
  provider_id VARCHAR(50) REFERENCES cowatch.providers(id),
  source_type VARCHAR(50) NOT NULL, -- COGETHER_HOSTED, AUTHORIZED_EMBED, YOUTUBE, PUBLIC_DOMAIN, OPEN_LICENSE, EXTERNAL_PROVIDER, LIVE_STREAM, SPORTS_PROVIDER
  playback_mode VARCHAR(50) NOT NULL, -- NATIVE_PLAYER, YOUTUBE_PLAYER, AUTHORIZED_EMBED, EXTERNAL_PROVIDER, SCREEN_SHARE, HYBRID
  license_status VARCHAR(50) NOT NULL, -- LICENSE_VERIFIED, PUBLIC_DOMAIN_VERIFIED, OPEN_LICENSE_VERIFIED, PROVIDER_AUTHORIZED, PENDING_REVIEW, UNAVAILABLE
  availability_status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
  embed_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  sync_capability VARCHAR(50) NOT NULL, -- FULL_CLOCK_SYNC, POSTMESSAGE_SYNC, COMPANION_TIMECODE_SYNC, MANUAL_SYNC
  screen_share_supported BOOLEAN NOT NULL DEFAULT TRUE,
  watch_party_supported BOOLEAN NOT NULL DEFAULT TRUE,
  region VARCHAR(50) DEFAULT 'GLOBAL',
  external_url TEXT,
  provider_content_id VARCHAR(255),
  video_stream_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Content Capabilities
CREATE TABLE IF NOT EXISTS cowatch.content_capabilities (
  content_id VARCHAR(100) PRIMARY KEY REFERENCES cowatch.contents(id) ON DELETE CASCADE,
  max_resolution VARCHAR(20) DEFAULT '1080p',
  audio_channels VARCHAR(20) DEFAULT '2.0 Stereo',
  subtitles_supported BOOLEAN DEFAULT FALSE,
  speed_control_supported BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Extend Watch Rooms table for Phase 3
ALTER TABLE cowatch.watch_rooms ALTER COLUMN video_id DROP NOT NULL;
ALTER TABLE cowatch.watch_rooms ADD COLUMN IF NOT EXISTS room_code VARCHAR(50);
ALTER TABLE cowatch.watch_rooms ADD COLUMN IF NOT EXISTS content_id VARCHAR(100) REFERENCES cowatch.contents(id);
ALTER TABLE cowatch.watch_rooms ADD COLUMN IF NOT EXISTS host_user_id UUID REFERENCES identity.users(id);
ALTER TABLE cowatch.watch_rooms ADD COLUMN IF NOT EXISTS playback_mode VARCHAR(50) DEFAULT 'NATIVE_PLAYER';
ALTER TABLE cowatch.watch_rooms ADD COLUMN IF NOT EXISTS control_policy VARCHAR(50) DEFAULT 'HOST_ONLY';
ALTER TABLE cowatch.watch_rooms ADD COLUMN IF NOT EXISTS playback_state VARCHAR(50) DEFAULT 'PAUSED';
ALTER TABLE cowatch.watch_rooms ADD COLUMN IF NOT EXISTS server_time_ms BIGINT DEFAULT 0;
ALTER TABLE cowatch.watch_rooms ADD COLUMN IF NOT EXISTS sequence_number BIGINT DEFAULT 0;
ALTER TABLE cowatch.watch_rooms ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE cowatch.watch_rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_cowatch_watch_rooms_code ON cowatch.watch_rooms(room_code) WHERE room_code IS NOT NULL;

-- 5. Watch Room Members
CREATE TABLE IF NOT EXISTS cowatch.watch_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES identity.users(id) ON DELETE CASCADE,
  username VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'MEMBER', -- HOST, CO_HOST, MEMBER, SPECTATOR
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_code, user_id)
);

-- 6. Watch History
CREATE TABLE IF NOT EXISTS cowatch.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  content_id VARCHAR(100) NOT NULL REFERENCES cowatch.contents(id) ON DELETE CASCADE,
  position_seconds DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

-- 7. Favorites
CREATE TABLE IF NOT EXISTS cowatch.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  content_id VARCHAR(100) NOT NULL REFERENCES cowatch.contents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cowatch_contents_type ON cowatch.contents(content_type);
CREATE INDEX IF NOT EXISTS idx_cowatch_contents_provider ON cowatch.contents(provider_id);
CREATE INDEX IF NOT EXISTS idx_cowatch_contents_license ON cowatch.contents(license_status);
CREATE INDEX IF NOT EXISTS idx_cowatch_history_user ON cowatch.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cowatch_favorites_user ON cowatch.favorites(user_id);

-- ══════════════════════════════════════════════════════════════════════
-- SEED DATA: PROVIDERS REGISTRY
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO cowatch.providers (id, name, logo_url, embed_capability, official_api_status, drm_type, screen_share_behavior, requires_account, deep_link_template, terms_restriction_note)
VALUES
  ('cogether_hosted', 'CoGether Cinema', '/assets/icons/cogether.svg', 'FULL_EMBED', 'OFFICIAL_IFRAME_API', 'NONE', 'ALLOWED', FALSE, NULL, 'Direct open media streaming hosted on verified CDN endpoints with range requests.'),
  ('public_domain', 'Public Domain Archive', 'https://upload.wikimedia.org/wikipedia/commons/8/84/Internet_Archive_logo_and_wordmark.svg', 'FULL_EMBED', 'OFFICIAL_IFRAME_API', 'NONE', 'ALLOWED', FALSE, 'https://archive.org/details/{id}', 'Verified public domain films and historical media.'),
  ('youtube', 'YouTube', 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg', 'AUTHORIZED_IFRAME', 'OFFICIAL_IFRAME_API', 'NONE', 'ALLOWED', FALSE, 'https://www.youtube.com/watch?v={id}', 'Official IFrame Player API. No media downloading or scraping. Subject to YouTube Terms.'),
  ('netflix', 'Netflix', 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', 'EXTERNAL_ONLY', 'NO_PUBLIC_API', 'HARDWARE_WIDEVINE_L1', 'HARDWARE_BLACK_SCREEN', TRUE, 'https://www.netflix.com/title/{id}', 'Hardware L1 DRM blocks screen share. Requires personal subscriber account. Synchronized via CoGether Companion Mode.'),
  ('prime_video', 'Amazon Prime Video', 'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg', 'EXTERNAL_ONLY', 'NO_PUBLIC_API', 'PLAYREADY', 'HARDWARE_BLACK_SCREEN', TRUE, 'https://www.primevideo.com/detail/{id}', 'Hardware DRM protected. Companion mode timecode sync.'),
  ('disney_plus', 'Disney+', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', 'EXTERNAL_ONLY', 'NO_PUBLIC_API', 'HARDWARE_WIDEVINE_L1', 'HARDWARE_BLACK_SCREEN', TRUE, 'https://www.disneyplus.com/movies/{id}', 'Hardware FairPlay/Widevine lock. Companion mode synchronization.'),
  ('jiohotstar', 'JioHotstar', 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Disney%2B_Hotstar_logo.svg', 'EXTERNAL_ONLY', 'NO_PUBLIC_API', 'HARDWARE_WIDEVINE_L1', 'HARDWARE_BLACK_SCREEN', TRUE, 'https://www.hotstar.com/{id}', 'Live sports & movies protected by Widevine L1. Companion mode synchronization.'),
  ('crunchyroll', 'Crunchyroll', 'https://upload.wikimedia.org/wikipedia/commons/0/08/Crunchyroll_Logo.png', 'EXTERNAL_ONLY', 'NO_PUBLIC_API', 'SOFTWARE_WIDEVINE', 'HARDWARE_BLACK_SCREEN', TRUE, 'https://www.crunchyroll.com/series/{id}', 'Authorized anime streaming. Supported via external deep-links or official YouTube anime channels.'),
  ('sports_broadcaster', 'Official Broadcaster', '/assets/icons/sports.svg', 'EXTERNAL_ONLY', 'NO_PUBLIC_API', 'HARDWARE_WIDEVINE_L1', 'HARDWARE_BLACK_SCREEN', TRUE, NULL, 'Official sports broadcast partner. Live match center and companion HUD.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  logo_url = EXCLUDED.logo_url,
  embed_capability = EXCLUDED.embed_capability,
  official_api_status = EXCLUDED.official_api_status,
  drm_type = EXCLUDED.drm_type,
  screen_share_behavior = EXCLUDED.screen_share_behavior,
  requires_account = EXCLUDED.requires_account,
  deep_link_template = EXCLUDED.deep_link_template,
  terms_restriction_note = EXCLUDED.terms_restriction_note;

-- ══════════════════════════════════════════════════════════════════════
-- SEED DATA: CANONICAL CONTENT CATALOG
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO cowatch.contents (
  id, title, description, thumbnail, backdrop, content_type, genre, year, duration,
  provider_id, source_type, playback_mode, license_status, availability_status,
  embed_allowed, sync_capability, screen_share_supported, watch_party_supported,
  external_url, video_stream_url, is_featured, is_trending
) VALUES
  -- 1. Movies & Public Domain Masterpieces (Native High-Def CDN / Open Source)
  ('night-of-the-living-dead-1968', 'Night of the Living Dead', 'George A. Romero''s legendary horror landmark where strangers barricade themselves in a rural farmhouse against relentless flesh-eating ghouls.', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80', 'MOVIE', 'Horror', 1968, 5760, 'cogether_hosted', 'PUBLIC_DOMAIN', 'NATIVE_PLAYER', 'PUBLIC_DOMAIN_VERIFIED', 'AVAILABLE', TRUE, 'FULL_CLOCK_SYNC', TRUE, TRUE, 'https://archive.org/details/night_of_the_living_dead', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', TRUE, TRUE),

  ('the-general-1926', 'The General', 'Buster Keaton''s silent comedy masterpiece following a brave train engineer who embarks on a death-defying locomotive chase to rescue his stolen engine.', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80', 'MOVIE', 'Comedy', 1926, 4500, 'cogether_hosted', 'PUBLIC_DOMAIN', 'NATIVE_PLAYER', 'PUBLIC_DOMAIN_VERIFIED', 'AVAILABLE', TRUE, 'FULL_CLOCK_SYNC', TRUE, TRUE, 'https://archive.org/details/TheGeneral1926', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', FALSE, TRUE),

  ('metropolis-1927', 'Metropolis', 'Fritz Lang''s groundbreaking dystopian sci-fi vision of a futuristic hyper-city where subterranean laborers rise against wealthy oligarchs.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80', 'MOVIE', 'Sci-Fi', 1927, 9180, 'cogether_hosted', 'PUBLIC_DOMAIN', 'NATIVE_PLAYER', 'PUBLIC_DOMAIN_VERIFIED', 'AVAILABLE', TRUE, 'FULL_CLOCK_SYNC', TRUE, TRUE, 'https://archive.org/details/Metropolis_1927', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', TRUE, FALSE),

  ('nosferatu-1922', 'Nosferatu: A Symphony of Horror', 'F.W. Murnau''s eerie vampire classic depicting Count Orlok''s plague-infested voyage across the Baltic to claim a quiet German town.', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80', 'MOVIE', 'Horror', 1922, 5640, 'cogether_hosted', 'PUBLIC_DOMAIN', 'NATIVE_PLAYER', 'PUBLIC_DOMAIN_VERIFIED', 'AVAILABLE', TRUE, 'FULL_CLOCK_SYNC', TRUE, TRUE, 'https://archive.org/details/Nosferatu_1922', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', FALSE, TRUE),

  ('charade-1963', 'Charade', 'Stanley Donen''s stylish romantic suspense thriller starring Audrey Hepburn and Cary Grant dodging dangerous fortune-hunters in Paris.', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1920&q=80', 'MOVIE', 'Thriller', 1963, 6780, 'cogether_hosted', 'PUBLIC_DOMAIN', 'NATIVE_PLAYER', 'PUBLIC_DOMAIN_VERIFIED', 'AVAILABLE', TRUE, 'FULL_CLOCK_SYNC', TRUE, TRUE, 'https://archive.org/details/Charade1963', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', FALSE, FALSE),

  ('the-39-steps-1935', 'The 39 Steps', 'Alfred Hitchcock''s iconic espionage thriller where an innocent man is framed for murder and races across the Scottish Highlands.', 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1920&q=80', 'MOVIE', 'Thriller', 1935, 5160, 'cogether_hosted', 'PUBLIC_DOMAIN', 'NATIVE_PLAYER', 'PUBLIC_DOMAIN_VERIFIED', 'AVAILABLE', TRUE, 'FULL_CLOCK_SYNC', TRUE, TRUE, 'https://archive.org/details/The39Steps1935', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', FALSE, FALSE),

  -- 2. Open-License Cinema (Blender Foundation Open Media - CC-BY 3.0)
  ('big-buck-bunny', 'Big Buck Bunny', 'A large, gentle rabbit deals with bullying forest creatures in this colorful, open-source animated short produced by the Blender Institute.', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80', 'SERIES', 'Animation', 2008, 596, 'cogether_hosted', 'OPEN_LICENSE', 'NATIVE_PLAYER', 'OPEN_LICENSE_VERIFIED', 'AVAILABLE', TRUE, 'FULL_CLOCK_SYNC', TRUE, TRUE, 'https://peach.blender.org', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', FALSE, TRUE),

  ('sintel', 'Sintel', 'An epic open-source fantasy short film following a determined young woman searching for her dragon friend across dangerous lands.', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80', 'ANIME', 'Fantasy', 2010, 918, 'cogether_hosted', 'OPEN_LICENSE', 'NATIVE_PLAYER', 'OPEN_LICENSE_VERIFIED', 'AVAILABLE', TRUE, 'FULL_CLOCK_SYNC', TRUE, TRUE, 'https://durian.blender.org', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', TRUE, TRUE),

  ('tears-of-steel', 'Tears of Steel', 'In a dystopian futuristic Amsterdam, a group of scientists and soldiers attempt to rewrite history to prevent a catastrophic robotic uprising.', 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1920&q=80', 'MOVIE', 'Sci-Fi', 2012, 734, 'cogether_hosted', 'OPEN_LICENSE', 'NATIVE_PLAYER', 'OPEN_LICENSE_VERIFIED', 'AVAILABLE', TRUE, 'FULL_CLOCK_SYNC', TRUE, TRUE, 'https://mango.blender.org', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', FALSE, FALSE),

  -- 3. YouTube (Official IFrame API Integration)
  ('yt-lofi-hip-hop', 'Lofi Girl — Beats to Relax/Study to', 'Official 24/7 lofi hip hop stream synchronized for group study, deep focus sessions, and shared chilling.', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80', 'YOUTUBE_VIDEO', 'Music & Chill', 2026, 0, 'youtube', 'YOUTUBE', 'YOUTUBE_PLAYER', 'LICENSE_VERIFIED', 'AVAILABLE', TRUE, 'POSTMESSAGE_SYNC', TRUE, TRUE, 'https://www.youtube.com/watch?v=jfKfPfyJRdk', 'jfKfPfyJRdk', TRUE, TRUE),

  ('yt-cosmos-documentary', 'Journey Through the Universe 4K', 'Deep space exploration documentary featuring stunning high-resolution telescope footage and cosmic narration.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80', 'YOUTUBE_VIDEO', 'Documentary', 2024, 3600, 'youtube', 'YOUTUBE', 'YOUTUBE_PLAYER', 'LICENSE_VERIFIED', 'AVAILABLE', TRUE, 'POSTMESSAGE_SYNC', TRUE, TRUE, 'https://www.youtube.com/watch?v=libKVRa01L8', 'libKVRa01L8', FALSE, TRUE),

  -- 4. Anime (Licensed YouTube Channel Stream & OTT Companion)
  ('anime-muse-licensed', 'She and Her Cat: Everything Flows', 'Official licensed anime short series by Makoto Shinkai streaming via authorized YouTube broadcast channel.', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1920&q=80', 'ANIME', 'Slice of Life', 2016, 1800, 'youtube', 'AUTHORIZED_EMBED', 'YOUTUBE_PLAYER', 'LICENSE_VERIFIED', 'AVAILABLE', TRUE, 'POSTMESSAGE_SYNC', TRUE, TRUE, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', FALSE, TRUE),

  ('anime-crunchyroll-companion', 'Attack on Titan — Final Season', 'Epic dark fantasy anime. Requires active Crunchyroll subscription. CoGether coordinates timecode sync & voice lounge.', 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1920&q=80', 'ANIME', 'Action', 2023, 1440, 'crunchyroll', 'EXTERNAL_PROVIDER', 'EXTERNAL_PROVIDER', 'PROVIDER_AUTHORIZED', 'AVAILABLE', FALSE, 'COMPANION_TIMECODE_SYNC', FALSE, TRUE, 'https://www.crunchyroll.com/series/GR751KNZY/attack-on-titan', NULL, FALSE, TRUE),

  -- 5. Sports / Live Events (Official Broadcaster & Live Center)
  ('sports-icc-cricket', 'ICC World Cup Highlights & Live Match Center', 'Live cricket commentary, ball-by-ball timeline, and synchronized companion watch room for match days.', 'https://images.unsplash.com/photo-1531415074868-036b1c5f53ec?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1531415074868-036b1c5f53ec?auto=format&fit=crop&w=1920&q=80', 'SPORTS_LIVE', 'Cricket', 2026, 14400, 'sports_broadcaster', 'SPORTS_PROVIDER', 'EXTERNAL_PROVIDER', 'PROVIDER_AUTHORIZED', 'AVAILABLE', FALSE, 'COMPANION_TIMECODE_SYNC', FALSE, TRUE, 'https://www.icc-cricket.com', NULL, TRUE, TRUE),

  ('sports-f1-race-center', 'Formula 1 Live Companion & Timing Hub', 'Official Grand Prix live telemetry, driver radio commentary, and synchronized social lounge.', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1920&q=80', 'SPORTS_LIVE', 'Motorsport', 2026, 7200, 'sports_broadcaster', 'SPORTS_PROVIDER', 'EXTERNAL_PROVIDER', 'PROVIDER_AUTHORIZED', 'AVAILABLE', FALSE, 'COMPANION_TIMECODE_SYNC', FALSE, TRUE, 'https://f1tv.formula1.com', NULL, FALSE, TRUE),

  -- 6. External OTT Services in Companion Mode
  ('netflix-stranger-things', 'Stranger Things', 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments and terrifying supernatural forces. Synchronized via CoGether Companion.', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80', 'SERIES', 'Sci-Fi Drama', 2022, 3300, 'netflix', 'EXTERNAL_PROVIDER', 'EXTERNAL_PROVIDER', 'PROVIDER_AUTHORIZED', 'AVAILABLE', FALSE, 'COMPANION_TIMECODE_SYNC', FALSE, TRUE, 'https://www.netflix.com/title/80057281', NULL, FALSE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  thumbnail = EXCLUDED.thumbnail,
  backdrop = EXCLUDED.backdrop,
  content_type = EXCLUDED.content_type,
  genre = EXCLUDED.genre,
  year = EXCLUDED.year,
  duration = EXCLUDED.duration,
  provider_id = EXCLUDED.provider_id,
  source_type = EXCLUDED.source_type,
  playback_mode = EXCLUDED.playback_mode,
  license_status = EXCLUDED.license_status,
  availability_status = EXCLUDED.availability_status,
  embed_allowed = EXCLUDED.embed_allowed,
  sync_capability = EXCLUDED.sync_capability,
  screen_share_supported = EXCLUDED.screen_share_supported,
  watch_party_supported = EXCLUDED.watch_party_supported,
  external_url = EXCLUDED.external_url,
  video_stream_url = EXCLUDED.video_stream_url,
  is_featured = EXCLUDED.is_featured,
  is_trending = EXCLUDED.is_trending;
