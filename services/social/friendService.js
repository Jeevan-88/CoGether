/**
 * CoGether Social & Friends Service
 * Authoritative lifecycle orchestrator for user search, friend requests,
 * relationships, presence, and blocking in PostgreSQL.
 */

const { db } = require('../../packages/database');
const { logger } = require('../../packages/observability');

class FriendService {
  /**
   * Search users by partial handle (@username) or display name
   * Excludes the searching user and returns active friendship status.
   */
  async searchUsers(query, currentUserId) {
    if (!query || typeof query !== 'string') return [];
    const clean = query.trim().replace(/^@+/, '').toLowerCase();
    if (clean.length < 2) return [];

    const searchSql = `
      SELECT u.id, u.status, p.username, p.display_name, p.first_name, p.last_name, p.avatar_config, p.avatar_url,
             f.id as friendship_id, f.status as friendship_status, f.action_user_id
      FROM identity.users u
      JOIN identity.profiles p ON u.id = p.user_id
      LEFT JOIN identity.friendships f ON (
        (f.user_id_1 = LEAST($1::uuid, u.id) AND f.user_id_2 = GREATEST($1::uuid, u.id))
      )
      WHERE u.id != $1::uuid
        AND (u.status IS NULL OR u.status = 'active')
        AND (p.username ILIKE $2 OR p.display_name ILIKE $2)
      ORDER BY 
        CASE WHEN p.username = $3 THEN 0 WHEN p.username ILIKE $4 THEN 1 ELSE 2 END,
        p.username ASC
      LIMIT 20
    `;

    const res = await db.query(searchSql, [
      currentUserId,
      `%${clean}%`,
      clean,
      `${clean}%`
    ]);

    return res.rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name || row.username,
      avatarConfig: row.avatar_config || null,
      avatarUrl: row.avatar_url || null,
      friendshipStatus: row.friendship_status || 'none',
      friendship: row.friendship_id ? {
        id: row.friendship_id,
        status: row.friendship_status,
        isRequester: row.action_user_id === currentUserId
      } : null
    }));
  }

  /**
   * Send a friend request to a target user
   */
  async sendFriendRequest(requesterId, targetUsernameOrId) {
    if (!requesterId || !targetUsernameOrId) {
      return { success: false, error: 'MISSING_PARAMS', message: 'Target user is required.' };
    }

    // Resolve target user
    let targetId = targetUsernameOrId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(targetUsernameOrId));

    if (!isUuid) {
      const cleanUsername = String(targetUsernameOrId).trim().replace(/^@+/, '').toLowerCase();
      const userRes = await db.query(
        `SELECT user_id FROM identity.profiles WHERE LOWER(username) = $1 LIMIT 1`,
        [cleanUsername]
      );
      if (userRes.rows.length === 0) {
        return { success: false, error: 'USER_NOT_FOUND', message: 'No user found with that handle.' };
      }
      targetId = userRes.rows[0].user_id;
    }

    if (requesterId === targetId) {
      return { success: false, error: 'CANNOT_FRIEND_SELF', message: 'You cannot send a friend request to yourself.' };
    }

    const u1 = requesterId < targetId ? requesterId : targetId;
    const u2 = requesterId < targetId ? targetId : requesterId;

    // Check existing friendship / block state
    const existing = await db.query(
      `SELECT id, status, action_user_id FROM identity.friendships WHERE user_id_1 = $1 AND user_id_2 = $2`,
      [u1, u2]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.status === 'blocked') {
        return { success: false, error: 'CANNOT_SEND_REQUEST', message: 'Unable to send friend request.' };
      }
      if (row.status === 'accepted') {
        return { success: false, error: 'ALREADY_FRIENDS', message: 'You are already friends with this user.' };
      }
      if (row.status === 'pending') {
        if (row.action_user_id === requesterId) {
          return { success: false, error: 'REQUEST_ALREADY_PENDING', message: 'Friend request is already pending.' };
        } else {
          // If the other user already sent a request, auto-accept it!
          await db.query(
            `UPDATE identity.friendships SET status = 'accepted', action_user_id = $1, updated_at = NOW() WHERE id = $2`,
            [requesterId, row.id]
          );
          return { success: true, status: 'accepted', message: 'Friend request accepted!' };
        }
      }
    }

    // Insert new pending friendship
    const insertRes = await db.query(
      `INSERT INTO identity.friendships (user_id_1, user_id_2, status, action_user_id, created_at, updated_at)
       VALUES ($1, $2, 'pending', $3, NOW(), NOW())
       RETURNING id, status, created_at`,
      [u1, u2, requesterId]
    );

    return {
      success: true,
      status: 'pending',
      friendship: insertRes.rows[0],
      friendshipId: insertRes.rows[0].id,
      recipientId: targetId,
      targetUserId: targetId,
      message: 'Friend request sent!'
    };
  }

  /**
   * Respond to an incoming friend request (accept or reject)
   */
  async respondToFriendRequest(userId, targetOrFriendshipId, action) {
    if (!['accept', 'reject'].includes(action)) {
      return { success: false, error: 'INVALID_ACTION', message: 'Action must be accept or reject.' };
    }

    const check = await db.query(
      `SELECT id, user_id_1, user_id_2, status, action_user_id 
       FROM identity.friendships 
       WHERE id::text = $1
          OR (user_id_1 = LEAST($2::uuid, $1::uuid) AND user_id_2 = GREATEST($2::uuid, $1::uuid))`,
      [String(targetOrFriendshipId), userId]
    );

    if (check.rows.length === 0) {
      return { success: false, error: 'REQUEST_NOT_FOUND', message: 'Friend request not found.' };
    }

    const row = check.rows[0];

    // Must be a party to this friendship
    if (row.user_id_1 !== userId && row.user_id_2 !== userId) {
      return { success: false, error: 'UNAUTHORIZED', message: 'You are not authorized for this request.' };
    }

    // Only the recipient (not the requester) can accept/reject
    if (row.action_user_id === userId) {
      return { success: false, error: 'CANNOT_RESPOND_TO_OWN_REQUEST', message: 'You cannot respond to your own outgoing request.' };
    }

    if (row.status !== 'pending') {
      return { success: false, error: 'REQUEST_NOT_PENDING', message: `Request is already ${row.status}.` };
    }

    const otherUserId = row.user_id_1 === userId ? row.user_id_2 : row.user_id_1;

    if (action === 'accept') {
      await db.query(
        `UPDATE identity.friendships SET status = 'accepted', action_user_id = $1, updated_at = NOW() WHERE id = $2`,
        [userId, row.id]
      );
      return {
        success: true,
        action: 'accepted',
        status: 'accepted',
        friendship: { id: row.id, status: 'accepted' },
        friendUserId: otherUserId,
        friend: { id: otherUserId },
        message: 'Friend request accepted!'
      };
    } else {
      await db.query(`DELETE FROM identity.friendships WHERE id = $1`, [row.id]);
      return {
        success: true,
        action: 'rejected',
        status: 'rejected',
        friendUserId: otherUserId,
        message: 'Friend request declined.'
      };
    }
  }

  /**
   * Cancel an outgoing friend request
   */
  async cancelFriendRequest(userId, targetOrFriendshipId) {
    const check = await db.query(
      `SELECT id, user_id_1, user_id_2, status, action_user_id 
       FROM identity.friendships 
       WHERE id::text = $1
          OR (user_id_1 = LEAST($2::uuid, $1::uuid) AND user_id_2 = GREATEST($2::uuid, $1::uuid))`,
      [String(targetOrFriendshipId), userId]
    );

    if (check.rows.length === 0) {
      return { success: false, error: 'REQUEST_NOT_FOUND' };
    }

    const row = check.rows[0];
    if (row.action_user_id !== userId || row.status !== 'pending') {
      return { success: false, error: 'UNAUTHORIZED', message: 'Cannot cancel this request.' };
    }

    await db.query(`DELETE FROM identity.friendships WHERE id = $1`, [row.id]);
    return { success: true, message: 'Friend request canceled.' };
  }

  /**
   * Remove an accepted friend
   */
  async removeFriend(userId, friendUserId) {
    const u1 = userId < friendUserId ? userId : friendUserId;
    const u2 = userId < friendUserId ? friendUserId : userId;

    const res = await db.query(
      `DELETE FROM identity.friendships WHERE user_id_1 = $1 AND user_id_2 = $2 AND status = 'accepted' RETURNING id`,
      [u1, u2]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'NOT_FRIENDS', message: 'You are not friends with this user.' };
    }

    return { success: true, message: 'Friend removed successfully.' };
  }

  /**
   * Block a user
   */
  async blockUser(userId, targetUserId) {
    if (userId === targetUserId) {
      return { success: false, error: 'CANNOT_BLOCK_SELF' };
    }

    const u1 = userId < targetUserId ? userId : targetUserId;
    const u2 = userId < targetUserId ? targetUserId : userId;

    await db.query(
      `INSERT INTO identity.friendships (user_id_1, user_id_2, status, action_user_id, created_at, updated_at)
       VALUES ($1, $2, 'blocked', $3, NOW(), NOW())
       ON CONFLICT (user_id_1, user_id_2) DO UPDATE 
       SET status = 'blocked', action_user_id = $3, updated_at = NOW()`,
      [u1, u2, userId]
    );

    return { success: true, message: 'User blocked.' };
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId, targetUserId) {
    const u1 = userId < targetUserId ? userId : targetUserId;
    const u2 = userId < targetUserId ? targetUserId : userId;

    const res = await db.query(
      `DELETE FROM identity.friendships WHERE user_id_1 = $1 AND user_id_2 = $2 AND status = 'blocked' AND action_user_id = $3 RETURNING id`,
      [u1, u2, userId]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'NOT_BLOCKED', message: 'You have not blocked this user.' };
    }

    return { success: true, message: 'User unblocked.' };
  }

  /**
   * Get all accepted friends with their profiles
   */
  async getFriends(userId) {
    const sql = `
      SELECT f.id as friendship_id, f.created_at as friendship_date,
             u.id as friend_id, u.status as account_status,
             p.username, p.display_name, p.first_name, p.last_name, p.avatar_config, p.avatar_url, p.bio
      FROM identity.friendships f
      JOIN identity.users u ON (u.id = CASE WHEN f.user_id_1 = $1::uuid THEN f.user_id_2 ELSE f.user_id_1 END)
      JOIN identity.profiles p ON u.id = p.user_id
      WHERE (f.user_id_1 = $1::uuid OR f.user_id_2 = $1::uuid)
        AND f.status = 'accepted'
        AND (u.status IS NULL OR u.status = 'active')
      ORDER BY p.display_name ASC, p.username ASC
    `;

    const res = await db.query(sql, [userId]);
    return res.rows.map((row) => ({
      id: row.friend_id,
      friendId: row.friend_id,
      friendshipId: row.friendship_id,
      username: row.username,
      displayName: row.display_name || row.username,
      avatarConfig: row.avatar_config || null,
      avatarUrl: row.avatar_url || null,
      bio: row.bio || null,
      friendshipDate: row.friendship_date
    }));
  }

  /**
   * Get incoming and outgoing pending friend requests
   */
  async getPendingRequests(userId) {
    const sql = `
      SELECT f.id as friendship_id, f.status, f.action_user_id, f.created_at,
             u.id as user_id, p.username, p.display_name, p.avatar_config, p.avatar_url
      FROM identity.friendships f
      JOIN identity.users u ON (u.id = CASE WHEN f.user_id_1 = $1::uuid THEN f.user_id_2 ELSE f.user_id_1 END)
      JOIN identity.profiles p ON u.id = p.user_id
      WHERE (f.user_id_1 = $1::uuid OR f.user_id_2 = $1::uuid)
        AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `;

    const res = await db.query(sql, [userId]);

    const incoming = [];
    const outgoing = [];

    for (const row of res.rows) {
      const item = {
        id: row.user_id,
        userId: row.user_id,
        friendshipId: row.friendship_id,
        username: row.username,
        displayName: row.display_name || row.username,
        avatarConfig: row.avatar_config || null,
        avatarUrl: row.avatar_url || null,
        createdAt: row.created_at
      };

      if (row.action_user_id === userId) {
        outgoing.push(item);
      } else {
        incoming.push(item);
      }
    }

    return { incoming, outgoing };
  }

  /**
   * Check if two users are accepted friends
   */
  async areFriends(userIdA, userIdB) {
    if (!userIdA || !userIdB || userIdA === userIdB) return false;
    const u1 = userIdA < userIdB ? userIdA : userIdB;
    const u2 = userIdA < userIdB ? userIdB : userIdA;

    const res = await db.query(
      `SELECT id FROM identity.friendships WHERE user_id_1 = $1 AND user_id_2 = $2 AND status = 'accepted' LIMIT 1`,
      [u1, u2]
    );

    return res.rows.length > 0;
  }
}

const friendService = new FriendService();

module.exports = {
  friendService,
  FriendService
};
