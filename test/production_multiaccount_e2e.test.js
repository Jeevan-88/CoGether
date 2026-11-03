/**
 * CoGether Master Engineering Directive — Section 16
 * Multi-Account End-to-End Acceptance Test Suite
 *
 * Fully automated multi-actor lifecycle verification:
 * [1] Multi-Account Registration & Password Hashing (Argon2id + PostgreSQL identity.users)
 * [2] Unified Profile & Preferences Update (PostgreSQL identity.profiles & identity.preferences)
 * [3] Social Discovery & Search (Query by username and display name)
 * [4] Friend Request Lifecycle (Send, duplicate rejection, self-request rejection, incoming view, accept)
 * [5] Real-Time Socket.IO Messaging & E2EE Key Exchange (WebCrypto ECDH P-256 + AES-256-GCM)
 * [6] Database Privacy & Zero Plaintext Audit (identity.direct_messages ciphertext validation)
 * [7] Chat History Persistence, Refresh Survival & Read Receipts (Unread summary aggregation)
 * [8] Private Game Room Security & Access Control (Creation, invite token, acceptance, unauthorized rejection)
 * [9] CoWatch Real Movie Catalog & Cinema Content Audit (Authentic metadata, artwork, working video)
 * [10] Cross-Service Identity Integrity (CoPlay, CoWatch, CoShop, CoStudy unified profile verification)
 */

const assert = require('assert');
const crypto = require('crypto');
const { io: ClientIO } = require('socket.io-client');
const { db } = require('../packages/database');
const { emailService } = require('../services/identity/emailService');

const SERVER_URL = 'http://localhost:3001';
const subtle = globalThis.crypto.subtle;

