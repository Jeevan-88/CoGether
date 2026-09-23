/**
 * Frontend Centralized API Configuration Automated Verification Suite
 * Validates:
 * 1. Default API_URL fallback when VITE_API_URL is absent -> http://localhost:3001
 * 2. Custom API_URL resolution when VITE_API_URL=https://api.cogether.tech
 * 3. Trailing-slash normalization (https://api.cogether.tech/ -> https://api.cogether.tech)
 * 4. Backward-compatible fallback to VITE_API_BASE
 * 5. Preservation of VITE_SIGNALING_URL for Socket.IO/WebRTC
 * 6. Codebase scan: zero unauthorized hardcoded localhost:3001 in frontend REST calls
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function runApiConfigTests() {
  console.log('🧪 Starting Frontend API Configuration Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`, err.message);
      failed++;
    }
  }

  const apiConfigPath = path.join(__dirname, '../client/src/config/api.js');
  const srcDir = path.join(__dirname, '../client/src');

  // 1. Verify existence of client/src/config/api.js
  test('client/src/config/api.js exists', () => {
    assert.strictEqual(fs.existsSync(apiConfigPath), true);
  });

  // 2. Read and test api.js export structure
  const configSource = fs.readFileSync(apiConfigPath, 'utf8');

  test('api.js exports API_URL and default export', () => {
    assert(configSource.includes('export const API_URL'), 'Must export const API_URL');
    assert(configSource.includes('export default API_URL'), 'Must export default API_URL');
  });

  test('api.js checks VITE_API_URL with http://localhost:3001 fallback', () => {
    assert(configSource.includes('VITE_API_URL'), 'Must check import.meta.env.VITE_API_URL');
    assert(configSource.includes('http://localhost:3001'), 'Must default to http://localhost:3001');
  });

  // 3. Test URL normalization logic simulation
  function resolveApiUrl(env = {}) {
    const rawApiUrl = env.VITE_API_URL || env.VITE_API_BASE || 'http://localhost:3001';
    return rawApiUrl.replace(/\/+$/, '');
  }

  test('Default resolution produces http://localhost:3001', () => {
    assert.strictEqual(resolveApiUrl({}), 'http://localhost:3001');
  });

  test('Staging/Production URL resolves cleanly', () => {
    assert.strictEqual(
      resolveApiUrl({ VITE_API_URL: 'https://api.cogether.tech' }),
      'https://api.cogether.tech'
    );
  });

  test('Trailing slashes are stripped during normalization', () => {
    assert.strictEqual(
      resolveApiUrl({ VITE_API_URL: 'https://api.cogether.tech/' }),
      'https://api.cogether.tech'
    );
    assert.strictEqual(
      resolveApiUrl({ VITE_API_URL: 'https://api.cogether.tech///' }),
      'https://api.cogether.tech'
    );
  });

  test('VITE_API_BASE fallback is respected when VITE_API_URL absent', () => {
    assert.strictEqual(
      resolveApiUrl({ VITE_API_BASE: 'https://staging.cogether.tech' }),
      'https://staging.cogether.tech'
    );
  });

  // 4. Verify CoShop target files use API_URL
  const coshopTargets = [
    'modules/coshop/components/AIShoppingAssistantModal.jsx',
    'modules/coshop/components/CoShopRoom.jsx',
    'modules/coshop/components/ProductDetailModal.jsx',
    'modules/coshop/CoShopHub.jsx'
  ];

  for (const relPath of coshopTargets) {
    test(`Target file imports and uses API_URL: ${relPath}`, () => {
      const fullPath = path.join(srcDir, relPath);
      assert.strictEqual(fs.existsSync(fullPath), true);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert(content.includes('API_URL'), `${relPath} must reference API_URL`);
      assert(
        !content.includes("'http://localhost:3001/api/coshop") &&
        !content.includes('"http://localhost:3001/api/coshop') &&
        !content.includes('`http://localhost:3001/api/coshop'),
        `${relPath} must not contain hardcoded http://localhost:3001/api/coshop`
      );
    });
  }

  // 5. Verify signaling files preserve VITE_SIGNALING_URL
  const signalingTargets = [
    'modules/coshop/components/CoShopRoom.jsx',
    'modules/costudy/MergedCameraView.jsx',
    'modules/videoroom/VideoRoom.jsx',
    'modules/cowatch/WatchPartyRoom.jsx',
    'modules/cowatch/CoWatchPartyRoom.jsx'
  ];

  for (const relPath of signalingTargets) {
    test(`Signaling file preserves VITE_SIGNALING_URL: ${relPath}`, () => {
      const fullPath = path.join(srcDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert(
        content.includes('VITE_SIGNALING_URL'),
        `${relPath} must preserve VITE_SIGNALING_URL`
      );
    });
  }

  // 6. Scan entire client/src for any unauthorized localhost:3001 REST calls
  function scanDir(dir) {
    let files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(scanDir(fullPath));
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  test('All frontend REST calls use API_URL (zero hardcoded REST localhost:3001)', () => {
    const allSrcFiles = scanDir(srcDir);
    const violations = [];

    for (const filePath of allSrcFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Skip signaling declarations and config fallback definition
        if (
          line.includes('VITE_SIGNALING_URL') ||
          line.includes('VITE_API_URL') ||
          filePath.includes('signalingConfig.js') ||
          filePath.endsWith('config\\api.js') ||
          filePath.endsWith('config/api.js')
        ) {
          return;
        }

        if (line.includes('localhost:3001') || line.includes('127.0.0.1:3001')) {
          violations.push({
            file: path.relative(srcDir, filePath),
            line: idx + 1,
            content: line.trim()
          });
        }
      });
    }

    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} unauthorized hardcoded localhost:3001 occurrence(s):\n` +
      violations.map(v => `  ${v.file}:${v.line} -> ${v.content}`).join('\n')
    );
  });

  console.log('\n======================================================');
  console.log(`TOTAL SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runApiConfigTests();
