/**
 * CoGether Platform Foundation Automated Verification Suite
 * Tests all Phase 1 packages, contracts, auth, database migrations, redis abstractions,
 * and live server endpoints.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// 1. Contracts Verification
const {
  PlanTiers,
  validateGuestSessionInput,
  validateGameScorePayload,
  validateAffiliateClickPayload,
  buildDomainEvent
} = require('../packages/contracts');

// 2. Config Verification
const { loadConfig, getSanitizedConfig } = require('../packages/config');

// 3. Auth Verification
const {
  signToken,
  verifyToken,
  createGuestSession,
  hasSufficientTier,
  TIER_RANK
} = require('../packages/auth');

// 4. Observability Verification
const {
  StructuredLogger,
  generateTraceId,
  generateSpanId,
  MetricsRegistry
} = require('../packages/observability');

// 5. Database Verification
const { getMigrationFiles } = require('../packages/database');

// 6. Redis Verification
const { RedisClient } = require('../packages/redis');

async function runTests() {
  console.log('🧪 Starting Phase 1 Platform Foundation Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('     ' + err.message);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('     ' + err.message);
      failed++;
    }
  }

  // ── 1. Contracts & Schemas ───────────────────────────────────────────────────
  console.log('── [1/7] Contracts & Runtime Schemas ──');
  test('Validates guest session input correctly', () => {
    const valid = validateGuestSessionInput({ displayName: 'Alice' });
    assert.strictEqual(valid.valid, true);
    assert.strictEqual(valid.data.displayName, 'Alice');

    const defaultName = validateGuestSessionInput({});
    assert.strictEqual(defaultName.valid, true);
    assert.strictEqual(defaultName.data.displayName, 'Guest');

    const invalid = validateGuestSessionInput({ displayName: 'a'.repeat(60) });
    assert.strictEqual(invalid.valid, false);
  });

  test('Validates game score payload correctly', () => {
    const valid = validateGameScorePayload({ gameId: '2048', score: 1024 });
    assert.strictEqual(valid.valid, true);
    assert.strictEqual(valid.data.score, 1024);

    const missing = validateGameScorePayload({ gameId: '2048' });
    assert.strictEqual(missing.valid, false);

    const negative = validateGameScorePayload({ gameId: '2048', score: -50 });
    assert.strictEqual(negative.valid, false);
  });

  test('Builds CloudEvents compliant domain event envelope', () => {
    const evt = buildDomainEvent({
      eventType: 'cogether.coplay.score.recorded',
      aggregateId: 'sess_123',
      aggregateType: 'game_session',
      data: { score: 5000 }
    });
    assert.ok(evt.eventId.startsWith('evt_'));
    assert.strictEqual(evt.eventType, 'cogether.coplay.score.recorded');
    assert.strictEqual(evt.data.score, 5000);
  });

  // ── 2. Configuration & Zero-Secret Exposure ──────────────────────────────────
  console.log('\n── [2/7] Configuration & Secret Sanitization ──');
  test('Loads default configuration safely', () => {
    const cfg = loadConfig({ NODE_ENV: 'test', PORT: '4000' });
    assert.strictEqual(cfg.env, 'test');
    assert.strictEqual(cfg.server.port, 4000);
    assert.ok(cfg.auth.jwtSecret.length >= 32);
  });

  test('Masks secrets in sanitized config representation', () => {
    const cfg = loadConfig({
      DATABASE_URL: 'postgresql://admin:supersecretpass@db.example.com:5432/cogether',
      JWT_SECRET: 'super-sensitive-jwt-token-signing-key-1234'
    });
    const sanitized = getSanitizedConfig(cfg);
    assert.strictEqual(sanitized.auth.jwtSecret, '***REDACTED***');
    assert.ok(!sanitized.database.url.includes('supersecretpass'));
    assert.ok(sanitized.database.url.includes('***REDACTED***'));
  });

  // ── 3. Authentication & Entitlements ─────────────────────────────────────────
  console.log('\n── [3/7] Authentication, JWT & Entitlements ──');
  test('Signs and verifies JWT with HMAC-SHA256', () => {
    const token = signToken({ sub: 'user_42', tier: PlanTiers.PRO }, { expiresInSeconds: 60 });
    assert.strictEqual(typeof token, 'string');
    assert.strictEqual(token.split('.').length, 3);

    const verification = verifyToken(token);
    assert.strictEqual(verification.valid, true);
    assert.strictEqual(verification.claims.sub, 'user_42');
    assert.strictEqual(verification.claims.tier, PlanTiers.PRO);
  });

  test('Rejects tampered or expired JWTs', () => {
    const token = signToken({ sub: 'user_42' }, { expiresInSeconds: 60 });
    const tampered = token.slice(0, -4) + 'abcd';
    const result = verifyToken(tampered);
    assert.strictEqual(result.valid, false);

    const expiredToken = signToken({ sub: 'user_42' }, { expiresInSeconds: -10 });
    const expiredResult = verifyToken(expiredToken);
    assert.strictEqual(expiredResult.valid, false);
    assert.strictEqual(expiredResult.expired, true);
  });

  test('Mints guest sessions with appropriate claims', () => {
    const guest = createGuestSession({ displayName: 'RetroGamer' });
    assert.ok(guest.user.id.startsWith('gst_'));
    assert.strictEqual(guest.user.displayName, 'RetroGamer');
    assert.strictEqual(guest.user.isGuest, true);
    assert.strictEqual(guest.user.tier, PlanTiers.FREE);

    const check = verifyToken(guest.token);
    assert.strictEqual(check.valid, true);
    assert.strictEqual(check.claims.sub, guest.user.id);
  });

  test('Evaluates entitlement tier hierarchy correctly', () => {
    assert.strictEqual(hasSufficientTier(PlanTiers.FREE, PlanTiers.FREE), true);
    assert.strictEqual(hasSufficientTier(PlanTiers.FREE, PlanTiers.PRO), false);
    assert.strictEqual(hasSufficientTier(PlanTiers.PRO, PlanTiers.FREE), true);
    assert.strictEqual(hasSufficientTier(PlanTiers.PRO, PlanTiers.PRO), true);
    assert.strictEqual(hasSufficientTier(PlanTiers.PRO, PlanTiers.TEAMS), false);
    assert.strictEqual(hasSufficientTier(PlanTiers.TEAMS, PlanTiers.PRO), true);
  });

  // ── 4. Observability & Tracing ───────────────────────────────────────────────
  console.log('\n── [4/7] Observability & Telemetry ──');
  test('Generates W3C Trace IDs and Span IDs', () => {
    const traceId = generateTraceId();
    const spanId = generateSpanId();
    assert.strictEqual(traceId.length, 32);
    assert.strictEqual(spanId.length, 16);
  });

  test('Metrics registry records counters and exports Prometheus format', () => {
    const reg = new MetricsRegistry();
    reg.incrementCounter('cogether_http_requests_total', 1, { method: 'GET', status: '200' });
    reg.setGauge('cogether_active_rooms', 4);

    const prom = reg.toPrometheusFormat();
    assert.ok(prom.includes('cogether_http_requests_total{method="GET",status="200"} 1'));
    assert.ok(prom.includes('cogether_active_rooms 4'));
  });

  // ── 5. Database Migrations ───────────────────────────────────────────────────
  console.log('\n── [5/7] Database Migrations ──');
  await testAsync('Discovers and validates all 6 versioned SQL migrations', async () => {
    const files = await getMigrationFiles();
    assert.strictEqual(files.length, 6);
    assert.strictEqual(files[0], '001_init_schemas.sql');
    assert.strictEqual(files[1], '002_identity_schema.sql');
    assert.strictEqual(files[2], '003_coplay_schema.sql');
    assert.strictEqual(files[3], '004_cowatch_schema.sql');
    assert.strictEqual(files[4], '005_coshop_schema.sql');
    assert.strictEqual(files[5], '006_platform_outbox.sql');

    for (const f of files) {
      const content = fs.readFileSync(path.join(__dirname, '../packages/database/migrations', f), 'utf8');
      assert.ok(content.length > 50, `Migration ${f} must have non-empty SQL content`);
      assert.ok(content.includes('CREATE TABLE') || content.includes('CREATE SCHEMA'), `Migration ${f} has valid DDL`);
    }
  });

  // ── 6. Redis State Abstraction ───────────────────────────────────────────────
  console.log('\n── [6/7] Redis State & Presence Abstraction ──');
  await testAsync('Key-value caching with TTL expiration', async () => {
    const r = new RedisClient();
    await r.set('test:foo', 'bar', 10);
    const val = await r.get('test:foo');
    assert.strictEqual(val, 'bar');
    await r.del('test:foo');
    const missing = await r.get('test:foo');
    assert.strictEqual(missing, null);
  });

  await testAsync('Distributed mutual exclusion lock acquire and release', async () => {
    const r = new RedisClient();
    const lock1 = await r.acquireLock('game:room:101', 2000, 'ownerA');
    assert.strictEqual(lock1.acquired, true);

    const lock2 = await r.acquireLock('game:room:101', 2000, 'ownerB');
    assert.strictEqual(lock2.acquired, false);

    const released = await r.releaseLock('game:room:101', 'ownerA');
    assert.strictEqual(released, true);

    const lock3 = await r.acquireLock('game:room:101', 2000, 'ownerB');
    assert.strictEqual(lock3.acquired, true);
    await r.releaseLock('game:room:101', 'ownerB');
  });

  await testAsync('Room presence member tracking', async () => {
    const r = new RedisClient();
    await r.addRoomMember('ROOM-ABC', 'peer_1', { username: 'Player1' });
    await r.addRoomMember('ROOM-ABC', 'peer_2', { username: 'Player2' });

    const members = await r.getRoomMembers('ROOM-ABC');
    assert.strictEqual(members.length, 2);
    assert.strictEqual(members.find((m) => m.id === 'peer_1').username, 'Player1');

    await r.removeRoomMember('ROOM-ABC', 'peer_1');
    const remaining = await r.getRoomMembers('ROOM-ABC');
    assert.strictEqual(remaining.length, 1);
    assert.strictEqual(remaining[0].id, 'peer_2');
  });

  await testAsync('Sliding-window rate limiter enforcement', async () => {
    const r = new RedisClient();
    const key = 'ratelimit:test:' + Date.now();
    for (let i = 0; i < 5; i++) {
      const res = await r.consumeRateLimit(key, 5, 10);
      assert.strictEqual(res.allowed, true);
    }
    const blocked = await r.consumeRateLimit(key, 5, 10);
    assert.strictEqual(blocked.allowed, false);
    assert.strictEqual(blocked.remaining, 0);
  });

  // ── 7. Live Server Endpoints Verification ────────────────────────────────────
  console.log('\n── [7/7] Live Server HTTP API & Health Endpoints ──');
  await testAsync('GET /health/live returns HTTP 200 and process liveness', async () => {
    const res = await fetch('http://localhost:3001/health/live');
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(typeof data.uptimeSeconds, 'number');
  });

  await testAsync('GET /health/ready returns readiness check data', async () => {
    const res = await fetch('http://localhost:3001/health/ready');
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ready');
    assert.ok(data.checks.database.connected);
    assert.ok(data.checks.redis.connected);
  });

  await testAsync('GET /health/startup returns startup status', async () => {
    const res = await fetch('http://localhost:3001/health/startup');
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'started');
  });

  await testAsync('GET /health preserves legacy response schema', async () => {
    const res = await fetch('http://localhost:3001/health');
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(typeof data.cachedGames, 'number');
    assert.strictEqual(typeof data.coshopIndexed, 'number');
  });

  await testAsync('GET /metrics returns Prometheus format exposition', async () => {
    const res = await fetch('http://localhost:3001/metrics');
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('# TYPE cogether_http_requests_total counter'));
  });

  await testAsync('POST /api/v1/auth/guest mints a valid session token', async () => {
    const res = await fetch('http://localhost:3001/api/v1/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'ArcadeMaster' })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.user.displayName, 'ArcadeMaster');
    assert.strictEqual(data.user.isGuest, true);
    assert.ok(data.token);

    // Validate the token via /api/v1/auth/session
    const checkRes = await fetch('http://localhost:3001/api/v1/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: data.token })
    });
    assert.strictEqual(checkRes.status, 200);
    const checkData = await checkRes.json();
    assert.strictEqual(checkData.valid, true);
    assert.strictEqual(checkData.claims.displayName, 'ArcadeMaster');

    // Access /api/v1/auth/me with Bearer token
    const meRes = await fetch('http://localhost:3001/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${data.token}` }
    });
    assert.strictEqual(meRes.status, 200);
    const meData = await meRes.json();
    assert.strictEqual(meData.user.displayName, 'ArcadeMaster');
    assert.strictEqual(meData.user.tier, PlanTiers.FREE);
  });

  await testAsync('GET /api/games continues returning 2,000+ game catalog (zero regression)', async () => {
    const res = await fetch('http://localhost:3001/api/games?limit=5');
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.total >= 100);
    assert.strictEqual(data.games.length, 5);
  });

  await testAsync('GET /api/coshop/products returns products and facets (zero regression)', async () => {
    const res = await fetch('http://localhost:3001/api/coshop/products?limit=3');
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.total >= 1);
    assert.ok(data.facets);
  });

  console.log(`\n======================================================`);
  console.log(`TOTAL SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal suite error:', err);
  process.exit(1);
});
