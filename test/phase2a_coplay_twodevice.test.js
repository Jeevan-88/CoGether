/**
 * Phase 2A Two-Device / Multi-Client Verification Suite
 * 
 * Verifies:
 * 1. Unauthorized Socket.IO connection rejection (missing & invalid token)
 * 2. Multi-device identity generation (guest session JWTs)
 * 3. Authenticated Socket.IO connections & room membership authorization
 * 4. Redis ephemeral room presence tracking
 * 5. CoPlay state machine: WAITING -> READY -> STARTING -> RUNNING -> FINISHED -> CLOSED
 * 6. PostgreSQL match outcome & score persistence (coplay.game_sessions & coplay.scores)
 * 7. Room departure & Redis state cleanup
 */

const assert = require('assert');
const { io } = require('socket.io-client');
const { db } = require('../packages/database');
const { redis } = require('../packages/redis');

const SERVER_URL = 'http://localhost:3001';
const TEST_ROOM = `phase2a-test-room-${Date.now()}`;

async function runTwoDeviceVerification() {
  console.log('🧪 Starting Phase 2A Two-Device & Full Lifecycle Verification...\n');
  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
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

  // ── [1/7] Unauthorized Connection Rejection ──────────────────────────────
  console.log('── [1/7] Socket.IO Authentication & Authorization Enforcement ──');

  await check('Rejects connection without authentication token', async () => {
    let errorReceived = null;
    const socket = io(SERVER_URL, {
      reconnection: false,
      timeout: 3000
    });

    await new Promise((resolve) => {
      socket.on('connect_error', (err) => {
        errorReceived = err.message;
        socket.close();
        resolve();
      });
      socket.on('connect', () => {
        socket.close();
        resolve();
      });
    });

    assert.ok(errorReceived, 'Connection without token should have failed');
    assert.ok(errorReceived.includes('AUTHENTICATION_REQUIRED'), `Expected AUTHENTICATION_REQUIRED, got: ${errorReceived}`);
  });

  await check('Rejects connection with invalid / forged token', async () => {
    let errorReceived = null;
    const socket = io(SERVER_URL, {
      auth: { token: 'invalid.token.signature' },
      reconnection: false,
      timeout: 3000
    });

    await new Promise((resolve) => {
      socket.on('connect_error', (err) => {
        errorReceived = err.message;
        socket.close();
        resolve();
      });
      socket.on('connect', () => {
        socket.close();
        resolve();
      });
    });

    assert.ok(errorReceived, 'Connection with invalid token should have failed');
    assert.ok(errorReceived.includes('AUTHENTICATION_FAILED'), `Expected AUTHENTICATION_FAILED, got: ${errorReceived}`);
  });

  // ── [2/7] Account & Session Identity Minting ─────────────────────────────
  console.log('\n── [2/7] Identity Generation & Minting for Two Distinct Devices ──');
  let token1, token2, user1, user2;

  await check('Mints legitimate guest JWT for Device 1 (Alice)', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Alice' })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(data.user.displayName, 'Alice');
    token1 = data.token;
    user1 = { ...data.user, sub: data.user.id };
  });

  await check('Mints legitimate guest JWT for Device 2 (Bob)', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Bob' })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(data.user.displayName, 'Bob');
    token2 = data.token;
    user2 = { ...data.user, sub: data.user.id };
    assert.notStrictEqual(user1.sub, user2.sub, 'Device IDs must be unique');
  });

  // ── [3/7] Two-Device Authenticated Socket Connection & Room Pairing ──────
  console.log('\n── [3/7] Two-Device Socket.IO Pairing & Presence ──');
  let socket1, socket2;

  await check('Device 1 connects and creates room', async () => {
    socket1 = io(SERVER_URL, {
      auth: { token: token1 },
      reconnection: false
    });

    await new Promise((resolve, reject) => {
      socket1.on('connect', resolve);
      socket1.on('connect_error', reject);
    });

    socket1.emit('join-room', {
      roomId: TEST_ROOM,
      username: 'Alice',
      micEnabled: true,
      cameraEnabled: true
    });

    await new Promise((r) => setTimeout(r, 200));
    assert.strictEqual(socket1.connected, true);
  });

  await check('Device 2 connects and joins room with mutual discovery', async () => {
    socket2 = io(SERVER_URL, {
      auth: { token: token2 },
      reconnection: false
    });

    await new Promise((resolve, reject) => {
      socket2.on('connect', resolve);
      socket2.on('connect_error', reject);
    });

    const d1DiscoveredD2Promise = new Promise((resolve) => {
      socket1.on('user-joined', (userData) => {
        resolve(userData);
      });
    });

    const d2DiscoveredD1Promise = new Promise((resolve) => {
      socket2.on('existing-users', (users) => {
        resolve(users);
      });
    });

    socket2.emit('join-room', {
      roomId: TEST_ROOM,
      username: 'Bob',
      micEnabled: true,
      cameraEnabled: true
    });

    const [d2Joined, existingUsers] = await Promise.all([
      d1DiscoveredD2Promise,
      d2DiscoveredD1Promise
    ]);

    assert.strictEqual(d2Joined.username, 'Bob');
    assert.strictEqual(existingUsers.length, 1);
    assert.strictEqual(existingUsers[0].username, 'Alice');
  });

  // ── [4/7] Redis Ephemeral Room Presence State ─────────────────────────────
  console.log('\n── [4/7] Redis Ephemeral Room State Verification ──');

  await check('Redis hash contains exactly 2 active room members', async () => {
    const members = await redis.getRoomMembers(TEST_ROOM);
    assert.strictEqual(members.length, 2, `Expected 2 members in Redis room ${TEST_ROOM}, found: ${members.length}`);
    const usernames = members.map((m) => m.username).sort();
    assert.deepStrictEqual(usernames, ['Alice', 'Bob']);
  });

  // ── [5/7] CoPlay Game Lifecycle State Machine ─────────────────────────────
  console.log('\n── [5/7] CoPlay Lifecycle: WAITING -> READY -> STARTING -> RUNNING -> FINISHED ──');
  let activeSessionId = null;

  await check('State WAITING -> READY when both devices set ready', async () => {
    const readyPromises = [];

    readyPromises.push(new Promise((resolve) => {
      socket1.on('challenge-session-sync', (session) => {
        if (session.state === 'READY') resolve(session);
      });
    }));

    // Device 1 signals ready
    socket1.emit('challenge-ready', { ready: true, gameId: '2048' });
    await new Promise((r) => setTimeout(r, 200));

    // Device 2 signals ready
    socket2.emit('challenge-ready', { ready: true, gameId: '2048' });

    const readySession = await Promise.race([
      readyPromises[0],
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for READY state')), 3000))
    ]);

    assert.strictEqual(readySession.state, 'READY');
    assert.ok(readySession.sessionId);
    activeSessionId = readySession.sessionId;
  });

  await check('State READY -> STARTING -> RUNNING on challenge-start countdown', async () => {
    const startingPromise = new Promise((resolve) => {
      socket2.on('challenge-session-sync', (session) => {
        if (session.state === 'STARTING') resolve(session);
      });
    });

    const runningPromise = new Promise((resolve) => {
      socket1.on('challenge-session-sync', (session) => {
        if (session.state === 'RUNNING') resolve(session);
      });
    });

    // Device 1 triggers start with 1-second countdown
    socket1.emit('challenge-start', { countdownSeconds: 1, gameId: '2048' });

    const startingSession = await startingPromise;
    assert.strictEqual(startingSession.state, 'STARTING');

    const runningSession = await Promise.race([
      runningPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for RUNNING state')), 3000))
    ]);
    assert.strictEqual(runningSession.state, 'RUNNING');
  });

  await check('State RUNNING -> FINISHED on score submission with winner determination', async () => {
    const scoreSyncPromise = new Promise((resolve) => {
      socket2.on('challenge-peer-score', (payload) => {
        if (payload.score === 1024) resolve(payload);
      });
    });

    const finishedPromise = new Promise((resolve) => {
      socket1.on('challenge-session-sync', (session) => {
        if (session.state === 'FINISHED') resolve(session);
      });
    });

    // Device 1 records mid-match score
    socket1.emit('challenge-score', { score: 1024, finalResult: false });
    const scorePayload = await scoreSyncPromise;
    assert.strictEqual(scorePayload.score, 1024);

    // Device 2 completes game with winning final score
    socket2.emit('challenge-score', { score: 2048, finalResult: true });

    const finishedSession = await Promise.race([
      finishedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for FINISHED state')), 3000))
    ]);

    assert.strictEqual(finishedSession.state, 'FINISHED');
    assert.strictEqual(finishedSession.winnerId, user2.sub);
    assert.strictEqual(finishedSession.scores[user2.sub], 2048);
  });

  // ── [6/7] PostgreSQL Match & Score Persistence ───────────────────────────
  console.log('\n── [6/7] PostgreSQL Data Persistence Invariants ──');

  await check('Game session row is persisted in coplay.game_sessions in PostgreSQL', async () => {
    assert.ok(activeSessionId, 'activeSessionId must be present');
    const res = await db.query('SELECT * FROM coplay.game_sessions WHERE id = $1', [activeSessionId]);
    assert.strictEqual(res.rows.length, 1);
    const row = res.rows[0];
    assert.strictEqual(row.room_id, TEST_ROOM);
    assert.strictEqual(row.game_id, '2048');
    assert.strictEqual(row.status, 'FINISHED');
    assert.ok(row.started_at);
    assert.ok(row.ended_at);
  });

  await check('Scores are persisted with SCHEMA_AND_RANGE_BOUND validation (verified=false) in PostgreSQL', async () => {
    const res = await db.query(
      'SELECT user_id, score, verified, metadata FROM coplay.scores WHERE session_id = $1 ORDER BY score DESC',
      [activeSessionId]
    );
    assert.strictEqual(res.rows.length, 2, 'Expected 2 recorded scores');
    assert.strictEqual(res.rows[0].user_id, user2.sub);
    assert.strictEqual(String(res.rows[0].score), '2048');
    assert.strictEqual(res.rows[0].verified, false, 'Client scores are not cryptographically anti-cheat verified');
    assert.strictEqual(res.rows[0].metadata?.validationLevel, 'SCHEMA_AND_RANGE_BOUND');

    assert.strictEqual(res.rows[1].user_id, user1.sub);
    assert.strictEqual(String(res.rows[1].score), '1024');
    assert.strictEqual(res.rows[1].verified, false, 'Client scores are not cryptographically anti-cheat verified');
    assert.strictEqual(res.rows[1].metadata?.validationLevel, 'SCHEMA_AND_RANGE_BOUND');
  });

  // ── [7/7] Room Departure & Redis State Cleanup ────────────────────────────
  console.log('\n── [7/7] Disconnect & Ephemeral State Cleanup ──');

  await check('Device 1 disconnects and Redis updates presence to 1 member', async () => {
    const leavePromise = new Promise((resolve) => {
      socket2.on('user-left', resolve);
    });

    socket1.disconnect();
    await leavePromise;
    await new Promise((r) => setTimeout(r, 200));

    const members = await redis.getRoomMembers(TEST_ROOM);
    assert.strictEqual(members.length, 1);
    assert.strictEqual(members[0].username, 'Bob');
  });

  await check('Device 2 disconnects and Redis room presence is fully purged', async () => {
    socket2.disconnect();
    await new Promise((r) => setTimeout(r, 200));

    const members = await redis.getRoomMembers(TEST_ROOM);
    assert.strictEqual(members.length, 0, 'Room members should be empty after all leave');
  });

  console.log(`\n======================================================`);
  console.log(`PHASE 2A TWO-DEVICE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTwoDeviceVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
