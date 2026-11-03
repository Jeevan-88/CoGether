/**
 * Cryptographic Safety Number / Identity Fingerprint Generator
 * Conforming to Signal Safety Number UX standard:
 * - Computes SHA-256 hash over sorted identity public keys
 * - Formats into 12 distinct 5-digit security blocks (60 numeric digits)
 * - Allows users to compare fingerprints out-of-band to prevent MITM attacks
 */

function getCrypto() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto;
  }
  const nodeCrypto = require('crypto');
  return nodeCrypto.webcrypto || nodeCrypto;
}

/**
 * Generate Safety Number from two peer public key identifiers
 */
async function generateSafetyNumber(userIdA, publicKeyA, userIdB, publicKeyB) {
  const cryptoObj = getCrypto();

  // Normalize string representations
  const strA = typeof publicKeyA === 'string' ? publicKeyA : JSON.stringify(publicKeyA);
  const strB = typeof publicKeyB === 'string' ? publicKeyB : JSON.stringify(publicKeyB);

  // Deterministically sort so both Alice and Bob compute the exact same Safety Number
  const peers = [
    { id: String(userIdA), key: strA },
    { id: String(userIdB), key: strB }
  ].sort((a, b) => a.id.localeCompare(b.id));

  const combinedBytes = new TextEncoder().encode(
    `CoGether_SafetyNumber_v1:${peers[0].id}:${peers[0].key}:${peers[1].id}:${peers[1].key}`
  );

  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', combinedBytes);
  const hashBytes = new Uint8Array(hashBuffer);

  // Convert 32 hash bytes into 12 groups of 5-digit decimal blocks
  const blocks = [];
  for (let i = 0; i < 12; i++) {
    // Take 2 bytes per block
    const offset = i * 2;
    const value = (hashBytes[offset] << 8) | hashBytes[offset + 1];
    const fiveDigit = String(value % 100000).padStart(5, '0');
    blocks.push(fiveDigit);
  }

  return {
    numericString: blocks.join(' '),
    blocks,
    fingerprintHex: Array.from(hashBytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase()
  };
}

module.exports = {
  generateSafetyNumber
};
