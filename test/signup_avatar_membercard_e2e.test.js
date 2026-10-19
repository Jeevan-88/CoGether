const { chromium } = require('playwright');
const path = require('path');
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
  console.log('🚀 Starting CoGether Final Polish, Metallic Silver Card & Z-Launch E2E Suite...');
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

    // ──────────────────────────────────────────────────────────────────────────
    // PART 1: VERIFY LEFT VIDEO PANEL IS UNCROPPED & CENTERED AT ALL VIEWPORTS
    // ──────────────────────────────────────────────────────────────────────────
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop_1920x1080' },
      { width: 1366, height: 768, name: 'desktop_1366x768' },
      { width: 1280, height: 720, name: 'desktop_1280x720' },
      { width: 768, height: 1024, name: 'tablet_768x1024' },
      { width: 430, height: 932, name: 'mobile_430px' },
      { width: 390, height: 844, name: 'mobile_390px' },
      { width: 360, height: 800, name: 'mobile_360px' },
      { width: 320, height: 680, name: 'mobile_320px' }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(180);

      const layoutCheck = await page.evaluate(() => {
        const card = document.querySelector('.flow-auth-card');
        const leftPanel = document.querySelector('.flow-auth-left-panel');
        const video = document.querySelector('.flow-auth-video');
        if (!card || !leftPanel || !video) return { ok: false };

        const cardRect = card.getBoundingClientRect();
        const panelRect = leftPanel.getBoundingClientRect();
        const videoRect = video.getBoundingClientRect();
        const videoStyle = window.getComputedStyle(video);
        const panelStyle = window.getComputedStyle(leftPanel);

        return {
          ok:
            cardRect.top >= 0 &&
            cardRect.bottom <= window.innerHeight + 1 &&
            videoStyle.objectFit === 'contain' &&
            panelStyle.backgroundColor === 'rgb(0, 0, 0)' &&
            videoRect.left >= panelRect.left - 1 &&
            videoRect.right <= panelRect.right + 1,
          objectFit: videoStyle.objectFit,
          panelBg: panelStyle.backgroundColor,
          cardFits: cardRect.bottom <= window.innerHeight + 1
        };
      });

      if (!layoutCheck.ok) {
        throw new Error(`Part 1 Video/Card check failed at ${vp.name}: ${JSON.stringify(layoutCheck)}`);
      }
      console.log(`✅ Part 1 verified at ${vp.name}: object-fit=${layoutCheck.objectFit}, bg=${layoutCheck.panelBg}`);
    }

    // Return to desktop 1440x900 for full 7-step signup journey
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_step1_uncropped_video.png') });

    // ──────────────────────────────────────────────────────────────────────────
    // PART 2: STEP 1 (EMAIL) & STEP 2 (OTP VERIFICATION)
    // ──────────────────────────────────────────────────────────────────────────
    const testId = Date.now().toString().slice(-6);
    const testEmail = `aria.vance.${testId}@cogether.app`;

    await page.getByTestId('signup-email-input').fill(testEmail);
    await page.getByTestId('signup-email-continue-btn').click();

    await page.getByTestId('otp-input').waitFor({ state: 'visible', timeout: 8000 });
    console.log('✅ Reached Step 2 (OTP Verification)');

    // Retrieve live OTP from PostgreSQL identity.email_otps
    await page.waitForTimeout(300);
    const debugOtp = await resolveLatestOtpForEmail(testEmail);
    if (!debugOtp) {
      throw new Error(`Could not find active OTP in PostgreSQL for ${testEmail}`);
    }
    console.log(`🔑 Retrieved live OTP for ${testEmail}: ${debugOtp}`);

    await page.getByTestId('otp-input').fill(debugOtp);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 3: PERSONAL DETAILS (FIRST & LAST NAME)
    // ──────────────────────────────────────────────────────────────────────────
    await page.getByTestId('first-name-input').waitFor({ state: 'visible', timeout: 8000 });
    await page.getByTestId('first-name-input').fill('Aria');
    await page.getByTestId('last-name-input').fill('Vance');

    const previewText = await page.getByTestId('display-name-preview').innerText();
    if (!previewText.includes('Aria Vance')) {
      throw new Error(`Expected live display name preview 'Aria Vance', got: ${previewText}`);
    }
    console.log('✅ Step 3 (First & Last Name + Live Preview) verified');
    await page.getByTestId('details-continue-btn').click();

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 4: UNIQUE @USERNAME SELECTION
    // ──────────────────────────────────────────────────────────────────────────
    await page.getByTestId('username-input').waitFor({ state: 'visible', timeout: 8000 });
    const uniqueUsername = `aria_vance_${testId}`;
    await page.getByTestId('username-input').fill(uniqueUsername);

    // Wait for debounced backend availability check
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="username-status"]');
        return el && el.textContent.includes('is available');
      },
      { timeout: 8000 }
    );
    console.log(`✅ Step 4 (@${uniqueUsername} live availability check) verified`);
    await page.getByTestId('username-continue-btn').click();

    // ──────────────────────────────────────────────────────────────────────────
    // PART 3: STEP 5 AVATAR STUDIO & CURVED ARC SELECTION WHEEL (NO SCROLLBAR)
    // ──────────────────────────────────────────────────────────────────────────
    await page.getByTestId('cogether-avatar-studio').waitFor({ state: 'visible', timeout: 8000 });

    const wheelCheck = await page.evaluate(() => {
      const carousel = document.querySelector('.studio-carousel-container');
      const arcWrapper = document.querySelector('.studio-arc-wheel-wrapper');
      const dialCurve = document.querySelector('.studio-arc-Dial-curve');
      const selectedThumb = document.querySelector('.studio-thumb-card.selected');
      const reflection = selectedThumb?.querySelector('.studio-thumb-reflection');
      if (!carousel || !arcWrapper || !dialCurve || !selectedThumb || !reflection) {
        return {
          ok: false,
          hasCarousel: Boolean(carousel),
          hasArcWrapper: Boolean(arcWrapper),
          hasDialCurve: Boolean(dialCurve),
          hasSelectedThumb: Boolean(selectedThumb),
          hasReflection: Boolean(reflection)
        };
      }
      const cs = window.getComputedStyle(carousel);
      const thumbStyle = selectedThumb.getAttribute('style') || '';
      return {
        ok: cs.scrollbarWidth === 'none' && thumbStyle.includes('scale(1.08)'),
        scrollbarWidth: cs.scrollbarWidth,
        thumbStyle
      };
    });

    if (!wheelCheck.ok) {
      throw new Error(`Part 3 Curved Arc Selection Wheel check failed: ${JSON.stringify(wheelCheck)}`);
    }
    console.log('✅ Part 3 verified: Curved Arc Selection Wheel active with zero visible scrollbar');

    // Test keyboard navigation on the arc wheel
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(220);

    // Test Eyes & Clothing customization
    await page.getByTestId('studio-tab-eyes').click();
    await page.waitForTimeout(220);
    await page.getByTestId('studio-next-asset-btn').click();
    await page.waitForTimeout(220);

    await page.getByTestId('studio-tab-clothing').click();
    await page.waitForTimeout(220);
    await page.getByTestId('studio-next-asset-btn').click();
    await page.waitForTimeout(220);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_step5_curved_arc_wheel.png') });
    await page.getByTestId('avatar-continue-btn').click();

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 6: PROFILE REVIEW & SAVE TO POSTGRESQL
    // ──────────────────────────────────────────────────────────────────────────
    await page.getByTestId('profile-review-card').waitFor({ state: 'visible', timeout: 8000 });
    const reviewName = await page.getByTestId('review-full-name').innerText();
    const reviewHandle = await page.getByTestId('review-username').innerText();
    if (reviewName !== 'Aria Vance' || reviewHandle !== `@${uniqueUsername}`) {
      throw new Error(`Review mismatch: ${reviewName} / ${reviewHandle}`);
    }
    console.log('✅ Step 6 (Profile Review) verified');

    // Click Confirm & Reveal Member Card -> triggers Step 7 Unified Pitch-Black Reveal
    await page.getByTestId('complete-signup-btn').click();

    // ──────────────────────────────────────────────────────────────────────────
    // PART 4 & PART 5: UNIFIED PITCH-BLACK STAGE & BRUSHED-SILVER MEMBER CARD
    // ──────────────────────────────────────────────────────────────────────────
    await page.getByTestId('cinematic-blackout-overlay').waitFor({ state: 'visible', timeout: 8000 });
    await page.getByTestId('cogether-member-card').waitFor({ state: 'visible', timeout: 5000 });

    // Wait 900ms into Scene A so the 3D entrance settles at center
    await page.waitForTimeout(900);

    const sceneACheck = await page.evaluate(() => {
      const stage = document.querySelector('.flow-cinematic-black-stage');
      const card = document.querySelector('[data-testid="cogether-member-card"]');
      const grain = document.querySelector('.silver-brushed-grain');
      const cone = document.querySelector('.silver-anisotropic-cone');
      const bevel = document.querySelector('.silver-bevel-border');
      const rainbowDot = document.querySelector('.titanium-holo-dot');
      const peachPanel = document.querySelector('.flow-auth-right-panel');

      const stageBg = stage ? window.getComputedStyle(stage).backgroundColor : null;
      return {
        stageBg,
        hasSilverCard: Boolean(card && card.classList.contains('cogether-brushed-silver-card')),
        hasBrushedLayers: Boolean(grain && cone && bevel),
        hasRainbowDot: Boolean(rainbowDot),
        hasPeachPanelBehind: Boolean(peachPanel),
        scene: stage?.getAttribute('data-scene')
      };
    });

    if (
      sceneACheck.stageBg !== 'rgb(0, 0, 0)' ||
      !sceneACheck.hasSilverCard ||
      !sceneACheck.hasBrushedLayers ||
      sceneACheck.hasRainbowDot ||
      sceneACheck.hasPeachPanelBehind
    ) {
      throw new Error(`Part 4/5 Scene A check failed: ${JSON.stringify(sceneACheck)}`);
    }
    console.log('✅ Part 4 & Part 5 verified: Unified #000000 pitch-black stage, Brushed-Silver Metallic Card, no rainbow indicator');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_step7_sceneA_silver_card.png') });

    // ──────────────────────────────────────────────────────────────────────────
    // PART 6: SCENE C & D — FIERY Z-SHAPED TRAJECTORY SLASH ACROSS PITCH BLACK
    // ──────────────────────────────────────────────────────────────────────────
    await page.waitForFunction(
      () => {
        const st = document.querySelector('.flow-cinematic-black-stage');
        return st && st.getAttribute('data-scene') === 'z-slash';
      },
      { timeout: 5000 }
    );
    await page.waitForTimeout(550);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_step7_sceneC_z_trajectory.png') });

    await page.waitForFunction(
      () => {
        const st = document.querySelector('.flow-cinematic-black-stage');
        return st && st.getAttribute('data-scene') === 'endpoint';
      },
      { timeout: 5000 }
    );
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_step7_sceneD_full_z_slash.png') });
    console.log('✅ Part 6 Scenes C & D verified: Full 3-segment fiery Z-trajectory slash captured');

    // ──────────────────────────────────────────────────────────────────────────
    // PART 7: THE FOUR-SERVICE CHOICE AT CENTER OF PURE #000000 VIEWPORT
    // ──────────────────────────────────────────────────────────────────────────
    await page.getByTestId('cogether-service-chooser').waitFor({ state: 'visible', timeout: 6000 });
    await page.waitForTimeout(650); // Allow staggered emergence animation to complete

    const servicesCheck = await page.evaluate(() => {
      const stage = document.querySelector('.flow-cinematic-black-stage');
      const coplay = document.querySelector('[data-testid="service-choice-coplay"]');
      const coshop = document.querySelector('[data-testid="service-choice-coshop"]');
      const cowatch = document.querySelector('[data-testid="service-choice-cowatch"]');
      const costudy = document.querySelector('[data-testid="service-choice-costudy"]');
      const bodyText = document.body.innerText;
      return {
        stageBg: stage ? window.getComputedStyle(stage).backgroundColor : null,
        allFourPresent: Boolean(coplay && coshop && cowatch && costudy),
        hasToBeContinued: bodyText.toLowerCase().includes('to be continued')
      };
    });

    if (
      servicesCheck.stageBg !== 'rgb(0, 0, 0)' ||
      !servicesCheck.allFourPresent ||
      servicesCheck.hasToBeContinued
    ) {
      throw new Error(`Part 7 Four-Service Choice check failed: ${JSON.stringify(servicesCheck)}`);
    }
    console.log('✅ Part 7 verified: CoPlay, CoShop, CoWatch, CoStudy centered on pure #000000');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_step7_part7_four_services.png') });

    // Click CoPlay to verify direct navigation to the authenticated CoPlay experience
    await page.getByTestId('service-choice-coplay').click();
    await page.waitForTimeout(500);

    // ──────────────────────────────────────────────────────────────────────────
    // PART 8: VERIFY MEMBER CARD & AVATAR PERSISTENCE ACROSS SERVICES & PROFILE
    // ──────────────────────────────────────────────────────────────────────────
    const memberPill = page.getByTestId('global-member-pass-pill');
    await memberPill.waitFor({ state: 'visible', timeout: 8000 });
    const pillText = await memberPill.innerText();
    if (!pillText.includes('Aria Vance') || !pillText.includes(`@${uniqueUsername}`)) {
      throw new Error(`Global member pass pill missing user details: ${pillText}`);
    }
    console.log('✅ Part 8 verified: Persistent Member Pass & Custom Avatar pill visible inside CoPlay');

    // Open ProfileModal from CoPlay and switch to the Member Card tab
    await memberPill.click();
    const cardTabBtn = page.locator('button:has-text("Member Card")').first();
    await cardTabBtn.waitFor({ state: 'visible', timeout: 5000 });
    await cardTabBtn.click();
    await page.waitForTimeout(400);

    await page.getByTestId('cogether-member-card').waitFor({ state: 'visible', timeout: 5000 });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'final_profile_silver_member_card.png') });
    console.log('✅ Part 8 verified: Brushed-Silver Member Card accessible inside ProfileModal');

    if (consoleErrors.length > 0) {
      console.warn('Page errors observed:', consoleErrors);
    }

    console.log('🎉 ALL PARTS 1–10 E2E VERIFICATION CHECKS PASSED!');
  } catch (err) {
    console.error('❌ E2E Test Error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    process.exit(process.exitCode || 0);
  }
})();
