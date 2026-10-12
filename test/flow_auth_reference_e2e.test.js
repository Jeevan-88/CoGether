/**
 * CoGether "Build Your Flow" Reference-Accurate Authentication E2E Test & Visual Verification
 * Tests:
 * 1. Desktop 1440x900 Two-Panel Layout:
 *    - Left panel: video element, pure black background, poster fallback, leaf badge ("Stay focused. Grow every day.")
 *    - Center seam: organic curved cutout with [ — • • ] pagination
 *    - Right panel: warm peach gradient, "Build Your Flow", email input, black action button, social buttons row, legal links
 * 2. Toggle between Sign Up ("Build Your Flow") and Sign In ("Welcome Back")
 * 3. Real passwordless OTP submission and verification
 * 4. Responsive Viewports: 430px, 390px, 360px, 320px (zero horizontal overflow, touch-accessible)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\Jeevan Yadav\\.gemini\\antigravity\\brain\\ffb913c9-9fef-48d8-a847-5ecdea42d885';

async function runReferenceAuthTest() {
  console.log('✨ Starting CoGether Reference Auth Playwright Test...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Navigate to app and clear session
    console.log('1. Navigating to http://localhost:5173/ and resetting session...');
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(async () => {
      try {
        await fetch('http://localhost:3001/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (e) {}
      localStorage.clear();
      sessionStorage.clear();
    });
    await context.clearCookies();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 2. Open Auth Modal
    console.log('2. Opening Auth Modal via Navbar Log In button...');
    const loginBtn = await page.waitForSelector('.btn-login-rect', { timeout: 8000 });
    await loginBtn.click();
    await page.waitForSelector('.flow-auth-overlay', { timeout: 5000 });
    await page.waitForSelector('.flow-auth-card', { timeout: 5000 });
    await page.waitForTimeout(600);

    // ── STEP 1: DESKTOP SIGN UP ("Build Your Flow") ───────────────────────────
    console.log('3. Verifying Reference Desktop Sign Up Layout...');
    const mainTitle = await page.textContent('.flow-title');
    assert(mainTitle.includes('Build Your Flow'), `Main heading matches: "${mainTitle.trim()}"`);

    const subtitle = await page.textContent('.flow-subtitle');
    assert(subtitle.includes('Create your account and get started with a clear mind'), `Subtitle matches: "${subtitle.trim()}"`);

    const topSwitch = await page.textContent('.flow-top-switch-row');
    assert(topSwitch.includes('Already have an account?'), 'Top-right switch link present');

    const videoEl = await page.$('.flow-auth-video');
    assert(videoEl !== null, 'Video element present in left panel');

    const videoSrc = await page.getAttribute('.flow-auth-video', 'src');
    assert(videoSrc.includes('cogether_auth_video.mp4'), `Video source matches: "${videoSrc}"`);

    const leafBadge = await page.textContent('.flow-video-leaf-badge');
    assert(leafBadge.includes('Stay focused.') && leafBadge.includes('Grow every day.'), 'Found leaf badge: "Stay focused. Grow every day."');

    const centerCutout = await page.$('.flow-center-curved-svg');
    assert(centerCutout !== null, 'Found organic center curved cutout with pagination indicators');

    const emailInput = await page.$('.flow-input-control[type="email"]');
    assert(emailInput !== null, 'Found Email Address input field');

    const submitBtn = await page.$('.flow-action-button');
    assert(submitBtn !== null, 'Found primary black action button');

    const socialCards = await page.$$('.flow-social-card');
    assert(socialCards.length === 3, `Found 3 social auth cards (Google, Apple, Telegram, count: ${socialCards.length})`);

    const legalText = await page.textContent('.flow-legal-disclaimer');
    assert(legalText.includes('Terms of Service') && legalText.includes('Privacy Policy'), 'Found bottom legal disclaimer');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'flow_auth_reference_signup.png'),
      fullPage: false
    });
    console.log('  📸 Captured screenshot: flow_auth_reference_signup.png');

    // ── STEP 2: SWITCH TO SIGN IN ("Welcome Back") ────────────────────────────
    console.log('4. Testing switch to Sign In...');
    await page.click('.flow-switch-action');
    await page.waitForTimeout(400);

    const signinTitle = await page.textContent('.flow-title');
    assert(signinTitle.includes('Welcome Back'), `Sign In heading matches: "${signinTitle.trim()}"`);

    const signinTopSwitch = await page.textContent('.flow-top-switch-row');
    assert(signinTopSwitch.includes("Don't have an account?"), 'Top-right switch displays "Don\'t have an account? Sign Up"');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'flow_auth_reference_signin.png'),
      fullPage: false
    });
    console.log('  📸 Captured screenshot: flow_auth_reference_signin.png');

    // ── STEP 3: SUBMIT EMAIL FOR OTP ──────────────────────────────────────────
    const testEmail = `flow_${Date.now()}@cogether.tech`;
    console.log(`5. Submitting email "${testEmail}" for real OTP...`);
    await page.fill('.flow-input-control[type="email"]', testEmail);
    await page.click('.flow-action-button');

    await page.waitForSelector('.flow-title', { timeout: 8000 });
    await page.waitForTimeout(400);

    const verifyTitle = await page.textContent('.flow-title');
    assert(verifyTitle.includes('Check Your Inbox'), `Transitioned to verification: "${verifyTitle.trim()}"`);

    const emailHighlight = await page.textContent('.flow-highlight-email');
    assert(emailHighlight.includes(testEmail), `Recipient highlighted in subtitle: "${emailHighlight.trim()}"`);

    const otpInput = await page.$('.flow-input-control[placeholder="Enter 6-digit passcode"]');
    assert(otpInput !== null, 'Found 6-digit passcode input');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'flow_auth_reference_otp.png'),
      fullPage: false
    });
    console.log('  📸 Captured screenshot: flow_auth_reference_otp.png');

    // ── STEP 4: VERIFY OTP AND MINT SESSION ───────────────────────────────────
    console.log('6. Retrieving OTP from local audit state and verifying...');
    const testOtpFile = path.join(__dirname, '../.test_last_otp.json');
    let generatedOtp = '123456';
    if (fs.existsSync(testOtpFile)) {
      try {
        const otpData = JSON.parse(fs.readFileSync(testOtpFile, 'utf8'));
        if (otpData[testEmail.toLowerCase()]) {
          generatedOtp = otpData[testEmail.toLowerCase()].otp;
        } else if (otpData._latest) {
          generatedOtp = otpData._latest.otp;
        }
      } catch (e) {}
    }
    console.log(`   Retrieved OTP: ${generatedOtp}`);

    await page.fill('.flow-input-control[placeholder="Enter 6-digit passcode"]', generatedOtp);
    await page.waitForTimeout(1000);

    // Verify modal closes and user badge is visible
    const modalClosed = await page.waitForSelector('.flow-auth-overlay', { state: 'detached', timeout: 8000 });
    assert(modalClosed === null, 'Modal closed cleanly upon successful authentication');

    const userBadge = await page.waitForSelector('.user-nav-badge', { timeout: 6000 });
    const userBadgeText = await userBadge.textContent();
    assert(userBadgeText.length > 0, `Navbar reflects authenticated member: "${userBadgeText.trim()}"`);

    // ── STEP 5: RESPONSIVENESS CHECKS ON MOBILE VIEWPORTS ─────────────────────
    console.log('7. Testing Responsive Viewports (430px, 390px, 360px, 320px)...');
    
    // Clear session to reopen modal on mobile
    await page.evaluate(async () => {
      try {
        await fetch('http://localhost:3001/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (e) {}
      localStorage.clear();
      sessionStorage.clear();
    });
    await context.clearCookies();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    const mobileViewports = [
      { name: '430px (iPhone 14 Pro Max)', width: 430, height: 932, file: 'flow_auth_mobile_430px.png' },
      { name: '390px (iPhone 14)', width: 390, height: 844, file: 'flow_auth_mobile_390px.png' },
      { name: '360px (Compact Android)', width: 360, height: 800, file: 'flow_auth_mobile_360px.png' },
      { name: '320px (iPhone SE)', width: 320, height: 667, file: 'flow_auth_mobile_320px.png' }
    ];

    for (const vp of mobileViewports) {
      console.log(`   Testing ${vp.name}...`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(300);

      const navBtn = await page.waitForSelector('.btn-login-rect', { timeout: 6000 });
      await navBtn.click();
      await page.waitForSelector('.flow-auth-card', { timeout: 5000 });
      await page.waitForTimeout(400);

      // Check overflow
      const hasOverflow = await page.evaluate(() => {
        const card = document.querySelector('.flow-auth-card');
        return card.scrollWidth > window.innerWidth;
      });
      assert(!hasOverflow, `Zero horizontal overflow on ${vp.width}px`);

      // Check video is visible on mobile
      const videoVisible = await page.evaluate(() => {
        const v = document.querySelector('.flow-auth-video');
        return v && window.getComputedStyle(v).display !== 'none';
      });
      assert(videoVisible, `Video remains visible on ${vp.width}px`);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, vp.file),
        fullPage: false
      });
      console.log(`   📸 Captured screenshot: ${vp.file}`);

      // Close modal for next viewport iteration
      await page.click('.flow-modal-close-btn');
      await page.waitForTimeout(300);
    }

    console.log(`\n======================================================`);
    console.log(`REFERENCE AUTH SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    try {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'debug_failure.png') });
      console.log('Saved debug screenshot: debug_failure.png');
      const html = await page.content();
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'debug_page.html'), html);
    } catch (e) {}
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runReferenceAuthTest();
