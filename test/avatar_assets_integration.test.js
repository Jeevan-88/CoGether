const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Verify ProfileService sanitization
const { profileService } = require('../services/identity/profileService');

console.log('=== [1/4] TESTING PROFILE SERVICE AVATAR SANITIZATION ===');
const testConfig = {
  headId: 'head-base-01',
  skinToneId: 'skin-01-porcelain',
  eyesId: 'eyes-05-sparkle-wide',
  hairId: 'hair-01-short-messy',
  hairColorId: 'hair-color-charcoal',
  clothingId: 'clothing-01-chibi-crew-tee',
  clothingColorId: 'cloth-color-crimson',
  eyewearId: null,
  accessoryIds: [],
  effectsIds: [],
  backgroundId: 'bg-01-obsidian'
};

const sanitized = profileService.sanitizeAvatarConfig(testConfig);
assert.strictEqual(sanitized.headId, 'head-base-01');
assert.strictEqual(sanitized.skinToneId, 'skin-01-porcelain');
assert.strictEqual(sanitized.eyesId, 'eyes-05-sparkle-wide');
assert.strictEqual(sanitized.hairId, 'hair-01-short-messy');
assert.strictEqual(sanitized.clothingId, 'clothing-01-chibi-crew-tee');
assert.deepStrictEqual(sanitized.accessoryIds, []);
assert.deepStrictEqual(sanitized.effectsIds, []);
assert.strictEqual(sanitized.backgroundId, 'bg-01-obsidian');
console.log('✓ ProfileService successfully sanitizes and preserves avatar config!');

console.log('\n=== [2/4] TESTING RESTORED MANIFEST CATEGORIES & ASSET COMPATIBILITY ===');
const manifestPath = path.join(__dirname, '../client/public/assets/avatars/cogether/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Verified counts for the restored consistent set
assert.strictEqual(manifest.categories.heads.length, 27, 'Expected 27 approved head variations');
assert.strictEqual(manifest.palettes.skinTones.length, 9, 'Expected 9 skin tones');
assert.strictEqual(manifest.categories.eyes.length, 6, 'Expected 6 original eye pairs');
assert.strictEqual(manifest.categories.hair.length, 6, 'Expected 6 original hairstyles');
assert.strictEqual(manifest.categories.clothing.length, 2, 'Expected 2 compatible chibi garments');
assert.strictEqual(manifest.categories.eyewear.length, 0, 'Expected eyewear to be empty (archived to experimental)');
assert.strictEqual(manifest.categories.accessories.length, 0, 'Expected accessories to be empty (archived to experimental)');
assert.strictEqual(manifest.categories.effects.length, 0, 'Expected effects to be empty (archived to experimental)');
console.log('✓ All categories verified with clean, compatible, non-mismatched asset counts!');

console.log('\n=== [3/4] TESTING SOURCE SHEETS INTEGRITY ===');
assert.strictEqual(manifest.sourceSheets.length, 7, 'Expected exactly 7 original approved source sheets in manifest');
for (const sheet of manifest.sourceSheets) {
  const sheetPath = path.join(__dirname, '../client/public', sheet.url);
  assert(fs.existsSync(sheetPath), `Source sheet does not exist: ${sheetPath}`);
  const stats = fs.statSync(sheetPath);
  assert(stats.size > 1000, `Source sheet is unusually small: ${sheetPath}`);
  console.log(`✓ Source sheet "${sheet.id}" verified (${stats.size} bytes).`);
}

console.log('\n=== [4/4] TESTING LAYER STACKING ORDER LOGIC ===');
const expectedOrder = [
  'background',
  'hairBack',
  'baseBody',
  'clothing',
  'head',
  'eyes',
  'hairFront',
  'eyewear',
  'accessories',
  'effects'
];
assert.deepStrictEqual(manifest.layerOrder, expectedOrder, 'manifest.layerOrder must match the canonical 10-layer order');
console.log('✓ Verified render stack order: ' + expectedOrder.join(' -> '));

console.log('\n🎉 ALL AVATAR RESTORATION INTEGRATION TESTS PASSED!');
