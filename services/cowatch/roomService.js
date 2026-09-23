/**
 * CoWatch Room & User Social State Service
 * Handles watch room lifecycle, membership, history, and favorites.
 */

const { db } = require('../../packages/database/client');
const crypto = require('crypto');

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CW-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(chars.length));
  }
  return code;
}

async function createWatchRoom({ hostUserId, contentId, title, controlPolicy = 'HOST_ONLY', playbackMode = 'NATIVE_PLAYER' }) {
  const roomCode = generateRoomCode();
  const serverTimeMs = Date.now();

  const insertSql = `
    INSERT INTO cowatch.watch_rooms (
      room_id, room_code, title, host_user_id, content_id, playback_mode,
      control_policy, playback_state, current_time_seconds, playback_rate,
      server_time_ms, sequence_number, is_locked
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, 'PAUSED', 0.0, 1.0, $8, 0, FALSE
    )
    RETURNING *
  `;

  const { rows } = await db.query(insertSql, [
    roomCode,
    roomCode,
    title || 'CoWatch Party',
    hostUserId || null,
    contentId || null,
    playbackMode,
    controlPolicy,
    serverTimeMs
  ]);

  return rows[0];
}

async function getWatchRoomByCode(roomCode) {
  const sql = `
    SELECT 
      r.*,
      c.title AS content_title,
      c.thumbnail AS content_thumbnail,
      c.backdrop AS content_backdrop,
      c.source_type AS content_source_type,
      c.playback_mode AS content_playback_mode,
      c.video_stream_url,
      c.external_url,
      c.duration AS content_duration,
      p.name AS provider_name,
      p.embed_capability AS provider_embed_capability,
      p.screen_share_behavior AS provider_screen_share_behavior,
      prof.display_name AS host_display_name,
      prof.username AS host_username
    FROM cowatch.watch_rooms r
    LEFT JOIN cowatch.contents c ON r.content_id = c.id
    LEFT JOIN cowatch.providers p ON c.provider_id = p.id
    LEFT JOIN identity.profiles prof ON r.host_user_id = prof.user_id
    WHERE r.room_code = $1 OR r.room_id = $1
  `;
  const { rows } = await db.query(sql, [roomCode]);
  if (!rows || rows.length === 0) return null;

  const room = rows[0];
  
  // Fetch active members
  const membersRes = await db.query(
    `SELECT m.*, p.display_name, p.avatar_url 
     FROM cowatch.watch_room_members m
     LEFT JOIN identity.profiles p ON m.user_id = p.user_id
     WHERE m.room_code = $1
     ORDER BY m.joined_at ASC`,
    [room.room_code]
  );

  return {
    ...room,
    members: membersRes.rows
  };
}

async function joinWatchRoom({ roomCode, userId, username, role = 'MEMBER' }) {
  const room = await getWatchRoomByCode(roomCode);
  if (!room) {
    const error = new Error('Watch room not found');
    error.statusCode = 404;
    throw error;
  }

  if (room.is_locked) {
    const error = new Error('Watch room is locked by host');
    error.statusCode = 403;
    throw error;
  }

  if (userId) {
    await db.query(`
      INSERT INTO cowatch.watch_room_members (room_code, user_id, username, role, last_seen_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (room_code, user_id) DO UPDATE SET
        username = EXCLUDED.username,
        role = EXCLUDED.role,
        last_seen_at = NOW()
    `, [roomCode, userId, username || 'Viewer', role]);
  }

  return getWatchRoomByCode(roomCode);
}

async function leaveWatchRoom({ roomCode, userId }) {
  if (userId) {
    await db.query(
      `DELETE FROM cowatch.watch_room_members WHERE room_code = $1 AND user_id = $2`,
      [roomCode, userId]
    );
  }
  return { success: true };
}

