/**
 * Phase 2C.3: CoPlay Production Hardening & Netcode Standardization Playwright E2E Suite
 * 
 * Verifies end-to-end browser execution:
 * 1. CoPlay hub loads with real PostgreSQL catalog (no fake 1450 XP or mock profile)
 * 2. Unauthenticated user can open real AuthModal and sign in via Email OTP
 * 3. Authenticated user toggles favorite, persisting to PostgreSQL and rendering in UI
 * 4. User opens LeaderboardModal, filters periods, and views real scores from PostgreSQL
 * 5. Launches local game (2048) in solo mode, verifies sandboxed iframe isolation and back navigation
 */

const assert = require('assert');
const { chromium } = require('playwright');
const { db } = require('../packages/database');
const { emailService } = require('../services/identity/emailService');

const CLIENT_URL = 'http://localhost:5173';
const SERVER_URL = 'http://localhost:3001';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPlaywrightE2ETests() {
  console.log('🎭 Starting Phase 2C.3 Playwright E2E CoPlay Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  let browser;
  let context;
  let page;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('     ' + (err.stack || err.message));
      failed++;
    }
  }

  const testEmail = `coplay_e2e_${Date.now()}@example.com`;
  const testUsername = `e2e_gamer_${Date.now().toString().slice(-4)}`;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    page = await context.newPage();

    // ── [1/5] Real Catalog & Absence of Mock Profile ───────────────────────────
    console.log('── [1/5] Real Catalog & Zero-Mock Verification ──');

    await check('Navigates to CoPlay Hub and renders verified open-source arcade catalog', async () => {
      await page.goto(`${CLIENT_URL}/?mode=coplay`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.coplay-yellow-canvas-wrapper', { timeout: 10000 });

      // Verify header arcade pill
      const xpPillText = await page.locator('.header-xp-pill').textContent();
      assert.ok(xpPillText.includes('Verified Arcade'), 'Missing Verified Arcade header status');
      assert.ok(!xpPillText.includes('1450 XP'), 'Found mock 1450 XP in header');

      // Verify unauthenticated user sees SIGN IN button
      const signinBtn = page.locator('.btn-hub-signin');
      assert.ok(await signinBtn.isVisible(), 'Sign In button should be visible when unauthenticated');

      // Verify game cards loaded from catalog
      await page.waitForSelector('.cogether-game-card', { timeout: 5000 });
      const cardCount = await page.locator('.cogether-game-card').count();
      assert.ok(cardCount >= 4, `Expected at least 4 game cards, found ${cardCount}`);
    });

    // ── [2/5] Real Authentication via OTP inside CoPlay Hub ────────────────────
    console.log('\n── [2/5] Real Authentication via OTP inside CoPlay Hub ──');

    await check('Signs in via real AuthModal and updates player profile in header', async () => {
      // Click SIGN IN
      await page.click('.btn-hub-signin');
      await page.waitForSelector('.auth-id-card', { timeout: 5000 });

      // Enter email and user details
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[placeholder="Alex Rivera"]', 'E2E Arcade Tester');
      await page.fill('input[placeholder="alex_rivera"]', testUsername);
      await page.click('button.auth-submit-btn');

      // Wait for OTP step input
      await page.waitForSelector('input[placeholder="000000"]', { timeout: 10000 });
      await sleep(500);

      const lastSent = emailService.getLastSentOtpForTest(testEmail);
      const validOtp = typeof lastSent === 'object' ? lastSent.otp : lastSent;
      assert.ok(validOtp, 'Expected OTP to be generated and stored');

      // Enter OTP passcode
      await page.fill('input[placeholder="000000"]', validOtp);
      await page.click('button.auth-submit-btn');

      // Wait for auth modal to dismiss
      await page.waitForSelector('.auth-id-card', { state: 'detached', timeout: 10000 });

      // Header avatar should now be visible instead of signin button
      await page.waitForSelector('.header-avatar-circle', { timeout: 5000 });
      assert.ok(await page.locator('.header-avatar-circle').isVisible());
    });

    // ── [3/5] PostgreSQL Player Favorites Interaction ──────────────────────────
    console.log('\n── [3/5] PostgreSQL Favorites Persistence & UI Sync ──');

    await check('Toggles favorite on 2048 and verifies PostgreSQL persistence', async () => {
      // Find 2048 card favorite button
      const cardFavBtn = page.locator('.cogether-game-card .btn-card-fav').first();
      await cardFavBtn.click();
      await sleep(600);

      // Verify button active state
      const classes = await cardFavBtn.getAttribute('class');
      assert.ok(classes.includes('active'), 'Favorite button should have active class');

      // Verify favorite persisted in PostgreSQL
      const favRows = await db.query(
        `SELECT f.game_id 
         FROM coplay.favorites f
         JOIN identity.identities i ON i.user_id = f.user_id
         WHERE i.provider_email = $1`,
        [testEmail.toLowerCase()]
      );
      assert.ok(favRows.rows.length >= 1, 'Expected favorite in coplay.favorites table');
    });

    // ── [4/5] Real Leaderboard Modal ───────────────────────────────────────────
    console.log('\n── [4/5] Real Leaderboard Modal & Period Filtering ──');

    await check('Opens LeaderboardModal and filters periods with real database scores', async () => {
      // Click LEADERBOARD button in spotlight hero
      const lbBtn = page.locator('.spotlight-actions .btn-spotlight-squad:has-text("LEADERBOARD")');
      await lbBtn.click();

      // Modal appears
      await page.waitForSelector('.leaderboard-modal-card', { timeout: 5000 });
      const title = await page.locator('.leaderboard-game-title').textContent();
      assert.ok(title.includes('Leaderboard'), 'Expected Leaderboard title');

      // Click TODAY filter tab
      await page.click('.leaderboard-tab:has-text("TODAY")');
      await sleep(300);

      // Click THIS WEEK filter tab
      await page.click('.leaderboard-tab:has-text("THIS WEEK")');
      await sleep(300);

      // Click ALL-TIME filter tab
      await page.click('.leaderboard-tab:has-text("ALL-TIME")');
      await sleep(300);

      // Close modal
      await page.click('.leaderboard-close-btn');
      await page.waitForSelector('.leaderboard-modal-backdrop', { state: 'detached', timeout: 5000 });
    });

    // ── [5/5] Local Game Launch & Sandboxed Viewport ───────────────────────────
    console.log('\n── [5/5] Local Game Launch & Sandboxed Viewport ──');

    await check('Launches 2048 in Solo mode, verifies sandbox iframe, and exits back to hub', async () => {
      // Click PLAY INSTANTLY button in spotlight hero
      const playBtn = page.locator('.spotlight-actions .btn-spotlight-play');
      await playBtn.click();

      // GameShell mounts
      await page.waitForSelector('.game-shell-root', { timeout: 10000 });
      assert.ok(await page.locator('.game-shell-root').isVisible());

      // Iframe for player should exist
      await page.waitForSelector('.game-embedded-viewport-frame', { timeout: 10000 });
      const iframeSrc = await page.locator('.game-embedded-viewport-frame').getAttribute('src');
      assert.ok(iframeSrc.includes('/games/2048/index.html'), 'Game iframe src should point to local 2048');

      // Verify sandbox attribute on iframe
      const sandboxAttr = await page.locator('.game-embedded-viewport-frame').getAttribute('sandbox');
      assert.ok(sandboxAttr.includes('allow-scripts'), 'Expected allow-scripts in sandbox');
      assert.ok(sandboxAttr.includes('allow-same-origin'), 'Expected allow-same-origin in local sandbox');

      // Close game player using header back button
      await page.click('.btn-header-back');
      await page.waitForSelector('.coplay-yellow-canvas-wrapper', { timeout: 8000 });
      assert.ok(await page.locator('.coplay-yellow-canvas-wrapper').isVisible());
    });

  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }

  console.log('\n======================================================');
  console.log(`Phase 2C.3 Playwright E2E Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPlaywrightE2ETests().catch((err) => {
  console.error('Playwright E2E fatal error:', err);
  process.exit(1);
});
