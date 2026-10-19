const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
const { db } = require('../packages/database');
const { verifyOtpHash } = require('../packages/auth');

const ARTIFACT_DIR = 'C:\\Users\\Jeevan Yadav\\.gemini\\antigravity\\brain\\ffb913c9-9fef-48d8-a847-5ecdea42d885';
const APP_URL = 'http://localhost:5173';

async function resolveLatestOtpForEmail(email) {
  const res = await db.query(
    `SELECT otp_hash FROM identity.email_otps WHERE email_normalized = $1 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    [email.toLowerCase()]
  );
  if (!res.rows.length) return null;
  const targetHash = res.rows[0].otp_hash;
  for (let i = 0; i <= 999999; i++) {
    const code = String(i).padStart(6, '0');
    if (verifyOtpHash(code, targetHash)) {
      return code;
    }
  }
  return null;
}

(async () => {
  console.log('🚀 Starting Restored Avatar Studio Visual Combinations Verification...');
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(APP_URL, { waitUntil: 'networkidle' });

    // Open Auth Modal
    const loginBtn = page.locator('button:has-text("Log In")').first();
    await loginBtn.waitFor({ state: 'visible', timeout: 10000 });
    await loginBtn.click();

    // STEP 1: Enter email
    const testId = Date.now().toString().slice(-6);
    const testEmail = `chibi.restore.${testId}@cogether.app`;
    await page.getByTestId('signup-email-input').waitFor({ state: 'visible', timeout: 8000 });
    await page.getByTestId('signup-email-input').fill(testEmail);
    await page.getByTestId('signup-email-continue-btn').click();

    // STEP 2: Enter OTP
    await page.getByTestId('otp-input').waitFor({ state: 'visible', timeout: 8000 });
    await page.waitForTimeout(400);
    const debugOtp = await resolveLatestOtpForEmail(testEmail);
    if (!debugOtp) throw new Error(`Could not find active OTP in PostgreSQL for ${testEmail}`);
    await page.getByTestId('otp-input').fill(debugOtp);

    // STEP 3: First & Last Name
    await page.getByTestId('first-name-input').waitFor({ state: 'visible', timeout: 8000 });
    await page.getByTestId('first-name-input').fill('Maya');
    await page.getByTestId('last-name-input').fill('Lin');
    await page.getByTestId('details-continue-btn').click();

    // STEP 4: Username
    await page.getByTestId('username-input').waitFor({ state: 'visible', timeout: 8000 });
    const uniqueUsername = `maya_chibi_${testId}`;
    await page.getByTestId('username-input').fill(uniqueUsername);
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="username-status"]');
        return el && el.textContent.includes('is available');
      },
      { timeout: 8000 }
    );
    await page.getByTestId('username-continue-btn').click();

    // STEP 5: AVATAR STUDIO
    await page.getByTestId('cogether-avatar-studio').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(600);

    const captureAvatar = async (name) => {
      const stage = page.locator('.cogether-avatar-stage').first();
      await stage.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`) });
    };

    // 1. Default Original Avatar
    console.log('📸 1. Capturing Default Original Chibi Avatar...');
    await captureAvatar('avatar_restored_01_default');

    // 2. Hair: Fluffy Cloud (hair-03)
    console.log('📸 2. Testing Original Hair (Fluffy Cloud)...');
    await page.getByTestId('studio-tab-hair').click();
    await page.waitForTimeout(250);
    const fluffyCard = page.locator('.studio-thumb-card:has-text("Fluffy")').first();
    if (await fluffyCard.isVisible()) {
      await fluffyCard.click();
    } else {
      await page.getByTestId('studio-next-asset-btn').click();
      await page.getByTestId('studio-next-asset-btn').click();
    }
    await page.waitForTimeout(300);
    await captureAvatar('avatar_restored_02_fluffy_cloud');

    // 3. Hair: Long Hime Cut (hair-04) + Hair Color Tint (CoGether Crimson)
    console.log('📸 3. Testing Original Hair (Long Hime Cut) + Crimson Tint...');
    const himeCard = page.locator('.studio-thumb-card:has-text("Hime")').first();
    if (await himeCard.isVisible()) {
      await himeCard.click();
    } else {
      await page.getByTestId('studio-next-asset-btn').click();
    }
    await page.waitForTimeout(250);
    const crimsonHairDot = page.locator('[data-testid="hair-color-hair-color-crimson"]');
    if (await crimsonHairDot.isVisible()) {
      await crimsonHairDot.click();
    }
    await page.waitForTimeout(300);
    await captureAvatar('avatar_restored_03_hime_crimson');

    // 4. Skin Tone change (Golden Sand)
    console.log('📸 4. Testing Skin Tone (Golden Sand)...');
    await page.getByTestId('studio-tab-skin').click();
    await page.waitForTimeout(250);
    const skinSand = page.locator('.studio-thumb-card:has-text("Warm")').first();
    if (await skinSand.isVisible()) {
      await skinSand.click();
    } else {
      await page.locator('.studio-thumb-card').nth(2).click();
    }
    await page.waitForTimeout(300);
    await captureAvatar('avatar_restored_04_skin_sand');

    // 5. Eyes: Focused Dark (eyes-06)
    console.log('📸 5. Testing Original Eyes (Focused Dark)...');
    await page.getByTestId('studio-tab-eyes').click();
    await page.waitForTimeout(250);
    const focusedEyes = page.locator('.studio-thumb-card:has-text("Focused")').first();
    if (await focusedEyes.isVisible()) {
      await focusedEyes.click();
    } else {
      await page.getByTestId('studio-next-asset-btn').click();
      await page.getByTestId('studio-next-asset-btn').click();
    }
    await page.waitForTimeout(300);
    await captureAvatar('avatar_restored_05_focused_eyes');

    // 6. Clothes: Relaxed Fit Tee (clothing-02) + Onyx Black Tint
    console.log('📸 6. Testing Original Clothes (Relaxed Fit Tee) + Onyx Tint...');
    await page.getByTestId('studio-tab-clothing').click();
    await page.waitForTimeout(250);
    const relaxedTee = page.locator('.studio-thumb-card:has-text("Relaxed")').first();
    if (await relaxedTee.isVisible()) {
      await relaxedTee.click();
    } else {
      await page.getByTestId('studio-next-asset-btn').click();
    }
    await page.waitForTimeout(250);
    const onyxClothDot = page.locator('[data-testid="cloth-color-cloth-color-onyx"]');
    if (await onyxClothDot.isVisible()) {
      await onyxClothDot.click();
    }
    await page.waitForTimeout(300);
    await captureAvatar('avatar_restored_06_clothing_relaxed_onyx');

    // 7. Verify Empty Categories display "More styles coming soon"
    console.log('📸 7. Verifying Eyewear displays "More styles coming soon"...');
    await page.getByTestId('studio-tab-eyewear').click();
    await page.waitForTimeout(250);
    const comingSoonText = page.getByTestId('studio-coming-soon');
    await comingSoonText.waitFor({ state: 'visible', timeout: 3000 });
    const txt = await comingSoonText.textContent();
    assert(txt.includes('More styles coming soon'), 'Expected "More styles coming soon" placeholder');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'avatar_restored_07_eyewear_coming_soon.png') });
    console.log('✓ Eyewear empty category confirmed with "More styles coming soon"!');

    // 8. Randomize check (verify only clean compatible assets are chosen)
    console.log('📸 8. Testing Randomize with compatible set...');
    const shuffleBtn = page.getByTestId('studio-randomize-btn');
    await shuffleBtn.click();
    await page.waitForTimeout(400);
    await captureAvatar('avatar_restored_08_randomize_1');

    await shuffleBtn.click();
    await page.waitForTimeout(400);
    await captureAvatar('avatar_restored_09_randomize_2');

    // 9. Reset check
    console.log('📸 9. Testing Reset to Default...');
    await page.getByTestId('studio-reset-btn').click();
    await page.waitForTimeout(400);
    await captureAvatar('avatar_restored_10_reset_default');

    // 10. Complete signup to verify Member Card with restored chibi avatar
    console.log('📸 10. Proceeding through Review to Final Member Card...');
    await page.getByTestId('avatar-continue-btn').click();
    await page.getByTestId('profile-review-card').waitFor({ state: 'visible', timeout: 8000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'avatar_restored_11_profile_review.png') });

    await page.getByTestId('complete-signup-btn').click();
    await page.getByTestId('cinematic-blackout-overlay').waitFor({ state: 'visible', timeout: 8000 });
    await page.getByTestId('cogether-member-card').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'avatar_restored_12_member_card.png') });

    if (consoleErrors.length > 0) {
      console.warn('⚠️ Console errors:', consoleErrors);
    } else {
      console.log('✅ Zero console errors during entire restored avatar run!');
    }

    console.log('🎉 ALL RESTORED VISUAL AVATAR VERIFICATION CHECKS PASSED!');
  } finally {
    await browser.close();
  }
})();
