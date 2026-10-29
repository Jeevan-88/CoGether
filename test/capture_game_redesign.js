const { chromium } = require('playwright');
const path = require('path');
const { db } = require('../packages/database');
const { signToken, createSession } = require('../packages/auth');

const ARTIFACT_DIR = 'C:\\Users\\Jeevan Yadav\\.gemini\\antigravity\\brain\\ffb913c9-9fef-48d8-a847-5ecdea42d885';
const APP_URL = 'http://localhost:5173';

(async () => {
  console.log('🎮 Starting CoPlay Redesign Visual Capture & Verification...');
  const browser = await chromium.launch({ headless: true });

  try {
    const userRes = await db.query(
      `SELECT u.id, u.email, u.display_name, p.username, p.avatar_config
       FROM identity.users u
       LEFT JOIN identity.profiles p ON u.id = p.user_id
       WHERE u.email = 'jeevanyadav2008@gmail.com'
       LIMIT 1`
    );

    const testUser = userRes.rows[0];
    console.log(`👤 Verified User: ${testUser.email} (@${testUser.username})`);

    const session = await createSession(testUser.id, { userAgent: 'Playwright-Game-Capture' });
    const accessToken = signToken({
      sub: testUser.id,
      email: testUser.email,
      sessionId: session.sessionId,
      role: 'member'
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });

    const page = await context.newPage();

    // 1. Seed auth tokens in localStorage before navigation
    await page.addInitScript(({ token, refreshToken }) => {
      localStorage.setItem('cogether_access_token', token);
      localStorage.setItem('cogether_refresh_token', refreshToken);
    }, { token: accessToken, refreshToken: session.refreshToken });

    // 2. Navigate directly to CoPlay games using domcontentloaded
    console.log('⏳ Navigating directly into CoPlay with game 2048...');
    await page.goto(`${APP_URL}/?mode=coplay&room=duel-3852&challenge=2048`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // 3. Verify AppNavShell is rendered
    const appNavShell = page.locator('.cogether-app-nav-shell');
    await appNavShell.waitFor({ state: 'visible', timeout: 8000 });
    console.log('  ✅ AppNavShell is visible at top');

    // 4. Verify GameHeader is rendered
    const gameHeader = page.locator('.game-header-bar');
    await gameHeader.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ GameHeader is visible');

    // 5. Verify 2048 stage / frame is rendered
    const gameStage = page.locator('.game-viewport-stage, .dark-game-frame');
    await gameStage.first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ GameViewport stage is active');

    // 6. Verify Floating Meta Dock is rendered
    const metaDock = page.locator('.game-floating-meta-dock');
    await metaDock.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Floating Game Meta Dock is visible');

    // 7. Verify Right Social Rail is rendered
    const socialRail = page.locator('.game-social-rail, .game-social-rail-target');
    await socialRail.first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ GameSocialRail is visible on the right');

    // Verify Party Room card inside Social Rail
    const partyCard = page.locator('.party-room-panel');
    await partyCard.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Party Room card is active');

    // Verify Chat panel inside Social Rail
    const chatPanel = page.locator('.party-chat-panel');
    await chatPanel.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Chat panel is active');

    // Wait for 2048 iframe to load completely
    await page.waitForTimeout(2500);

    // 8. Capture the complete redesigned game screen
    const screenshotPath = path.join(ARTIFACT_DIR, 'coplay_redesign_verification.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: false
    });
    console.log(`  📸 Saved redesign screenshot to: ${screenshotPath}`);

    // 9. Test Challenge Friend Modal
    console.log('⏳ Testing Challenge Friend button...');
    const challengeBtn = page.locator('.game-header-challenge-btn');
    await challengeBtn.click();
    await page.waitForTimeout(600);

    const friendModal = page.locator('.friend-modal-card');
    await friendModal.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Challenge Friend modal opened successfully');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'coplay_challenge_modal_verification.png'),
      fullPage: false
    });
    console.log('  📸 Saved challenge modal screenshot');

    const closeFriendModal = page.locator('.friend-modal-card .btn-modal-close');
    await closeFriendModal.click();
    await page.waitForTimeout(400);

    // 10. Test Leaderboard button in docked pill
    console.log('⏳ Testing Leaderboard button in floating dock...');
    const leaderboardBtn = page.locator('.game-floating-meta-dock button[title="Leaderboard & Stats"]');
    await leaderboardBtn.click();
    await page.waitForTimeout(600);

    const leaderboardModal = page.locator('.leaderboard-modal-card');
    await leaderboardModal.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Leaderboard modal opened successfully');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'coplay_leaderboard_modal_verification.png'),
      fullPage: false
    });
    console.log('  📸 Saved leaderboard modal screenshot');

    console.log('\n======================================================');
    console.log('🎉 ALL VISUAL VERIFICATIONS & SCREENSHOTS COMPLETED!');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Capture failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
