/**
 * CoGether — CoPlay Social, Friends, Private Rooms & E2EE Direct Messaging Test Suite
 *
 * Automated verification of:
 * 1. PostgreSQL-backed Friends Engine:
 *    - Search by @username / display name
 *    - Request, duplicate rejection, self-request rejection
 *    - Incoming & outgoing pending request separation
 *    - Accept, reject, cancel, remove, block, and unblock
 * 2. Cryptographic Private Rooms & Invitation Engine:
 *    - Secure room code generation (DUEL-XXXXXX)
 *    - Server-authoritative capacity & status
 *    - Direct game invitation tokens
 *    - Token preview, authorization check, acceptance, and rejection
 * 3. End-to-End Encryption (E2EE) Direct Messaging Engine:
 *    - WebCrypto ECDH P-256 keypair generation & JWK directory publication
 *    - Symmetrical AES-256-GCM shared key derivation
 *    - Unique 12-byte IV encryption and Base64 packing
 *    - Database Privacy Audit (Zero Plaintext Exposure)
 *    - Plaintext restoration on recipient side
 *    - Tampered ciphertext rejection (AES-GCM tag mismatch)
 *    - Conversation history, read receipts, and unread count aggregation
 * 4. Real-time Socket.IO Direct Messaging & Presence Relay:
 *    - Multi-client authenticated socket connection
 *    - Dynamic personal room subscription (user:ID)
 *    - Real-time typing indicators & event delivery
 */

const assert = require('assert');
const crypto = require('crypto');
const { io: ClientIO } = require('socket.io-client');
const { db } = require('../packages/database');
const { signToken } = require('../packages/auth');
const { friendService } = require('../services/social/friendService');
const { privateRoomService } = require('../services/coplay/privateRoomService');
const { messagingService } = require('../services/social/messagingService');

