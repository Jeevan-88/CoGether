/**
 * Cryptographic Opaque Invite Service
 * Manages secure invite tokens without exposing raw user or database IDs.
 * Implements transaction-safe redemption, max use limits, and inviter profile resolution.
 */

const crypto = require('crypto');
const { db } = require('../../packages/database');
const { getConfig } = require('../../packages/config');

class InviteService {
  generateToken() {
    return crypto.randomBytes(24).toString('base64url');
  }

  hashToken(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return '';
    return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
  }

  async createInvite(inviterUserId, options = {}) {
    if (!inviterUserId) {
      throw new Error('INVITER_REQUIRED');
    }

    const config = getConfig();
    const invitesConfig = config.auth?.invites || {};
    const defaultMaxUses = invitesConfig.defaultMaxUses || 10;
    const defaultExpiresHours = invitesConfig.defaultExpiresInHours || 48;
    const maxAllowedUses = invitesConfig.maxAllowedUses || 100;

    const {
      destinationType = options.resourceType || 'room',
      metadata = {},
      resourceId,
      maxUses = defaultMaxUses,
      expiresInHours,
      expiresInDays
    } = options;

    if (resourceId && !metadata.resourceId) {
      metadata.resourceId = resourceId;
    }

    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);

    let hours = defaultExpiresHours;
    if (expiresInDays) {
      hours = Math.max(1, Math.min(30 * 24, parseInt(expiresInDays, 10) * 24));
    } else if (expiresInHours) {
      hours = Math.max(1, Math.min(30 * 24, parseInt(expiresInHours, 10)));
    }

    const parsedMaxUses = parseInt(maxUses, 10);
    const uses = Math.max(1, Math.min(maxAllowedUses, isNaN(parsedMaxUses) ? defaultMaxUses : parsedMaxUses));

    const res = await db.query(
      `INSERT INTO identity.invites 
       (inviter_user_id, token_hash, destination_type, metadata, expires_at, max_uses, used_count)
       VALUES ($1, $2, $3, $4, NOW() + ($5 || ' hours')::interval, $6, 0)
       RETURNING id, inviter_user_id, destination_type, metadata, expires_at, max_uses, used_count, created_at`,
      [inviterUserId, tokenHash, destinationType, JSON.stringify(metadata), hours, uses]
    );

    const clientBaseUrl = config.auth.clientUrl || 'http://localhost:5173';

    return {
      inviteId: res.rows[0].id,
      inviteToken: rawToken,
      inviteUrl: `${clientBaseUrl}/invite/${rawToken}`,
      token: rawToken,
      destinationType,
      resourceType: destinationType,
      resourceId: metadata.resourceId || null,
      metadata,
      expiresAt: res.rows[0].expires_at,
      maxUses: uses,
      usesCount: 0
    };
  }

  async getInvitePreview(rawToken) {
    if (!rawToken) {
      return { valid: false, error: 'TOKEN_REQUIRED' };
    }

    const tokenHash = this.hashToken(rawToken);

    const res = await db.query(
      `SELECT i.id, i.inviter_user_id, i.destination_type, i.metadata, i.expires_at, 
              i.max_uses, i.used_count, i.revoked_at, i.created_at,
              p.username, p.display_name, p.avatar_url, p.bio
       FROM identity.invites i
       LEFT JOIN identity.profiles p ON i.inviter_user_id = p.user_id
       WHERE i.token_hash = $1`,
      [tokenHash]
    );

    if (res.rows.length === 0) {
      return { valid: false, error: 'INVITE_NOT_FOUND' };
    }

    const invite = res.rows[0];

    if (invite.revoked_at) {
      return { valid: false, error: 'INVITE_REVOKED', revokedAt: invite.revoked_at };
    }

    if (new Date(invite.expires_at) <= new Date()) {
      return { valid: false, error: 'INVITE_EXPIRED', expiresAt: invite.expires_at };
    }

    if (invite.used_count >= invite.max_uses) {
      return { valid: false, error: 'INVITE_EXHAUSTED', maxUses: invite.max_uses, usedCount: invite.used_count };
    }

    return {
      valid: true,
      destinationType: invite.destination_type,
      metadata: invite.metadata,
      expiresAt: invite.expires_at,
      maxUses: invite.max_uses,
      usedCount: invite.used_count,
      usesCount: invite.used_count,
      inviter: {
        userId: invite.inviter_user_id,
        username: invite.username || 'CoGether Member',
        displayName: invite.display_name || invite.username || 'Friend',
        avatarUrl: invite.avatar_url,
        bio: invite.bio
      }
    };
  }

  async redeemInvite(rawToken, redeemingUserId) {
    if (!rawToken) {
      return { success: false, error: 'TOKEN_REQUIRED' };
    }
    if (!redeemingUserId) {
      return { success: false, error: 'USER_ID_REQUIRED' };
    }

    const tokenHash = this.hashToken(rawToken);

    // Atomic transaction with row lock to prevent race conditions
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const lookup = await client.query(
        `SELECT id, inviter_user_id, destination_type, metadata, expires_at, max_uses, used_count, revoked_at
         FROM identity.invites
         WHERE token_hash = $1
         FOR UPDATE`,
        [tokenHash]
      );

      if (lookup.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'INVITE_NOT_FOUND' };
      }

      const invite = lookup.rows[0];

      if (invite.revoked_at) {
        await client.query('ROLLBACK');
        return { success: false, error: 'INVITE_REVOKED' };
      }

      if (new Date(invite.expires_at) <= new Date()) {
        await client.query('ROLLBACK');
        return { success: false, error: 'INVITE_EXPIRED' };
      }

      if (invite.used_count >= invite.max_uses) {
        await client.query('ROLLBACK');
        return { success: false, error: 'INVITE_EXHAUSTED' };
      }

      if (invite.inviter_user_id === redeemingUserId) {
        await client.query('ROLLBACK');
        return { success: false, error: 'CANNOT_REDEEM_OWN_INVITE' };
      }

      // Check if user already redeemed this invite
      const existing = await client.query(
        `SELECT id FROM identity.invite_redemptions 
         WHERE invite_id = $1 AND redeemed_by_user_id = $2`,
        [invite.id, redeemingUserId]
      );

      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'INVITE_ALREADY_REDEEMED' };
      }

      // Record redemption and increment count
      await client.query(
        `INSERT INTO identity.invite_redemptions (invite_id, redeemed_by_user_id, redeemed_at)
         VALUES ($1, $2, NOW())`,
        [invite.id, redeemingUserId]
      );

      await client.query(
        `UPDATE identity.invites 
         SET used_count = used_count + 1 
         WHERE id = $1`,
        [invite.id]
      );

      await client.query('COMMIT');

      return {
        success: true,
        destinationType: invite.destination_type,
        metadata: invite.metadata,
        inviterId: invite.inviter_user_id
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async revokeInvite(rawToken, inviterUserId) {
    const tokenHash = this.hashToken(rawToken);
    const res = await db.query(
      `UPDATE identity.invites 
       SET revoked_at = NOW() 
       WHERE token_hash = $1 AND inviter_user_id = $2 AND revoked_at IS NULL
       RETURNING id`,
      [tokenHash, inviterUserId]
    );
    return res.rows.length > 0;
  }
}

const inviteService = new InviteService();

module.exports = {
  inviteService,
  InviteService
};
