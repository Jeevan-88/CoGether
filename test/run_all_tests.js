/**
 * CoGether Comprehensive Test Suite Runner
 * Runs all unit, integration, security, and architecture test suites sequentially.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const SUITES = [
  'test/platform_foundation.test.js',
  'test/security_auth_hardening.test.js',
  'test/coplay_friends_e2ee.test.js',
  'test/phase2a_coplay_twodevice.test.js',
  'test/phase2b_webrtc_security.test.js',
  'test/phase2c_identity_foundation.test.js',
  'test/phase2c3_coplay_hardening.test.js',
  'test/phase3_cowatch_architecture.test.js',
  'test/phase4_costudy_architecture.test.js',
  'test/phase5_production_auth_database.test.js',
  'test/authentication_strict_ui_flows.test.js'
];

console.log('═══════════════════════════════════════════════════════════');
console.log('🚀 Running CoGether Comprehensive Test Suites');
console.log(`📁 Test Directory: ${path.join(ROOT_DIR, 'test')}`);
console.log(`🧪 Total Suites to Run: ${SUITES.length}`);
console.log('═══════════════════════════════════════════════════════════\n');

let failedSuites = [];

for (const suite of SUITES) {
  console.log(`\n▶ [RUNNING]: ${suite}`);
  const startTime = Date.now();
  const result = spawnSync(process.execPath, [path.join(ROOT_DIR, suite)], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: process.env
  });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  if (result.status !== 0) {
    console.error(`\n❌ [FAILED]: ${suite} (exited with code ${result.status}, ${elapsed}s)`);
    failedSuites.push(suite);
  } else {
    console.log(`\n✅ [PASSED]: ${suite} (${elapsed}s)`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('📊 Test Execution Summary');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Total Suites:  ${SUITES.length}`);
console.log(`Passed Suites: ${SUITES.length - failedSuites.length}`);
console.log(`Failed Suites: ${failedSuites.length}`);

if (failedSuites.length > 0) {
  console.error('\nFailed Suites:');
  failedSuites.forEach((s) => console.error(`  - ${s}`));
  process.exit(1);
} else {
  console.log('\n🎉 ALL TEST SUITES PASSED CLEANLY (100% SUCCESS)!');
  process.exit(0);
}
