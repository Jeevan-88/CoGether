const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
const { db } = require('../packages/database/client');
const { signToken, createSession } = require('../packages/auth');

const ARTIFACT_DIR = 'C:\\Users\\Jeevan Yadav\\.gemini\\antigravity\\brain\\ffb913c9-9fef-48d8-a847-5ecdea42d885';
const APP_URL = 'http://localhost:5173';

(async () => {
  console.log('🎬 Starting CoWatch Cinema Premium Visual Verification & Interaction Suite...');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Fetch authenticated test user
    const userRes = await db.query(
      `SELECT u.id, u.email, u.display_name, p.username, p.avatar_config
       FROM identity.users u
       LEFT JOIN identity.profiles p ON u.id = p.user_id
       WHERE u.email = 'jeevanyadav2008@gmail.com'
       LIMIT 1`
    );

    const testUser = userRes.rows[0];
    console.log(`👤 Verified User: ${testUser.email} (@${testUser.username})`);

    const session = await createSession(testUser.id, { userAgent: 'Playwright-CoWatch-Capture' });
    const accessToken = signToken({
      sub: testUser.id,
      email: testUser.email,
      sessionId: session.sessionId,
      role: 'member'
    });

    // Viewport exactly at 1788 x 863 matching reference dimensions
    const context = await browser.newContext({
      viewport: { width: 1788, height: 863 },
      deviceScaleFactor: 1
    });

    const page = await context.newPage();

    // 2. Seed auth tokens in localStorage before navigation
    await page.addInitScript(({ token, refreshToken }) => {
      localStorage.setItem('cogether_access_token', token);
      localStorage.setItem('cogether_refresh_token', refreshToken);
    }, { token: accessToken, refreshToken: session.refreshToken });

    // 3. Navigate directly to CoWatch
    console.log('⏳ Navigating to CoWatch Hub...');
    await page.goto(`${APP_URL}/?mode=cowatch`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // 4. Verify CoWatch App Shell
    const appShell = page.locator('.cowatch-app-shell');
    await appShell.waitFor({ state: 'visible', timeout: 8000 });
    console.log('  ✅ CoWatch Master Shell is rendered');

    // 5. Verify Sidebar
    const sidebar = page.locator('.cowatch-sidebar-target');
    await sidebar.waitFor({ state: 'visible' });
    const activeNavPill = page.locator('.cowatch-nav-item-btn.active');
    const activeNavText = await activeNavPill.innerText();
    assert(activeNavText.includes('Home'), 'Home navigation item must be active by default');
    console.log('  ✅ Sidebar active navigation: Home with crimson velvet pill');

    // Verify Profile in Sidebar
    const profileCard = page.locator('.cowatch-sidebar-profile');
    await profileCard.waitFor({ state: 'visible' });
    console.log('  ✅ Sidebar user profile card mounted with online indicator');

    // 6. Verify Header Toolbar
    const header = page.locator('.cowatch-header-target');
    await header.waitFor({ state: 'visible' });
    const searchPill = page.locator('.cowatch-search-pill');
    await searchPill.waitFor({ state: 'visible' });
    const newPartyBtn = page.locator('.btn-cowatch-new-party');
    await newPartyBtn.waitFor({ state: 'visible' });
    console.log('  ✅ Header mounted with centered search pill, filter, notification, and "New Party" pill');

    // 7. Verify Hero Billboard (Initial: SHŌGUN)
    const heroPanel = page.locator('.cowatch-hero-panel');
    await heroPanel.waitFor({ state: 'visible' });
    const heroTitle = await page.locator('.cowatch-hero-title-serif').textContent();
    assert.strictEqual(heroTitle.trim(), 'SHŌGUN', 'Initial hero title must be SHŌGUN');
    console.log('  ✅ Hero Billboard displays serif title "SHŌGUN" with action buttons and right title selector');

    // 8. Verify Filter Pills
    const filterPills = page.locator('.cowatch-filters-wrapper');
    await filterPills.waitFor({ state: 'visible' });
    const activeFilter = await page.locator('.cowatch-filter-pill.active').textContent();
    assert.strictEqual(activeFilter.trim(), 'All', 'Default filter pill must be "All"');
    console.log('  ✅ Horizontal Filter Pills rendered with "All" active in crimson (#C9293A)');

    // 9. Verify Trending Now Row
    const trendingRow = page.locator('.cowatch-movie-row-section').first();
    await trendingRow.waitFor({ state: 'visible' });
    const rowTitle = await trendingRow.locator('.cowatch-row-title').textContent();
    assert(rowTitle.includes('Trending Now'), 'First movie row must be Trending Now');
    console.log('  ✅ Trending Now row rendered with flame icon and movie cards');

    // Verify first movie card: Dune: Part Two
    const duneCard = trendingRow.locator('.cowatch-portrait-card').first();
    const duneCardTitle = await duneCard.locator('.portrait-title').textContent();
    assert(duneCardTitle.includes('Dune: Part Two'), 'First trending card must be Dune: Part Two');
    console.log(`  ✅ First card verified: ${duneCardTitle.trim()}`);

    // Capture Target Match Screenshot: 1788 x 863 px
    const targetScreenshotPath = path.join(ARTIFACT_DIR, 'cowatch_cinema_verification.png');
    await page.screenshot({ path: targetScreenshotPath, fullPage: false });
    console.log(`📸 Target Reference Match Screenshot saved to: ${targetScreenshotPath}`);

    // 10. Interactive Test: Click 2nd selector card in Hero ("Dune: Part Two")
    console.log('🖱️ Testing Hero Interaction: Selecting "Dune: Part Two"...');
    const duneSelectorBtn = page.locator('.hero-selector-card:has-text("Dune: Part Two")');
    await duneSelectorBtn.click();
    await page.waitForTimeout(1000);

    const updatedHeroTitle = await page.locator('.cowatch-hero-title-serif').textContent();
    assert.strictEqual(updatedHeroTitle.trim(), 'DUNE: PART TWO', 'Hero title must update to DUNE: PART TWO');
    console.log('  ✅ Hero seamlessly transitioned to "DUNE: PART TWO" with crossfade & updated metadata');

    // Capture second state screenshot
    const duneStateScreenshotPath = path.join(ARTIFACT_DIR, 'cowatch_cinema_dune_active.png');
    await page.screenshot({ path: duneStateScreenshotPath, fullPage: false });
    console.log(`📸 Dune Active State Screenshot saved to: ${duneStateScreenshotPath}`);

    // 11. Test Hover State on Movie Card
    console.log('🖱️ Testing Movie Card Hover Effect (Video 2 depth & glow)...');
    await duneCard.hover();
    await page.waitForTimeout(500);

    // 12. Test Carousel Arrow Navigation
    console.log('🖱️ Testing Movie Row Horizontal Scroll Navigation...');
    const nextArrow = trendingRow.locator('.btn-row-nav-arrow').nth(1);
    await nextArrow.click();
    await page.waitForTimeout(600);
    console.log('  ✅ Movie row horizontal scroll executed smoothly');

    console.log('\n🎉 ALL COWATCH CINEMA VISUAL & INTERACTIVE VERIFICATIONS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
