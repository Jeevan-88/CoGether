/**
 * Database Client Manager
 * Manages PostgreSQL connection pool, health checks, and fallback simulation for offline dev.
 */

const crypto = require('crypto');
const { getConfig } = require('../config');
const { logger } = require('../observability');

class DatabaseClient {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.isSimulated = false;

    // In-memory relational tables for local dev / sandbox simulation
    this._simulatedTables = {
      users: new Map(),
      emails: new Map(),
      profiles: new Map(),
      preferences: new Map(),
      entitlements: new Map(),
      verification_tokens: new Map(),
      sessions: new Map(),
      costudy_progress: new Map(),
      telemetry_events: []
    };

    this._init();
  }

  _init() {
    const config = getConfig();
    let pg;
    try {
      pg = require('pg');
    } catch (e) {
      try {
        const path = require('path');
        pg = require(require.resolve('pg', { paths: [path.join(__dirname, '../../server'), path.join(__dirname, '../..')] }));
      } catch (e2) {}
    }

    if (pg && config.database.url) {
      try {
        const { Pool } = pg;
        this.pool = new Pool({
          connectionString: config.database.url,
          max: config.database.poolMax,
          idleTimeoutMillis: config.database.poolIdleTimeoutMs,
          ssl: config.database.ssl ? { rejectUnauthorized: false } : false
        });

        this.pool.on('error', (err) => {
          logger.error('PostgreSQL Pool background error', { error: err });
          this.isConnected = false;
        });
      } catch (err) {
        if (config.env === 'production' || config.env === 'staging' || process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
          throw new Error(`FATAL: PostgreSQL pool creation failed in ${config.env}: ${err.message}`);
        }
        logger.warn('PostgreSQL pool creation failed; enabling simulated store for local dev', { error: err });
        this.isSimulated = true;
      }
    } else {
      if (config.env === 'production' || config.env === 'staging' || process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
        throw new Error('FATAL: PostgreSQL connection string is required in staging/production environment.');
      }
      this.isSimulated = true;
      logger.info('PostgreSQL driver or URL not active; operating in fallback dev simulation mode');
    }
  }

  _isConnectionError(err) {
    if (!err) return false;
    const msg = String(err.message || '');
    const code = String(err.code || '');
    return (
      ['ECONNREFUSED', 'EACCES', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', '57P01', '57P03'].includes(code) ||
      msg.includes('Connection terminated') ||
      msg.includes('connect E') ||
      msg.includes('timeout expired')
    );
  }

  async query(text, params = []) {
    const config = getConfig();
    if (this.pool && !this.isSimulated) {
      const start = Date.now();
      try {
        const res = await this.pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed DB query', { text, duration, rows: res.rowCount });
        return res;
      } catch (err) {
        const isDevLike =
          config.env !== 'production' &&
          config.env !== 'staging' &&
          process.env.NODE_ENV !== 'production' &&
          process.env.NODE_ENV !== 'staging' &&
          !process.env.CI;
        if (isDevLike && this._isConnectionError(err)) {
          logger.warn('PostgreSQL connection unreachable; switching to simulated dev store', { error: err.message });
          this.isSimulated = true;
          return this._handleSimulatedQuery(text, params);
        }
        logger.error('DB query error', { text, error: err.message });
        throw err;
      }
    }

    // Fallback simulation mode
    if (config.env === 'production' || config.env === 'staging' || process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
      throw new Error('FATAL: Database queries cannot run in simulated fallback mode in staging/production.');
    }
    return this._handleSimulatedQuery(text, params);
  }

  _handleSimulatedQuery(text, params = []) {
    const cleanSql = text.trim();
    logger.debug('[Simulated DB] query execution', { sql: cleanSql.slice(0, 80), params });

    // ── USERS TABLE ──
    if (cleanSql.includes('identity.users')) {
      // 1. SELECT by email or id
      if (cleanSql.startsWith('SELECT') && cleanSql.includes('WHERE email = $1')) {
        const email = String(params[0] || '').toLowerCase();
        const user = Array.from(this._simulatedTables.users.values()).find(
          (u) => (u.email || '').toLowerCase() === email
        );
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      if (cleanSql.startsWith('SELECT') && cleanSql.includes('email_normalized = $1')) {
        const email = String(params[0] || '').toLowerCase();
        let user = Array.from(this._simulatedTables.users.values()).find(
          (u) => (u.email || '').toLowerCase() === email
        );
        if (!user) {
          const emailRow = Array.from(this._simulatedTables.emails.values()).find(
            (e) => (e.email_normalized || '').toLowerCase() === email
          );
          if (emailRow) user = this._simulatedTables.users.get(emailRow.user_id);
        }
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      if (cleanSql.startsWith('SELECT') && cleanSql.includes('WHERE id = $1')) {
        const userId = params[0];
        const user = this._simulatedTables.users.get(userId);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }

      // 2. INSERT user
      if (cleanSql.startsWith('INSERT INTO identity.users')) {
        const email = String(params[0] || '').toLowerCase();
        const name = params[1];
        const displayName = params[2];
        const passwordHash = params[3];
        const role = params[4] || 'USER';

        const record = {
          id: crypto.randomUUID(),
          email,
          name,
          display_name: displayName,
          password_hash: passwordHash,
          is_verified: false,
          onboarding_completed: false,
          onboarding_interest: null,
          role,
          status: 'active',
          failed_login_attempts: 0,
          lock_until: null,
          lockout_until: null,
          last_login_at: null,
          created_at: new Date(),
          updated_at: new Date()
        };
        this._simulatedTables.users.set(record.id, record);
        return { rows: [record], rowCount: 1 };
      }

      // 3. UPDATE user (lockout, reset attempts, verify, reset password, onboarding)
      if (cleanSql.startsWith('UPDATE identity.users')) {
        let user = null;
        if (cleanSql.includes('WHERE id = $')) {
          const idParam = params[params.length - 1];
          user = this._simulatedTables.users.get(idParam);
        }
        if (!user) {
          let email = null;
          for (const p of params) {
            if (typeof p === 'string' && p.includes('@')) {
              email = p.toLowerCase();
            }
          }
          user = Array.from(this._simulatedTables.users.values()).find(
            (u) => (u.email || '').toLowerCase() === email
          );
        }
        if (user) {
          if (cleanSql.includes('failed_login_attempts = failed_login_attempts + 1')) {
            user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
          }
          if (cleanSql.includes('lock_until = $1')) {
            user.lock_until = params[0];
            user.lockout_until = params[0];
          }
          if (cleanSql.includes('failed_login_attempts = 0')) {
            user.failed_login_attempts = 0;
            user.lock_until = null;
            user.lockout_until = null;
          }
          if (cleanSql.includes('is_verified = TRUE')) {
            user.is_verified = true;
          }
          if (cleanSql.includes('onboarding_completed = TRUE')) {
            user.onboarding_completed = true;
            if (typeof params[0] === 'string' && !cleanSql.includes('WHERE id = $1')) {
              user.onboarding_interest = params[0];
            }
          }
          if (cleanSql.includes('last_login_at = NOW()')) {
            user.last_login_at = new Date();
          }
          if (cleanSql.includes('password_hash = $1')) {
            user.password_hash = params[0];
          }
          user.updated_at = new Date();
          return { rows: [user], rowCount: 1 };
        }
      }
      if (cleanSql.startsWith('DELETE FROM identity.users')) {
        const id = params[0];
        this._simulatedTables.users.delete(id);
        this._simulatedTables.profiles.delete(id);
        this._simulatedTables.preferences.delete(id);
        this._simulatedTables.entitlements.delete(id);
        this._simulatedTables.emails.delete(id);
        return { rows: [], rowCount: 1 };
      }
    }

    // ── EMAILS TABLE ──
    if (cleanSql.includes('identity.emails')) {
      if (cleanSql.startsWith('INSERT INTO identity.emails')) {
        const userId = params[0];
        const emailNorm = String(params[1] || '').toLowerCase();
        const isVerified = Boolean(params[2]);
        const record = {
          user_id: userId,
          email_normalized: emailNorm,
          is_primary: true,
          verified_at: isVerified ? new Date() : null
        };
        this._simulatedTables.emails.set(userId, record);
        return { rows: [record], rowCount: 1 };
      }
      if (cleanSql.startsWith('SELECT')) {
        const val = String(params[0] || '').toLowerCase();
        const row =
          this._simulatedTables.emails.get(params[0]) ||
          Array.from(this._simulatedTables.emails.values()).find((e) => e.email_normalized === val);
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }
      if (cleanSql.startsWith('UPDATE identity.emails')) {
        const emailNorm = String(params[0] || '').toLowerCase();
        for (const row of this._simulatedTables.emails.values()) {
          if (row.email_normalized === emailNorm || row.user_id === params[0]) {
            row.verified_at = new Date();
          }
        }
        return { rows: [], rowCount: 1 };
      }
    }

    // ── PROFILES TABLE ──
    if (cleanSql.includes('identity.profiles')) {
      if (cleanSql.startsWith('INSERT INTO identity.profiles')) {
        const userId = params[0];
        const username = params[1];
        const displayName = params[2];
        const avatarUrl = params[3] || null;
        const primaryInterest = params[4] || null;
        const existing = this._simulatedTables.profiles.get(userId);
        const record = existing
          ? {
              ...existing,
              username: username || existing.username,
              display_name: displayName || existing.display_name,
              avatar_url: avatarUrl !== undefined ? avatarUrl : existing.avatar_url,
              primary_interest: primaryInterest || existing.primary_interest,
              updated_at: new Date()
            }
          : {
              user_id: userId,
              username,
              display_name: displayName,
              avatar_url: avatarUrl,
              bio: null,
              avatar_config_json: { seed: username || userId },
              primary_interest: primaryInterest,
              updated_at: new Date()
            };
        this._simulatedTables.profiles.set(userId, record);
        return { rows: [record], rowCount: 1 };
      }
      if (cleanSql.startsWith('SELECT')) {
        const userId = params[0];
        if (cleanSql.includes('username = $1')) {
          const uname = String(params[0] || '').toLowerCase();
          const hit = Array.from(this._simulatedTables.profiles.values()).find(
            (p) => (p.username || '').toLowerCase() === uname && p.user_id !== params[1]
          );
          return { rows: hit ? [hit] : [], rowCount: hit ? 1 : 0 };
        }
        const profile = this._simulatedTables.profiles.get(userId);
        return { rows: profile ? [profile] : [], rowCount: profile ? 1 : 0 };
      }
      if (cleanSql.startsWith('UPDATE identity.profiles')) {
        const userId = params[params.length - 1];
        const existing = this._simulatedTables.profiles.get(userId) || { user_id: userId };
        if (params[0]) existing.username = params[0];
        if (params[1]) existing.display_name = params[1];
        if (params[2] !== undefined && params[2] !== null) existing.avatar_url = params[2];
        if (params[3] !== undefined && params[3] !== null) {
          existing.avatar_config_json = typeof params[3] === 'string' ? JSON.parse(params[3]) : params[3];
        }
        if (params[4] !== undefined && params[4] !== null) existing.primary_interest = params[4];
        existing.updated_at = new Date();
        this._simulatedTables.profiles.set(userId, existing);
        return { rows: [existing], rowCount: 1 };
      }
    }

    // ── PREFERENCES TABLE ──
    if (cleanSql.includes('identity.preferences')) {
      if (cleanSql.startsWith('INSERT INTO identity.preferences')) {
        const userId = params[0];
        const existing = this._simulatedTables.preferences.get(userId) || {
          user_id: userId,
          theme: 'obsidian',
          cam_auto_merge: true,
          cam_size: 'M',
          notifications_enabled: true
        };
        this._simulatedTables.preferences.set(userId, existing);
        return { rows: [existing], rowCount: 1 };
      }
      if (cleanSql.startsWith('SELECT')) {
        const pref = this._simulatedTables.preferences.get(params[0]);
        return { rows: pref ? [pref] : [], rowCount: pref ? 1 : 0 };
      }
    }

    // ── ENTITLEMENTS TABLE ──
    if (cleanSql.includes('identity.entitlements')) {
      if (cleanSql.startsWith('INSERT INTO identity.entitlements')) {
        const userId = params[0];
        const isPro = cleanSql.includes('KEYPASS_PRO');
        const record = isPro
          ? {
              user_id: userId,
              tier: 'KEYPASS_PRO',
              plan_code: 'keypass_monthly',
              status: 'active',
              expires_at: params[1] || null,
              payment_provider: params[2] || 'sandbox_preview',
              payment_reference: params[3] || null,
              amount_inr: params[4] || 49,
              updated_at: new Date()
            }
          : this._simulatedTables.entitlements.get(userId) || {
              user_id: userId,
              tier: 'FREE',
              plan_code: 'free',
              status: 'active',
              expires_at: null,
              updated_at: new Date()
            };
        this._simulatedTables.entitlements.set(userId, record);
        return { rows: [record], rowCount: 1 };
      }
      if (cleanSql.startsWith('SELECT')) {
        const ent = this._simulatedTables.entitlements.get(params[0]);
        return { rows: ent ? [ent] : [], rowCount: ent ? 1 : 0 };
      }
    }

    // ── COSTUDY PROGRESS TABLE ──
    if (cleanSql.includes('social.costudy_progress')) {
      const userId = params[0];
      if (cleanSql.startsWith('SELECT')) {
        const row = this._simulatedTables.costudy_progress.get(userId);
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }
      const record = {
        user_id: userId,
        xp: params[1] ?? 0,
        streak_days: params[2] ?? 0,
        level: params[3] ?? 1,
        active_mission: params[4] ?? null,
        updated_at: new Date()
      };
      this._simulatedTables.costudy_progress.set(userId, record);
      return { rows: [record], rowCount: 1 };
    }

    // ── VERIFICATION TOKENS TABLE ──
    if (cleanSql.includes('identity.verification_tokens')) {
      // 1. INSERT token
      if (cleanSql.startsWith('INSERT INTO identity.verification_tokens')) {
        const identifier = String(params[0] || '').toLowerCase();
        const token = params[1];
        const type = cleanSql.includes('PASSWORD_RESET') ? 'PASSWORD_RESET' : 'EMAIL_VERIFY';
        const id = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const record = { id, identifier, token, type, expires_at: expiresAt, created_at: new Date() };
        this._simulatedTables.verification_tokens.set(id, record);
        return { rows: [record], rowCount: 1 };
      }

      // 2. SELECT token
      if (cleanSql.startsWith('SELECT')) {
        const identifier = String(params[0] || '').toLowerCase();
        const token = params[1];
        const found = Array.from(this._simulatedTables.verification_tokens.values()).find(
          (t) => t.identifier === identifier && t.token === token
        );
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      // 3. DELETE token
      if (cleanSql.startsWith('DELETE')) {
        const id = params[0];
        this._simulatedTables.verification_tokens.delete(id);
        return { rows: [], rowCount: 1 };
      }
    }

    // ── SESSIONS TABLE ──
    if (cleanSql.includes('identity.sessions')) {
      // 1. INSERT session
      if (cleanSql.startsWith('INSERT INTO identity.sessions')) {
        const userId = params[0];
        const tokenHash = params[1];
        const userAgent = params[2];
        const ipAddress = params[3];
        const id = crypto.randomUUID();
        const record = {
          id,
          user_id: userId,
          token_hash: tokenHash,
          user_agent: userAgent,
          ip_address: ipAddress,
          revoked_at: null,
          created_at: new Date(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };
        this._simulatedTables.sessions.set(tokenHash, record);
        return { rows: [record], rowCount: 1 };
      }

      // 2. SELECT session by token_hash or refresh_token_hash
      if (cleanSql.startsWith('SELECT') && (cleanSql.includes('token_hash = $1') || cleanSql.includes('refresh_token_hash = $1'))) {
        const tokenHash = params[0];
        const session = this._simulatedTables.sessions.get(tokenHash);
        if (session && !session.revoked_at && new Date(session.expires_at) > new Date()) {
          const user = this._simulatedTables.users.get(session.user_id) || {
            id: session.user_id,
            email: 'user@cogether.tech',
            role: 'USER'
          };
          return {
            rows: [{
              id: session.id,
              session_id: session.id,
              user_id: session.user_id,
              email: user.email,
              role: user.role,
              refresh_token_hash: session.token_hash,
              token_hash: session.token_hash,
              revoked_at: session.revoked_at,
              expires_at: session.expires_at
            }],
            rowCount: 1
          };
        }
        return { rows: [], rowCount: 0 };
      }

      // 3. UPDATE session (revoke by token hash or session id)
      if (cleanSql.startsWith('UPDATE identity.sessions')) {
        const identifier = params[0];
        for (const session of this._simulatedTables.sessions.values()) {
          if (session.id === identifier || session.token_hash === identifier) {
            session.revoked_at = new Date();
          }
        }
        return { rows: [], rowCount: 1 };
      }
    }

    return { rows: [], rowCount: 0 };
  }

  async checkHealth() {
    const config = getConfig();
    if (this.isSimulated || !this.pool) {
      if (config.env === 'production' || process.env.NODE_ENV === 'production') {
        return {
          connected: false,
          mode: 'simulated_dev',
          latencyMs: 0,
          error: 'FATAL: Simulated database mode is prohibited in production environment.'
        };
      }
      return {
        connected: true,
        mode: 'simulated_dev',
        latencyMs: 0,
        error: null
      };
    }

    const start = Date.now();
    try {
      await this.pool.query('SELECT 1 AS health_check');
      this.isConnected = true;
      return {
        connected: true,
        mode: 'postgresql',
        latencyMs: Date.now() - start,
        error: null
      };
    } catch (err) {
      this.isConnected = false;
      return {
        connected: false,
        mode: 'postgresql',
        latencyMs: Date.now() - start,
        error: err.message
      };
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
    }
  }
}

const db = new DatabaseClient();

module.exports = {
  DatabaseClient,
  db
};
