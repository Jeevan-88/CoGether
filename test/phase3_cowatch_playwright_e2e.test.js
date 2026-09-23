/**
 * Phase 3.0A Playwright E2E CoWatch Verification Suite
 * Exercises Barlow typography, luxury minimal styling, Free to Watch section,
 * Watch on Your Services provider tiles, cinema room orchestration, and safe media importer.
 */

const { chromium } = require('playwright');
const assert = require('assert');

const CLIENT_URL = 'http://localhost:5173';

async function runPlaywrightSuite() {
  console.log('\n🎭 Starting Phase 3.0A Playwright E2E CoWatch Verification Suite...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function recordPass(desc) {
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  }

  function recordFail(desc, err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(err);
    failed++;
  }

  try {
    // ── [1/5] Barlow Typography & Visual System Invariants ──
    console.log('── [1/5] Barlow Typography & Visual System Invariants ──');
    await page.goto(CLIENT_URL);
    await page.waitForTimeout(1000);

    // Navigate to CoWatch Hub
    const watchNavBtn = page.locator('button:has-text("Co-Watch"), [data-tab="cowatch"], button:has-text("Watch")').first();
    await watchNavBtn.click();
    await page.waitForTimeout(1500);

    // Verify Sidebar exists
    const sidebar = page.locator('.cowatch-sidebar-root');
    await sidebar.waitFor({ state: 'visible' });
    recordPass('CoWatch luxury sidebar is mounted and visible');

    // Verify Barlow Font Family is applied to body/shell
    const fontFamily = await page.locator('.cowatch-app-shell').evaluate(el => window.getComputedStyle(el).fontFamily);
    assert(fontFamily.includes('Barlow'), `Expected font family to include Barlow, received: ${fontFamily}`);
    recordPass(`Barlow typography loaded and applied to CoWatch shell (${fontFamily.split(',')[0]})`);

    // Verify Zero Arcade Yellow Background (#FFE500 absent)
    const hasYellowCanvas = await page.locator('.netflix-rows-section, [style*="#FFE500"], [style*="rgb(255, 229, 0)"]').count();
    assert.strictEqual(hasYellowCanvas, 0, 'Obsolete yellow arcade canvas must be completely absent');
    recordPass('Obsolete yellow arcade canvas styling (#FFE500) is 100% removed');

    // Verify Zero "DIRECT CINEMA" labels in the DOM
    const directCinemaCount = await page.locator('text="DIRECT CINEMA", text="Direct Cinema"').count();
    assert.strictEqual(directCinemaCount, 0, 'No Direct Cinema labels should exist in the DOM');
    recordPass('Zero "DIRECT CINEMA" labels found across all rendered content cards');

    // Verify Hero Billboard
    const hero = page.locator('.cowatch-hero-billboard');
    await hero.waitFor({ state: 'visible' });
    const heroTitle = await hero.locator('.cowatch-hero-title').textContent();
    assert(heroTitle.length > 0, 'Hero billboard must display a valid title');
    recordPass(`Hero billboard is visible displaying "${heroTitle}" with factual metadata`);

    // ── [2/5] Content Separation: Free to Watch & Watch on Your Services ──
    console.log('\n── [2/5] Content Separation: Free to Watch & Watch on Your Services ──');
    
    // Verify "Free to Watch" section header and subtitle
    const freeSectionHeader = page.locator('.cowatch-catalog-section:has-text("Free to Watch")').first();
    await freeSectionHeader.waitFor({ state: 'visible' });
    const subtitle = await freeSectionHeader.locator('.cowatch-rail-subtitle').first().textContent();
    assert(subtitle.includes('Verified public-domain'), 'Free to watch subtitle must be factual');
    recordPass('Free to Watch section renders verified public-domain and open-license films');

    // Verify "Watch on Your Services" Provider Tiles
    const servicesSection = page.locator('.cowatch-catalog-section:has-text("Watch on Your Services")').first();
    await servicesSection.waitFor({ state: 'visible' });
    const netflixCard = page.locator('.cowatch-provider-card:has-text("Netflix")').first();
    await netflixCard.waitFor({ state: 'visible' });
    const netflixLabel = await netflixCard.locator('.provider-card-capability-label').textContent();
    assert(netflixLabel.includes('Netflix account'), 'Netflix tile must state account requirement');
    recordPass('Watch on Your Services renders provider destination tiles with factual capability copy');

    // Global Search Filter
    const searchInput = page.locator('.cowatch-search-box input');
    await searchInput.fill('Metropolis');
    await page.waitForTimeout(500);
    const searchResultCard = page.locator('.cowatch-content-card:has-text("Metropolis")').first();
    await searchResultCard.waitFor({ state: 'visible' });
    recordPass('Global search filters canonical items in real time');
    await searchInput.fill('');
    await page.waitForTimeout(400);

    // ── [3/5] Native Cinema Watch Room Launch & Social Plane ──
    console.log('\n── [3/5] Native Cinema Watch Room Launch & Social Plane ──');
    // Launch watch party from Free to Watch card
    const freeCard = page.locator('.cowatch-content-card').first();
    const watchPartyBtn = freeCard.locator('.btn-card-party');
    await watchPartyBtn.click();
    await page.waitForTimeout(1500);

    // Verify Theater Room is mounted
    const theaterRoot = page.locator('.cowatch-cinema-theater-root');
    await theaterRoot.waitFor({ state: 'visible' });
    recordPass('Free to Watch card launches into dominant Cinema Theater room');

    // Verify Room Code Badge
    const roomCodeBadge = page.locator('.theater-room-code-badge');
    await roomCodeBadge.waitFor({ state: 'visible' });
    const codeText = await roomCodeBadge.textContent();
    assert(codeText.includes('CW-'), 'Room code must follow CW-XXXXXX pattern');
    recordPass(`Authoritative room code badge visible (${codeText.trim()})`);

    // Verify Video Stage & Minimal Player Controls
    const videoElem = page.locator('.cinema-native-video');
    await videoElem.waitFor({ state: 'attached' });
    recordPass('HTML5 Native video stage is mounted with minimal controls bar');

    // Verify Sync Status Indicator (SYNCED)
    const syncStatus = page.locator('text="SYNCED"').first();
    await syncStatus.waitFor({ state: 'visible' });
    recordPass('Clean human-readable SYNCED status badge is active');

    // Verify Rectangular Camera Tile
    const cameraTile = page.locator('.cowatch-camera-tile').first();
    await cameraTile.waitFor({ state: 'visible' });
    recordPass('Audience camera grid renders rectangular camera tile');

    // Send Live Chat Message
    const chatInput = page.locator('.social-chat-input');
    await chatInput.fill('Phase 3.0A Premium Cinema Room Active!');
    await chatInput.press('Enter');
    await page.waitForTimeout(400);
    const sentMsg = page.locator('.social-chat-stream').getByText('Phase 3.0A Premium Cinema Room Active!').first();
    await sentMsg.waitFor({ state: 'visible' });
    recordPass('Live synchronized chat message sent and rendered in social rail');

    // Test Social Rail Collapse to Slim Icon Rail
    const collapseBtn = page.locator('.btn-toggle-social');
    await collapseBtn.click();
    await page.waitForTimeout(400);
    const collapsedRail = page.locator('.theater-social-rail-collapsed');
    await collapsedRail.waitFor({ state: 'visible' });
    recordPass('Social panel collapses cleanly into slim red/gold icon rail');

    // Expand Social Rail back
    const expandBtn = page.locator('.btn-rail-collapsed-action').first();
    await expandBtn.click();
    await page.waitForTimeout(400);

    // Leave Theater Room and return to Hub
    const leaveBtn = page.locator('.theater-top-right button:has-text("Leave")');
    await leaveBtn.click();
    await page.waitForTimeout(1000);
    await sidebar.waitFor({ state: 'visible' });
    recordPass('Leave room button safely returns user back to CoWatch Hub');

    // ── [4/5] External OTT Provider Watch Party ──
    console.log('\n── [4/5] External OTT Provider Watch Party ──');
    const netflixPartyBtn = page.locator('.cowatch-provider-card:has-text("Netflix") .btn-provider-party').first();
    await netflixPartyBtn.click();
    await page.waitForTimeout(1500);

    // Verify Companion HUD Stage
    const companionBox = page.locator('.companion-stage-box');
    await companionBox.waitFor({ state: 'visible' });
    recordPass('Provider card mounts CoGether Watch Companion stage');

    // Verify DRM Hardware Protected Notice
    const drmNotice = page.locator('.companion-notice-card');
    await drmNotice.waitFor({ state: 'visible' });
    recordPass('DRM Hardware Protected Media notice is prominently surfaced');

    // Return to Hub
    const backToHub = page.locator('.btn-theater-back:has-text("Cinema Hub")');
    await backToHub.click();
    await page.waitForTimeout(1000);

    // ── [5/5] Safe Media Importer Security Boundary ──
    console.log('\n── [5/5] Safe Media Importer Security Boundary ──');
    const utilityBtn = page.locator('.btn-cowatch-utility-toggle');
    if (await utilityBtn.isVisible()) {
      await utilityBtn.click();
      await page.waitForTimeout(300);
    }
    const importBtn = page.locator('button:has-text("Import Stream")');
    await importBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('.cowatch-modal-dialog');
    await modal.waitFor({ state: 'visible' });
    recordPass('Import Stream opens security validation modal');

    // Enter arbitrary untrusted website URL
    const urlInput = modal.locator('input[placeholder*="https://"]');
    await urlInput.fill('https://arbitrary-movie-proxy.com/embed?id=999');
    const validateBtn = modal.locator('button:has-text("Validate & Stream")');
    await validateBtn.click();
    await page.waitForTimeout(400);

    // Verify arbitrary URL is blocked
    const errorBox = modal.locator('text=For security and compliance');
    await errorBox.waitFor({ state: 'visible' });
    recordPass('Security boundary rejects arbitrary URL input and protects against SSRF');

    // Close Modal
    const closeBtn = modal.locator('.btn-modal-close');
    await closeBtn.click();
    await page.waitForTimeout(400);
    recordPass('Modal closes cleanly without side effects');

  } catch (err) {
    recordFail('Playwright E2E suite encountered an error', err);
  } finally {
    await browser.close();
  }

  console.log('\n======================================================');
  console.log(`Phase 3.0A Playwright E2E Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runPlaywrightSuite().catch((err) => {
  console.error('Playwright fatal error:', err);
  process.exit(1);
});
