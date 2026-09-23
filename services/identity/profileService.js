/**
 * Profile & Preferences Service
 * Enforces case-insensitive username uniqueness, profile updates, and preferences.
 */

const { db } = require('../../packages/database');

class ProfileService {
  normalizeUsername(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.trim().toLowerCase();
  }

  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { valid: false, error: 'Username is required' };
    }
    const clean = username.trim();
    if (clean.length < 3 || clean.length > 30) {
      return { valid: false, error: 'Username must be between 3 and 30 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      return { valid: false, error: 'Username may only contain letters, numbers, and underscores' };
    }
    return { valid: true, cleanUsername: clean, normalized: clean.toLowerCase() };
  }

  async isUsernameAvailable(rawUsername, excludeUserId = null, client = db) {
    const normalized = this.normalizeUsername(rawUsername);
    if (!normalized) return false;

    let query = 'SELECT user_id FROM identity.profiles WHERE username_normalized = $1';
    const params = [normalized];

    if (excludeUserId) {
      query += ' AND user_id != $2';
      params.push(excludeUserId);
    }

    const res = await client.query(query, params);
    return res.rows.length === 0;
  }

  async generateUniqueUsername(preferredHandle, client = db) {
    let base = this.normalizeUsername(preferredHandle).replace(/[^a-z0-9_]/g, '');
    if (!base || base.length < 3) base = 'player';
    if (base.length > 20) base = base.substring(0, 20);

    let candidate = base;
    let counter = 1;

    while (!(await this.isUsernameAvailable(candidate, null, client))) {
      counter++;
      candidate = `${base}_${counter}`;
      if (candidate.length > 30) {
        candidate = `u_${Date.now().toString(36)}`;
      }
    }

    return candidate;
  }

  async createProfile(userId, { username, displayName, avatarUrl = null, bio = null }, client = db) {
    const valid = this.validateUsername(username);
    if (!valid.valid) {
      throw new Error(valid.error);
    }

    const available = await this.isUsernameAvailable(valid.normalized, null, client);
    if (!available) {
      throw new Error('USERNAME_ALREADY_TAKEN');
    }

    const cleanDisplay = (displayName || valid.cleanUsername).trim().substring(0, 100);

    const res = await client.query(
      `INSERT INTO identity.profiles 
       (user_id, username, username_normalized, display_name, avatar_url, bio, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING user_id, username, display_name, avatar_url, bio, created_at, updated_at`,
      [
        userId,
        valid.cleanUsername,
        valid.normalized,
        cleanDisplay,
        avatarUrl ? String(avatarUrl).trim() : null,
        bio ? String(bio).trim().substring(0, 500) : null
      ]
    );

    return res.rows[0];
  }

  async getProfileByUserId(userId, client = db) {
    const res = await client.query(
      `SELECT user_id, username, display_name, avatar_url, bio, created_at, updated_at 
       FROM identity.profiles 
       WHERE user_id = $1`,
      [userId]
    );
    return res.rows[0] || null;
  }

  async getProfileByUsername(username, client = db) {
    const normalized = this.normalizeUsername(username);
    const res = await client.query(
      `SELECT user_id, username, display_name, avatar_url, bio, created_at, updated_at 
       FROM identity.profiles 
       WHERE username_normalized = $1`,
      [normalized]
    );
    return res.rows[0] || null;
  }

  async updateProfile(userId, updates = {}, client = db) {
    const current = await this.getProfileByUserId(userId, client);
    if (!current) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    let newUsername = current.username;
    let newNormalized = current.username.toLowerCase();

    if (updates.username && updates.username !== current.username) {
      const valid = this.validateUsername(updates.username);
      if (!valid.valid) throw new Error(valid.error);

      const available = await this.isUsernameAvailable(valid.normalized, userId, client);
      if (!available) throw new Error('USERNAME_ALREADY_TAKEN');

      newUsername = valid.cleanUsername;
      newNormalized = valid.normalized;
    }

    const displayName = updates.displayName !== undefined 
      ? String(updates.displayName).trim().substring(0, 100) 
      : current.display_name;

    const avatarUrl = updates.avatarUrl !== undefined 
      ? (updates.avatarUrl ? String(updates.avatarUrl).trim() : null) 
      : current.avatar_url;

    const bio = updates.bio !== undefined 
      ? (updates.bio ? String(updates.bio).trim().substring(0, 500) : null) 
      : current.bio;

    const res = await client.query(
      `UPDATE identity.profiles 
       SET username = $1, username_normalized = $2, display_name = $3, avatar_url = $4, bio = $5, updated_at = NOW()
       WHERE user_id = $6
       RETURNING user_id, username, display_name, avatar_url, bio, created_at, updated_at`,
      [newUsername, newNormalized, displayName, avatarUrl, bio, userId]
    );

    return res.rows[0];
  }

  async createPreferences(userId, { primaryInterest = 'all', interests = [], timezone = 'UTC', language = 'en' } = {}, client = db) {
    const res = await client.query(
      `INSERT INTO identity.preferences 
       (user_id, primary_interest, interests, timezone, language, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE 
       SET primary_interest = EXCLUDED.primary_interest,
           interests = EXCLUDED.interests,
           timezone = EXCLUDED.timezone,
           language = EXCLUDED.language,
           updated_at = NOW()
       RETURNING user_id, primary_interest, interests, timezone, language, created_at, updated_at`,
      [userId, primaryInterest, interests, timezone, language]
    );
    return res.rows[0];
  }

  async getPreferences(userId, client = db) {
    const res = await client.query(
      `SELECT user_id, primary_interest, interests, timezone, language, created_at, updated_at 
       FROM identity.preferences 
       WHERE user_id = $1`,
      [userId]
    );
    return res.rows[0] || null;
  }

  async updatePreferences(userId, updates = {}, client = db) {
    const current = (await this.getPreferences(userId, client)) || {
      primary_interest: 'all',
      interests: [],
      timezone: 'UTC',
      language: 'en'
    };

    const primaryInterest = updates.primaryInterest !== undefined 
      ? String(updates.primaryInterest).substring(0, 100) 
      : current.primary_interest;

    const interests = Array.isArray(updates.interests) ? updates.interests : current.interests;
    const timezone = updates.timezone !== undefined ? String(updates.timezone).substring(0, 100) : current.timezone;
    const language = updates.language !== undefined ? String(updates.language).substring(0, 20) : current.language;

    const res = await client.query(
      `INSERT INTO identity.preferences 
       (user_id, primary_interest, interests, timezone, language, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE 
       SET primary_interest = EXCLUDED.primary_interest,
           interests = EXCLUDED.interests,
           timezone = EXCLUDED.timezone,
           language = EXCLUDED.language,
           updated_at = NOW()
       RETURNING user_id, primary_interest, interests, timezone, language, created_at, updated_at`,
      [userId, primaryInterest, interests, timezone, language]
    );

    return res.rows[0];
  }
}

const profileService = new ProfileService();

module.exports = {
  profileService,
  ProfileService
};
