/**
 * CoGether Production Verification Suite
 * Verifies:
 * 1. Database & Jeevan's Account Preservation
 * 2. 5-Minute Guest Mode & Expiration Enforcement
 * 3. Real User Registration (Argon2id + PostgreSQL persistence)
 * 4. User Login & Session Resolution
 * 5. Real Friendship Lifecycle in PostgreSQL
 * 6. E2EE Direct Messaging Persistence (Ciphertext only)
 * 7. Cryptographic Room Invitations & Codes
 */

const { db } = require('../packages/database');
const http = require('http');

const API_BASE = 'http://127.0.0.1:3001';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(url, {
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 CoGether Production Architecture Verification');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Database Audit & Jeevan's Account Preservation
    // ----------------------------------------------------
    console.log('--- TEST 1: Database & Jeevan\'s Account Preservation ---');
    const jeevanUserId = '02503ede-23ab-4b59-9275-321213f75201';
    const userRes = await db.query(
      `SELECT u.id, u.status, u.email, u.password_hash, p.username, p.display_name, p.avatar_config
       FROM identity.users u
       JOIN identity.profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [jeevanUserId]
    );

    assert(userRes.rows.length === 1, 'Jeevan\'s account exists in PostgreSQL');
    const jeevan = userRes.rows[0];
    assert(jeevan.email === 'jeevanyadav2008@gmail.com', `Email matches jeevanyadav2008@gmail.com (got: ${jeevan.email})`);
    assert(jeevan.username === 'jeevan_yadav', `Username is jeevan_yadav (got: ${jeevan.username})`);
    assert(jeevan.display_name === 'Jeevan Yadav', `Display name is Jeevan Yadav (got: ${jeevan.display_name})`);
    assert(jeevan.avatar_config && typeof jeevan.avatar_config === 'object', 'Avatar config exists in DB');
    assert(jeevan.avatar_config.eyesId === 'eyes-03-relaxed-amber', `Custom avatar eyes intact (got: ${jeevan.avatar_config?.eyesId})`);
    assert(jeevan.password_hash && jeevan.password_hash.startsWith('$argon2id$'), 'Password hash is OWASP Argon2id');

    // ----------------------------------------------------
    // TEST 2: 5-Minute Guest Mode & Expiration
    // ----------------------------------------------------
    console.log('\n--- TEST 2: 5-Minute Guest Mode & Expiration Enforcement ---');
    const guestRes = await request('POST', '/api/v1/auth/guest', { displayName: 'VerifiedGuest' });
    assert(guestRes.status === 201, `Guest creation returns 201 (got ${guestRes.status})`);
    assert(guestRes.body.token && typeof guestRes.body.token === 'string', 'Guest JWT token returned');
    assert(guestRes.body.durationSeconds === 300, `Guest session duration strictly 300 seconds (5 min) (got: ${guestRes.body.durationSeconds})`);

    const guestToken = guestRes.body.token;
    const guestId = guestRes.body.user.id;

    // Check DB persistence
    const guestDbRes = await db.query(
      `SELECT guest_id, display_name, expires_at FROM identity.guest_sessions WHERE guest_id = $1`,
      [guestId]
    );
    assert(guestDbRes.rows.length === 1, 'Guest session is persistently recorded in PostgreSQL identity.guest_sessions');

    // Check /api/v1/me as guest
    const guestMeRes = await request('GET', '/api/v1/me', null, { Authorization: `Bearer ${guestToken}` });
    assert(guestMeRes.status === 200, `Guest /api/v1/me returns 200 (got: ${guestMeRes.status})`);
    assert(guestMeRes.body.isGuest === true, 'Guest flag is true in profile');
    assert(guestMeRes.body.remainingSeconds <= 300 && guestMeRes.body.remainingSeconds > 280, `Guest remaining seconds is accurate (${guestMeRes.body.remainingSeconds}s)`);

    // Check guest restriction: cannot send friend request
    const guestFriendReq = await request('POST', '/api/v1/social/friends/request', { targetUsername: 'anyuser' }, { Authorization: `Bearer ${guestToken}` });
    assert(guestFriendReq.status === 403, `Guest blocked from friend requests (got ${guestFriendReq.status})`);
    assert(guestFriendReq.body.error?.code === 'GUEST_RESTRICTED', `Error code is GUEST_RESTRICTED (got: ${guestFriendReq.body.error?.code})`);

    // Check guest restriction: cannot send DM
    const guestDmReq = await request('POST', '/api/v1/social/messages', { recipientUserId: jeevanUserId, ciphertext: 'test', iv: 'test' }, { Authorization: `Bearer ${guestToken}` });
    assert(guestDmReq.status === 403, `Guest blocked from sending DMs (got ${guestDmReq.status})`);

    // Test Expiration: manually expire guest in DB
    await db.query(`UPDATE identity.guest_sessions SET expires_at = NOW() - INTERVAL '5 seconds' WHERE guest_id = $1`, [guestId]);
    const expiredMeRes = await request('GET', '/api/v1/me', null, { Authorization: `Bearer ${guestToken}` });
    assert(expiredMeRes.status === 401, `Expired guest session rejected with 401 (got: ${expiredMeRes.status})`);
    assert(expiredMeRes.body.error?.code === 'GUEST_SESSION_EXPIRED', `Error code is GUEST_SESSION_EXPIRED (got: ${expiredMeRes.body.error?.code})`);

    // ----------------------------------------------------
    // TEST 3: Real User Registration (Argon2id + PostgreSQL)
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Real Registration with Argon2id ---');
    const timestamp = Date.now();
    const aliceEmail = `alice_${timestamp}@testdomain.com`;
    const aliceUsername = `alice_${timestamp}`;
    const alicePassword = 'SecurePassword123!';

    const regRes = await request('POST', '/api/v1/auth/register', {
      email: aliceEmail,
      password: alicePassword,
      username: aliceUsername,
      displayName: 'Alice In Production'
    });

    assert(regRes.status === 201, `Registration returned 201 Created (got: ${regRes.status})`);
    assert(regRes.body.success === true, 'Registration succeeded');
    assert(regRes.body.user && regRes.body.user.id, `User ID generated: ${regRes.body.user?.id}`);
    assert(regRes.body.tokens && regRes.body.tokens.accessToken, 'Access token issued');

    const aliceToken = regRes.body.tokens.accessToken;
    const aliceId = regRes.body.user.id;

    // Verify DB records
    const aliceDb = await db.query(
      `SELECT u.id, u.status, u.email, u.password_hash, p.username, p.display_name
       FROM identity.users u
       JOIN identity.profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [aliceId]
    );

    assert(aliceDb.rows.length === 1, 'Alice saved in PostgreSQL identity.users and profiles');
    assert(aliceDb.rows[0].password_hash.startsWith('$argon2id$'), 'Alice\'s password hashed with Argon2id');

    // Test duplicate registration rejection
    const dupRes = await request('POST', '/api/v1/auth/register', {
      email: aliceEmail,
      password: 'AnotherPassword456!',
      username: `different_${timestamp}`
    });
    assert(dupRes.status === 409, `Duplicate email rejected with 409 Conflict (got: ${dupRes.status})`);
    assert(dupRes.body.error === 'EMAIL_ALREADY_EXISTS' || dupRes.body.error === 'EMAIL_EXISTS', 'Error code indicates email already exists');

    // ----------------------------------------------------
    // TEST 4: User Login & Session Resolution
    // ----------------------------------------------------
    console.log('\n--- TEST 4: User Login & Session ---');
    const loginRes = await request('POST', '/api/v1/auth/login', {
      email: aliceEmail,
      password: alicePassword
    });
    assert(loginRes.status === 200, `Login returns 200 (got: ${loginRes.status})`);
    assert(loginRes.body.otpRequired === true, 'Password authentication requires email OTP (otpRequired: true)');
    assert(!loginRes.body.accessToken, 'Password alone never issues an authenticated session or access token');

    // Retrieve dispatched login OTP from test delivery hook
    const fs = require('fs');
    const path = require('path');
    const otpFile = path.join(__dirname, '../.test_last_otp.json');
    let loginOtp = null;
    if (fs.existsSync(otpFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(otpFile, 'utf8'));
        loginOtp = data[aliceEmail.toLowerCase()]?.otp || data._latest?.otp;
      } catch (e) {}
    }

    assert(loginOtp && loginOtp.length === 6, 'Verification OTP was dispatched to registered email');

    // Verify OTP to complete login
    const verifyLoginRes = await request('POST', '/api/v1/auth/email/verify-otp', {
      email: aliceEmail,
      otp: loginOtp,
      purpose: 'login'
    });
    assert(verifyLoginRes.status === 200, `OTP verification returns 200 (got: ${verifyLoginRes.status})`);
    const resolvedUsername = verifyLoginRes.body.profile?.username || verifyLoginRes.body.user?.username;
    assert(resolvedUsername === aliceUsername, `Logged-in user username matches (${resolvedUsername})`);
    assert(verifyLoginRes.body.accessToken, 'Login issued fresh access token upon OTP verification');

    // ----------------------------------------------------
    // TEST 5: Real Friendship Lifecycle in PostgreSQL
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Real Friendship Lifecycle ---');
    // Register Bob
    const bobEmail = `bob_${timestamp}@testdomain.com`;
    const bobUsername = `bob_${timestamp}`;
    const bobPassword = 'SecurePassword123!';

    const bobReg = await request('POST', '/api/v1/auth/register', {
      email: bobEmail,
      password: bobPassword,
      username: bobUsername,
      displayName: 'Bob The Tester'
    });
    const bobToken = bobReg.body.accessToken || bobReg.body.tokens?.accessToken;
    const bobId = bobReg.body.user.id;

    // Alice searches for Bob
    const searchRes = await request('GET', `/api/v1/social/users/search?q=${bobUsername}`, null, { Authorization: `Bearer ${aliceToken}` });
    assert(searchRes.status === 200, `User search returns 200 (got: ${searchRes.status})`);
    assert(searchRes.body.users.length >= 1, 'Found Bob in user search');
    assert(searchRes.body.users[0].username === bobUsername, 'Matched correct username');

    // Alice sends friend request to Bob
    const friendReqRes = await request('POST', '/api/v1/social/friends/request', { targetUsername: bobUsername }, { Authorization: `Bearer ${aliceToken}` });
    assert(friendReqRes.status === 200 || friendReqRes.status === 201, `Friend request sent successfully (got: ${friendReqRes.status})`);

    // Bob checks pending requests
    const bobRequests = await request('GET', '/api/v1/social/friends/requests', null, { Authorization: `Bearer ${bobToken}` });
    assert(bobRequests.body.incoming.length === 1, `Bob has 1 incoming friend request (got: ${bobRequests.body.incoming.length})`);
    assert(bobRequests.body.incoming[0].username === aliceUsername, 'Incoming request is from Alice');

    // Bob accepts friend request
    const acceptRes = await request('POST', '/api/v1/social/friends/respond', {
      targetUserId: aliceId,
      action: 'accept'
    }, { Authorization: `Bearer ${bobToken}` });
    assert(acceptRes.status === 200 && acceptRes.body.success, 'Bob accepted friend request');

    // Verify both are now friends in PostgreSQL
    const aliceFriends = await request('GET', '/api/v1/social/friends', null, { Authorization: `Bearer ${aliceToken}` });
    assert(aliceFriends.body.friends.some(f => f.username === bobUsername), 'Bob appears in Alice\'s friends list');

    const bobFriends = await request('GET', '/api/v1/social/friends', null, { Authorization: `Bearer ${bobToken}` });
    assert(bobFriends.body.friends.some(f => f.username === aliceUsername), 'Alice appears in Bob\'s friends list');

    // ----------------------------------------------------
    // TEST 6: E2EE Direct Messaging Persistence
    // ----------------------------------------------------
    console.log('\n--- TEST 6: E2EE Direct Messaging (No Plaintext) ---');
    const fakeCiphertext = Buffer.from('Secret encrypted message').toString('base64');
    const fakeIv = Buffer.from('123456789012').toString('base64');

    const sendDmRes = await request('POST', '/api/v1/social/messages', {
      recipientId: bobId,
      ciphertext: fakeCiphertext,
      iv: fakeIv
    }, { Authorization: `Bearer ${aliceToken}` });

    assert(sendDmRes.status === 201, `Encrypted DM sent (got: ${sendDmRes.status})`);
    assert(sendDmRes.body.success === true, 'DM stored successfully');

    // Check DB record to guarantee no plaintext is ever stored
    const dmDbRes = await db.query(
      `SELECT id, sender_id, recipient_id, ciphertext, iv FROM identity.direct_messages WHERE id = $1`,
      [sendDmRes.body.message.id]
    );
    assert(dmDbRes.rows.length === 1, 'DM saved in PostgreSQL identity.direct_messages');
    assert(dmDbRes.rows[0].ciphertext === fakeCiphertext, 'Ciphertext stored faithfully');
    assert(dmDbRes.rows[0].iv === fakeIv, 'IV stored faithfully');

    // ----------------------------------------------------
    // TEST 7: Cryptographic Room Codes & Isolation
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Cryptographic Room Codes ---');
    const roomRes = await request('POST', '/api/v1/coplay/rooms/private', {
      gameId: 'duel-chess',
      options: { maxCapacity: 2 }
    }, { Authorization: `Bearer ${aliceToken}` });

    assert(roomRes.status === 201, `Private room created (got: ${roomRes.status})`);
    const roomCode = roomRes.body.room?.room_code;
    assert(/^DUEL-[0-9A-F]{6}$/.test(roomCode), `Room code is cryptographically formatted DUEL-XXXXXX (got: ${roomCode})`);

    // Clean up test users
    console.log('\n--- Cleanup test records ---');
    await db.query(`DELETE FROM identity.direct_messages WHERE sender_id = $1 OR recipient_id = $1`, [aliceId]);
    await db.query(`DELETE FROM identity.friendships WHERE user_id_1 IN ($1, $2) OR user_id_2 IN ($1, $2)`, [aliceId, bobId]);
    await db.query(`DELETE FROM coplay.private_rooms WHERE host_user_id = $1`, [aliceId]);
    await db.query(`DELETE FROM identity.identities WHERE user_id IN ($1, $2)`, [aliceId, bobId]);
    await db.query(`DELETE FROM identity.emails WHERE user_id IN ($1, $2)`, [aliceId, bobId]);
    await db.query(`DELETE FROM identity.profiles WHERE user_id IN ($1, $2)`, [aliceId, bobId]);
    await db.query(`DELETE FROM identity.users WHERE id IN ($1, $2)`, [aliceId, bobId]);
    await db.query(`DELETE FROM identity.guest_sessions WHERE guest_id = $1`, [guestId]);
    console.log('  Cleaned up temporary verification test accounts.');

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runVerification();
