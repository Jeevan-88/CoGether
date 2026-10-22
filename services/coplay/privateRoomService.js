/**
 * CoPlay Private Room & Game Invitation Engine
 * Cryptographically secure room generation, server-authoritative admission,
 * invitation lifecycle, and player room reconciliation.
 */

const crypto = require('crypto');
const { db } = require('../../packages/database');
const { logger } = require('../../packages/observability');

class PrivateRoomService {
  /**
   * Create a secure private room with cryptographic room code
   */
  async createPrivateRoom(hostUserId, gameId, options = {}) {
    if (!hostUserId || !gameId) {
      throw new Error('Host user ID and game ID are required');
    }

    // Generate unique readable room code: e.g. "DUEL-4A8F2B"
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const roomCode = `DUEL-${randomSuffix}`;
    const maxCapacity = options.maxCapacity || 2;
    const metadata = options.metadata || {};

    const res = await db.query(
      `INSERT INTO coplay.private_rooms 
       (room_code, game_id, host_user_id, status, max_capacity, metadata, created_at, expires_at)
       VALUES ($1, $2, $3, 'open', $4, $5, NOW(), NOW() + INTERVAL '4 hours')
       RETURNING id, room_code, game_id, host_user_id, status, max_capacity, metadata, created_at, expires_at`,
      [roomCode, gameId, hostUserId, maxCapacity, JSON.stringify(metadata)]
    );

    return res.rows[0];
  }

  /**
   * Create a direct game invitation for a specific friend
   */
  async createGameInvitation(inviterId, inviteeId, roomId, gameId) {
    if (!inviterId || !inviteeId || !roomId || !gameId) {
      return { success: false, error: 'MISSING_PARAMS', message: 'All invitation fields are required.' };
    }

    if (inviterId === inviteeId) {
      return { success: false, error: 'CANNOT_INVITE_SELF' };
    }

    // Verify room
    const roomRes = await db.query(
      `SELECT id, status, host_user_id FROM coplay.private_rooms WHERE id = $1`,
      [roomId]
    );

    if (roomRes.rows.length === 0 || roomRes.rows[0].status === 'closed') {
      return { success: false, error: 'ROOM_NOT_FOUND', message: 'Game room is closed or does not exist.' };
    }

    // Generate cryptographically random invite token (48 hex chars)
    const inviteToken = crypto.randomBytes(24).toString('hex');

    const res = await db.query(
      `INSERT INTO coplay.game_invitations
       (room_id, inviter_user_id, invitee_user_id, invite_token, game_id, status, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW() + INTERVAL '30 minutes')
       RETURNING id, room_id, inviter_user_id, invitee_user_id, invite_token, game_id, status, expires_at`,
      [roomId, inviterId, inviteeId, inviteToken, gameId]
    );

    const row = res.rows[0];

    // Fetch inviter profile details for notification
    const inviterProf = await db.query(
      `SELECT username, display_name, avatar_config FROM identity.profiles WHERE user_id = $1`,
      [inviterId]
    );

    return {
      success: true,
      invitation: {
        ...row,
        inviter: inviterProf.rows[0] || null
      }
    };
  }

