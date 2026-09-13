/**
 * Phase 2B WebRTC Signaling Security, Telemetry & Multi-Device Verification Suite
 * 
 * Verifies:
 * 1. Dynamic ICE Server Discovery endpoint (GET /api/v1/webrtc/ice-servers)
 * 2. WebRTC Golden Signals Telemetry Ingestion (POST /api/v1/telemetry/webrtc)
 * 3. Strict Room-Authorized Signaling Guards (reject cross-room offer/answer/ice-candidate)
 * 4. Legitimate In-Room Signaling Delivery (offer/answer/ice-candidate between peers in same room)
 * 5. Reconnect Ghost Socket Purge (no duplicate presence entries on network glitch)
 * 6. Honest Anti-Cheat Classification (SCHEMA_AND_RANGE_BOUND, verified: false)
 */

const assert = require('assert');
const { io } = require('socket.io-client');
const { db } = require('../packages/database');
const { redis } = require('../packages/redis');
const { scoreValidationService, ValidationLevel } = require('../services/coplay/scoreValidation');

const SERVER_URL = 'http://localhost:3001';

async function runPhase2BTests() {
  console.log('🧪 Starting Phase 2B WebRTC Security & Telemetry Verification Suite...\n');
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

  // ── [1/6] ICE Configuration Endpoint ──────────────────────────────────────
  console.log('── [1/6] Dynamic WebRTC ICE Server Discovery ──');

  await check('GET /api/v1/webrtc/ice-servers returns compliant STUN configuration', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/webrtc/ice-servers`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.iceServers), 'Expected iceServers array');
    assert.ok(data.iceServers.length > 0, 'Should have at least 1 ICE server');
    
    // Validate STUN structure
    const hasStun = data.iceServers.some((s) => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.some((u) => typeof u === 'string' && u.startsWith('stun:'));
    });
    assert.ok(hasStun, 'At least one STUN server must be present');
  });

  // ── [2/6] WebRTC Telemetry Ingestion ───────────────────────────────────────
  console.log('\n── [2/6] WebRTC Golden Signals Telemetry Endpoint ──');

  await check('POST /api/v1/telemetry/webrtc ingests WebRTC lifecycle events', async () => {
    const telemetryPayload = {
      event: 'webrtc_connected',
      roomId: 'test-telemetry-room',
      peerId: 'peer-device-a',
      metrics: {
        rtt: 35,
        iceGatheringDurationMs: 142,
        connectionState: 'connected'
      }
    };

    const res = await fetch(`${SERVER_URL}/api/v1/telemetry/webrtc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telemetryPayload)
    });

    assert.strictEqual(res.status, 200);
    const result = await res.json();
    assert.strictEqual(result.received, true);
    assert.strictEqual(result.event, 'webrtc_connected');
  });

  // ── Setup helper for authenticated socket ────────────────────────────────
  async function createAuthSocket(displayName) {
    const authRes = await fetch(`${SERVER_URL}/api/v1/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName })
    });
    const authData = await authRes.json();
    const token = authData.token;

    const socket = io(SERVER_URL, {
      auth: { token },
      reconnection: false,
      timeout: 3000
    });

    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
    });

    return { socket, token, user: authData.user };
  }

  // ── [3/6] Strict Cross-Room Signaling Isolation ───────────────────────────
  console.log('\n── [3/6] Room-Authorized Signaling Guards (Cross-Room Isolation) ──');

  const roomAlpha = `sec-room-alpha-${Date.now()}`;
  const roomBeta = `sec-room-beta-${Date.now()}`;

  let clientA, clientB;

  await check('Device A joins Room Alpha and Device B joins Room Beta', async () => {
    clientA = await createAuthSocket('DeviceA');
    clientB = await createAuthSocket('DeviceB');

    const joinA = new Promise((res) => clientA.socket.emit('join-room', roomAlpha, res));
    const joinB = new Promise((res) => clientB.socket.emit('join-room', roomBeta, res));

    const [resA, resB] = await Promise.all([joinA, joinB]);
    assert.strictEqual(resA.success, true);
    assert.strictEqual(resB.success, true);
  });

  await check('Server drops cross-room WebRTC offer targeting peer in another room', async () => {
    let leakReceived = false;

    clientB.socket.on('offer', () => {
      leakReceived = true;
    });

    // Device A maliciously or mistakenly targets Device B's socket across room boundaries
    clientA.socket.emit('offer', {
      to: clientB.socket.id,
      offer: { type: 'offer', sdp: 'fake-sdp-cross-room-leak' }
    });

    // Wait 300ms to ensure no message arrives
    await new Promise((r) => setTimeout(r, 300));
    assert.strictEqual(leakReceived, false, 'Offer should NOT leak across room boundaries');
  });

  await check('Server drops cross-room WebRTC answer targeting peer in another room', async () => {
    let leakReceived = false;

    clientB.socket.on('answer', () => {
      leakReceived = true;
    });

    clientA.socket.emit('answer', {
      to: clientB.socket.id,
      answer: { type: 'answer', sdp: 'fake-sdp-cross-room-leak' }
    });

    await new Promise((r) => setTimeout(r, 300));
    assert.strictEqual(leakReceived, false, 'Answer should NOT leak across room boundaries');
  });

  await check('Server drops cross-room ICE candidate targeting peer in another room', async () => {
    let leakReceived = false;

    clientB.socket.on('ice-candidate', () => {
      leakReceived = true;
    });

    clientA.socket.emit('ice-candidate', {
      to: clientB.socket.id,
      candidate: { candidate: 'candidate:1 1 UDP ...', sdpMid: '0' }
    });

    await new Promise((r) => setTimeout(r, 300));
    assert.strictEqual(leakReceived, false, 'ICE candidate should NOT leak across room boundaries');
  });

  clientA.socket.disconnect();
  clientB.socket.disconnect();

  // ── [4/6] Legitimate In-Room Signaling Delivery ───────────────────────────
  console.log('\n── [4/6] Legitimate In-Room Signaling Delivery ──');

  const sharedRoom = `sec-shared-room-${Date.now()}`;
  let peer1, peer2;

  await check('Two peers in same room establish bidirectional signaling', async () => {
    peer1 = await createAuthSocket('Device1');
    peer2 = await createAuthSocket('Device2');

    const join1 = new Promise((res) => peer1.socket.emit('join-room', sharedRoom, res));
    const join2 = new Promise((res) => peer2.socket.emit('join-room', sharedRoom, res));

    const [res1, res2] = await Promise.all([join1, join2]);
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res2.success, true);
  });

  await check('Legitimate offer is relayed to peer with correct sender socket ID', async () => {
    const offerPromise = new Promise((resolve) => {
      peer2.socket.once('offer', (data) => {
        resolve(data);
      });
    });

    peer1.socket.emit('offer', {
      to: peer2.socket.id,
      offer: { type: 'offer', sdp: 'valid-v2-sdp-offer' }
    });

    const received = await offerPromise;
    assert.strictEqual(received.from, peer1.socket.id);
    assert.strictEqual(received.offer.sdp, 'valid-v2-sdp-offer');
  });

  await check('Legitimate answer is relayed back to offerer with correct sender ID', async () => {
    const answerPromise = new Promise((resolve) => {
      peer1.socket.once('answer', (data) => {
        resolve(data);
      });
    });

    peer2.socket.emit('answer', {
      to: peer1.socket.id,
      answer: { type: 'answer', sdp: 'valid-v2-sdp-answer' }
    });

    const received = await answerPromise;
    assert.strictEqual(received.from, peer2.socket.id);
    assert.strictEqual(received.answer.sdp, 'valid-v2-sdp-answer');
  });

  await check('Legitimate ICE candidate is relayed to peer', async () => {
    const icePromise = new Promise((resolve) => {
      peer2.socket.once('ice-candidate', (data) => {
        resolve(data);
      });
    });

    peer1.socket.emit('ice-candidate', {
      to: peer2.socket.id,
      candidate: { candidate: 'candidate:valid-in-room', sdpMLineIndex: 0 }
    });

    const received = await icePromise;
    assert.strictEqual(received.from, peer1.socket.id);
    assert.strictEqual(received.candidate.candidate, 'candidate:valid-in-room');
  });

  // ── [5/6] Reconnect & Ghost Socket Cleanup ────────────────────────────────
  console.log('\n── [5/6] Reconnect Resilience & Ghost Socket Purge ──');

  await check('Reconnecting with same user credentials replaces old socket without duplicate presence', async () => {
    // Current presence count in sharedRoom: should be 2
    let members = await redis.getRoomMembers(sharedRoom);
    assert.strictEqual(members.length, 2);

    // Simulate peer1 reconnecting (e.g. mobile browser re-opening page with same token)
    const reconnectedPeer1 = io(SERVER_URL, {
      auth: { token: peer1.token },
      reconnection: false,
      timeout: 3000
    });

    await new Promise((resolve, reject) => {
      reconnectedPeer1.on('connect', resolve);
      reconnectedPeer1.on('connect_error', reject);
    });

    // Join room with reconnected socket
    const joinResult = await new Promise((res) =>
      reconnectedPeer1.emit('join-room', sharedRoom, res)
    );
    assert.strictEqual(joinResult.success, true);

    await new Promise((r) => setTimeout(r, 150));

    // Room members should still be 2 (peer1 and peer2), NOT 3
    members = await redis.getRoomMembers(sharedRoom);
    assert.strictEqual(members.length, 2, 'Ghost socket must be purged; exactly 2 distinct users in room');

    const peer1Entries = members.filter((m) => m.userId === peer1.user.id);
    assert.strictEqual(peer1Entries.length, 1, 'Exactly one entry for reconnected user');
    const updatedSocketId = peer1Entries[0].socketId || peer1Entries[0].id;
    assert.strictEqual(updatedSocketId, reconnectedPeer1.id, 'Presence updated to new socket ID');

    reconnectedPeer1.disconnect();
    peer1.socket.disconnect();
    peer2.socket.disconnect();
  });

  // ── [6/6] Anti-Cheat Honest Classification ────────────────────────────────
  console.log('\n── [6/6] Anti-Cheat Level Classification & Schema Boundaries ──');

  await check('Score validation marks valid integers as SCHEMA_AND_RANGE_BOUND and verified: false', async () => {
    const res = scoreValidationService.validateScore(1250, { gameId: 'duo-runner' });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.cleanScore, 1250);
    assert.strictEqual(res.validationLevel, ValidationLevel.SCHEMA_AND_RANGE_BOUND);
    assert.strictEqual(res.verified, false, 'Must not claim cryptographic verification');
    assert.strictEqual(res.metadata.clientReported, true);
  });

  await check('Score validation rejects negative scores', async () => {
    const res = scoreValidationService.validateScore(-100);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.verified, false);
    assert.ok(res.error.includes('Negative scores'));
  });

  await check('Score validation rejects non-numerical and NaN values', async () => {
    const res = scoreValidationService.validateScore('hacked_score');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.verified, false);
  });

  console.log(`\n======================================================`);
  console.log(`PHASE 2B RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase2BTests().catch((err) => {
  console.error('Fatal error running Phase 2B tests:', err);
  process.exit(1);
});
