/**
 * CoPlay Game Catalog Repository
 * Manages game catalog persistence in PostgreSQL (coplay.games) with Redis caching.
 */

const { db } = require('../../packages/database');
const { redis } = require('../../packages/redis');
const { logger } = require('../../packages/observability');

class GameRepository {
  constructor() {
    this._fallbackCache = [];
    this._lastFetchTime = 0;
  }

  /**
   * Syncs and seeds the 2,000+ HTML5 game catalog into PostgreSQL coplay.games table.
   */
  async syncCatalogFromFeed(feedUrl = 'https://gamemonetize.com/feed.php?format=0') {
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

      // Batch insert / upsert into PostgreSQL coplay.games
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
          valueClauses.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, TRUE)`);
          params.push(game.id, game.title, game.description, game.instructions, game.category, game.thumb, game.url, Boolean(game.isMultiplayer), game.tags);
        });

        try {
          await client.query(
            `INSERT INTO coplay.games (id, title, description, instructions, category, thumb_url, game_url, is_multiplayer, tags, active)
             VALUES ${valueClauses.join(', ')}
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               category = EXCLUDED.category,
               thumb_url = EXCLUDED.thumb_url,
               game_url = EXCLUDED.game_url,
               updated_at = NOW()`,
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
      logger.error('Failed to sync game catalog from feed', { error: err });
      return this._fallbackCache;
    }
  }

  /**
   * Retrieves paginated, filtered game list from PostgreSQL (with Redis cache).
   */
  async getGames({ category, search, limit = 100, offset = 0 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    const cacheKey = `coplay:games:cat_${category || 'all'}:q_${search || 'none'}:l_${lim}:o_${off}`;

    // 1. Check Redis Cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Ignore cache miss / error
    }

    // 2. Query PostgreSQL
    try {
      let query = 'SELECT id, title, description, instructions, category, thumb_url AS thumb, game_url AS url, is_multiplayer AS "isMultiplayer", tags FROM coplay.games WHERE active = TRUE';
      const params = [];

      if (category && category !== 'all') {
        if (category === 'multiplayer' || category === '2-player') {
          query += ' AND is_multiplayer = TRUE';
        } else if (category === 'solo') {
          query += ' AND is_multiplayer = FALSE';
        } else {
          params.push(`%${category}%`);
          query += ` AND category ILIKE $${params.length}`;
        }
      }

      if (search) {
        params.push(`%${search}%`);
        query += ` AND (title ILIKE $${params.length} OR instructions ILIKE $${params.length})`;
      }

      // Count query
      const countRes = await db.query(query.replace('SELECT id, title, description, instructions, category, thumb_url AS thumb, game_url AS url, is_multiplayer AS "isMultiplayer", tags', 'SELECT COUNT(*) as total'), params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      // Pagination
      params.push(lim);
      query += ` ORDER BY title ASC LIMIT $${params.length}`;
      params.push(off);
      query += ` OFFSET $${params.length}`;

      const dataRes = await db.query(query, params);

      if (dataRes.rows.length > 0) {
        const result = {
          total,
          limit: lim,
          offset: off,
          games: dataRes.rows
        };

        // Cache in Redis for 15 minutes
        await redis.set(cacheKey, JSON.stringify(result), 900).catch(() => {});
        return result;
      }
    } catch (err) {
      logger.warn('PostgreSQL game query failed; falling back to in-memory catalog', { error: err.message });
    }

    // 3. Fallback to cached in-memory array if DB empty or offline
    let filtered = this._fallbackCache;

    if (category && category !== 'all') {
      if (category === 'multiplayer' || category === '2-player') {
        filtered = filtered.filter((g) => g.isMultiplayer || g.category === '2 Player' || g.category === 'Multiplayer');
      } else if (category === 'solo') {
        filtered = filtered.filter((g) => !g.isMultiplayer);
      } else {
        filtered = filtered.filter((g) => g.category.toLowerCase().includes(category.toLowerCase()));
      }
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((g) => g.title.toLowerCase().includes(q) || (g.tags && g.tags.some((t) => t.toLowerCase().includes(q))));
    }

    const paginated = filtered.slice(off, off + lim);
    return {
      total: filtered.length,
      limit: lim,
      offset: off,
      games: paginated
    };
  }

  async getGameById(gameId) {
    try {
      const res = await db.query(
        'SELECT id, title, description, instructions, category, thumb_url AS thumb, game_url AS url, is_multiplayer AS "isMultiplayer", tags FROM coplay.games WHERE id = $1',
        [gameId]
      );
      if (res.rows.length > 0) return res.rows[0];
    } catch (e) {}

    return this._fallbackCache.find((g) => g.id === gameId) || null;
  }
}

const gameRepository = new GameRepository();

module.exports = {
  GameRepository,
  gameRepository
};
