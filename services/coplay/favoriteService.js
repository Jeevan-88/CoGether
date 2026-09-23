/**
 * CoPlay Player Favorites Service
 * Backed by PostgreSQL (coplay.favorites) and bound to central identity (identity.users).
 */

const { db } = require('../../packages/database');
const { logger } = require('../../packages/observability');

class FavoriteService {
  /**
   * Adds a game to the user's favorites
   * @param {string} userId - UUID from authenticated session
   * @param {string} gameId - Valid game identifier
   */
  async addFavorite(userId, gameId) {
    if (!userId) {
      throw new Error('UNAUTHORIZED: Valid user session required');
    }
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('INVALID_GAME_ID: gameId must be a non-empty string');
    }

    // Verify game exists in coplay.games
    const gameCheck = await db.query(
      'SELECT id FROM coplay.games WHERE id = $1 AND active = TRUE LIMIT 1',
      [gameId]
    );
    if (gameCheck.rows.length === 0) {
      throw new Error(`GAME_NOT_FOUND: Game "${gameId}" does not exist`);
    }

    try {
      const res = await db.query(
        `INSERT INTO coplay.favorites (user_id, game_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, game_id) DO NOTHING
         RETURNING id, user_id, game_id, created_at`,
        [userId, gameId]
      );
      const favorite = res.rows[0] || { user_id: userId, game_id: gameId };
      logger.info('Favorite added', { userId, gameId });
      return { success: true, favorite, gameId };
    } catch (err) {
      logger.error('Failed to add favorite', { userId, gameId, error: err.message });
      throw err;
    }
  }

  /**
   * Removes a game from the user's favorites
   * @param {string} userId
   * @param {string} gameId
   */
  async removeFavorite(userId, gameId) {
    if (!userId) {
      throw new Error('UNAUTHORIZED: Valid user session required');
    }
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('INVALID_GAME_ID: gameId must be a non-empty string');
    }

    try {
      await db.query(
        'DELETE FROM coplay.favorites WHERE user_id = $1 AND game_id = $2',
        [userId, gameId]
      );
      logger.info('Favorite removed', { userId, gameId });
      return { success: true, removed: true, gameId };
    } catch (err) {
      logger.error('Failed to remove favorite', { userId, gameId, error: err.message });
      throw err;
    }
  }

  /**
   * Returns list of favorited game IDs for the user
   * @param {string} userId
   */
  async getFavorites(userId) {
    if (!userId) {
      throw new Error('UNAUTHORIZED: Valid user session required');
    }

    try {
      const res = await db.query(
        `SELECT game_id, created_at 
         FROM coplay.favorites 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );
      return {
        favorites: res.rows.map((r) => ({ game_id: r.game_id, created_at: r.created_at })),
        favoriteIds: res.rows.map((r) => r.game_id),
        count: res.rows.length
      };
    } catch (err) {
      logger.error('Failed to fetch favorites', { userId, error: err.message });
      throw err;
    }
  }
}

const favoriteService = new FavoriteService();

module.exports = {
  FavoriteService,
  favoriteService
};