  /**
   * Get public preview of an invitation by token
   */
  async getInvitationDetails(inviteToken) {
    if (!inviteToken) return null;

    const res = await db.query(
      `SELECT i.id, i.room_id, i.inviter_user_id, i.invitee_user_id, i.invite_token, i.game_id, i.status, i.expires_at,
              r.room_code, r.status as room_status, r.max_capacity,
              p.username as inviter_username, p.display_name as inviter_display_name, p.avatar_config as inviter_avatar_config
       FROM coplay.game_invitations i
       JOIN coplay.private_rooms r ON i.room_id = r.id
       JOIN identity.profiles p ON i.inviter_user_id = p.user_id
       WHERE i.invite_token = $1`,
      [inviteToken]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const isExpired = new Date(row.expires_at) <= new Date() || row.room_status === 'closed';

    return {
      success: true,
      id: row.id,
      roomId: row.room_id,
      roomCode: row.room_code,
      gameId: row.game_id,
      status: isExpired ? 'expired' : row.status,
      isExpired,
      inviter: {
        id: row.inviter_user_id,
        userId: row.inviter_user_id,
        username: row.inviter_username,
        displayName: row.inviter_display_name,
        avatarConfig: row.inviter_avatar_config
      },
      room: {
        id: row.room_id,
        room_code: row.room_code,
        max_capacity: row.max_capacity,
        status: row.room_status
      },
      invitation: {
        id: row.id,
        room_id: row.room_id,
        inviter_user_id: row.inviter_user_id,
        invitee_user_id: row.invitee_user_id,
        invite_token: row.invite_token,
        game_id: row.game_id,
        status: isExpired ? 'expired' : row.status,
        expires_at: row.expires_at
      },
      inviteeUserId: row.invitee_user_id,
      expiresAt: row.expires_at
    };
  }

  /**
   * Accept an invitation and gain authorized access to the private room
   */
  async acceptInvitation(arg1, arg2) {
    const isFirstUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(arg1));
    const userId = isFirstUuid ? arg1 : arg2;
    const inviteToken = isFirstUuid ? arg2 : arg1;

    const invite = await this.getInvitationDetails(inviteToken);
    if (!invite) {
      return { success: false, error: 'INVITATION_NOT_FOUND', message: 'Game invitation not found.' };
    }

    if (invite.inviteeUserId !== userId) {
      return { success: false, error: 'UNAUTHORIZED_INVITEE', message: 'This invitation was addressed to another player.' };
    }

    if (invite.isExpired || invite.status !== 'pending') {
      return { success: false, error: 'INVITATION_EXPIRED', message: `This invitation is ${invite.status}.` };
    }

    await db.query(
      `UPDATE coplay.game_invitations SET status = 'accepted' WHERE id = $1`,
      [invite.id]
    );

    return {
      success: true,
      invitation: { ...invite.invitation, status: 'accepted' },
      room: invite.room,
      roomId: invite.roomId,
      roomCode: invite.roomCode,
      gameId: invite.gameId
    };
  }

  /**
   * Reject an invitation
   */
  async rejectInvitation(arg1, arg2) {
    const isFirstUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(arg1));
    const userId = isFirstUuid ? arg1 : arg2;
    const inviteToken = isFirstUuid ? arg2 : arg1;

    const res = await db.query(
      `UPDATE coplay.game_invitations SET status = 'rejected' 
       WHERE invite_token = $1 AND invitee_user_id = $2 AND status = 'pending'
       RETURNING id, room_id, inviter_user_id`,
      [inviteToken, userId]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'CANNOT_REJECT' };
    }

    return { success: true, invitation: res.rows[0] };
  }

  /**
   * Cancel an outgoing invitation
   */
  async cancelInvitation(inviterId, invitationId) {
    const res = await db.query(
      `UPDATE coplay.game_invitations SET status = 'canceled'
       WHERE id = $1 AND inviter_user_id = $2 AND status = 'pending'
       RETURNING id, invitee_user_id`,
      [invitationId, inviterId]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'CANNOT_CANCEL' };
    }

    return { success: true, invitation: res.rows[0] };
  }

  /**
   * Authoritative lookup of a private room by code (e.g. "DUEL-9A2F") or UUID
   */
  async getRoomByCodeOrId(codeOrId) {
    if (!codeOrId) return null;
    const clean = String(codeOrId).trim().toUpperCase();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeOrId);

    const res = await db.query(
      `SELECT r.id, r.room_code, r.game_id, r.host_user_id, r.status, r.max_capacity, r.metadata, r.expires_at,
              p.username as host_username, p.display_name as host_display_name, p.avatar_config as host_avatar_config
       FROM coplay.private_rooms r
       JOIN identity.profiles p ON r.host_user_id = p.user_id
       WHERE (r.room_code = $1 OR ($2::boolean AND r.id = $3::uuid))`,
      [clean, isUuid, isUuid ? codeOrId : null]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const isExpired = new Date(row.expires_at) <= new Date() || row.status === 'closed';

    return {
      id: row.id,
      room_code: row.room_code,
      roomCode: row.room_code,
      game_id: row.game_id,
      gameId: row.game_id,
      host_user_id: row.host_user_id,
      hostUserId: row.host_user_id,
      host: {
        username: row.host_username,
        displayName: row.host_display_name,
        avatarConfig: row.host_avatar_config
      },
      status: isExpired ? 'closed' : row.status,
      max_capacity: row.max_capacity,
      maxCapacity: row.max_capacity,
      metadata: row.metadata,
      expires_at: row.expires_at,
      expiresAt: row.expires_at
    };
  }

  /**
   * Close a private room
   */
  async closeRoom(roomId, hostUserId) {
    const res = await db.query(
      `UPDATE coplay.private_rooms SET status = 'closed' WHERE id = $1 AND host_user_id = $2 RETURNING id`,
      [roomId, hostUserId]
    );
    return res.rows.length > 0;
  }
}

const privateRoomService = new PrivateRoomService();

module.exports = {
  privateRoomService,
  PrivateRoomService
};
