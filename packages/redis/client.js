/**
 * Redis Data Access Layer & State Abstraction
 * Handles caching, distributed locks, room presence, and rate limiting with
 * automatic resilient fallback store for offline development.
 */

const { getConfig } = require('../config');
const { logger } = require('../observability');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isSimulated = false;

    // In-memory fallback structures
    this._memStore = new Map();
    this._memExpirations = new Map();
    this._memRooms = new Map(); // roomId -> Map(memberId -> data)
    this._memLocks = new Map(); // resource -> { ownerToken, expiresAt }
    this._memRateLimits = new Map(); // key -> [timestamps]

    this._init();
  }

  _init() {
    const config = getConfig();
    const allowFallback = config.env === 'development' || config.isTest;

    if (!config.redis.enabled) {
      if (allowFallback) {
        this.isSimulated = true;
        logger.info('Redis disabled by configuration; using in-memory state engine');
        return;
      }

      logger.error('Redis is disabled in a non-development environment; refusing to start with simulated state');
      process.exit(1);
    }

    let ioredis;
    try {
      ioredis = require('ioredis');
    } catch (e) {
      try {
        const path = require('path');
        ioredis = require(require.resolve('ioredis', {
          paths: [path.join(__dirname, '../../server'), path.join(__dirname, '../..')]
        }));
      } catch (e2) {}
    }

    if (!ioredis || !config.redis.url) {
      if (allowFallback) {
        this.isSimulated = true;
        logger.info('Redis client or URL unavailable; using in-memory state engine');
        return;
      }

      logger.error('Redis client or REDIS_URL is missing in a non-development environment');
      process.exit(1);
    }

    try {
      const Redis = ioredis;

      this.client = new Redis(config.redis.url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.isSimulated = false;
        logger.info('Connected to Redis instance successfully');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;

        if (allowFallback) {
          this.isSimulated = true;
          logger.warn('Redis error; switching to resilient in-memory fallback', {
            error: err.message
          });
          return;
        }

        logger.error('Redis connection failed in non-development environment', {
          error: err.message
        });

        process.exit(1);
      });

      this.client.connect().catch((err) => {
        this.isConnected = false;

        if (allowFallback) {
          this.isSimulated = true;
          logger.info('Could not connect to Redis; using in-memory state engine', {
            error: err.message
          });
          return;
        }

        logger.error('Could not connect to required Redis/Valkey in non-development environment', {
          error: err.message
        });

        process.exit(1);
      });
    } catch (err) {
      if (allowFallback) {
        this.isSimulated = true;
        logger.warn('Redis initialization failed; using in-memory fallback', {
          error: err.message
        });
        return;
      }

      logger.error('Redis initialization failed in non-development environment', {
        error: err.message
      });

      process.exit(1);
    }
  }

  // ── Key-Value Cache ──────────────────────────────────────────────────────────

  async get(key) {
    if (!this.isSimulated && this.client && this.isConnected) {
      return await this.client.get(key);
    }
    this._cleanExpiredMem();
    return this._memStore.get(key) || null;
  }

  async set(key, value, ttlSeconds = null) {
    if (!this.isSimulated && this.client && this.isConnected) {
      if (ttlSeconds) {
        return await this.client.set(key, value, 'EX', ttlSeconds);
      }
      return await this.client.set(key, value);
    }

    this._memStore.set(key, String(value));
    if (ttlSeconds) {
      this._memExpirations.set(key, Date.now() + ttlSeconds * 1000);
    } else {
      this._memExpirations.delete(key);
    }
    return 'OK';
  }

  async del(key) {
    if (!this.isSimulated && this.client && this.isConnected) {
      return await this.client.del(key);
    }
    this._memStore.delete(key);
    this._memExpirations.delete(key);
    return 1;
  }

  // ── Distributed Locking (Redlock style) ──────────────────────────────────────

  async acquireLock(resource, ttlMs = 5000, ownerToken = null) {
    const token = ownerToken || Math.random().toString(36).substring(2, 15);
    const lockKey = `lock:${resource}`;

    if (!this.isSimulated && this.client && this.isConnected) {
      const acquired = await this.client.set(lockKey, token, 'PX', ttlMs, 'NX');
      return acquired === 'OK' ? { acquired: true, token } : { acquired: false };
    }

    // In-memory lock
    const now = Date.now();
    const existing = this._memLocks.get(lockKey);
    if (existing && existing.expiresAt > now) {
      return { acquired: false, token: null };
    }

    this._memLocks.set(lockKey, { ownerToken: token, expiresAt: now + ttlMs });
    return { acquired: true, token };
  }

  async releaseLock(resource, ownerToken) {
    const lockKey = `lock:${resource}`;

    if (!this.isSimulated && this.client && this.isConnected) {
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const res = await this.client.eval(luaScript, 1, lockKey, ownerToken);
      return res === 1;
    }

    const existing = this._memLocks.get(lockKey);
    if (existing && existing.ownerToken === ownerToken) {
      this._memLocks.delete(lockKey);
      return true;
    }
    return false;
  }

  // ── Room Presence ────────────────────────────────────────────────────────────

  async addRoomMember(roomId, memberId, memberData) {
    const payload = {
      ...memberData,
      joinedAt: Date.now()
    };
    if (!this._memRooms.has(roomId)) {
      this._memRooms.set(roomId, new Map());
    }
    this._memRooms.get(roomId).set(memberId, payload);

    if (!this.isSimulated && this.client && this.isConnected) {
      try {
        const hashKey = `cogether:room:${roomId}:members`;
        await this.client.hset(hashKey, memberId, JSON.stringify(payload));
        await this.client.expire(hashKey, 86400);
      } catch (err) {
        logger.warn('Redis addRoomMember error; saved in fallback', { error: err.message });
      }
    }
    return true;
  }

  async removeRoomMember(roomId, memberId) {
    let memRemoved = false;
    if (this._memRooms.has(roomId)) {
      const room = this._memRooms.get(roomId);
      memRemoved = room.delete(memberId);
      if (room.size === 0) {
        this._memRooms.delete(roomId);
      }
    }

    if (!this.isSimulated && this.client && this.isConnected) {
      try {
        const hashKey = `cogether:room:${roomId}:members`;
        const res = await this.client.hdel(hashKey, memberId);
        const count = await this.client.hlen(hashKey);
        if (count === 0) {
          await this.client.del(hashKey);
        }
        return res > 0 || memRemoved;
      } catch (err) {
        logger.warn('Redis removeRoomMember error', { error: err.message });
      }
    }
    return memRemoved;
  }

  async getRoomMembers(roomId) {
    if (!this.isSimulated && this.client && this.isConnected) {
      try {
        const hashKey = `cogether:room:${roomId}:members`;
        const rawMap = await this.client.hgetall(hashKey);
        if (rawMap && Object.keys(rawMap).length > 0) {
          return Object.entries(rawMap).map(([id, json]) => {
            try {
              return { id, ...JSON.parse(json) };
            } catch (e) {
              return { id };
            }
          });
        }
      } catch (err) {
        logger.warn('Redis getRoomMembers error; falling back to memory', { error: err.message });
      }
    }

    if (!this._memRooms.has(roomId)) return [];
    return Array.from(this._memRooms.get(roomId).entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }

  // ── Sliding-Window Rate Limiter ──────────────────────────────────────────────

  async consumeRateLimit(key, limit = 60, windowSeconds = 60) {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    let timestamps = this._memRateLimits.get(key) || [];
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.ceil((timestamps[0] + windowSeconds * 1000) / 1000)
      };
    }

    timestamps.push(now);
    this._memRateLimits.set(key, timestamps);

    return {
      allowed: true,
      remaining: limit - timestamps.length,
      resetTime: Math.ceil((now + windowSeconds * 1000) / 1000)
    };
  }

  // ── Health Check ─────────────────────────────────────────────────────────────

  async checkHealth() {
    if (this.isSimulated || !this.client) {
      return {
        connected: true,
        mode: 'simulated_dev',
        latencyMs: 0,
        error: null
      };
    }

    const start = Date.now();
    try {
      await this.client.ping();
      this.isConnected = true;
      return {
        connected: true,
        mode: 'redis',
        latencyMs: Date.now() - start,
        error: null
      };
    } catch (err) {
      this.isConnected = false;
      return {
        connected: false,
        mode: 'redis',
        latencyMs: Date.now() - start,
        error: err.message
      };
    }
  }

  _cleanExpiredMem() {
    const now = Date.now();
    for (const [k, exp] of this._memExpirations.entries()) {
      if (exp <= now) {
        this._memStore.delete(k);
        this._memExpirations.delete(k);
      }
    }
  }

  async close() {
    if (this.client) {
      await this.client.quit().catch(() => {});
      this.isConnected = false;
    }
  }
}

const redis = new RedisClient();

module.exports = {
  RedisClient,
  redis
};