async function updatePlaybackState({ roomCode, userId, playbackState, position, playbackRate = 1.0, sequenceNumber }) {
  const room = await getWatchRoomByCode(roomCode);
  if (!room) {
    const error = new Error('Watch room not found');
    error.statusCode = 404;
    throw error;
  }

  // If control_policy is HOST_ONLY, verify user is host
  if (room.control_policy === 'HOST_ONLY' && room.host_user_id && userId && room.host_user_id !== userId) {
    const error = new Error('Only the room host can control playback');
    error.statusCode = 403;
    throw error;
  }

  const serverTimeMs = Date.now();
  const nextSeq = sequenceNumber !== undefined ? sequenceNumber : (parseInt(room.sequence_number || 0, 10) + 1);

  const updateSql = `
    UPDATE cowatch.watch_rooms SET
      playback_state = COALESCE($1, playback_state),
      current_time_seconds = COALESCE($2, current_time_seconds),
      playback_rate = COALESCE($3, playback_rate),
      server_time_ms = $4,
      sequence_number = $5,
      updated_at = NOW()
    WHERE room_code = $6 OR room_id = $6
    RETURNING *
  `;

  const { rows } = await db.query(updateSql, [
    playbackState,
    position !== undefined ? position : null,
    playbackRate,
    serverTimeMs,
    nextSeq,
    roomCode
  ]);

  return rows[0];
}

// ── Watch History ──
async function getWatchHistory(userId) {
  const sql = `
    SELECT 
      h.*,
      c.title,
      c.thumbnail,
      c.backdrop,
      c.content_type,
      c.genre,
      c.duration,
      c.playback_mode,
      p.name AS provider_name
    FROM cowatch.watch_history h
    JOIN cowatch.contents c ON h.content_id = c.id
    LEFT JOIN cowatch.providers p ON c.provider_id = p.id
    WHERE h.user_id = $1
    ORDER BY h.last_watched_at DESC
    LIMIT 50
  `;
  const { rows } = await db.query(sql, [userId]);
  return rows;
}

async function recordWatchHistory({ userId, contentId, positionSeconds, durationSeconds, completed = false }) {
  const sql = `
    INSERT INTO cowatch.watch_history (user_id, content_id, position_seconds, duration_seconds, completed, last_watched_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (user_id, content_id) DO UPDATE SET
      position_seconds = EXCLUDED.position_seconds,
      duration_seconds = EXCLUDED.duration_seconds,
      completed = EXCLUDED.completed,
      last_watched_at = NOW()
    RETURNING *
  `;
  const { rows } = await db.query(sql, [userId, contentId, positionSeconds || 0, durationSeconds || 0, completed]);
  return rows[0];
}

// ── Favorites ──
async function getFavorites(userId) {
  const sql = `
    SELECT 
      f.id AS favorite_id,
      f.created_at AS favorited_at,
      c.*,
      p.name AS provider_name
    FROM cowatch.favorites f
    JOIN cowatch.contents c ON f.content_id = c.id
    LEFT JOIN cowatch.providers p ON c.provider_id = p.id
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC
  `;
  const { rows } = await db.query(sql, [userId]);
  return rows;
}

async function addFavorite({ userId, contentId }) {
  const sql = `
    INSERT INTO cowatch.favorites (user_id, content_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, content_id) DO NOTHING
    RETURNING *
  `;
  const { rows } = await db.query(sql, [userId, contentId]);
  return rows[0] || { user_id: userId, content_id: contentId };
}

async function removeFavorite({ userId, contentId }) {
  await db.query(
    `DELETE FROM cowatch.favorites WHERE user_id = $1 AND content_id = $2`,
    [userId, contentId]
  );
  return { success: true };
}

module.exports = {
  generateRoomCode,
  createWatchRoom,
  getWatchRoomByCode,
  joinWatchRoom,
  leaveWatchRoom,
  updatePlaybackState,
  getWatchHistory,
  recordWatchHistory,
  getFavorites,
  addFavorite,
  removeFavorite
};
