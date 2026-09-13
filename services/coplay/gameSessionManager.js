/**
 * CoPlay Game Session Lifecycle Manager
 * Implements the strict state machine:
 * WAITING -> READY -> STARTING -> RUNNING -> FINISHED -> CLOSED
 * Uses Redis for ephemeral low-latency state and PostgreSQL for permanent match persistence.
 */

const crypto = require('crypto');
const { db } = require('../../packages/database');
const { redis } = require('../../packages/redis');
const { logger } = require('../../packages/observability');
const { scoreValidationService, ValidationLevel } = require('./scoreValidation');

const SessionState = Object.freeze({
  WAITING: 'WAITING',
  READY: 'READY',
  STARTING: 'STARTING',
  RUNNING: 'RUNNING',
  FINISHED: 'FINISHED',
  CLOSED: 'CLOSED'
});

const VALID_TRANSITIONS = {
  [SessionState.WAITING]: [SessionState.READY, SessionState.CLOSED],
  [SessionState.READY]: [SessionState.STARTING, SessionState.WAITING, SessionState.CLOSED],
  [SessionState.STARTING]: [SessionState.RUNNING, SessionState.WAITING, SessionState.CLOSED],
  [SessionState.RUNNING]: [SessionState.FINISHED, SessionState.CLOSED],
  [SessionState.FINISHED]: [SessionState.CLOSED, SessionState.WAITING],
  [SessionState.CLOSED]: []
};

class GameSessionManager {
  constructor() {
    this._inMemorySessions = new Map(); // Fallback map
  }

  /**
   * Initializes a new game session in WAITING state.
   */
  async createSession({ roomId, gameId, hostUserId, participants = [] }) {
    const sessionId = crypto.randomUUID();
    const session = {
      sessionId,
      roomId,
      gameId,
      hostUserId,
      state: SessionState.WAITING,
      participants: participants.map((p) => ({
        userId: p.id || p.userId,
        username: p.username || 'Guest',
        ready: false,
        score: 0,
        eliminated: false
      })),
      scores: {},
      winnerId: null,
      startedAt: new Date().toISOString(),
      endedAt: null
    };

    // Store in Redis with 2-hour TTL
    await this._saveSession(session);

    // Persist session to PostgreSQL coplay.game_sessions
    try {
      await db.query(
        `INSERT INTO coplay.games (id, title, category, game_url, is_multiplayer, active)
         VALUES ($1, $2, 'Challenge', '', TRUE, TRUE)
         ON CONFLICT (id) DO NOTHING`,
        [gameId, `Game ${gameId}`]
      );

      await db.query(
        `INSERT INTO coplay.game_sessions (id, room_id, game_id, host_user_id, status, started_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sessionId, roomId, gameId, hostUserId, SessionState.WAITING, session.startedAt]
      );
    } catch (err) {
      logger.warn('Failed to insert game_sessions record into PostgreSQL', { error: err.message });
    }

    logger.info(`Game session created [${sessionId}] in room [${roomId}] for game [${gameId}]`);
    return session;
  }

  /**
   * Retrieves active session from Redis or in-memory fallback.
   */
  async getSession(sessionId) {
    try {
      const raw = await redis.get(`coplay:session:${sessionId}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    return this._inMemorySessions.get(sessionId) || null;
  }

  /**
   * Finds active session for a specific roomId.
   */
  async getSessionByRoom(roomId) {
    try {
      const activeSessionId = await redis.get(`coplay:room_active_session:${roomId}`);
      if (activeSessionId) {
        return await this.getSession(activeSessionId);
      }
    } catch (e) {}

    for (const session of this._inMemorySessions.values()) {
      if (session.roomId === roomId && session.state !== SessionState.CLOSED) {
        return session;
      }
    }
    return null;
  }

  /**
   * Transitions session state adhering strictly to state machine invariants.
   */
  async transitionState(sessionId, targetState, metadata = {}) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const allowed = VALID_TRANSITIONS[session.state] || [];
    if (!allowed.includes(targetState)) {
      throw new Error(`Invalid state transition from ${session.state} to ${targetState}`);
    }

    session.state = targetState;
    if (metadata.winnerId) session.winnerId = metadata.winnerId;
    if (targetState === SessionState.FINISHED || targetState === SessionState.CLOSED) {
      session.endedAt = new Date().toISOString();
    }

    await this._saveSession(session);

    // Update PostgreSQL
    try {
      await db.query(
        `UPDATE coplay.game_sessions
         SET status = $1, ended_at = $2
         WHERE id = $3`,
        [targetState, session.endedAt || null, sessionId]
      );
    } catch (err) {
      logger.warn('Failed to update game_sessions state in PostgreSQL', { error: err.message });
    }

    logger.info(`Session [${sessionId}] transitioned to state [${targetState}]`);
    return session;
  }

  /**
   * Updates participant ready status and auto-transitions WAITING -> READY if all ready.
   */
  async setParticipantReady(sessionId, userId, ready = true) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const participant = session.participants.find((p) => p.userId === userId);
    if (participant) {
      participant.ready = ready;
    } else {
      session.participants.push({ userId, username: 'Player', ready, score: 0, eliminated: false });
    }

    // Check if all players ready
    const allReady = session.participants.length >= 2 && session.participants.every((p) => p.ready);
    if (allReady && session.state === SessionState.WAITING) {
      session.state = SessionState.READY;
    } else if (!allReady && session.state === SessionState.READY) {
      session.state = SessionState.WAITING;
    }

    await this._saveSession(session);
    return session;
  }

  /**
   * Submits, validates, and persists player score.
   */
  async recordScore(sessionId, userId, score, isFinal = false, metadata = {}) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    // Schema and boundary validation (explicitly labelled as SCHEMA_AND_RANGE_BOUND)
    const validation = scoreValidationService.validateScore(score, metadata);
    if (!validation.valid) {
      logger.warn('Score submission rejected', { sessionId, userId, error: validation.error });
      throw new Error(`INVALID_SCORE: ${validation.error}`);
    }

    const cleanScore = validation.cleanScore;
    session.scores[userId] = cleanScore;
    const participant = session.participants.find((p) => p.userId === userId);
    if (participant) {
      participant.score = cleanScore;
    }

    // Persist schema-validated score into PostgreSQL with accurate validation metadata
    try {
      await db.query(
        `INSERT INTO coplay.scores (id, session_id, game_id, user_id, score, verified, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [crypto.randomUUID(), sessionId, session.gameId, userId, cleanScore, validation.verified, JSON.stringify(validation.metadata)]
      );
    } catch (err) {
      logger.warn('Failed to persist score to PostgreSQL coplay.scores', { error: err.message });
    }

    await this._saveSession(session);

    if (isFinal) {
      // Determine current leader/winner
      let highestScore = -1;
      let winner = null;
      for (const p of session.participants) {
        if (p.score > highestScore) {
          highestScore = p.score;
          winner = p.userId;
        }
      }
      session.winnerId = winner;
      return await this.transitionState(sessionId, SessionState.FINISHED, { winnerId: winner });
    }

    return session;
  }

  async _saveSession(session) {
    this._inMemorySessions.set(session.sessionId, session);
    try {
      await redis.set(`coplay:session:${session.sessionId}`, JSON.stringify(session), 7200);
      await redis.set(`coplay:room_active_session:${session.roomId}`, session.sessionId, 7200);
    } catch (e) {}
  }
}

const gameSessionManager = new GameSessionManager();

module.exports = {
  SessionState,
  GameSessionManager,
  gameSessionManager
};