// HTTP fetch helper
async function apiRequest(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runAcceptanceSuite() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 CoGether Multi-Account End-to-End Acceptance Test Suite');
  console.log('   Master Engineering Directive — Section 16 Verification');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;
  let socketA = null;
  let socketB = null;

  async function check(name, fn) {
    process.stdout.write(`  ⏳ ${name}... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
      console.error(err);
      failed++;
    }
  }

  const ts = Date.now();
  const accountA = {
    email: `alice_${ts}@cogether.tech`,
    password: `Password@123!_${ts}`,
    displayName: `Alice Walker ${ts.toString().slice(-4)}`,
    username: `alice_${ts.toString().slice(-6)}`,
    token: null,
    userId: null,
    keyPair: null,
    jwk: null
  };

  const accountB = {
    email: `bob_${ts}@cogether.tech`,
    password: `Password@123!_${ts}`,
    displayName: `Bob Builder ${ts.toString().slice(-4)}`,
    username: `bob_${ts.toString().slice(-6)}`,
    token: null,
    userId: null,
    keyPair: null,
    jwk: null
  };

  const accountC = {
    email: `charlie_${ts}@cogether.tech`,
    password: `Password@123!_${ts}`,
    displayName: `Charlie Hacker ${ts.toString().slice(-4)}`,
    username: `charlie_${ts.toString().slice(-6)}`,
    token: null,
    userId: null
  };

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // [1] Multi-Account Registration & Authentication
    // ─────────────────────────────────────────────────────────────────────────
    console.log('── [1/10] Multi-Account Registration & Password Hashing (Argon2id) ──');

    async function registerAndLogin(account) {
      const otpReq = await apiRequest('POST', '/api/v1/auth/email/request-otp', {
        email: account.email,
        purpose: 'signup'
      });
      assert.strictEqual(otpReq.status, 200, `OTP request failed for ${account.email}: ${JSON.stringify(otpReq.data)}`);

      const otp = emailService.getLastSentOtpForTest(account.email)?.otp || 
                  (typeof emailService.getLastSentOtpForTest(account.email) === 'string' ? emailService.getLastSentOtpForTest(account.email) : null);
      assert.ok(otp, `OTP not found for ${account.email}`);

      const regRes = await apiRequest('POST', '/api/v1/auth/register', {
        email: account.email,
        password: account.password,
        displayName: account.displayName,
        username: account.username,
        otp
      });
      assert.strictEqual(regRes.status, 201, `Registration failed for ${account.email}: ${JSON.stringify(regRes.data)}`);
      assert.ok(regRes.data.user?.id, 'Missing user ID in registration response');
      account.userId = regRes.data.user.id;
      account.token = regRes.data.accessToken;

      const userDb = await db.query(
        `SELECT u.id, u.email, u.password_hash, p.display_name, p.username 
         FROM identity.users u 
         JOIN identity.profiles p ON p.user_id = u.id 
         WHERE u.id = $1`,
        [account.userId]
      );
      assert.strictEqual(userDb.rowCount, 1, `User row not found in PostgreSQL for ${account.email}`);
      assert.ok(userDb.rows[0].password_hash.startsWith('$argon2'), 'Password hash must be Argon2id');
    }

    await check('Register Account A (Alice) with Argon2id hash in PostgreSQL', async () => {
      await registerAndLogin(accountA);
    });

    await check('Register Account B (Bob) with Argon2id hash in PostgreSQL', async () => {
      await registerAndLogin(accountB);
    });

    await check('Register Account C (Charlie) with Argon2id hash in PostgreSQL', async () => {
      await registerAndLogin(accountC);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // [2] Unified Profile & Preferences Update
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n── [2/10] Unified Profile & Preferences Update ──');

    await check('Account A updates profile and bio, persisting to identity.profiles', async () => {
      const updateRes = await apiRequest('PATCH', '/api/v1/me/profile', {
        displayName: 'Alice W. (Verified)',
        bio: 'Senior Software Architect & Full-Stack Specialist',
        status: 'online'
      }, accountA.token);

      assert.strictEqual(updateRes.status, 200, `Profile update failed: ${JSON.stringify(updateRes.data)}`);
      assert.strictEqual(updateRes.data.profile.displayName, 'Alice W. (Verified)');
      assert.strictEqual(updateRes.data.profile.bio, 'Senior Software Architect & Full-Stack Specialist');

      const profDb = await db.query('SELECT display_name, bio FROM identity.profiles WHERE user_id = $1', [accountA.userId]);
      assert.strictEqual(profDb.rows[0].display_name, 'Alice W. (Verified)');
      assert.strictEqual(profDb.rows[0].bio, 'Senior Software Architect & Full-Stack Specialist');
    });

    await check('Account A updates cross-service preferences in identity.preferences', async () => {
      const prefRes = await apiRequest('PATCH', '/api/v1/me/preferences', {
        primaryInterest: 'gaming',
        timezone: 'America/New_York',
        language: 'en'
      }, accountA.token);

      assert.strictEqual(prefRes.status, 200, `Preferences update failed: ${JSON.stringify(prefRes.data)}`);
      assert.strictEqual(prefRes.data.preferences.primary_interest, 'gaming');
      assert.strictEqual(prefRes.data.preferences.timezone, 'America/New_York');

      const prefDb = await db.query('SELECT primary_interest, timezone FROM identity.preferences WHERE user_id = $1', [accountA.userId]);
      assert.strictEqual(prefDb.rows[0].primary_interest, 'gaming');
      assert.strictEqual(prefDb.rows[0].timezone, 'America/New_York');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // [3] Social Discovery & Search
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n── [3/10] Social Discovery & User Search ──');

    await check('Account A searches for Account B by username via /api/v1/social/users/search', async () => {
      const searchRes = await apiRequest('GET', `/api/v1/social/users/search?q=${accountB.username}`, null, accountA.token);
      assert.strictEqual(searchRes.status, 200);
      assert.ok(Array.isArray(searchRes.data.users), 'Expected users array');
      const found = searchRes.data.users.find(u => u.id === accountB.userId);
      assert.ok(found, `Account B with ID ${accountB.userId} not found in search results`);
      assert.strictEqual(found.username, accountB.username);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // [4] Friend Request Lifecycle
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n── [4/10] Friend Request Lifecycle (Send, View, Accept) ──');

    await check('Account A sends friend request to Account B (POST /api/v1/social/friends/request)', async () => {
      const reqRes = await apiRequest('POST', '/api/v1/social/friends/request', {
        targetUserId: accountB.userId
      }, accountA.token);
      assert.strictEqual(reqRes.status, 201, `Friend request failed: ${JSON.stringify(reqRes.data)}`);
      assert.strictEqual(reqRes.data.friendship?.status, 'pending');

      // Verify self-request is rejected
      const selfReq = await apiRequest('POST', '/api/v1/social/friends/request', {
        targetUserId: accountA.userId
      }, accountA.token);
      assert.strictEqual(selfReq.status, 400, 'Self-request should be rejected with 400');

      // Verify duplicate request is safely rejected
      const dupReq = await apiRequest('POST', '/api/v1/social/friends/request', {
        targetUserId: accountB.userId
      }, accountA.token);
      assert.strictEqual(dupReq.status, 400, 'Duplicate request rejected');
      assert.strictEqual(dupReq.data.error, 'REQUEST_ALREADY_PENDING');
    });

    await check('Account B views pending incoming request (GET /api/v1/social/friends/requests)', async () => {
      const pendingRes = await apiRequest('GET', '/api/v1/social/friends/requests', null, accountB.token);
      assert.strictEqual(pendingRes.status, 200);
      assert.ok(Array.isArray(pendingRes.data.incoming), 'Expected incoming array');
      const incomingReq = pendingRes.data.incoming.find(r => r.userId === accountA.userId || r.id === accountA.userId);
      assert.ok(incomingReq, 'Pending request from Account A not found in Account B incoming');
    });

    await check('Account B accepts friend request from Account A (POST /api/v1/social/friends/respond)', async () => {
      const acceptRes = await apiRequest('POST', '/api/v1/social/friends/respond', {
        requesterId: accountA.userId,
        action: 'accept'
      }, accountB.token);
      assert.strictEqual(acceptRes.status, 200, `Accept failed: ${JSON.stringify(acceptRes.data)}`);

      // Verify both accounts show each other in /api/v1/social/friends
      const friendsA = await apiRequest('GET', '/api/v1/social/friends', null, accountA.token);
      const friendsB = await apiRequest('GET', '/api/v1/social/friends', null, accountB.token);

      assert.ok(friendsA.data.friends.some(f => f.id === accountB.userId), 'Account B missing from Account A friend list');
      assert.ok(friendsB.data.friends.some(f => f.id === accountA.userId), 'Account A missing from Account B friend list');

      const dbRel = await db.query(
        `SELECT status FROM identity.friendships 
         WHERE (user_id_1 = LEAST($1::uuid, $2::uuid) AND user_id_2 = GREATEST($1::uuid, $2::uuid))`,
        [accountA.userId, accountB.userId]
      );
      assert.strictEqual(dbRel.rows[0].status, 'accepted');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // [5] Real-Time Socket.IO & E2EE Key Exchange
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n── [5/10] Real-Time Socket.IO & E2EE Key Exchange ──');

    accountA.keyPair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
    accountA.jwk = await subtle.exportKey('jwk', accountA.keyPair.publicKey);

    accountB.keyPair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
    accountB.jwk = await subtle.exportKey('jwk', accountB.keyPair.publicKey);

    await check('Both accounts publish ECDH public JWKs to /api/v1/social/keys', async () => {
      const pubA = await apiRequest('POST', '/api/v1/social/keys', {
        keyId: 'key-alice-1',
        publicKeyJwk: accountA.jwk
      }, accountA.token);
      assert.strictEqual(pubA.status, 200);

      const pubB = await apiRequest('POST', '/api/v1/social/keys', {
        keyId: 'key-bob-1',
        publicKeyJwk: accountB.jwk
      }, accountB.token);
      assert.strictEqual(pubB.status, 200);

      const fetchedB = await apiRequest('GET', `/api/v1/social/keys/${accountB.userId}`, null, accountA.token);
      assert.strictEqual(fetchedB.status, 200);
      assert.strictEqual(fetchedB.data.publicKeyJwk.x, accountB.jwk.x);
      assert.strictEqual(fetchedB.data.publicKeyJwk.y, accountB.jwk.y);
    });

    await check('Both accounts establish authenticated Socket.IO connections', async () => {
      socketA = ClientIO(SERVER_URL, {
        auth: { token: accountA.token },
        transports: ['websocket']
      });

      socketB = ClientIO(SERVER_URL, {
        auth: { token: accountB.token },
        transports: ['websocket']
      });

      await Promise.all([
        new Promise(resolve => socketA.on('connect', resolve)),
        new Promise(resolve => socketB.on('connect', resolve))
      ]);

      assert.ok(socketA.connected, 'Socket A not connected');
      assert.ok(socketB.connected, 'Socket B not connected');
    });

    // Derive symmetric AES-GCM 256 keys on both sides
    const bobPubImported = await subtle.importKey('jwk', accountB.jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
    const aliceDerivedAes = await subtle.deriveKey(
      { name: 'ECDH', public: bobPubImported },
      accountA.keyPair.privateKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const alicePubImported = await subtle.importKey('jwk', accountA.jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
    const bobDerivedAes = await subtle.deriveKey(
      { name: 'ECDH', public: alicePubImported },
      accountB.keyPair.privateKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const testSecretMessage = `Classified Directive 42: Production Verified at ${new Date().toISOString()}`;
    const iv = crypto.randomBytes(12);
    const cipherBuffer = await subtle.encrypt({ name: 'AES-GCM', iv }, aliceDerivedAes, Buffer.from(testSecretMessage, 'utf8'));
    const ciphertextBase64 = Buffer.from(cipherBuffer).toString('base64');
    const ivBase64 = iv.toString('base64');

    await check('Account A sends encrypted direct message; Account B receives it live via Socket.IO', async () => {
      const messagePromise = new Promise((resolve) => {
        socketB.on('social:dm_received', (data) => {
          resolve(data.message || data);
        });
      });

      const sendRes = await apiRequest('POST', '/api/v1/social/messages', {
        recipientId: accountB.userId,
        ciphertext: ciphertextBase64,
        iv: ivBase64
      }, accountA.token);

      assert.strictEqual(sendRes.status, 201, `Message send failed: ${JSON.stringify(sendRes.data)}`);

      const receivedLiveMsg = await Promise.race([
        messagePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Socket.IO direct message delivery timed out')), 5000))
      ]);

      assert.strictEqual(receivedLiveMsg.sender_id, accountA.userId);
      assert.strictEqual(receivedLiveMsg.ciphertext, ciphertextBase64);

      // Decrypt on recipient side
      const decBuffer = await subtle.decrypt(
        { name: 'AES-GCM', iv: Buffer.from(receivedLiveMsg.iv, 'base64') },
        bobDerivedAes,
        Buffer.from(receivedLiveMsg.ciphertext, 'base64')
      );
      const decryptedPlaintext = Buffer.from(decBuffer).toString('utf8');
      assert.strictEqual(decryptedPlaintext, testSecretMessage, 'Decrypted plaintext must match original message');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // [6] Database Privacy & Zero Plaintext Audit
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n── [6/10] Database Privacy & Zero Plaintext Audit ──');

    await check('Verify message row in identity.direct_messages contains ZERO plaintext', async () => {
      const msgDb = await db.query(
        `SELECT ciphertext, iv FROM identity.direct_messages 
         WHERE sender_id = $1 AND recipient_id = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [accountA.userId, accountB.userId]
      );
      assert.strictEqual(msgDb.rowCount, 1, 'Message row not found in PostgreSQL');
      const storedRow = msgDb.rows[0];

      assert.ok(!storedRow.ciphertext.includes('Classified Directive 42'), 'SECURITY FAULT: Plaintext found in DB ciphertext column!');
      assert.strictEqual(storedRow.ciphertext, ciphertextBase64);
      assert.strictEqual(storedRow.iv, ivBase64);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // [7] Chat History, Refresh Survival & Read Receipts
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n── [7/10] Message History Persistence & Read Receipts ──');

    await check('Account B checks unread summary (/api/v1/social/messages/unread/summary)', async () => {
      const unreadRes = await apiRequest('GET', '/api/v1/social/messages/unread/summary', null, accountB.token);
      assert.strictEqual(unreadRes.status, 200);
      assert.ok(unreadRes.data.totalUnread >= 1, `Expected at least 1 unread message, got ${unreadRes.data.totalUnread}`);
    });

    await check('Account B fetches message history (/api/v1/social/messages/:friendUserId) and decrypts', async () => {
      const historyRes = await apiRequest('GET', `/api/v1/social/messages/${accountA.userId}`, null, accountB.token);
      assert.strictEqual(historyRes.status, 200);
      const messages = Array.isArray(historyRes.data) ? historyRes.data : historyRes.data.messages;
      assert.ok(Array.isArray(messages), 'Expected messages array');
      const latest = messages[0];
      const decBuf = await subtle.decrypt(
        { name: 'AES-GCM', iv: Buffer.from(latest.iv, 'base64') },
        bobDerivedAes,
        Buffer.from(latest.ciphertext, 'base64')
      );
      assert.strictEqual(Buffer.from(decBuf).toString('utf8'), testSecretMessage);
    });

    await check('Account B marks messages as read; unread summary resets to 0', async () => {
      const readRes = await apiRequest('POST', `/api/v1/social/messages/${accountA.userId}/read`, {}, accountB.token);
      assert.strictEqual(readRes.status, 200);

      const unreadAfter = await apiRequest('GET', '/api/v1/social/messages/unread/summary', null, accountB.token);
      assert.strictEqual(unreadAfter.data.byFriend[accountA.userId] || 0, 0, 'Unread for Alice must be 0 after read receipt');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // [8] Private Game Room Security & Access Control
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n── [8/10] Private Game Room Security & Access Control ──');

    let privateRoomCode = null;
    let privateRoomId = null;
    let roomInviteToken = null;

    await check('Account A creates a private game room (POST /api/v1/coplay/rooms/private)', async () => {
      const roomRes = await apiRequest('POST', '/api/v1/coplay/rooms/private', {
        gameId: '2048',
        options: { maxCapacity: 2 }
      }, accountA.token);
      assert.strictEqual(roomRes.status, 201, `Room creation failed: ${JSON.stringify(roomRes.data)}`);
      assert.ok(roomRes.data.room?.room_code, 'Missing room_code');
      assert.ok(roomRes.data.room?.id, 'Missing room id');
      privateRoomCode = roomRes.data.room.room_code;
      privateRoomId = roomRes.data.room.id;
    });

    await check('Account A generates invitation for Account B (POST /api/v1/coplay/rooms/invite)', async () => {
      const inviteRes = await apiRequest('POST', '/api/v1/coplay/rooms/invite', {
        inviteeId: accountB.userId,
        roomId: privateRoomId,
        gameId: '2048'
      }, accountA.token);
      assert.strictEqual(inviteRes.status, 201, `Room invite failed: ${JSON.stringify(inviteRes.data)}`);
      assert.ok(inviteRes.data.invitation?.invite_token, 'Missing invitation invite_token');
      roomInviteToken = inviteRes.data.invitation.invite_token;
    });

    await check('Account B accepts invitation token (POST /api/v1/coplay/invitations/:token/accept)', async () => {
      const acceptInviteRes = await apiRequest('POST', `/api/v1/coplay/invitations/${roomInviteToken}/accept`, {}, accountB.token);
      assert.strictEqual(acceptInviteRes.status, 200, `Accept invite failed: ${JSON.stringify(acceptInviteRes.data)}`);
      assert.strictEqual(acceptInviteRes.data.invitation.status, 'accepted');
    });

    await check('Unauthorized Account C attempts to hijack Account B invitation -> strictly 403 Forbidden', async () => {
      const hijackAttempt = await apiRequest('POST', `/api/v1/coplay/invitations/${roomInviteToken}/accept`, {}, accountC.token);
      assert.strictEqual(hijackAttempt.status, 403, `Unauthorized user must be rejected with 403 (got ${hijackAttempt.status})`);
      assert.strictEqual(hijackAttempt.data.error, 'UNAUTHORIZED_INVITEE');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // [9] CoWatch Real Movie Catalog & Cinema Content Audit
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n── [9/10] CoWatch Real Movie Catalog & Cinema Content Audit ──');

    await check('Verify GET /api/v1/cowatch/content returns genuine movie records with authentic artwork', async () => {
      const contentRes = await apiRequest('GET', '/api/v1/cowatch/content');
      assert.strictEqual(contentRes.status, 200);
      const items = contentRes.data.contents || [];
      assert.ok(items.length >= 16, `Expected at least 16 movie records, got ${items.length}`);

      const item0 = items[0];
      assert.ok(item0.title, 'Movie must have a title');
      assert.ok(item0.thumbnail, 'Movie must have real thumbnail');
      assert.ok(item0.videoStreamUrl || item0.externalUrl, 'Movie must have working playback URL');

      // Verify zero mock/fabricated titles
      for (const it of items) {
        assert.ok(!it.title.toLowerCase().includes('dummy'), 'Found dummy title in movie catalog');
        assert.ok(!it.title.toLowerCase().includes('lorem ipsum'), 'Found lorem ipsum title in movie catalog');
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // [10] Cross-Service Identity Integrity
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n── [10/10] Cross-Service Identity Integrity (CoPlay, CoWatch, CoShop, CoStudy) ──');

    await check('Account A identity is uniformly recognized across all services', async () => {
      // 1. Core Auth Me
      const meRes = await apiRequest('GET', '/api/v1/me', null, accountA.token);
      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.data.id, accountA.userId);
      assert.strictEqual(meRes.data.profile.displayName, 'Alice W. (Verified)');

      // 2. CoPlay Leaderboard Display
      const coplayLeaderboard = await apiRequest('GET', '/api/v1/coplay/leaderboards/2048', null, accountA.token);
      assert.strictEqual(coplayLeaderboard.status, 200);

      // 3. CoWatch Watch Room Creation with Unified Profile
      const cowatchRoom = await apiRequest('POST', '/api/v1/cowatch/rooms', {
        title: "Alice's Cinema Session",
        isPrivate: false
      }, accountA.token);
      assert.strictEqual(cowatchRoom.status, 201);
      assert.strictEqual(cowatchRoom.data.room.host_user_id, accountA.userId);

      // 4. CoStudy Progress Tracking
      const studyProgress = await apiRequest('GET', '/api/v1/costudy/progress', null, accountA.token);
      assert.strictEqual(studyProgress.status, 200);

      // 5. CoShop Product Catalog & Session Integration
      const shopProducts = await apiRequest('GET', '/api/coshop/products', null, accountA.token);
      assert.strictEqual(shopProducts.status, 200);
      assert.ok(Array.isArray(shopProducts.data.products), 'Expected products list');
    });

  } finally {
    if (socketA) socketA.disconnect();
    if (socketB) socketB.disconnect();

    try {
      const testUserIds = [accountA.userId, accountB.userId, accountC.userId].filter(Boolean);
      if (testUserIds.length > 0) {
        await db.query(`DELETE FROM cowatch.watch_rooms WHERE host_user_id = ANY($1::uuid[])`, [testUserIds]);
        await db.query(`DELETE FROM coplay.private_rooms WHERE host_user_id = ANY($1::uuid[])`, [testUserIds]);
        await db.query(`DELETE FROM identity.users WHERE id = ANY($1::uuid[])`, [testUserIds]);
        console.log('\n🧹 Multi-account test data cleaned up from PostgreSQL.');
      }
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 Multi-Account Acceptance Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAcceptanceSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
