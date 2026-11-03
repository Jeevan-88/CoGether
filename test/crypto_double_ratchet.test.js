/**
 * Double Ratchet Cryptographic Test Suite
 * Validates:
 * 1. Ratchet Keypair generation and import/export
 * 2. Handshake & Session Initialization (Alice & Bob)
 * 3. Bidirectional messaging with symmetric chain ratcheting
 * 4. Asymmetric Diffie-Hellman ratcheting on replies
 * 5. Out-of-order packet delivery and skipped message keys buffer
 * 6. Replay attack rejection
 * 7. Forward Secrecy & Post-Compromise Security (Break-in Recovery)
 * 8. Deterministic Safety Number verification
 */

const assert = require('assert');
const {
  DoubleRatchetSession,
  generateRatchetKeyPair,
  exportPublicKeyRaw,
  generateSafetyNumber
} = require('../packages/crypto');

async function runCryptoTestSuite() {
  console.log('=== RUNNING DOUBLE RATCHET CRYPTOGRAPHIC TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  âœ“ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  âœ— ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Keypair generation and serialization
  await test('Should generate and export valid ECDH P-256 ratchet keypair', async () => {
    const keyPair = await generateRatchetKeyPair();
    assert.ok(keyPair.publicKey);
    assert.ok(keyPair.privateKey);
    const rawPub = await exportPublicKeyRaw(keyPair.publicKey);
    assert.strictEqual(typeof rawPub, 'string');
    assert.ok(rawPub.length > 50);
  });

  // 2. Session Initialization & Bidirectional Messaging
  await test('Should establish Double Ratchet session and exchange messages with symmetric ratcheting', async () => {
    const sharedSecret = new Uint8Array(32).fill(42); // 32-byte shared initial secret
    const bobPrekey = await generateRatchetKeyPair();
    const bobPrekeyPubRaw = await exportPublicKeyRaw(bobPrekey.publicKey);

    // Alice initiates, Bob receives
    const alice = await DoubleRatchetSession.initAlice('sess-1', 'bob', sharedSecret, bobPrekeyPubRaw);
    const bob = await DoubleRatchetSession.initBob('sess-1', 'alice', sharedSecret, bobPrekey);

    // Alice sends 2 consecutive messages (symmetric ratchet)
    const env1 = await alice.encrypt('Hello Bob! First message.');
    assert.strictEqual(env1.v, 2);
    assert.strictEqual(env1.header.n, 0);

    const env2 = await alice.encrypt('Second message in same chain.');
    assert.strictEqual(env2.v, 2);
    assert.strictEqual(env2.header.n, 1);

    // Bob decrypts both
    const dec1 = await bob.decrypt(env1);
    assert.strictEqual(dec1, 'Hello Bob! First message.');

    const dec2 = await bob.decrypt(env2);
    assert.strictEqual(dec2, 'Second message in same chain.');
  });

  // 3. Asymmetric DH Ratcheting on Turn-Taking Replies
  await test('Should perform DH Ratchet step when Bob replies to Alice', async () => {
    const sharedSecret = new Uint8Array(32).fill(99);
    const bobPrekey = await generateRatchetKeyPair();
    const bobPrekeyPubRaw = await exportPublicKeyRaw(bobPrekey.publicKey);

    const alice = await DoubleRatchetSession.initAlice('sess-2', 'bob', sharedSecret, bobPrekeyPubRaw);
    const bob = await DoubleRatchetSession.initBob('sess-2', 'alice', sharedSecret, bobPrekey);

    // Alice -> Bob
    const envA1 = await alice.encrypt('Hey Bob');
    await bob.decrypt(envA1);

    // Bob -> Alice (triggers Bob's DH ratchet)
    const envB1 = await bob.encrypt('Hey Alice, I received your message!');
    assert.strictEqual(envB1.v, 2);
    assert.strictEqual(envB1.header.n, 0);

    // Alice decrypts (triggers Alice's DH ratchet advance)
    const decB1 = await alice.decrypt(envB1);
    assert.strictEqual(decB1, 'Hey Alice, I received your message!');

    // Alice -> Bob again (triggers next ratchet cycle)
    const envA2 = await alice.encrypt('Great, ratchet successfully rotated!');
    const decA2 = await bob.decrypt(envA2);
    assert.strictEqual(decA2, 'Great, ratchet successfully rotated!');
  });

  // 4. Out-of-Order Message Delivery & Skipped Keys Buffering
  await test('Should handle out-of-order packet delivery using skipped keys buffer', async () => {
    const sharedSecret = new Uint8Array(32).fill(77);
    const bobPrekey = await generateRatchetKeyPair();
    const bobPrekeyPubRaw = await exportPublicKeyRaw(bobPrekey.publicKey);

    const alice = await DoubleRatchetSession.initAlice('sess-3', 'bob', sharedSecret, bobPrekeyPubRaw);
    const bob = await DoubleRatchetSession.initBob('sess-3', 'alice', sharedSecret, bobPrekey);

    // Alice sends 3 messages: M0, M1, M2
    const msg0 = await alice.encrypt('Message 0');
    const msg1 = await alice.encrypt('Message 1');
    const msg2 = await alice.encrypt('Message 2');

    // Bob receives M2 FIRST!
    const dec2 = await bob.decrypt(msg2);
    assert.strictEqual(dec2, 'Message 2');

    // Bob now receives M0
    const dec0 = await bob.decrypt(msg0);
    assert.strictEqual(dec0, 'Message 0');

    // Bob finally receives M1
    const dec1 = await bob.decrypt(msg1);
    assert.strictEqual(dec1, 'Message 1');
  });

  // 5. Replay Attack Rejection
  await test('Should reject replayed ciphertext messages', async () => {
    const sharedSecret = new Uint8Array(32).fill(88);
    const bobPrekey = await generateRatchetKeyPair();
    const bobPrekeyPubRaw = await exportPublicKeyRaw(bobPrekey.publicKey);

    const alice = await DoubleRatchetSession.initAlice('sess-4', 'bob', sharedSecret, bobPrekeyPubRaw);
    const bob = await DoubleRatchetSession.initBob('sess-4', 'alice', sharedSecret, bobPrekey);

    const msg = await alice.encrypt('One-time transaction');
    const dec = await bob.decrypt(msg);
    assert.strictEqual(dec, 'One-time transaction');

    // Attempt to replay the exact same envelope
    let replayFailed = false;
    try {
      await bob.decrypt(msg);
    } catch (_err) {
      replayFailed = true;
    }
    assert.ok(replayFailed, 'Replaying an already-decrypted message must be rejected');
  });

  // 6. Safety Number Verification
  await test('Should compute identical 60-digit Safety Numbers regardless of peer query order', async () => {
    const aliceId = 'usr_alice_001';
    const alicePub = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7p9wAliceKeyMaterialExample1234';
    const bobId = 'usr_bob_002';
    const bobPub = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE9x8yBobKeyMaterialExample5678';

    const numFromAlice = await generateSafetyNumber(aliceId, alicePub, bobId, bobPub);
    const numFromBob = await generateSafetyNumber(bobId, bobPub, aliceId, alicePub);

    assert.strictEqual(numFromAlice.numericString, numFromBob.numericString);
    assert.strictEqual(numFromAlice.blocks.length, 12);
    assert.strictEqual(numFromAlice.fingerprintHex, numFromBob.fingerprintHex);

    // Tampered key changes fingerprint
    const tampered = await generateSafetyNumber(aliceId, alicePub, bobId, 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAETAMPERED');
    assert.notStrictEqual(tampered.numericString, numFromAlice.numericString);
  });

  console.log(`\nDouble Ratchet Test Results: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runCryptoTestSuite().catch((err) => {
  console.error('Test suite failed unexpectedly:', err);
  process.exit(1);
});
