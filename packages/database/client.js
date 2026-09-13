/**
 * Database Client Manager
 * Manages PostgreSQL connection pool, health checks, and fallback simulation for offline dev.
 */

const { getConfig } = require('../config');
const { logger } = require('../observability');

class DatabaseClient {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.isSimulated = false;
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
        logger.warn('PostgreSQL pool creation failed; enabling simulated store for local dev', { error: err });
        this.isSimulated = true;
      }
    } else {
      this.isSimulated = true;
      logger.info('PostgreSQL driver or URL not active; operating in fallback dev simulation mode');
    }
  }

  async query(text, params = []) {
    if (this.pool && !this.isSimulated) {
      const start = Date.now();
      try {
        const res = await this.pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed DB query', { text, duration, rows: res.rowCount });
        return res;
      } catch (err) {
        logger.error('DB query error', { text, error: err });
        throw err;
      }
    }

    // Fallback simulation mode
    logger.debug('[Simulated DB] query execution', { text, params });
    return { rows: [], rowCount: 0 };
  }

  async checkHealth() {
    if (this.isSimulated || !this.pool) {
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
