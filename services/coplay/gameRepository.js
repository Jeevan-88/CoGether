/**
 * CoPlay Game Catalog Repository
 * Manages game catalog persistence in PostgreSQL (coplay.games) with Redis caching.
 * Authoritative source of truth for verified open-source games and external integrations.
 */

const { db } = require('../../packages/database');
const { redis } = require('../../packages/redis');
const { logger } = require('../../packages/observability');

const VERIFIED_LOCAL_GAMES = [
  {
    id: '2048',
    title: '2048',
    description: 'Slide and merge numbered tiles on a 4x4 grid to reach the 2048 tile. Fast, lightweight, and addictive.',
    instructions: 'Use arrow keys or WASD to slide tiles across the board. Tiles with the same number merge into one when they collide.',
    category: 'puzzle',
    thumb_url: '/games/thumbnails/2048.svg',
    game_url: '/games/2048/index.html',
    is_multiplayer: false,
    tags: ['puzzle', 'solo', 'challenge', 'popular'],
    provider: 'CoGether Open Source',
    game_mode: 'SINGLE_PLAYER',
    launch_type: 'LOCAL_SOURCE',
    license_status: 'LICENSE_VERIFIED',
    distribution_status: 'AVAILABLE',
    controls: { p1: 'Arrow Keys or WASD to slide tiles in 4 directions', description: 'Swipe or Arrow Keys.' },
    orientation: 'any',
    max_players: 1,
    source_repository: 'https://github.com/gabrielecirulli/2048',
    provider_game_id: '2048',
    launch_url: '/games/2048/index.html',
    fullscreen_supported: true,
    camera_supported: true,
    supports_challenge: true,
    supports_local_multiplayer: false,
    supports_online_multiplayer: false,
    supports_score_telemetry: true
  },
  {
    id: 'hextris',
    title: 'Hextris',
    description: 'Fast-paced hexagonal puzzle game. Rotate the central hexagon to match 3 or more blocks of the same color!',
    instructions: 'Press Left/Right arrow keys or A/D to rotate the hexagon. Clear lines before blocks cross the outer perimeter boundary.',
    category: 'puzzle',
    thumb_url: '/games/thumbnails/hextris.svg',
    game_url: '/games/hextris/index.html',
    is_multiplayer: false,
    tags: ['puzzle', 'arcade', 'challenge', 'popular'],
    provider: 'CoGether Open Source',
    game_mode: 'SINGLE_PLAYER',
    launch_type: 'LOCAL_SOURCE',
    license_status: 'LICENSE_VERIFIED',
    distribution_status: 'AVAILABLE',
    controls: { p1: 'Left/Right Arrow Keys or A/D to rotate hexagon', description: 'Rotate hexagon to match 3 colors.' },
    orientation: 'any',
    max_players: 1,
    source_repository: 'https://github.com/Hextris/hextris',
    provider_game_id: 'hextris',
    launch_url: '/games/hextris/index.html',
    fullscreen_supported: true,
    camera_supported: true,
    supports_challenge: true,
    supports_local_multiplayer: false,
    supports_online_multiplayer: false,
    supports_score_telemetry: true
  },
  {
    id: 'block-puzzle',
    title: 'Block Puzzle',
    description: 'Classic falling-blocks puzzle game. Position and rotate blocks to clear full horizontal lines and rack up points.',
    instructions: 'Use Left/Right to steer, Up to rotate, Down to soft drop, and Spacebar to instant drop and clear lines.',
    category: 'puzzle',
    thumb_url: '/games/thumbnails/block-puzzle.svg',
    game_url: '/games/block-puzzle/index.html',
    is_multiplayer: false,
    tags: ['puzzle', 'retro', 'challenge'],
    provider: 'CoGether Open Source',
    game_mode: 'SINGLE_PLAYER',
    launch_type: 'LOCAL_SOURCE',
    license_status: 'LICENSE_VERIFIED',
    distribution_status: 'AVAILABLE',
    controls: { p1: 'Left/Right Arrow to move, Up to rotate, Down to soft drop, Space to hard drop', description: 'Standard falling-block keyboard bindings.' },
    orientation: 'any',
    max_players: 1,
    source_repository: 'https://github.com/jakesgordon/javascript-tetris',
    provider_game_id: 'block-puzzle',
    launch_url: '/games/block-puzzle/index.html',
    fullscreen_supported: true,
    camera_supported: true,
    supports_challenge: true,
    supports_local_multiplayer: false,
    supports_online_multiplayer: false,
    supports_score_telemetry: true
  },
  {
    id: 'clumsy-bird',
    title: 'Clumsy Bird',
    description: 'Retro 8-bit tap-to-fly arcade runner. Flap your wings, navigate between pipes, and set the high score!',
    instructions: 'Press Spacebar or Left Click to flap wings and gain altitude. Timing is critical to thread the gap between obstacles.',
    category: 'runners',
    thumb_url: '/games/thumbnails/clumsy-bird.svg',
    game_url: '/games/clumsy-bird/index.html',
    is_multiplayer: false,
    tags: ['runner', 'arcade', 'challenge'],
    provider: 'CoGether Open Source',
    game_mode: 'SINGLE_PLAYER',
    launch_type: 'LOCAL_SOURCE',
    license_status: 'LICENSE_VERIFIED',
    distribution_status: 'AVAILABLE',
    controls: { p1: 'Spacebar or Left Click to flap wings', description: 'Tap or Spacebar to fly.' },
    orientation: 'portrait',
    max_players: 1,
    source_repository: 'https://github.com/ellisonleao/clumsy-bird',
    provider_game_id: 'clumsy-bird',
    launch_url: '/games/clumsy-bird/index.html',
    fullscreen_supported: true,
    camera_supported: true,
    supports_challenge: true,
    supports_local_multiplayer: false,
    supports_online_multiplayer: false,
    supports_score_telemetry: true
  }
];