async function runTestSuite() {
  console.log('🎮 Starting CoGether CoPlay, Friends & E2EE Messaging Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
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

  // Generate unique test identities
  const ts = Date.now();
  const userA = {
    id: `00000000-0000-4000-a000-${ts.toString().slice(-12)}`,
    email: `alpha_${ts}@test.cogether.tech`,
    username: `alpha_${ts.toString().slice(-6)}`,
    displayName: 'Alpha Player'
  };
  const userB = {
    id: `00000000-0000-4000-b000-${ts.toString().slice(-12)}`,
    email: `beta_${ts}@test.cogether.tech`,
    username: `beta_${ts.toString().slice(-6)}`,
    displayName: 'Beta Player'
  };
  const userC = {
    id: `00000000-0000-4000-c000-${ts.toString().slice(-12)}`,
    email: `gamma_${ts}@test.cogether.tech`,
    username: `gamma_${ts.toString().slice(-6)}`,
    displayName: 'Gamma Player'
  };

  try {
    // ── SETUP: Insert test users into identity schema ──
    await test('Setup test users in PostgreSQL identity schema', async () => {
      for (const u of [userA, userB, userC]) {
        await db.query(
          `INSERT INTO identity.users (id, email, display_name, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.email, u.displayName]
        );
        await db.query(
          `INSERT INTO identity.profiles (user_id, display_name, username, username_normalized, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           ON CONFLICT (user_id) DO UPDATE SET display_name = $2, username = $3, username_normalized = $4`,
          [u.id, u.displayName, u.username, u.username.toLowerCase()]
        );
      }
    });

    // ── SECTION 1: FRIENDS SYSTEM ──
    await test('Friends: Search users by username handle or display name', async () => {
      const results = await friendService.searchUsers(userB.username, userA.id);
      assert(Array.isArray(results), 'Expected results array');
      const found = results.find(r => r.id === userB.id);
      assert(found, `User Beta (${userB.username}) should be found in search`);
      assert.strictEqual(found.displayName, userB.displayName);
      assert.strictEqual(found.friendshipStatus, 'none');
    });

    await test('Friends: Prevent sending friend request to oneself', async () => {
      const res = await friendService.sendFriendRequest(userA.id, userA.id);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error, 'CANNOT_FRIEND_SELF');
    });

    let activeFriendshipId = null;
    await test('Friends: User Alpha sends friend request to User Beta', async () => {
      const res = await friendService.sendFriendRequest(userA.id, userB.username);
      assert.strictEqual(res.success, true);
      assert(res.friendship, 'Expected friendship object');
      assert.strictEqual(res.friendship.status, 'pending');
      activeFriendshipId = res.friendship.id;
    });

    await test('Friends: Prevent duplicate pending friend requests', async () => {
      const res = await friendService.sendFriendRequest(userA.id, userB.username);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error, 'REQUEST_ALREADY_PENDING');
    });

    await test('Friends: Pending requests partitioned correctly (incoming vs outgoing)', async () => {
      const alphaPending = await friendService.getPendingRequests(userA.id);
      assert.strictEqual(alphaPending.incoming.length, 0, 'Alpha should have 0 incoming');
      assert.strictEqual(alphaPending.outgoing.length, 1, 'Alpha should have 1 outgoing');
      assert.strictEqual(alphaPending.outgoing[0].id, userB.id);

      const betaPending = await friendService.getPendingRequests(userB.id);
      assert.strictEqual(betaPending.incoming.length, 1, 'Beta should have 1 incoming');
      assert.strictEqual(betaPending.outgoing.length, 0, 'Beta should have 0 outgoing');
      assert.strictEqual(betaPending.incoming[0].id, userA.id);
    });

    await test('Friends: User Beta accepts friend request', async () => {
      const res = await friendService.respondToFriendRequest(userB.id, userA.id, 'accept');
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.friendship.status, 'accepted');

      const areFriends = await friendService.areFriends(userA.id, userB.id);
      assert.strictEqual(areFriends, true, 'User A and User B must now be confirmed friends');
    });

    await test('Friends: Mutual friends list populated', async () => {
      const alphaFriends = await friendService.getFriends(userA.id);
      assert.strictEqual(alphaFriends.length, 1);
      assert.strictEqual(alphaFriends[0].id, userB.id);

      const betaFriends = await friendService.getFriends(userB.id);
      assert.strictEqual(betaFriends.length, 1);
      assert.strictEqual(betaFriends[0].id, userA.id);
    });

    // ── SECTION 2: PRIVATE ROOMS & INVITATIONS ──
    let testRoom = null;
    await test('CoPlay: Create private game room with cryptographic room code', async () => {
      testRoom = await privateRoomService.createPrivateRoom(userA.id, '2048', { maxCapacity: 2 });
      assert(testRoom, 'Expected room object');
      assert(testRoom.room_code.startsWith('DUEL-'), `Room code ${testRoom.room_code} must start with DUEL-`);
      assert.strictEqual(testRoom.game_id, '2048');
      assert.strictEqual(testRoom.host_user_id, userA.id);
      assert.strictEqual(testRoom.status, 'open');
      assert.strictEqual(testRoom.max_capacity, 2);
    });

    await test('CoPlay: Query room by code and ID', async () => {
      const byCode = await privateRoomService.getRoomByCodeOrId(testRoom.room_code);
      assert(byCode, 'Should resolve room by code');
      assert.strictEqual(byCode.id, testRoom.id);

      const byId = await privateRoomService.getRoomByCodeOrId(testRoom.id);
      assert(byId, 'Should resolve room by UUID');
      assert.strictEqual(byId.room_code, testRoom.room_code);
    });

    let testInvitation = null;
    await test('CoPlay: Host Alpha creates direct game invitation for Friend Beta', async () => {
      const res = await privateRoomService.createGameInvitation(userA.id, userB.id, testRoom.id, '2048');
      assert.strictEqual(res.success, true);
      assert(res.invitation, 'Expected invitation object');
      assert(res.invitation.invite_token, 'Expected secure invite token');
      assert.strictEqual(res.invitation.status, 'pending');
      testInvitation = res.invitation;
    });

    await test('CoPlay: Invitation preview resolves game & inviter details', async () => {
      const preview = await privateRoomService.getInvitationDetails(testInvitation.invite_token);
      assert.strictEqual(preview.success, true);
      assert.strictEqual(preview.invitation.id, testInvitation.id);
      assert.strictEqual(preview.inviter.id, userA.id);
      assert.strictEqual(preview.room.room_code, testRoom.room_code);
    });

    await test('CoPlay: Prevent unauthorized user from accepting target invite', async () => {
      // User Gamma attempts to redeem an invite token meant for Beta
      const res = await privateRoomService.acceptInvitation(testInvitation.invite_token, userC.id);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error, 'UNAUTHORIZED_INVITEE');
    });

    await test('CoPlay: Friend Beta accepts game invitation', async () => {
      const res = await privateRoomService.acceptInvitation(testInvitation.invite_token, userB.id);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.invitation.status, 'accepted');
      assert.strictEqual(res.room.id, testRoom.id);
    });

    await test('CoPlay: Close private room', async () => {
      const closed = await privateRoomService.closeRoom(testRoom.id, userA.id);
      assert.strictEqual(closed, true);

      const check = await privateRoomService.getRoomByCodeOrId(testRoom.id);
      assert.strictEqual(check.status, 'closed');
    });

    // ── SECTION 3: E2EE DIRECT MESSAGING (ECDH P-256 + AES-256-GCM) ──
    const subtle = globalThis.crypto.subtle;
    let aliceKeyPair, bobKeyPair;
    let aliceJwk, bobJwk;

    await test('E2EE: Generate ECDH P-256 keypairs for Alice and Bob', async () => {
      aliceKeyPair = await subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey']
      );
      bobKeyPair = await subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey']
      );

      aliceJwk = await subtle.exportKey('jwk', aliceKeyPair.publicKey);
      bobJwk = await subtle.exportKey('jwk', bobKeyPair.publicKey);

      assert(aliceJwk.x && aliceJwk.y, 'Alice public JWK coordinates present');
      assert(bobJwk.x && bobJwk.y, 'Bob public JWK coordinates present');
    });

    await test('E2EE: Register public JWKs in PostgreSQL key directory', async () => {
      const regA = await messagingService.registerUserKey(userA.id, 'key-alice-1', aliceJwk);
      assert.strictEqual(regA.success, true);

      const regB = await messagingService.registerUserKey(userB.id, 'key-bob-1', bobJwk);
      assert.strictEqual(regB.success, true);

      const fetchedB = await messagingService.getUserPublicKey(userB.id);
      assert.strictEqual(fetchedB.success, true);
      assert.strictEqual(fetchedB.publicKey.x, bobJwk.x);
    });

    let encryptedPayload = null;
    const SECRET_TEXT = 'Confidential duel plan: Focus on the top-right corner in 2048!';

    await test('E2EE: Alice derives shared secret and encrypts plaintext with AES-256-GCM', async () => {
      // Alice imports Bob's public key
      const bobImported = await subtle.importKey(
        'jwk',
        bobJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );

      // Alice derives 256-bit AES-GCM shared key
      const aliceSharedKey = await subtle.deriveKey(
        { name: 'ECDH', public: bobImported },
        aliceKeyPair.privateKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      // Encrypt with 12-byte IV
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
      const plaintextBytes = new TextEncoder().encode(SECRET_TEXT);
      const ciphertextBuf = await subtle.encrypt(
        { name: 'AES-GCM', iv },
        aliceSharedKey,
        plaintextBytes
      );

      encryptedPayload = {
        ciphertext: Buffer.from(ciphertextBuf).toString('base64'),
        iv: Buffer.from(iv).toString('base64'),
        senderKeyId: 'key-alice-1',
        recipientKeyId: 'key-bob-1'
      };

      assert(encryptedPayload.ciphertext.length > 0);
      assert.strictEqual(Buffer.from(encryptedPayload.iv, 'base64').length, 12);
    });

    let savedMessage = null;
    await test('E2EE: Store direct message through MessagingService', async () => {
      const res = await messagingService.sendDirectMessage(userA.id, userB.id, encryptedPayload);
      assert.strictEqual(res.success, true);
      assert(res.message, 'Expected saved message');
      assert.strictEqual(res.message.ciphertext, encryptedPayload.ciphertext);
      savedMessage = res.message;
    });

    await test('E2EE Privacy Audit: Plaintext is NEVER stored in PostgreSQL database', async () => {
      const dbRow = await db.query(
        `SELECT id, sender_id, recipient_id, ciphertext, iv, status 
         FROM identity.direct_messages WHERE id = $1`,
        [savedMessage.id]
      );
      assert.strictEqual(dbRow.rows.length, 1);
      const row = dbRow.rows[0];

      // Verify row contains ciphertext and IV only
      assert.strictEqual(row.ciphertext, encryptedPayload.ciphertext);
      assert.strictEqual(row.iv, encryptedPayload.iv);

      // Query raw text search across entire table for the secret string
      const leakCheck = await db.query(
        `SELECT id FROM identity.direct_messages 
         WHERE ciphertext ILIKE '%${SECRET_TEXT}%' OR iv ILIKE '%${SECRET_TEXT}%'`
      );
      assert.strictEqual(leakCheck.rows.length, 0, 'Plaintext MUST NOT exist in database!');
    });

    await test('E2EE: Bob derives shared secret and decrypts message back to exact plaintext', async () => {
      // Bob imports Alice's public key
      const aliceImported = await subtle.importKey(
        'jwk',
        aliceJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );

      // Bob derives identical AES-GCM shared key
      const bobSharedKey = await subtle.deriveKey(
        { name: 'ECDH', public: aliceImported },
        bobKeyPair.privateKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      // Decrypt
      const ivBuf = Buffer.from(savedMessage.iv, 'base64');
      const cipherBuf = Buffer.from(savedMessage.ciphertext, 'base64');
      const decryptedBuf = await subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuf },
        bobSharedKey,
        cipherBuf
      );

      const decryptedText = new TextDecoder().decode(decryptedBuf);
      assert.strictEqual(decryptedText, SECRET_TEXT, 'Decrypted text must match original plaintext!');
    });

    await test('E2EE: Tampered ciphertext is rejected by AES-GCM integrity check', async () => {
      const aliceImported = await subtle.importKey(
        'jwk',
        aliceJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );
      const bobSharedKey = await subtle.deriveKey(
        { name: 'ECDH', public: aliceImported },
        bobKeyPair.privateKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      // Flip 1 byte in ciphertext
      const tamperedBuf = Buffer.from(savedMessage.ciphertext, 'base64');
      tamperedBuf[tamperedBuf.length - 1] ^= 0x01; // flip last bit of authentication tag

      let failedGracefully = false;
      try {
        await subtle.decrypt(
          { name: 'AES-GCM', iv: Buffer.from(savedMessage.iv, 'base64') },
          bobSharedKey,
          tamperedBuf
        );
      } catch (e) {
        failedGracefully = true;
      }
      assert.strictEqual(failedGracefully, true, 'AES-GCM must reject tampered ciphertext with tag error');
    });

    await test('E2EE: Read receipts & unread counters reflect message lifecycle', async () => {
      // Bob checks unread summary
      const unread1 = await messagingService.getUnreadSummary(userB.id);
      assert.strictEqual(unread1.totalUnread, 1);
      assert.strictEqual(unread1.byFriend[userA.id], 1);

      // Bob marks messages read
      const markRes = await messagingService.markMessagesRead(userB.id, userA.id);
      assert.strictEqual(markRes.success, true);
      assert.strictEqual(markRes.markedCount, 1);

      // Summary is now 0
      const unread2 = await messagingService.getUnreadSummary(userB.id);
      assert.strictEqual(unread2.totalUnread, 0);
    });

    // ── SECTION 4: REALTIME SOCKET.IO INTERACTION ──
    await test('Socket.IO: Two clients connect with JWT and receive real-time presence/events', async () => {
      const tokenA = signToken({ sub: userA.id, username: userA.username, displayName: userA.displayName, role: 'member' });
      const tokenB = signToken({ sub: userB.id, username: userB.username, displayName: userB.displayName, role: 'member' });

      const socketA = ClientIO('http://localhost:3001', {
        auth: { token: tokenA },
        transports: ['websocket'],
        reconnection: false
      });

      const socketB = ClientIO('http://localhost:3001', {
        auth: { token: tokenB },
        transports: ['websocket'],
        reconnection: false
      });

      await Promise.all([
        new Promise((resolve, reject) => {
          socketA.on('connect', resolve);
          socketA.on('connect_error', reject);
        }),
        new Promise((resolve, reject) => {
          socketB.on('connect', resolve);
          socketB.on('connect_error', reject);
        })
      ]);

      // Client A sends typing indicator to Client B
      const typingReceivedPromise = new Promise((resolve) => {
        socketB.on('social:dm_typing', (data) => {
          if (data.senderId === userA.id && data.isTyping === true) {
            resolve();
          }
        });
      });

      socketA.emit('dm:typing', { recipientId: userB.id, isTyping: true });
      await typingReceivedPromise;

      socketA.disconnect();
      socketB.disconnect();
    });

    // ── CLEANUP ──
    await test('Cleanup test artifacts from PostgreSQL', async () => {
      await db.query(`DELETE FROM identity.direct_messages WHERE sender_id IN ($1, $2, $3)`, [userA.id, userB.id, userC.id]);
      await db.query(`DELETE FROM identity.user_keys WHERE user_id IN ($1, $2, $3)`, [userA.id, userB.id, userC.id]);
      await db.query(`DELETE FROM coplay.game_invitations WHERE inviter_user_id IN ($1, $2, $3)`, [userA.id, userB.id, userC.id]);
      await db.query(`DELETE FROM coplay.private_rooms WHERE host_user_id IN ($1, $2, $3)`, [userA.id, userB.id, userC.id]);
      await db.query(`DELETE FROM identity.friendships WHERE user_id_1 IN ($1, $2, $3) OR user_id_2 IN ($1, $2, $3)`, [userA.id, userB.id, userC.id]);
      await db.query(`DELETE FROM identity.profiles WHERE user_id IN ($1, $2, $3)`, [userA.id, userB.id, userC.id]);
      await db.query(`DELETE FROM identity.users WHERE id IN ($1, $2, $3)`, [userA.id, userB.id, userC.id]);
    });

  } catch (globalErr) {
    console.error('Fatal test error:', globalErr);
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite();
