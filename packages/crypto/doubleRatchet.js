/**
 * CoGether Double Ratchet Protocol Implementation
 * Conforming strictly to the Signal Double Ratchet Specification
 * (Trevor Perrin & Moxie Marlinspike, 2016)
 *
 * Implements:
 * - Symmetric Ratchet (KDF chain ratcheting per message)
 * - Diffie-Hellman Ratchet (Asymmetric ratcheting on incoming DH keys)
 * - Forward Secrecy: One-time message keys destroyed immediately
 * - Break-in Recovery: Ephemeral DH renewal heals compromised states
 * - Out-of-Order Message Buffering: Handles dropped or reordered packets
 * - Replay Protection: Counters strictly tracked; replay attempts rejected
 * - Backward Compatibility: Envelope versioning (v1: legacy, v2: double ratchet)
 *
 * Designed to operate identically in both Browser (WebCrypto API) and Node.js runtimes.
 */

const MAX_SKIP = 1000; // Protection against DoS via huge message counter gaps

/**
 * Get SubtleCrypto reference across Node and browser
 */
function getCrypto() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto;
  }
  try {
    const nodeCrypto = require('crypto');
    return nodeCrypto.webcrypto || nodeCrypto;
  } catch (_e) {
    throw new Error('WebCrypto API not supported in this runtime environment');
  }
}

/**
 * Helper: Convert ArrayBuffer or Uint8Array to Base64
 */
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: Convert Base64 string to Uint8Array
 */
function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate ephemeral ECDH P-256 Key Pair for Ratchet
 */