class GameRepository {
  constructor() {
    this._fallbackCache = [];
    this._lastFetchTime = 0;
  }

  /**
   * Seeds the 4 verified local games into PostgreSQL coplay.games
   */
  async seedAuthoritativeGames() {
    for (const game of VERIFIED_LOCAL_GAMES) {
      try {
        await db.query(
          `INSERT INTO coplay.games (
            id, title, description, instructions, category, thumb_url, game_url,
            is_multiplayer, tags, active, provider, game_mode, launch_type,
            license_status, distribution_status, controls, orientation, max_players,
            source_repository, provider_game_id, launch_url, fullscreen_supported,
            camera_supported, supports_challenge, supports_local_multiplayer,
            supports_online_multiplayer, supports_score_telemetry
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, TRUE, $10, $11, $12,
            $13, $14, $15, $16, $17,
            $18, $19, $20, $21,
            $22, $23, $24,
            $25, $26
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
            updated_at = NOW()`,
          [
            game.id, game.title, game.description, game.instructions, game.category, game.thumb_url, game.game_url,
            game.is_multiplayer, game.tags, game.provider, game.game_mode, game.launch_type,
            game.license_status, game.distribution_status, JSON.stringify(game.controls), game.orientation, game.max_players,
            game.source_repository, game.provider_game_id, game.launch_url, game.fullscreen_supported,
            game.camera_supported, game.supports_challenge, game.supports_local_multiplayer,
            game.supports_online_multiplayer, game.supports_score_telemetry
          ]
        );
      } catch (err) {
        logger.warn(`Failed to seed verified game ${game.id}`, { error: err.message });
      }
    }
  }

