/**
 * CoPlay Leaderboard Service
 * Aggregates high scores from coplay.scores joined with identity.profiles.
 * Accurately surfaces SCHEMA_AND_RANGE_BOUND validation level without fabricating anti-cheat verification.
 */

const { db } = require('../../packages/database');
const { logger } = require('../../packages/observability');

class LeaderboardService {
  /**
   * Retrieves ranked leaderboard entries for a specific game
   * @param {string} gameId
   * @param {Object} options
   * @param {'all_time'|'weekly'} options.period
   * @param {number} options.limit
   */
  async getLeaderboard(gameId, { period = 'all_time', limit = 50 } = {}) {
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('INVALID_GAME_ID: Valid gameId string required');
    }

    const validPeriods = ['all_time', 'weekly', 'daily'];
    const selectedPeriod = validPeriods.includes(period) ? period : 'all_time';
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 50);

    // Verify game exists in database
    const gameCheck = await db.query(
      'SELECT id, title FROM coplay.games WHERE id = $1 AND active = TRUE LIMIT 1',
      [gameId]
    );
    if (gameCheck.rows.length === 0) {
      throw new Error(`GAME_NOT_FOUND: Game "${gameId}" does not exist in catalog`);
    }
    const gameTitle = gameCheck.rows[0].title;

    let timeConstraint = null;
    if (selectedPeriod === 'daily') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      timeConstraint = oneDayAgo;
    } else if (selectedPeriod === 'weekly') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      timeConstraint = oneWeekAgo;
    }

    try {
      const query = `
        SELECT 
          s.id,
          s.user_id,
          s.score,
          s.verified,
          s.metadata,
          s.created_at,
          p.display_name,
          p.username,
          p.avatar_url
        FROM coplay.scores s
        LEFT JOIN identity.profiles p ON p.user_id::text = s.user_id
        WHERE s.game_id = $1
          AND ($2::timestamptz IS NULL OR s.created_at >= $2::timestamptz)
        ORDER BY s.score DESC, s.created_at ASC
        LIMIT $3
      `;

      const res = await db.query(query, [gameId, timeConstraint, parsedLimit]);

      const entries = res.rows.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        score: Number(row.score),
        displayName: row.display_name || 'Arcade Player',
        username: row.username || 'player',
        avatarUrl: row.avatar_url || null,
        createdAt: row.created_at,
        verified: Boolean(row.verified), // Explicitly false for client-reported metrics
        validationLevel: row.metadata?.validationLevel || 'SCHEMA_AND_RANGE_BOUND'
      }));

      return {
        gameId,
        gameTitle,
        period: selectedPeriod,
        count: entries.length,
        entries
      };
    } catch (err) {
      logger.error('Failed to query leaderboard', { gameId, error: err.message });
      throw err;
    }
  }
}

const leaderboardService = new LeaderboardService();

module.exports = {
  LeaderboardService,
  leaderboardService
};
