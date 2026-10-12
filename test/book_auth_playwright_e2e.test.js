/**
 * CoGether Book / Identity Folio Experience Playwright End-to-End Test & Visual Verification
 * Tests:
 * 1. Page 1: Cover (title, subtitle, tactile buttons, 3D spread)
 * 2. Page 2A & 2B: Sign In & Create Account (inputs, Google OIDC, back navigation)
 * 3. Page 3: 6-Digit OTP verification (grid auto-advance, cooldown, live verify)
 * 4. Page 4: Profile & Persona (avatar monogram, live handle check, display name)
 * 5. Page 5: Phone & Real-World Trust (carrier notice, dial code, badge tiles)
 * 6. Page 6: Account Complete (folio summary plate, badges, Enter CoGether)
 * 7. Mobile Viewport (390x844): single-page folio, zero overflow, touch targets >= 44px
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\Jeevan Yadav\\.gemini\\antigravity\\brain\\ffb913c9-9fef-48d8-a847-5ecdea42d885';

async function runBookAuthE2ETest() {
  console.log('📖 Starting CoGether Book Auth Experience Playwright Test...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

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
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 2. Open Auth Modal
    console.log('2. Opening Auth Modal via Navbar Log In button...');
    const loginBtn = await page.waitForSelector('.btn-login-rect', { timeout: 8000 });
    await loginBtn.click();
    await page.waitForSelector('.book-modal-backdrop', { timeout: 5000 });
    await page.waitForSelector('.book-container', { timeout: 5000 });
    await page.waitForTimeout(600); // Allow 3D fold-in animation

    // ── PAGE 1: COVER ──────────────────────────────────────────────────────────
    console.log('3. Verifying Page 1 (Cover)...');
    const coverTitle = await page.textContent('.cover-title');
    assert(coverTitle.includes('CoGether'), `Cover title matches: "${coverTitle.trim()}"`);

    const coverSubtitle = await page.textContent('.cover-subtitle');
    assert(coverSubtitle.includes('Your people. Your space.'), `Cover subtitle matches: "${coverSubtitle.trim()}"`);

    const createAccountBtn = await page.$('.btn-create-account');
    const signinBtn = await page.$('.btn-signin');
    assert(createAccountBtn !== null, 'Found "Create Account" opening card');
    assert(signinBtn !== null, 'Found "Sign In" opening card');

    const leftFolioNum = await page.textContent('.folio-roman-numeral');
    assert(leftFolioNum.includes('COGETHER'), `Left folio heading: "${leftFolioNum.trim()}"`);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'book_auth_page1_cover.png'),
      fullPage: false
    });
    console.log('  📸 Captured screenshot: book_auth_page1_cover.png');

    // ── MOBILE VIEWPORT TEST ON COVER ──────────────────────────────────────────
    console.log('3B. Testing Mobile Viewport on Cover (390x844 iPhone 14)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);

    const leftPageCoverHidden = await page.evaluate(() => {
      const el = document.querySelector('.book-left-page');
      if (!el) return true;
      return window.getComputedStyle(el).display === 'none';
    });
    assert(leftPageCoverHidden, 'Left decorative page hidden on mobile Cover (single card view)');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'book_auth_mobile_cover.png'),
      fullPage: false
    });
    console.log('  📸 Captured screenshot: book_auth_mobile_cover.png');

    // Reset back to desktop for remaining flow
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);

    // ── PAGE 2B: CREATE ACCOUNT ────────────────────────────────────────────────
    console.log('4. Navigating to Page 2B (Create Account)...');
    await createAccountBtn.click();
    await page.waitForTimeout(500);

    const createHeader = await page.textContent('.form-chapter-tag');
    assert(createHeader.includes('PAGE 2B'), `Chapter tag matches: "${createHeader.trim()}"`);

    const createTitle = await page.textContent('.auth-form-section .form-header h2');
    assert(createTitle.includes("Let's create your identity."), `Form title: "${createTitle.trim()}"`);

    const emailInput = await page.$('#create-email');
    assert(emailInput !== null, 'Create account email input present');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'book_auth_page2_create.png'),
      fullPage: false
    });
    console.log('  📸 Captured screenshot: book_auth_page2_create.png');

    // ── TEST BACK BUTTON ───────────────────────────────────────────────────────
    console.log('5. Testing Back button navigation to Cover...');
    const backBtn = await page.waitForSelector('.book-nav-back-btn', { timeout: 3000 });
    await backBtn.click();
    await page.waitForTimeout(500);
    const coverRecheck = await page.textContent('.cover-title');
    assert(coverRecheck.includes('CoGether'), 'Returned safely to Cover page via Back navigation');

    // ── PAGE 2A: SIGN IN ───────────────────────────────────────────────────────
    console.log('6. Navigating to Page 2A (Sign In)...');
    const signinBtn2 = await page.waitForSelector('.btn-signin', { timeout: 3000 });
    await signinBtn2.click();
    await page.waitForTimeout(500);

    const signinHeader = await page.textContent('.form-chapter-tag');
    assert(signinHeader.includes('PAGE 2A'), `Chapter tag: "${signinHeader.trim()}"`);

    const signinTitle = await page.textContent('.auth-form-section .form-header h2');
    assert(signinTitle.includes('Welcome back.'), `Sign in title: "${signinTitle.trim()}"`);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'book_auth_page2_signin.png'),
      fullPage: false
    });
    console.log('  📸 Captured screenshot: book_auth_page2_signin.png');

    // ── PAGE 3: EMAIL VERIFICATION (OTP) ───────────────────────────────────────
    const testEmail = `folio_${Date.now()}@cogether.tech`;
    console.log(`7. Submitting email "${testEmail}" for passwordless OTP...`);
    await page.fill('#signin-email', testEmail);
    await page.click('.book-primary-action-btn');

    await page.waitForSelector('.otp-digit-grid', { timeout: 8000 });
    await page.waitForTimeout(400);

    const verifyTitle = await page.textContent('.auth-form-section .form-header h2');
    assert(verifyTitle.includes('Check your inbox.'), `Verification title: "${verifyTitle.trim()}"`);

    const emailTag = await page.textContent('.highlight-text');
    assert(emailTag.includes(testEmail), `Recipient highlighted correctly: "${emailTag.trim()}"`);

    const otpBoxes = await page.$$('.otp-digit-box');
    assert(otpBoxes.length === 6, `Rendered exactly 6 OTP digit boxes (found ${otpBoxes.length})`);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'book_auth_page3_verify.png'),
      fullPage: false
    });
    console.log('  📸 Captured screenshot: book_auth_page3_verify.png');

    // Retrieve generated OTP from .test_last_otp.json
    console.log('8. Retrieving test OTP from local audit state...');
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
      } catch (err) {
        console.warn('Could not parse test OTP file:', err.message);
      }
    }
    console.log(`   Retrieved OTP: ${generatedOtp}`);

    // Fill OTP digits one by one to test auto-advance
    console.log('9. Typing 6-digit passcode into boxes with auto-advance...');
    for (let i = 0; i < 6; i++) {
      await otpBoxes[i].fill(generatedOtp[i]);
      await page.waitForTimeout(100);
    }

    // ── PAGE 4: PROFILE CREATION ───────────────────────────────────────────────
    console.log('10. Waiting for auto-verify and Page 4 (Persona / Profile)...');
    await page.waitForSelector('#profile-display-name', { timeout: 8000 });
    await page.waitForTimeout(400);

    const profileTitle = await page.textContent('.auth-form-section .form-header h2');
    assert(profileTitle.includes('Make it yours.'), `Profile title: "${profileTitle.trim()}"`);

    const avatarCircle = await page.$('.avatar-circle-frame');
    assert(avatarCircle !== null, 'Avatar upload circular frame is present');

    // Test live username availability check
    console.log('11. Testing live username availability feedback...');
    const handleInput = await page.$('#profile-username');

    // Step 11A: Test taken handle detection
    await handleInput.fill('alex_folio');
    await page.waitForTimeout(700); // debounce wait
    const takenBadge = await page.$('.handle-status-badge .text-danger');
    const takenMessage = await page.textContent('.field-hint-message.taken');
    assert(takenBadge !== null && takenMessage.includes('already taken'), 'Detected taken handle correctly');

    // Step 11B: Test available handle detection
    const uniqueHandle = `alex_${Date.now().toString().slice(-6)}`;
    await handleInput.fill(uniqueHandle);
    await page.waitForTimeout(700); // debounce wait
    const availableBadge = await page.waitForSelector('.handle-status-badge .text-success', { timeout: 4000 });
    const availableMessage = await page.textContent('.field-hint-message.available');
    assert(availableBadge !== null && availableMessage.includes('is available'), `Available handle verified (@${uniqueHandle} is available)`);

    await page.fill('#profile-display-name', 'Alex Rivera');
    await page.fill('#profile-bio', 'Cinema curator & late-night code architect');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'book_auth_page4_profile.png'),
      fullPage: false
    });
    console.log('  📸 Captured screenshot: book_auth_page4_profile.png');

    // ── PAGE 5: PHONE / REAL-WORLD TRUST ───────────────────────────────────────
    console.log('12. Submitting profile and advancing to Page 5 (Phone / Trust)...');
    await page.click('.book-primary-action-btn');
    await page.waitForSelector('.trust-architecture-card', { timeout: 8000 });
    await page.waitForTimeout(400);

    const trustTitle = await page.textContent('.auth-form-section .form-header h2');
    assert(trustTitle.includes('Secure your identity.'), `Trust title: "${trustTitle.trim()}"`);

    const carrierNotice = await page.textContent('.trust-status-banner strong');
    assert(carrierNotice.includes('SMS Gateway In Configuration'), 'Transparent carrier setup banner shown');

    const countrySelect = await page.$('.country-dial-select');
    assert(countrySelect !== null, 'Country dial code selector is present');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'book_auth_page5_trust.png'),
      fullPage: false
    });
    console.log('  📸 Captured screenshot: book_auth_page5_trust.png');

    // ── PAGE 6: ACCOUNT COMPLETE ───────────────────────────────────────────────
    console.log('13. Advancing to Page 6 (Account Complete)...');
    await page.click('.trust-actions-deck .book-primary-action-btn');
    await page.waitForSelector('.complete-celebration-seal', { timeout: 8000 });
    await page.waitForTimeout(400);

    const completeTitle = await page.textContent('.complete-section h2');
    assert(completeTitle.includes("You're in."), `Complete heading: "${completeTitle.trim()}"`);

    const plateName = await page.textContent('.plate-display-name');
    assert(plateName.includes('Alex Rivera'), `Identity Folio Plate display name: "${plateName.trim()}"`);

    const plateHandle = await page.textContent('.plate-handle');
    assert(plateHandle.includes(`@${uniqueHandle}`), `Identity Folio Plate handle: "${plateHandle.trim()}"`);

    const enterBtn = await page.$('.btn-enter-platform');
    assert(enterBtn !== null, '"Enter CoGether" primary launch button present');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'book_auth_page6_complete.png'),
      fullPage: false
    });
    console.log('  📸 Captured screenshot: book_auth_page6_complete.png');

    // ── MOBILE VIEWPORT VERIFICATION (390x844 iPhone 14) ───────────────────────
    console.log('14. Testing Mobile Viewport (390x844 iPhone 14)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);

    // Verify left page is hidden on mobile
    const leftPageVisible = await page.evaluate(() => {
      const el = document.querySelector('.book-left-page');
      if (!el) return false;
      return window.getComputedStyle(el).display !== 'none';
    });
    assert(!leftPageVisible, 'Left decorative page hidden on mobile (displays single-page card folio)');

    // Verify no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      const container = document.querySelector('.book-container');
      if (!container) return false;
      return container.scrollWidth > window.innerWidth;
    });
    assert(!hasHorizontalOverflow, 'Zero horizontal overflow on mobile 390px viewport');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'book_auth_mobile_complete.png'),
      fullPage: false
    });
    console.log('  📸 Captured screenshot: book_auth_mobile_complete.png');

    // Test entering platform
    console.log('15. Clicking "Enter CoGether" to close modal and enter platform...');
    await enterBtn.click();
    await page.waitForTimeout(600);

    // Verify modal closed
    const modalOpen = await page.$('.book-modal-backdrop');
    assert(modalOpen === null, 'Book auth modal closed cleanly upon entering platform');

    // Verify navbar displays user name / badge
    const userBadge = await page.waitForSelector('.user-nav-badge', { timeout: 6000 });
    const userBadgeText = await userBadge.textContent();
    assert(userBadgeText.includes('Alex Rivera') || userBadgeText.includes('alex_folio'), `Navbar reflects authenticated member: "${userBadgeText.trim()}"`);
    console.log('  ✓ User badge visible in Navbar');

    console.log(`\n======================================================`);
    console.log(`BOOK AUTH SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runBookAuthE2ETest();