  /**
   * Syncs external game feed. External feed games default to PENDING_REVIEW and UNAVAILABLE.
   */
  async syncCatalogFromFeed(feedUrl = 'https://gamemonetize.com/feed.php?format=0') {
    await this.seedAuthoritativeGames();

    logger.info('Fetching live game catalog from feed for PostgreSQL persistence...');
    try {
      const res = await fetch(feedUrl);
      if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
      const rawGames = await res.json();

      const normalized = rawGames.map((g) => ({
        id: String(g.id || Math.random().toString(36).substring(2, 9)),
        title: g.title || 'Untitled Game',
        description: g.description || '',
        instructions: g.instructions || '',
        category: g.category || 'Arcade',
        thumb: g.thumb || '',
        url: g.url || '',
        tags: g.tags ? g.tags.split(',').map((t) => t.trim()) : [],
        isMultiplayer: g.category === '2 Player' || g.category === 'Multiplayer' || (g.tags && g.tags.toLowerCase().includes('multiplayer'))
      }));

      this._fallbackCache = normalized;
      this._lastFetchTime = Date.now();

      const client = db;
      let insertedCount = 0;
      const gamesToSeed = normalized.slice(0, 500);
      const CHUNK_SIZE = 50;

      for (let i = 0; i < gamesToSeed.length; i += CHUNK_SIZE) {
        const chunk = gamesToSeed.slice(i, i + CHUNK_SIZE);
        const valueClauses = [];
        const params = [];

        chunk.forEach((game, idx) => {
          const offset = idx * 9;
          valueClauses.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, TRUE, 'External Feed', 'PENDING_REVIEW', 'UNAVAILABLE')`);
          params.push(game.id, game.title, game.description, game.instructions, game.category, game.thumb, game.url, Boolean(game.isMultiplayer), game.tags);
        });

        try {
          await client.query(
            `INSERT INTO coplay.games (
              id, title, description, instructions, category, thumb_url, game_url, is_multiplayer, tags, active,
              provider, license_status, distribution_status
            )
             VALUES ${valueClauses.join(', ')}
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               category = EXCLUDED.category,
               thumb_url = EXCLUDED.thumb_url,
               game_url = EXCLUDED.game_url,
               updated_at = NOW()
             WHERE coplay.games.license_status != 'LICENSE_VERIFIED'`,
            params
          );
          insertedCount += chunk.length;
        } catch (err) {
          logger.warn('Batch insert chunk failed', { error: err.message });
        }
      }

      logger.info(`Successfully synced ${normalized.length} games (persisted ${insertedCount} to coplay.games)`);
      return normalized;
    } catch (err) {
      logger.error('Failed to sync game catalog from feed', { error: err.message });
      return this._fallbackCache;
    }
  }

  /**
   * Retrieves paginated, filtered game list from PostgreSQL.
   * Prioritizes LICENSE_VERIFIED games at the top of results.
   */
  async getGames({ category, search, limit = 100, offset = 0, verifiedOnly = false } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    const isVerifiedOnly = verifiedOnly === true || verifiedOnly === 'true';
    const cacheKey = `coplay:games:cat_${category || 'all'}:q_${search || 'none'}:v_${isVerifiedOnly}:l_${lim}:o_${off}`;

    // 1. Check Redis Cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}

    // 2. Query PostgreSQL
    try {
      let baseSelect = `
        SELECT 
          id, 
          title, 
          description, 
          instructions, 
          category, 
          thumb_url AS thumbnail,
          thumb_url AS thumb, 
          game_url AS url, 
          is_multiplayer AS "isMultiplayer", 
          tags,
          provider,
          game_mode AS "gameMode",
          launch_type AS "launchType",
          license_status AS "licenseStatus",
          distribution_status AS "distributionStatus",
          controls,
          orientation,
          max_players AS "maxPlayers",
          source_repository AS "sourceRepository",
          provider_game_id AS "providerGameId",
          launch_url AS "launchUrl",
          fullscreen_supported AS "fullscreenSupported",
          camera_supported AS "cameraSupported",
          supports_challenge AS "supportsChallenge",
          supports_local_multiplayer AS "supportsLocalMultiplayer",
          supports_online_multiplayer AS "supportsOnlineMultiplayer",
          supports_score_telemetry AS "supportsScoreTelemetry"
        FROM coplay.games 
        WHERE active = TRUE
      `;
      let countQuery = 'SELECT COUNT(*) as total FROM coplay.games WHERE active = TRUE';
      const params = [];

      if (isVerifiedOnly) {
        const filter = " AND license_status = 'LICENSE_VERIFIED'";
        baseSelect += filter;
        countQuery += filter;
      }

      if (category && category !== 'all') {
        if (category === 'multiplayer' || category === '2-player') {
          const filter = ' AND (is_multiplayer = TRUE OR supports_local_multiplayer = TRUE OR supports_online_multiplayer = TRUE)';
          baseSelect += filter;
          countQuery += filter;
        } else if (category === 'solo') {
          const filter = ' AND is_multiplayer = FALSE';
          baseSelect += filter;
          countQuery += filter;
        } else {
          params.push(`%${category}%`);
          const filter = ` AND category ILIKE $${params.length}`;
          baseSelect += filter;
          countQuery += filter;
        }
      }

      if (search) {
        params.push(`%${search}%`);
        const filter = ` AND (title ILIKE $${params.length} OR instructions ILIKE $${params.length})`;
        baseSelect += filter;
        countQuery += filter;
      }

      const countRes = await db.query(countQuery, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      params.push(lim);
      baseSelect += ` ORDER BY (license_status = 'LICENSE_VERIFIED') DESC, title ASC LIMIT $${params.length}`;
      params.push(off);
      baseSelect += ` OFFSET $${params.length}`;

      const dataRes = await db.query(baseSelect, params);

      const result = {
        total,
        limit: lim,
        offset: off,
        games: dataRes.rows
      };

      await redis.set(cacheKey, JSON.stringify(result), 300).catch(() => {});
      return result;
    } catch (err) {
      logger.warn('PostgreSQL game query failed', { error: err.message });
      return {
        total: VERIFIED_LOCAL_GAMES.length,
        limit: lim,
        offset: off,
        games: VERIFIED_LOCAL_GAMES
      };
    }
  }

  async getGameById(gameId) {
    try {
      const res = await db.query(
        `SELECT 
          id, title, description, instructions, category, 
          thumb_url AS thumbnail, thumb_url AS thumb, game_url AS url, 
          is_multiplayer AS "isMultiplayer", tags, provider,
          game_mode AS "gameMode", launch_type AS "launchType",
          license_status AS "licenseStatus", distribution_status AS "distributionStatus",
          controls, orientation, max_players AS "maxPlayers",
          source_repository AS "sourceRepository", provider_game_id AS "providerGameId",
          launch_url AS "launchUrl", fullscreen_supported AS "fullscreenSupported",
          camera_supported AS "cameraSupported", supports_challenge AS "supportsChallenge",
          supports_local_multiplayer AS "supportsLocalMultiplayer",
          supports_online_multiplayer AS "supportsOnlineMultiplayer",
          supports_score_telemetry AS "supportsScoreTelemetry"
        FROM coplay.games 
        WHERE id = $1`,
        [gameId]
      );
      if (res.rows.length > 0) return res.rows[0];
    } catch (e) {}

    return VERIFIED_LOCAL_GAMES.find((g) => g.id === gameId) || null;
  }
}

const gameRepository = new GameRepository();

module.exports = {
  VERIFIED_LOCAL_GAMES,
  GameRepository,
  gameRepository
};
