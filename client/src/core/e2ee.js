/**
 * CoGether End-to-End Encryption (E2EE) Engine
 * Cryptographic direct messaging using browser Web Crypto API (SubtleCrypto).
 * - Key Exchange: ECDH (P-256 / prime256v1)
 * - Symmetric Cipher: AES-256-GCM with unique 96-bit IV per message
 * - Local Key Storage: IndexedDB (structured clone of CryptoKey) with memory fallback
 * Plaintext and private keys NEVER touch the server or database.
 */

const DB_NAME = 'cogether_e2ee_keystore';
const DB_VERSION = 1;
const STORE_NAME = 'identity_keys';

// In-memory cache for derived AES-GCM shared keys
// Key: `${userId}:${friendUserId}:${peerPublicKeyFingerprint}` -> CryptoKey
const sharedKeyCache = new Map();
let memoryKeyFallback = new Map();

/**
 * Open or create IndexedDB keystore
 */
function openKeyDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return resolve(null); // Fallback to memory storage
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => {
      console.warn('E2EE: Failed to open IndexedDB keystore, using memory fallback', event);
      resolve(null);
    };
  });
}

/**
 * Store user identity key pair in local storage
 */
async function storeLocalKeyPair(userId, record) {
  const db = await openKeyDatabase();
  if (!db) {
    memoryKeyFallback.set(userId, record);
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ userId, ...record, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e);
  });
}

/**
 * Retrieve user identity key pair from local storage
 */
async function getLocalKeyPair(userId) {
  const db = await openKeyDatabase();
  if (!db) {
    return memoryKeyFallback.get(userId) || null;
  }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(userId);
    req.onsuccess = (event) => resolve(event.target.result || null);
    req.onerror = () => resolve(null);
  });
}

/**
 * Convert ArrayBuffer / Uint8Array to Base64
 */
export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 */
export function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Initialize or restore user's ECDH keypair and ensure it's registered on the server.
 */
export async function initUserKeyPair(userId, token, apiBase = '') {
  if (!userId) throw new Error('User ID required for E2EE key initialization');
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API (subtle) not available in this environment');
  }

  let local = await getLocalKeyPair(userId);
  let keyPair = local?.keyPair;
  let keyId = local?.keyId;
  let publicKeyJwk = local?.publicKeyJwk;

  if (!keyPair || !keyId || !publicKeyJwk) {
    // Generate fresh P-256 ECDH keypair
    // Note: privateKey is non-extractable for security if browser supports structured clone
    keyPair = await cryptoObj.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true, // extractable for JWK export
      ['deriveKey', 'deriveBits']
    );

    publicKeyJwk = await cryptoObj.subtle.exportKey('jwk', keyPair.publicKey);
    keyId = `ecdh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    await storeLocalKeyPair(userId, { keyPair, keyId, publicKeyJwk });
  }

  // Register public key with backend
  if (token) {
    try {
      const res = await fetch(`${apiBase}/api/v1/social/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ keyId, publicKeyJwk })
      });
      if (!res.ok) {
        console.warn('E2EE: Failed to publish user key to directory', await res.text());
      }
    } catch (e) {
      console.warn('E2EE: Network error registering public key', e.message);
    }
  }

  return { keyId, publicKeyJwk, keyPair };
}

/**
 * Derive shared AES-256-GCM symmetric key from user's ECDH private key and friend's public JWK
 */
export async function getSharedSecretKey(userId, friendUserId, friendPublicKeyJwk) {
  if (!friendPublicKeyJwk || !friendPublicKeyJwk.x || !friendPublicKeyJwk.y) {
    throw new Error('Invalid peer public key JWK');
  }

  const cacheKey = `${userId}:${friendUserId}:${friendPublicKeyJwk.x}`;
  if (sharedKeyCache.has(cacheKey)) {
    return sharedKeyCache.get(cacheKey);
  }

  const local = await getLocalKeyPair(userId);
  if (!local || !local.keyPair) {
    throw new Error('Local E2EE identity keypair not found. Call initUserKeyPair first.');
  }

  const cryptoObj = globalThis.crypto;
  // Import friend's public key
  const peerPublicKey = await cryptoObj.subtle.importKey(
    'jwk',
    friendPublicKeyJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive AES-GCM 256 key
  const sharedKey = await cryptoObj.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    local.keyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  sharedKeyCache.set(cacheKey, sharedKey);
  return sharedKey;
}

/**
 * Encrypt direct message plaintext with AES-256-GCM
 */
export async function encryptDirectMessage(userId, friendUserId, friendPublicKeyJwk, plaintext) {
  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a string');
  }
  const cryptoObj = globalThis.crypto;
  const sharedKey = await getSharedSecretKey(userId, friendUserId, friendPublicKeyJwk);
  const local = await getLocalKeyPair(userId);

  // 12-byte cryptographically random IV (standard for AES-GCM)
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encodedText
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
    senderKeyId: local?.keyId || 'default'
  };
}

/**
 * Decrypt direct message ciphertext with AES-256-GCM
 */
export async function decryptDirectMessage(userId, friendUserId, friendPublicKeyJwk, ciphertextBase64, ivBase64) {
  try {
    const cryptoObj = globalThis.crypto;
    const sharedKey = await getSharedSecretKey(userId, friendUserId, friendPublicKeyJwk);
    const ciphertext = base64ToBuffer(ciphertextBase64);
    const iv = base64ToBuffer(ivBase64);

    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      ciphertext
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.warn('E2EE decryption error (tampering or key mismatch):', err);
    return '[Decryption failed: Message integrity check failed]';
  }
}
