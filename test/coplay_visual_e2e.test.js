const { chromium } = require('playwright');
const path = require('path');
const { db } = require('../packages/database');
const { signToken, createSession } = require('../packages/auth');

const ARTIFACT_DIR = 'C:\\Users\\Jeevan Yadav\\.gemini\\antigravity\\brain\\ffb913c9-9fef-48d8-a847-5ecdea42d885';
const APP_URL = 'http://localhost:5173';

(async () => {
  console.log('🎮 Starting CoGether Landing Page & Authenticated Navigation E2E Suite...');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Fetch our target user
    const userRes = await db.query(
      `SELECT u.id, u.email, u.display_name, p.username, p.avatar_config
       FROM identity.users u
       LEFT JOIN identity.profiles p ON u.id = p.user_id
       WHERE u.email = 'jeevanyadav2008@gmail.com'
       LIMIT 1`
    );

    if (!userRes.rows.length) {
      throw new Error('Target user jeevanyadav2008@gmail.com not found in database');
    }

    const testUser = userRes.rows[0];
    console.log(`👤 Using user: ${testUser.email} (@${testUser.username})`);

    // Create session and access token
    const session = await createSession(testUser.id, { userAgent: 'Playwright-Nav-Verifier' });
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

    // Listen to console and page errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
    page.on('pageerror', err => {
      console.error('Browser uncaught page error:', err.message);
    });

    // Seed localStorage with access and refresh tokens
    await page.goto(`${APP_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      ({ token, refreshToken }) => {
        localStorage.setItem('cogether_access_token', token);
        localStorage.setItem('cogether_refresh_token', refreshToken);
      },
      { token: accessToken, refreshToken: session.refreshToken }
    );

    // Reload page to allow AuthContext to initialize
    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 1: CLEAN PROMOTIONAL HERO LANDING PAGE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('⏳ Test 1: Verifying clean promotional landing page...');

    // 1. Full profile modal must NOT be visible on landing page
    const profileModal = page.locator('.profile-modal-card');
    const isProfileVisible = await profileModal.isVisible().catch(() => false);
    if (isProfileVisible) {
      throw new Error('FAIL: Profile modal automatically took over screen on login!');
    }
    console.log('  ✅ Profile modal did NOT automatically take over');

    // 2. Friends modal must NOT be visible on landing page
    const friendsModal = page.locator('.social-modal-card');
    const isFriendsVisible = await friendsModal.isVisible().catch(() => false);
    if (isFriendsVisible) {
      throw new Error('FAIL: Friends modal automatically popped up on login!');
    }
    console.log('  ✅ Friends modal did NOT automatically pop up');

    // 3. Authenticated profile chip must NOT be in the hero header
    const heroProfileChip = page.locator('.navbar-container .user-nav-badge-upper-left, .navbar-container .hub-upper-left-profile-btn');
    const hasHeroProfile = await heroProfileChip.isVisible().catch(() => false);
    if (hasHeroProfile) {
      throw new Error('FAIL: Authenticated profile chip is still visible on the promotional hero landing page!');
    }
    console.log('  ✅ Profile chip correctly removed from promotional hero header');

    // 4. Friends button must NOT be in the hero header
    const heroFriendsBtn = page.locator('.navbar-container .btn-hub-friends-trigger, .navbar-container button:has-text("Friends")');
    const hasHeroFriends = await heroFriendsBtn.isVisible().catch(() => false);
    if (hasHeroFriends) {
      throw new Error('FAIL: Friends button is still visible on the promotional hero landing page!');
    }
    console.log('  ✅ Friends button correctly removed from promotional hero header');

    // 5. Hero header has clean "Launch App" button and service links
    const launchAppBtn = page.locator('.navbar-container .btn-login-rect:has-text("Launch App")');
    await launchAppBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Clean "Launch App" button present on promotional hero header');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'nav_01_clean_landing_page.png'),
      fullPage: false
    });
    console.log('  📸 Captured: nav_01_clean_landing_page.png');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 2: ENTER PRODUCT MODULE (COPLAY) & VERIFY AUTHENTICATED APP NAVIGATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('⏳ Test 2: Entering CoPlay & verifying AppNavShell...');
    await launchAppBtn.click();
    await page.waitForTimeout(1500);

    // 1. AppNavShell must be visible
    const appNavShell = page.locator('.cogether-app-nav-shell');
    await appNavShell.waitFor({ state: 'visible', timeout: 6000 });
    console.log('  ✅ AppNavShell is visible in CoPlay');

    // 2. User avatar and profile button at the top-left of the CoPlay app header
    const upperLeftProfile = page.locator('.hub-upper-left-profile-btn');
    await upperLeftProfile.waitFor({ state: 'visible', timeout: 5000 });
    const profileName = await upperLeftProfile.textContent();
    console.log(`  ✅ Top-left avatar and profile button is active: "${profileName.trim()}"`);

    // 3. Shared product navigation switcher present (Co-Play, Co-Watch, Co-Shop, Co-Study)
    const coplayTab = page.locator('.app-nav-service-pill:has-text("Co-Play")');
    const cowatchTab = page.locator('.app-nav-service-pill:has-text("Co-Watch")');
    const coshopTab = page.locator('.app-nav-service-pill:has-text("Co-Shop")');
    const costudyTab = page.locator('.app-nav-service-pill:has-text("Co-Study")');
    await coplayTab.waitFor({ state: 'visible', timeout: 5000 });
    await cowatchTab.waitFor({ state: 'visible', timeout: 5000 });
    await coshopTab.waitFor({ state: 'visible', timeout: 5000 });
    await costudyTab.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Shared product module switcher pills all visible');

    // 4. Friends button visible in app navigation
    const appFriendsBtn = page.locator('.btn-hub-friends-trigger');
    await appFriendsBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Friends button visible in app navigation header');

    // 5. Sidebar Friends shortcut visible in CoPlay left sidebar
    const sidebarFriendsBtn = page.locator('.sidebar-friends-btn');
    await sidebarFriendsBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Friends shortcut visible in CoPlay left sidebar');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'nav_02_coplay_authenticated_shell.png'),
      fullPage: false
    });
    console.log('  📸 Captured: nav_02_coplay_authenticated_shell.png');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 3: CLICK TOP-LEFT PROFILE BUTTON -> OPENS PROFILE MODAL
    // ──────────────────────────────────────────────────────────────────────────
    console.log('⏳ Test 3: Opening Profile modal from top-left control...');
    await upperLeftProfile.click();
    await page.waitForTimeout(600);

    const openProfile = page.locator('.profile-modal-card');
    await openProfile.waitFor({ state: 'visible', timeout: 5000 });

    const profileTitle = await page.textContent('.profile-modal-card');
    if (!profileTitle.includes('CoGether Member Profile')) {
      throw new Error('FAIL: Profile modal missing expected refined title!');
    }
    console.log('  ✅ Profile modal opened smoothly with refined title');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'nav_03_profile_modal.png'),
      fullPage: false
    });
    console.log('  📸 Captured: nav_03_profile_modal.png');

    // Close profile modal
    const closeProfileBtn = page.locator('.profile-modal-card .modal-close');
    await closeProfileBtn.click();
    await page.waitForTimeout(400);
    console.log('  ✅ Profile modal closed cleanly');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 4: FRIENDS ACCESS VIA HEADER & SIDEBAR
    // ──────────────────────────────────────────────────────────────────────────
    console.log('⏳ Test 4: Testing Friends access via sidebar...');
    await sidebarFriendsBtn.click();
    await page.waitForTimeout(600);

    const openFriendsModal = page.locator('.social-modal-card');
    await openFriendsModal.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Friends modal opened via sidebar button');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'nav_04_friends_modal.png'),
      fullPage: false
    });
    console.log('  📸 Captured: nav_04_friends_modal.png');

    const closeFriendsBtn = page.locator('.social-modal-card .btn-social-close');
    await closeFriendsBtn.click();
    await page.waitForTimeout(400);

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 5: PLAY WITH FRIEND MODAL
    // ──────────────────────────────────────────────────────────────────────────
    console.log('⏳ Test 5: Testing Play with Friend modal & room code...');
    const playWithFriendBtn = page.locator('.btn-hub-play-friend');
    await playWithFriendBtn.click();
    await page.waitForTimeout(600);

    const pwfModal = page.locator('.friend-modal-card');
    await pwfModal.waitFor({ state: 'visible', timeout: 5000 });

    const roomCodeEl = page.locator('.room-code-text');
    await roomCodeEl.waitFor({ state: 'visible', timeout: 5000 });
    const code = await roomCodeEl.textContent();
    console.log(`  ✅ Generated cryptographic duel code: "${code.trim()}"`);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'nav_05_play_with_friend.png'),
      fullPage: false
    });
    console.log('  📸 Captured: nav_05_play_with_friend.png');

    const closePwf = page.locator('.friend-modal-card .btn-modal-close');
    await closePwf.click();
    await page.waitForTimeout(400);

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 6: SEAMLESS CROSS-MODULE NAVIGATION VIA SHARED NAVIGATION SHELL
    // ──────────────────────────────────────────────────────────────────────────
    console.log('⏳ Test 6: Switching from Co-Play to Co-Watch via shared navigation...');
    await cowatchTab.click();
    await page.waitForTimeout(1500);

    // Verify AppNavShell is present in CoWatch
    await appNavShell.waitFor({ state: 'visible', timeout: 5000 });

    // Verify Co-Watch is now active
    const activeCowatchTab = page.locator('.app-nav-service-pill.active:has-text("Co-Watch")');
    await activeCowatchTab.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Co-Watch is active in shared navigation shell');

    // Verify top-left profile button remains visible in CoWatch
    await upperLeftProfile.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Top-left avatar and profile control preserved in CoWatch');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'nav_06_cowatch_shared_navigation.png'),
      fullPage: false
    });
    console.log('  📸 Captured: nav_06_cowatch_shared_navigation.png');

    // Switch back to Co-Play
    console.log('⏳ Switching back to Co-Play...');
    await coplayTab.click();
    await page.waitForTimeout(1200);

    const activeCoplayTab = page.locator('.app-nav-service-pill.active:has-text("Co-Play")');
    await activeCoplayTab.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ Seamlessly returned to Co-Play');

    console.log('\n======================================================');
    console.log('🎉 ALL LANDING & APP NAVIGATION E2E TESTS PASSED!');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ E2E Verification failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
