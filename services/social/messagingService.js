/**
 * CoGether Direct Messaging & E2EE Key Registry Service
 * Stores and routes client-side encrypted message payloads (AES-256-GCM)
 * Server has ZERO access to plaintext or private encryption keys.
 */

const { db } = require('../../packages/database');
const { friendService } = require('./friendService');
const { logger } = require('../../packages/observability');

class MessagingService {
  /**
   * Register or update user's public ECDH identity key for E2EE
   */
  async registerUserKey(userId, keyId, publicKeyJwk) {
    if (!userId || !keyId || !publicKeyJwk) {
      throw new Error('User ID, key ID, and public key JWK are required');
    }

    const res = await db.query(
      `INSERT INTO identity.user_keys (user_id, key_id, public_key_jwk, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE 
       SET key_id = $2, public_key_jwk = $3, updated_at = NOW()
       RETURNING user_id, key_id, public_key_jwk, updated_at`,
      [userId, keyId, JSON.stringify(publicKeyJwk)]
    );

    return {
      success: true,
      key: res.rows[0],
      ...res.rows[0]
    };
  }

  /**
   * Retrieve a user's public identity key for E2EE handshake
   */
  async getUserPublicKey(userId) {
    if (!userId) return { success: false, error: 'USER_ID_REQUIRED' };

    const res = await db.query(
      `SELECT user_id, key_id, public_key_jwk, updated_at 
       FROM identity.user_keys 
       WHERE user_id = $1`,
      [userId]
    );

    if (res.rows.length === 0) return { success: false, error: 'KEY_NOT_FOUND' };

    const row = res.rows[0];
    const parsed = typeof row.public_key_jwk === 'string' ? JSON.parse(row.public_key_jwk) : row.public_key_jwk;
    return {
      success: true,
      userId: row.user_id,
      keyId: row.key_id,
      publicKey: parsed,
      publicKeyJwk: parsed,
      updatedAt: row.updated_at
    };
  }

  /**
   * Send a client-side encrypted direct message between accepted friends
   */
  async sendDirectMessage(senderId, recipientId, payload) {
    const { ciphertext, iv, senderKeyId, recipientKeyId } = payload || {};

    if (!senderId || !recipientId) {
      return { success: false, error: 'SENDER_AND_RECIPIENT_REQUIRED' };
    }

    if (senderId === recipientId) {
      return { success: false, error: 'CANNOT_MESSAGE_SELF' };
    }

    if (!ciphertext || typeof ciphertext !== 'string' || !iv || typeof iv !== 'string') {
      return { success: false, error: 'INVALID_CIPHERTEXT_PAYLOAD', message: 'Ciphertext and IV are required.' };
    }

    // Input size limit: ciphertext cannot exceed 100KB
    if (ciphertext.length > 100000) {
      return { success: false, error: 'MESSAGE_PAYLOAD_TOO_LARGE', message: 'Message payload exceeds maximum allowable length.' };
    }

    // Server-Side Authorization: verify friendship is accepted and not blocked
    const areFriends = await friendService.areFriends(senderId, recipientId);
    if (!areFriends) {
      return { success: false, error: 'NOT_FRIENDS', message: 'Direct messages can only be exchanged between accepted friends.' };
    }

    const res = await db.query(
      `INSERT INTO identity.direct_messages 
       (sender_id, recipient_id, ciphertext, iv, sender_key_id, recipient_key_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'sent', NOW())
       RETURNING id, sender_id, recipient_id, ciphertext, iv, sender_key_id, recipient_key_id, status, created_at`,
      [
        senderId,
        recipientId,
        ciphertext,
        iv,
        senderKeyId || 'default',
        recipientKeyId || 'default'
      ]
    );

    const message = res.rows[0];

    return {
      success: true,
      message
    };
  }

  /**
   * Get direct message history for an authorized conversation
   */
  async getConversation(userId, friendUserId, { limit = 50, beforeId = null } = {}) {
    if (!userId || !friendUserId) return [];

    // Verify authorized friendship
    const areFriends = await friendService.areFriends(userId, friendUserId);
    if (!areFriends) {
      return [];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

    let sql = `
      SELECT id, sender_id, recipient_id, ciphertext, iv, sender_key_id, recipient_key_id, status, created_at, read_at
      FROM identity.direct_messages
      WHERE ((sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1))
    `;
    const params = [userId, friendUserId];

    if (beforeId) {
      sql += ` AND created_at < (SELECT created_at FROM identity.direct_messages WHERE id = $3)`;
      params.push(beforeId);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(safeLimit);

    const res = await db.query(sql, params);
    // Return in chronological order
    return res.rows.reverse();
  }

  /**
   * Mark messages as read by recipient
   */
  async markMessagesRead(userId, friendUserId) {
    if (!userId || !friendUserId) return { success: false, markedCount: 0 };

    const res = await db.query(
      `UPDATE identity.direct_messages 
       SET status = 'read', read_at = NOW() 
       WHERE recipient_id = $1 AND sender_id = $2 AND status != 'read'
       RETURNING id`,
      [userId, friendUserId]
    );

    return { success: true, count: res.rows.length, markedCount: res.rows.length, readIds: res.rows.map(r => r.id) };
  }

  /**
   * Get summary of unread messages count per friend
   */
  async getUnreadSummary(userId) {
    if (!userId) return { success: false, totalUnread: 0, byFriend: {} };

    const res = await db.query(
      `SELECT sender_id, count(*)::int as unread_count 
       FROM identity.direct_messages 
       WHERE recipient_id = $1 AND status != 'read' 
       GROUP BY sender_id`,
      [userId]
    );

    const summary = {};
    let totalUnread = 0;
    for (const row of res.rows) {
      summary[row.sender_id] = row.unread_count;
      totalUnread += row.unread_count;
    }
    return {
      success: true,
      totalUnread,
      byFriend: summary,
      ...summary
    };
  }
}

const messagingService = new MessagingService();

module.exports = {
  messagingService,
  MessagingService
};
