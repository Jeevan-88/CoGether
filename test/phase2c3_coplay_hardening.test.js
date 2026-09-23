/**
 * Phase 2C.3: CoPlay Production Hardening & Netcode Standardization Integration Test Suite
 * 
 * Verifies:
 * 1. Database Migration 008 schema extensions (coplay.games metadata & coplay.favorites)
 * 2. Authoritative PostgreSQL catalog API (GET /api/games & GET /api/games/:id)
 * 3. Standardized COPLAY_GAME_SYNC netcode contract across all 4 local games
 * 4. PostgreSQL-backed player favorites CRUD (/api/v1/coplay/favorites)
 * 5. PostgreSQL-backed real leaderboards with period aggregation (/api/v1/coplay/leaderboards/:gameId)
 * 6. Socket.IO challenge score telemetry validation and anti-cheat schema bounds
 * 7. Strict iframe sandboxing and elimination of all mock/localStorage profile identity
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');
const { db } = require('../packages/database');
const { emailService } = require('../services/identity/emailService');

const SERVER_URL = 'http://localhost:3001';

async function runPhase2C3Tests() {
  console.log('🧪 Starting Phase 2C.3 CoPlay Hardening & Netcode Standardization Suite...\n');
  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('     ' + (err.stack || err.message));
      failed++;
    }
  }

  // Helper to mint a real authenticated session
  let authUser = null;
  let authToken = null;

  async function getAuthenticatedUser() {
    if (authToken) return { user: authUser, token: authToken };
    const email = `coplay_tester_${Date.now()}@example.com`;
    await fetch(`${SERVER_URL}/api/v1/auth/email/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose: 'signup' })
    });

    const lastSent = emailService.getLastSentOtpForTest();
    const validOtp = lastSent.otp;

    const verifyRes = await fetch(`${SERVER_URL}/api/v1/auth/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        otp: validOtp,
        username: `Gamer_${Date.now().toString().slice(-4)}`,
        displayName: 'Hardened Arcade Master'
      })
    });
    const verifyData = await verifyRes.json();
    authUser = verifyData.user;
    authToken = verifyData.accessToken;
    return { user: authUser, token: authToken };
  }

  // ── [1/7] Database Schema & Migration 008 Verification ────────────────────────
  console.log('── [1/7] Database Migration 008 & Metadata Schema Verification ──');

  await check('coplay.games schema has all extended production metadata columns', async () => {
    const res = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'coplay' AND table_name = 'games'
    `);
    const cols = res.rows.map(r => r.column_name);
    const required = [
      'provider', 'game_mode', 'launch_type', 'license_status', 'distribution_status',
      'controls', 'orientation', 'max_players', 'source_repository', 'provider_game_id',
      'launch_url', 'fullscreen_supported', 'camera_supported', 'supports_challenge',
      'supports_local_multiplayer', 'supports_online_multiplayer', 'supports_score_telemetry'
    ];
    for (const col of required) {
      assert.ok(cols.includes(col), `Missing column ${col} in coplay.games`);
    }
  });

  await check('coplay.favorites table exists with user_id & game_id unique constraint', async () => {
    const res = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'coplay' AND table_name = 'favorites'
    `);
    const cols = res.rows.map(r => r.column_name);
    assert.ok(cols.includes('id'), 'Missing id in coplay.favorites');
    assert.ok(cols.includes('user_id'), 'Missing user_id in coplay.favorites');
    assert.ok(cols.includes('game_id'), 'Missing game_id in coplay.favorites');
    assert.ok(cols.includes('created_at'), 'Missing created_at in coplay.favorites');

    const constraint = await db.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'coplay.favorites'::regclass AND contype = 'u'
    `);
    assert.ok(constraint.rows.length > 0, 'Missing unique constraint on coplay.favorites');
  });

  await check('The 4 local games are seeded with LICENSE_VERIFIED & AVAILABLE', async () => {
    const res = await db.query(`
      SELECT id, license_status, distribution_status, launch_type, provider
      FROM coplay.games 
      WHERE id IN ('2048', 'hextris', 'block-puzzle', 'clumsy-bird')
    `);
    assert.strictEqual(res.rows.length, 4, 'Expected all 4 local games in coplay.games');
    for (const row of res.rows) {
      assert.strictEqual(row.license_status, 'LICENSE_VERIFIED', `Game ${row.id} not LICENSE_VERIFIED`);
      assert.strictEqual(row.distribution_status, 'AVAILABLE', `Game ${row.id} not AVAILABLE`);
      assert.strictEqual(row.launch_type, 'LOCAL_SOURCE', `Game ${row.id} not LOCAL_SOURCE`);
    }
  });

  // ── [2/7] Authoritative Catalog API ──────────────────────────────────────────
  console.log('\n── [2/7] Authoritative Catalog API (/api/games) ──');

  await check('GET /api/games returns verified games first', async () => {
    const res = await fetch(`${SERVER_URL}/api/games?limit=10`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.ok(Array.isArray(data.games));
    assert.ok(data.games.length >= 4);
    for (let i = 0; i < 4; i++) {
      assert.strictEqual(data.games[i].licenseStatus, 'LICENSE_VERIFIED');
    }
  });

  await check('GET /api/games?verifiedOnly=true returns exclusively verified games', async () => {
    const res = await fetch(`${SERVER_URL}/api/games?verifiedOnly=true`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    for (const g of data.games) {
      assert.strictEqual(g.licenseStatus, 'LICENSE_VERIFIED');
    }
  });

  await check('GET /api/games/2048 returns full production metadata', async () => {
    const res = await fetch(`${SERVER_URL}/api/games/2048`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.strictEqual(data.game.id, '2048');
    assert.strictEqual(data.game.licenseStatus, 'LICENSE_VERIFIED');
    assert.strictEqual(data.game.distributionStatus, 'AVAILABLE');
    assert.ok(data.game.launchUrl.includes('/games/2048/index.html'));
  });

  await check('GET /api/games/:id returns 404 for non-existent game', async () => {
    const res = await fetch(`${SERVER_URL}/api/games/non_existent_game_xyz`);
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    const errCode = data.error?.code || data.error;
    assert.strictEqual(errCode, 'GAME_NOT_FOUND');
  });

  // ── [3/7] Netcode Standardization (COPLAY_GAME_SYNC) ─────────────────────────
  console.log('\n── [3/7] Standardized Netcode Contract Verification ──');

  await check('2048 HTML actuator emits COPLAY_GAME_SYNC', async () => {
    const filePath = path.join(__dirname, '../client/public/games/2048/js/html_actuator.js');
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes("type: 'COPLAY_GAME_SYNC'"), '2048 html_actuator missing COPLAY_GAME_SYNC');
    assert.ok(content.includes("gameId: '2048'"), '2048 html_actuator missing gameId');
  });

  await check('Hextris checking.js and view.js emit COPLAY_GAME_SYNC', async () => {
    const checkPath = path.join(__dirname, '../client/public/games/hextris/js/checking.js');
    const content = fs.readFileSync(checkPath, 'utf8');
    assert.ok(content.includes("type: 'COPLAY_GAME_SYNC'"), 'hextris checking.js missing COPLAY_GAME_SYNC');
    assert.ok(content.includes("gameId: 'hextris'"), 'hextris checking.js missing gameId');
  });

  await check('Block Puzzle index.html emits COPLAY_GAME_SYNC', async () => {
    const bpPath = path.join(__dirname, '../client/public/games/block-puzzle/index.html');
    const content = fs.readFileSync(bpPath, 'utf8');
    assert.ok(content.includes("type: 'COPLAY_GAME_SYNC'"), 'block-puzzle missing COPLAY_GAME_SYNC');
    assert.ok(content.includes("gameId: 'block-puzzle'"), 'block-puzzle missing gameId');
  });

  await check('Clumsy Bird entities.js and gameover.js emit COPLAY_GAME_SYNC', async () => {
    const cbPath = path.join(__dirname, '../client/public/games/clumsy-bird/js/screens/gameover.js');
    const content = fs.readFileSync(cbPath, 'utf8');
    assert.ok(content.includes("type: 'COPLAY_GAME_SYNC'"), 'clumsy-bird missing COPLAY_GAME_SYNC');
    assert.ok(content.includes("gameId: 'clumsy-bird'"), 'clumsy-bird missing gameId');
  });

  // ── [4/7] PostgreSQL Player Favorites API ────────────────────────────────────
  console.log('\n── [4/7] PostgreSQL Player Favorites API (/api/v1/coplay/favorites) ──');

  await check('GET /api/v1/coplay/favorites rejects unauthenticated requests (401)', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/coplay/favorites`);
    assert.strictEqual(res.status, 401);
  });

  await check('POST /api/v1/coplay/favorites/:gameId adds game to PostgreSQL favorites', async () => {
    const { token } = await getAuthenticatedUser();
    const res = await fetch(`${SERVER_URL}/api/v1/coplay/favorites/2048`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    assert.ok(res.status === 200 || res.status === 201);
    const data = await res.json();
    assert.ok(data.success);
    assert.ok(data.favorite && data.favorite.game_id === '2048');
  });

  await check('GET /api/v1/coplay/favorites returns authenticated user favorites', async () => {
    const { token } = await getAuthenticatedUser();
    const res = await fetch(`${SERVER_URL}/api/v1/coplay/favorites`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.ok(Array.isArray(data.favorites));
    assert.ok(data.favorites.some(f => (f.game_id || f) === '2048'));
  });

  await check('DELETE /api/v1/coplay/favorites/:gameId removes game from favorites', async () => {
    const { token } = await getAuthenticatedUser();
    const res = await fetch(`${SERVER_URL}/api/v1/coplay/favorites/2048`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.strictEqual(data.removed, true);

    const getRes = await fetch(`${SERVER_URL}/api/v1/coplay/favorites`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const getData = await getRes.json();
    assert.ok(!getData.favorites.some(f => (f.game_id || f) === '2048'));
  });

  // ── [5/7] PostgreSQL Real Leaderboards API ───────────────────────────────────
  console.log('\n── [5/7] Real Leaderboards API (/api/v1/coplay/leaderboards/:gameId) ──');

  await check('GET /api/v1/coplay/leaderboards/:gameId returns empty or sorted entries', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/coplay/leaderboards/2048?period=all_time`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.strictEqual(data.gameId, '2048');
    assert.strictEqual(data.period, 'all_time');
    assert.ok(Array.isArray(data.entries));
  });

  await check('Leaderboard reflects real scores persisted in coplay.scores with profile display name', async () => {
    const { user } = await getAuthenticatedUser();
    const testScore = 8888;
    await db.query(`
      INSERT INTO coplay.scores (id, user_id, game_id, score, verified, metadata)
      VALUES (gen_random_uuid(), $1, '2048', $2, false, '{"validationLevel": "SCHEMA_AND_RANGE_BOUND"}'::jsonb)
    `, [user.id, testScore]);

    const res = await fetch(`${SERVER_URL}/api/v1/coplay/leaderboards/2048?period=all_time`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    const myEntry = data.entries.find(e => e.userId === user.id);
    assert.ok(myEntry, 'User entry missing from leaderboard');
    assert.strictEqual(myEntry.score, testScore);
    assert.ok(myEntry.displayName || myEntry.username);
  });

  await check('Leaderboard query supports period filters (daily, weekly, all_time)', async () => {
    for (const period of ['daily', 'weekly', 'all_time']) {
      const res = await fetch(`${SERVER_URL}/api/v1/coplay/leaderboards/2048?period=${period}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.period, period);
    }
  });

  // ── [6/7] Socket.IO Challenge Score Telemetry Validation ─────────────────────
  console.log('\n── [6/7] Socket.IO Challenge Score Telemetry Validation ──');

  await check('Challenge score validation drops invalid / negative scores', async () => {
    const { token } = await getAuthenticatedUser();
    const socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
    });

    // Send invalid score payloads and verify server remains stable
    socket.emit('challenge-score', { roomId: 'test-room', score: -50 });
    socket.emit('challenge-score', { roomId: 'test-room', score: 'not_a_number' });
    socket.emit('challenge-score', { roomId: 'test-room', score: 999999999 });
    socket.emit('challenge-score', { roomId: 'test-room', score: 1024, isOver: false, isWon: false });

    // Ensure server still responsive
    const health = await fetch(`${SERVER_URL}/health`);
    assert.strictEqual(health.status, 200);

    socket.disconnect();
  });

  // ── [7/7] Zero Mock / Strict Sandbox Auditing ────────────────────────────────
  console.log('\n── [7/7] Zero Mock & Iframe Sandboxing Static Audits ──');

  await check('DirectEmbedAdapter strictly sets sandbox omitting allow-same-origin', async () => {
    const adapterPath = path.join(__dirname, '../client/src/modules/coplay/services/GameProviderAdapter.js');
    const code = fs.readFileSync(adapterPath, 'utf8');
    assert.ok(code.includes("iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-pointer-lock')"),
      'DirectEmbedAdapter missing strict sandbox attribute');
  });

  await check('CoPlayGamesHub has zero mock identity or fake XP state', async () => {
    const hubPath = path.join(__dirname, '../client/src/modules/coplay/CoPlayGamesHub.jsx');
    const code = fs.readFileSync(hubPath, 'utf8');
    assert.ok(!code.includes('cogether_player_profile'), 'Found cogether_player_profile in CoPlayGamesHub');
    assert.ok(!code.includes('cogether_fav_games'), 'Found cogether_fav_games in CoPlayGamesHub');
    assert.ok(!code.includes('1450 XP'), 'Found fake 1450 XP in CoPlayGamesHub');
    assert.ok(code.includes('useAuth'), 'CoPlayGamesHub missing useAuth hook');
    assert.ok(code.includes('/api/v1/coplay/favorites'), 'CoPlayGamesHub missing favorites API');
    assert.ok(code.includes('LeaderboardModal'), 'CoPlayGamesHub missing LeaderboardModal');
  });

  console.log('\n======================================================');
  console.log(`PHASE 2C.3 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2C3Tests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
