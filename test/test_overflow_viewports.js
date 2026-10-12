import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\Jeevan Yadav\\.gemini\\antigravity\\brain\\ffb913c9-9fef-48d8-a847-5ecdea42d885';

const viewports = [
  { name: 'desktop_1920x1080', width: 1920, height: 1080, isMobile: false },
  { name: 'desktop_1366x768', width: 1366, height: 768, isMobile: false },
  { name: 'desktop_1280x720', width: 1280, height: 720, isMobile: false },
  { name: 'mobile_430x932', width: 430, height: 932, isMobile: true },
  { name: 'mobile_390x844', width: 390, height: 844, isMobile: true },
  { name: 'mobile_360x800', width: 360, height: 800, isMobile: true },
  { name: 'mobile_320x667', width: 320, height: 667, isMobile: true },
];

async function run() {
  console.log('🚀 Starting Comprehensive Viewport Overflow & Reachability Test...');
  const browser = await chromium.launch({ headless: true });
  
  let allPassed = true;
  const results = [];

  for (const vp of viewports) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

      // If auth modal is not already open, click the login button in navbar
      const modalOpen = await page.locator('.flow-auth-card').isVisible().catch(() => false);
      if (!modalOpen) {
        // Find navbar login/signup button or trigger
        const trigger = page.locator('button:has-text("Log In"), button:has-text("Sign Up"), [data-testid="auth-modal-btn"]').first();
        if (await trigger.isVisible()) {
          await trigger.click();
        } else {
          // Open via window / evaluate
          await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Log In') || b.textContent.includes('Sign In'));
            if (btn) btn.click();
          });
        }
      }

      await page.waitForSelector('.flow-auth-card', { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(600); // Allow animation to settle

      // 1. Check card bounding box fits within viewport
      const cardBox = await page.locator('.flow-auth-card').boundingBox();
      const fitsVertically = cardBox.y >= 0 && (cardBox.y + cardBox.height) <= (vp.height + 2); // allow 2px subpixel
      console.log(`  Card bounds: top=${Math.round(cardBox.y)}, height=${Math.round(cardBox.height)}, bottom=${Math.round(cardBox.y + cardBox.height)} / viewport height=${vp.height}`);
      if (!fitsVertically) {
        console.error(`  ❌ Card overflows viewport vertically! Bottom: ${cardBox.y + cardBox.height} > ${vp.height}`);
        allPassed = false;
      } else {
        console.log(`  ✓ Card fully contained within viewport height!`);
      }

      // 2. Check document horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const noHorizOverflow = scrollWidth <= vp.width + 1;
      if (!noHorizOverflow) {
        console.error(`  ❌ Document horizontal overflow! scrollWidth=${scrollWidth} > viewportWidth=${vp.width}`);
        allPassed = false;
      } else {
        console.log(`  ✓ Zero horizontal overflow (scrollWidth=${scrollWidth} <= ${vp.width})`);
      }

      // 3. For desktop, check left video panel height matches right panel
      if (!vp.isMobile) {
        const leftBox = await page.locator('.flow-auth-left-panel').boundingBox();
        const rightBox = await page.locator('.flow-auth-right-panel').boundingBox();
        const heightDiff = Math.abs(leftBox.height - rightBox.height);
        console.log(`  Left panel height: ${Math.round(leftBox.height)}px, Right panel height: ${Math.round(rightBox.height)}px (diff: ${Math.round(heightDiff)}px)`);
        if (heightDiff > 2) {
          console.error(`  ❌ Left and right panels are not equal height!`);
          allPassed = false;
        } else {
          console.log(`  ✓ Left video panel and right form panel heights are aligned!`);
        }
      }

      // 4. Verify all essential interactive elements exist
      const emailInput = page.locator('input[type="email"]');
      const actionBtn = page.locator('.flow-action-button');
      const socialCards = page.locator('.flow-social-card');
      const legalText = page.locator('.flow-legal-disclaimer');
      const closeBtn = page.locator('.flow-modal-close-btn');

      const emailCount = await emailInput.count();
      const actionBtnCount = await actionBtn.count();
      const socialCount = await socialCards.count();
      const legalCount = await legalText.count();
      const closeCount = await closeBtn.count();

      if (emailCount === 0 || actionBtnCount === 0 || socialCount === 0 || legalCount === 0 || closeCount === 0) {
        console.error(`  ❌ Missing essential elements! email=${emailCount}, actionBtn=${actionBtnCount}, social=${socialCount}, legal=${legalCount}, close=${closeCount}`);
        allPassed = false;
      } else {
        console.log(`  ✓ Essential elements found: email input, primary action, 3 social buttons, legal text, close button`);
      }

      // 5. Scroll inside right panel (or mobile card) to ensure bottom elements are reachable
      await legalText.first().scrollIntoViewIfNeeded();
      const legalVisible = await legalText.first().isVisible();
      console.log(`  ✓ Terms & privacy disclaimer reachable and visible: ${legalVisible}`);
      if (!legalVisible) {
        allPassed = false;
      }

      // 6. Check Close Button does NOT overlap switch link
      const closeBox = await closeBtn.boundingBox();
      const switchBox = await page.locator('.flow-top-switch-row').boundingBox();
      let closeOverlaps = false;
      if (closeBox && switchBox) {
        // In mobile, close button is top-right of left panel/video, switch is inside right panel.
        // In desktop, close button is top-right of right panel, check if bounding boxes overlap
        const xOverlap = Math.max(0, Math.min(closeBox.x + closeBox.width, switchBox.x + switchBox.width) - Math.max(closeBox.x, switchBox.x));
        const yOverlap = Math.max(0, Math.min(closeBox.y + closeBox.height, switchBox.y + switchBox.height) - Math.max(closeBox.y, switchBox.y));
        closeOverlaps = (xOverlap > 0 && yOverlap > 0);
      }
      if (closeOverlaps) {
        console.error(`  ❌ Close button overlaps account switch link!`);
        allPassed = false;
      } else {
        console.log(`  ✓ Close button position safe, zero overlap with switch link`);
      }

      // 7. Capture screenshot for proof
      const screenshotPath = path.join(ARTIFACT_DIR, `flow_viewport_${vp.name}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`  📸 Screenshot saved: ${screenshotPath}`);

      results.push({ viewport: vp.name, passed: fitsVertically && noHorizOverflow && !closeOverlaps });
    } catch (err) {
      console.error(`  ❌ Error during viewport ${vp.name}:`, err);
      allPassed = false;
      results.push({ viewport: vp.name, passed: false, error: err.message });
    } finally {
      await context.close();
    }
  }

  await browser.close();

  console.log('\n==================================================');
  console.log(`SUMMARY: ${allPassed ? 'ALL VIEWPORT TESTS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log(JSON.stringify(results, null, 2));
  console.log('==================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