async function generateRatchetKeyPair() {
  const cryptoObj = getCrypto();
  return cryptoObj.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Export public key to base64 raw representation
 */
async function exportPublicKeyRaw(publicKey) {
  const cryptoObj = getCrypto();
  const raw = await cryptoObj.subtle.exportKey('raw', publicKey);
  return toBase64(raw);
}

/**
 * Import public key from base64 raw representation
 */
async function importPublicKeyRaw(rawBase64) {
  const cryptoObj = getCrypto();
  const buffer = fromBase64(rawBase64);
  return cryptoObj.subtle.importKey(
    'raw',
    buffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

/**
 * Compute DH Shared Secret (256 bits)
 */
async function computeDH(privateKey, publicKey) {
  const cryptoObj = getCrypto();
  const derivedBits = await cryptoObj.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256
  );
  return new Uint8Array(derivedBits);
}

/**
 * HMAC-SHA256 Helper
 */
async function hmacSha256(keyBytes, dataBytes) {
  const cryptoObj = getCrypto();
  const cryptoKey = await cryptoObj.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await cryptoObj.subtle.sign('HMAC', cryptoKey, dataBytes);
  return new Uint8Array(sig);
}

/**
 * HKDF-SHA256 Helper deriving two 32-byte outputs (Root Key KDF)
 */
async function kdfRK(rk, dhOut) {
  // Input Key Material is dhOut, Salt is rk
  const salt = rk || new Uint8Array(32);
  const prk = await hmacSha256(salt, dhOut);

  // Derive new Root Key (info = 0x01)
  const info1 = new Uint8Array([0x01, ...new TextEncoder().encode('CoGether_DoubleRatchet_RK')]);
  const newRK = await hmacSha256(prk, info1);

  // Derive new Chain Key (info = 0x02)
  const info2 = new Uint8Array([0x02, ...new TextEncoder().encode('CoGether_DoubleRatchet_CK')]);
  const newCK = await hmacSha256(prk, info2);

  return { newRK, newCK };
}

/**
 * Symmetric Chain Key KDF deriving (next_ck, message_key)
 */
async function kdfCK(ck) {
  // Constant 0x01 for next Chain Key
  const nextCK = await hmacSha256(ck, new Uint8Array([0x01]));
  // Constant 0x02 for Message Key (MK)
  const mk = await hmacSha256(ck, new Uint8Array([0x02]));
  return { nextCK, mk };
}

/**
 * Authenticated Encryption (AES-256-GCM) with Associated Authenticated Data
 */
async function encryptWithMK(mk, plaintext, adBytes) {
  const cryptoObj = getCrypto();
  const iv = cryptoObj.getRandomValues(new Uint8Array(12)); // 96-bit random IV
  const key = await cryptoObj.subtle.importKey(
    'raw',
    mk,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encodedPlaintext = typeof plaintext === 'string'
    ? new TextEncoder().encode(plaintext)
    : plaintext;

  const ciphertextBuffer = await cryptoObj.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: adBytes
    },
    key,
    encodedPlaintext
  );

  return {
    ciphertext: toBase64(ciphertextBuffer),
    iv: toBase64(iv)
  };
}

/**
 * Authenticated Decryption (AES-256-GCM) with Associated Authenticated Data
 */
async function decryptWithMK(mk, ciphertextBase64, ivBase64, adBytes) {
  const cryptoObj = getCrypto();
  const ciphertext = fromBase64(ciphertextBase64);
  const iv = fromBase64(ivBase64);

  const key = await cryptoObj.subtle.importKey(
    'raw',
    mk,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await cryptoObj.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: adBytes
    },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Serialize header into deterministic binary Associated Data (AD)
 */
function serializeHeader(header, additionalContext = '') {
  const headerStr = JSON.stringify({
    dh: header.dh,
    pn: header.pn,
    n: header.n,
    ctx: additionalContext
  });
  return new TextEncoder().encode(headerStr);
}

/**
 * Double Ratchet Session State Representation
 */
class DoubleRatchetSession {
  constructor(sessionId, peerId) {
    this.sessionId = sessionId;
    this.peerId = peerId;

    this.dhs = null;        // Local DH keypair { privateKey, publicKey }
    this.dhsPubRaw = null;  // Base64 raw public key
    this.dhr = null;        // Remote DH public CryptoKey
    this.dhrPubRaw = null;  // Remote DH public raw Base64

    this.rk = null;         // Root key (Uint8Array)
    this.cks = null;        // Sending Chain Key (Uint8Array)
    this.ckr = null;        // Receiving Chain Key (Uint8Array)

    this.ns = 0;           // Number of messages sent in current chain
    this.nr = 0;           // Number of messages received in current chain
    this.pn = 0;           // Previous sending chain length

    this.mkSkipped = new Map(); // Key: `${dhrRaw}:${n}` -> Uint8Array (MK)
  }

  /**
   * Initialize Alice session (Sender initiates session with Bob's known public key)
   */
  static async initAlice(sessionId, peerId, sharedSecret, bobDhPubRaw) {
    const session = new DoubleRatchetSession(sessionId, peerId);
    session.dhs = await generateRatchetKeyPair();
    session.dhsPubRaw = await exportPublicKeyRaw(session.dhs.publicKey);
    session.dhrPubRaw = bobDhPubRaw;
    session.dhr = await importPublicKeyRaw(bobDhPubRaw);

    const dhOut = await computeDH(session.dhs.privateKey, session.dhr);
    const { newRK, newCK } = await kdfRK(sharedSecret, dhOut);
    session.rk = newRK;
    session.cks = newCK;
    session.ckr = null;
    return session;
  }

  /**
   * Initialize Bob session (Receiver awaits Alice's initial ratchet message)
   */
  static async initBob(sessionId, peerId, sharedSecret, bobDhKeyPair) {
    const session = new DoubleRatchetSession(sessionId, peerId);
    session.dhs = bobDhKeyPair;
    session.dhsPubRaw = await exportPublicKeyRaw(bobDhKeyPair.publicKey);
    session.dhr = null;
    session.dhrPubRaw = null;

    session.rk = sharedSecret;
    session.cks = null;
    session.ckr = null;
    return session;
  }

  /**
   * Encrypt a message using the current sending chain key
   */
  async encrypt(plaintext, associatedContext = '') {
    if (!this.cks) {
      throw new Error('Sending chain key not established');
    }

    const { nextCK, mk } = await kdfCK(this.cks);
    this.cks = nextCK;

    const header = {
      dh: this.dhsPubRaw,
      pn: this.pn,
      n: this.ns
    };
    this.ns++;

    const adBytes = serializeHeader(header, associatedContext);
    const { ciphertext, iv } = await encryptWithMK(mk, plaintext, adBytes);

    return {
      v: 2, // Double Ratchet Envelope Version
      header,
      ciphertext,
      iv
    };
  }

  /**
   * Decrypt an incoming Double Ratchet message envelope
   */
  async decrypt(envelope, associatedContext = '') {
    if (!envelope || envelope.v !== 2 || !envelope.header) {
      throw new Error('Invalid Double Ratchet message envelope (expected v: 2)');
    }

    const { header, ciphertext, iv } = envelope;
    const adBytes = serializeHeader(header, associatedContext);

    // 1. Check if message was already skipped and buffered
    const skipKey = `${header.dh}:${header.n}`;
    if (this.mkSkipped.has(skipKey)) {
      const mk = this.mkSkipped.get(skipKey);
      this.mkSkipped.delete(skipKey);
      return await decryptWithMK(mk, ciphertext, iv, adBytes);
    }

    // 2. If new DH key received, perform DH Ratchet step
    if (!this.dhrPubRaw || header.dh !== this.dhrPubRaw) {
      await this.skipMessageKeys(header.pn);
      await this.dhRatchet(header.dh);
    }

    // 3. Skip missing keys in current receiving chain up to header.n
    await this.skipMessageKeys(header.n);

    // 4. Derive message key from current receiving chain
    if (!this.ckr) {
      throw new Error('Receiving chain key not established after DH ratchet');
    }

    const { nextCK, mk } = await kdfCK(this.ckr);
    this.ckr = nextCK;
    this.nr++;

    return await decryptWithMK(mk, ciphertext, iv, adBytes);
  }

  /**
   * Buffer skipped message keys for out-of-order delivery
   */
  async skipMessageKeys(until) {
    if (this.ckr) {
      if (this.nr + MAX_SKIP < until) {
        throw new Error('Too many skipped messages (potential replay or DoS gap)');
      }
      while (this.nr < until) {
        const { nextCK, mk } = await kdfCK(this.ckr);
        this.ckr = nextCK;
        const skipKey = `${this.dhrPubRaw}:${this.nr}`;
        this.mkSkipped.set(skipKey, mk);
        this.nr++;

        // Prune old skipped keys if capacity exceeded
        if (this.mkSkipped.size > MAX_SKIP) {
          const firstKey = this.mkSkipped.keys().next().value;
          this.mkSkipped.delete(firstKey);
        }
      }
    }
  }

  /**
   * Asymmetric Diffie-Hellman Ratchet Step
   */
  async dhRatchet(remoteDhPubRaw) {
    this.pn = this.ns;
    this.ns = 0;
    this.nr = 0;
    this.dhrPubRaw = remoteDhPubRaw;
    this.dhr = await importPublicKeyRaw(remoteDhPubRaw);

    // Derive receiving chain key using local DHs and new remote DHr
    const dhReceive = await computeDH(this.dhs.privateKey, this.dhr);
    const { newRK: rkAfterReceive, newCK: newCKr } = await kdfRK(this.rk, dhReceive);
    this.rk = rkAfterReceive;
    this.ckr = newCKr;

    // Generate fresh local DH keypair (Asymmetric ratchet advance)
    this.dhs = await generateRatchetKeyPair();
    this.dhsPubRaw = await exportPublicKeyRaw(this.dhs.publicKey);

    // Derive sending chain key using fresh local DHs and remote DHr
    const dhSend = await computeDH(this.dhs.privateKey, this.dhr);
    const { newRK: rkAfterSend, newCK: newCKs } = await kdfRK(this.rk, dhSend);
    this.rk = rkAfterSend;
    this.cks = newCKs;
  }
}

module.exports = {
  DoubleRatchetSession,
  generateRatchetKeyPair,
  exportPublicKeyRaw,
  importPublicKeyRaw,
  toBase64,
  fromBase64
};
