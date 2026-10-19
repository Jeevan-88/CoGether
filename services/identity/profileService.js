/**
 * Profile & Preferences Service
 * Enforces case-insensitive username uniqueness, profile updates, first/last name,
 * structured SVG avatar configuration (avatar_config), and preferences.
 */

const { db } = require('../../packages/database');

class ProfileService {
  normalizeUsername(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.trim().toLowerCase();
  }

  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { valid: false, error: 'USERNAME_REQUIRED', message: 'Username is required' };
    }
    const clean = username.trim().replace(/^@+/, '');
    if (clean.length < 3) {
      return { valid: false, error: 'USERNAME_TOO_SHORT', message: 'Username must be at least 3 characters' };
    }
    if (clean.length > 30) {
      return { valid: false, error: 'USERNAME_TOO_LONG', message: 'Username cannot exceed 30 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      return { valid: false, error: 'USERNAME_INVALID_CHARS', message: 'Username may only contain letters, numbers, and underscores' };
    }
    return { valid: true, cleanUsername: clean, normalized: clean.toLowerCase() };
  }

  sanitizeAvatarConfig(rawConfig) {
    if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
      return null;
    }
    const clean = {};
    const stringFields = [
      'headId',
      'skinToneId',
      'eyesId',
      'hairId',
      'hairColorId',
      'clothingId',
      'clothingColorId',
      'eyewearId',
      'backgroundId'
    ];
    for (const key of stringFields) {
      if (typeof rawConfig[key] === 'string' && rawConfig[key].trim().length > 0 && rawConfig[key].length <= 80) {
        clean[key] = rawConfig[key].trim();
      }
    }
    if (Array.isArray(rawConfig.accessoryIds)) {
      clean.accessoryIds = rawConfig.accessoryIds
        .filter((id) => typeof id === 'string' && id.trim().length > 0 && id.length <= 80)
        .slice(0, 10);
    } else {
      clean.accessoryIds = [];
    }
    if (Array.isArray(rawConfig.effectsIds)) {
      clean.effectsIds = rawConfig.effectsIds
        .filter((id) => typeof id === 'string' && id.trim().length > 0 && id.length <= 80)
        .slice(0, 10);
    } else {
      clean.effectsIds = [];
    }
    return Object.keys(clean).length > 0 ? clean : null;
  }

  formatProfileRow(row) {
    if (!row) return null;
    return {
      ...row,
      firstName: row.first_name || null,
      lastName: row.last_name || null,
      displayName: row.display_name,
      avatarUrl: row.avatar_url || null,
      avatarConfig: row.avatar_config || null
    };
  }

  async isUsernameAvailable(rawUsername, excludeUserId = null, client = db) {
    const normalized = this.normalizeUsername(String(rawUsername || '').replace(/^@+/, ''));
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
    if (!base || base.length < 3) base = 'member';
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

  async generateUsernameSuggestions(rawBase, excludeUserId = null, count = 3, client = db) {
    let base = this.normalizeUsername(String(rawBase || '').replace(/^@+/, '')).replace(/[^a-z0-9_]/g, '');
    if (!base || base.length < 3) base = 'cogether';
    if (base.length > 18) base = base.substring(0, 18);

    const suffixes = ['_flow', '_hq', '_co', '_01', '_77', '_live', '_studio', '_x'];
    const suggestions = [];

    for (const suffix of suffixes) {
      if (suggestions.length >= count) break;
      const candidate = `${base}${suffix}`.substring(0, 30);
      const available = await this.isUsernameAvailable(candidate, excludeUserId, client);
      if (available) {
        suggestions.push(candidate);
      }
    }

    let n = 2;
    while (suggestions.length < count && n < 50) {
      const candidate = `${base}_${n}`;
      if (!suggestions.includes(candidate)) {
        const available = await this.isUsernameAvailable(candidate, excludeUserId, client);
        if (available) suggestions.push(candidate);
      }
      n++;
    }

    return suggestions;
  }

  async createProfile(
    userId,
    { username, displayName, firstName = null, lastName = null, avatarUrl = null, avatarConfig = null, bio = null },
    client = db
  ) {
    const valid = this.validateUsername(username);
    if (!valid.valid) {
      throw new Error(valid.error);
    }

    const available = await this.isUsernameAvailable(valid.normalized, null, client);
    if (!available) {
      throw new Error('USERNAME_ALREADY_TAKEN');
    }

    const cleanFirst = firstName ? String(firstName).trim().substring(0, 60) : null;
    const cleanLast = lastName ? String(lastName).trim().substring(0, 60) : null;
    const combinedName = [cleanFirst, cleanLast].filter(Boolean).join(' ').trim();
    const cleanDisplay = (displayName || combinedName || valid.cleanUsername).trim().substring(0, 100);
    const cleanAvatarConfig = this.sanitizeAvatarConfig(avatarConfig);

    const res = await client.query(
      `INSERT INTO identity.profiles 
       (user_id, username, username_normalized, display_name, first_name, last_name, avatar_url, avatar_config, bio, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING user_id, username, display_name, first_name, last_name, avatar_url, avatar_config, bio, created_at, updated_at`,
      [
        userId,
        valid.cleanUsername,
        valid.normalized,
        cleanDisplay,
        cleanFirst,
        cleanLast,
        avatarUrl ? String(avatarUrl).trim() : null,
        cleanAvatarConfig ? JSON.stringify(cleanAvatarConfig) : null,
        bio ? String(bio).trim().substring(0, 500) : null
      ]
    );

    return this.formatProfileRow(res.rows[0]);
  }

  async getProfileByUserId(userId, client = db) {
    const res = await client.query(
      `SELECT user_id, username, display_name, first_name, last_name, avatar_url, avatar_config, bio, created_at, updated_at 
       FROM identity.profiles 
       WHERE user_id = $1`,
      [userId]
    );
    return this.formatProfileRow(res.rows[0]);
  }

  async getProfileByUsername(username, client = db) {
    const normalized = this.normalizeUsername(username);
    const res = await client.query(
      `SELECT user_id, username, display_name, first_name, last_name, avatar_url, avatar_config, bio, created_at, updated_at 
       FROM identity.profiles 
       WHERE username_normalized = $1`,
      [normalized]
    );
    return this.formatProfileRow(res.rows[0]);
  }

  async updateProfile(userId, updates = {}, client = db) {
    const current = await this.getProfileByUserId(userId, client);
    if (!current) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    let newUsername = current.username;
    let newNormalized = current.username.toLowerCase();

    if (updates.username !== undefined && updates.username.trim().replace(/^@+/, '') !== current.username) {
      const valid = this.validateUsername(updates.username);
      if (!valid.valid) throw new Error(valid.error);

      const available = await this.isUsernameAvailable(valid.normalized, userId, client);
      if (!available) throw new Error('USERNAME_ALREADY_TAKEN');

      newUsername = valid.cleanUsername;
      newNormalized = valid.normalized;
    }

    const firstName = updates.firstName !== undefined
      ? (updates.firstName ? String(updates.firstName).trim().substring(0, 60) : null)
      : current.first_name;

    const lastName = updates.lastName !== undefined
      ? (updates.lastName ? String(updates.lastName).trim().substring(0, 60) : null)
      : current.last_name;

    const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim();

    let displayName = current.display_name;
    if (updates.displayName !== undefined && String(updates.displayName).trim().length > 0) {
      displayName = String(updates.displayName).trim().substring(0, 100);
    } else if ((updates.firstName !== undefined || updates.lastName !== undefined) && combinedName) {
      displayName = combinedName.substring(0, 100);
    }

    const avatarUrl = updates.avatarUrl !== undefined
      ? (updates.avatarUrl ? String(updates.avatarUrl).trim() : null)
      : current.avatar_url;

    const avatarConfig = updates.avatarConfig !== undefined
      ? this.sanitizeAvatarConfig(updates.avatarConfig)
      : current.avatar_config;

    const bio = updates.bio !== undefined
      ? (updates.bio ? String(updates.bio).trim().substring(0, 500) : null)
      : current.bio;

    const res = await client.query(
      `UPDATE identity.profiles 
       SET username = $1,
           username_normalized = $2,
           display_name = $3,
           first_name = $4,
           last_name = $5,
           avatar_url = $6,
           avatar_config = $7,
           bio = $8,
           updated_at = NOW()
       WHERE user_id = $9
       RETURNING user_id, username, display_name, first_name, last_name, avatar_url, avatar_config, bio, created_at, updated_at`,
      [
        newUsername,
        newNormalized,
        displayName,
        firstName,
        lastName,
        avatarUrl,
        avatarConfig ? JSON.stringify(avatarConfig) : null,
        bio,
        userId
      ]
    );

    // Keep identity.users.display_name synchronized
    await client.query(
      `UPDATE identity.users SET display_name = $1, updated_at = NOW() WHERE id = $2`,
      [displayName, userId]
    ).catch(() => {});

    return this.formatProfileRow(res.rows[0]);
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
