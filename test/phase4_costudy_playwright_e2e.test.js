/**
 * Phase 4.0 CoStudy World Playwright End-to-End & Visual Verification
 * Tests the complete student journey:
 * 2D Learning City Map -> HTML Building Interior -> Campus Roadmap ->
 * 10-Step Lesson Stage -> Live Code Sandbox -> Automated Tests -> AI Viva Defense -> Academic Campus
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\Jeevan Yadav\\.gemini\\antigravity\\brain\\ffb913c9-9fef-48d8-a847-5ecdea42d885';

async function runE2ETests() {
  console.log('🚀 Starting Phase 4.0 CoStudy Playwright E2E Test Suite...\n');
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
    // 1. Load CoStudy World via ?mode=study
    console.log('1. Navigating to CoStudy World at http://localhost:5173/?mode=study...');
    await page.goto('http://localhost:5173/?mode=study', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('.cs-hud', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Verify HUD
    const hudBrand = await page.locator('.cs-brand-badge').textContent();
    assert(hudBrand.includes('CO-STUDY WORLD'), `HUD Brand visible: "${hudBrand.trim()}"`);

    const missionPill = await page.locator('.cs-mission-pill').textContent();
    assert(missionPill.includes('HTML Building'), `Active Mission visible: "${missionPill.trim()}"`);

    // Verify 15 Districts rendered in canvas
    const districtCards = await page.locator('.cs-district-zone').count();
    assert(districtCards === 15, `Expected 15 knowledge district zones, got ${districtCards}`);

    // Verify HTML Building exists in Web District
    const htmlBuildingCard = page.locator('.cs-building-card.active-target');
    const isHtmlVisible = await htmlBuildingCard.isVisible();
    assert(isHtmlVisible, 'HTML Building highlighted as active target mission');

    // Capture Screen 1: 2D City Map
    const mapScreenshotPath = path.join(ARTIFACT_DIR, 'costudy_city_map_1440x900.png');
    await page.screenshot({ path: mapScreenshotPath });
    console.log(`  📸 Captured City Map screenshot: ${mapScreenshotPath}`);

    // 2. Click HTML Building to enter Building Interior & Campus Roadmap
    console.log('\n2. Entering HTML Building Interior...');
    await htmlBuildingCard.click({ force: true });
    await page.waitForSelector('.cs-interior-view', { timeout: 10000 });
    await page.waitForTimeout(1000);

    const interiorTitle = await page.locator('.cs-interior-info h1').textContent();
    assert(interiorTitle.includes('HTML & Web Document Engineering'), `Entered Building Interior: "${interiorTitle}"`);

    // Verify 6 Sequential Location Nodes
    const nodeCards = await page.locator('.cs-node-card').count();
    assert(nodeCards === 6, `Expected 6 campus roadmap nodes, got ${nodeCards}`);

    // Verify Quest Box
    const questTitle = await page.locator('.cs-quest-title').textContent();
    assert(questTitle.includes('Web Design Studio'), `Themed Enterprise Quest present: "${questTitle}"`);

    // Capture Screen 2: Building Interior & Campus Roadmap
    const interiorScreenshotPath = path.join(ARTIFACT_DIR, 'costudy_building_interior_1440x900.png');
    await page.screenshot({ path: interiorScreenshotPath });
    console.log(`  📸 Captured Building Interior screenshot: ${interiorScreenshotPath}`);

    // 3. Launch Lesson 1: HTML Architecture & Document Anatomy
    console.log('\n3. Launching Lesson Stage on Node 1...');
    const startLessonBtn = page.locator('.cs-node-action-btn').first();
    await startLessonBtn.click({ force: true });
    await page.waitForSelector('.cs-lesson-stage', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify 10-Step Stepper Ribbon
    const stepperTabs = await page.locator('.cs-step-tab').count();
    assert(stepperTabs === 10, `10-Step Learning Loop ribbon rendered with ${stepperTabs} steps`);

    // Step 1: Learn content
    const learnTitle = await page.locator('.cs-lesson-article h1').textContent();
    assert(learnTitle.includes('HTML Document Foundation') || learnTitle.includes('HTML Architecture'), `Step 1 Theory Article visible: "${learnTitle}"`);

    // Advance to Step 2: Visualize DOM Tree
    console.log('\n4. Testing Step 2: Visualize DOM Tree...');
    const step2Tab = page.locator('.cs-step-tab').nth(1);
    await step2Tab.click();
    await page.waitForTimeout(500);

    const domVisual = await page.locator('text=Document Root').isVisible();
    assert(domVisual, 'Interactive DOM Root visualization rendered');

    // Capture Screen 3: DOM Visualizer
    const domVisualScreenshotPath = path.join(ARTIFACT_DIR, 'costudy_dom_visualize_1440x900.png');
    await page.screenshot({ path: domVisualScreenshotPath });
    console.log(`  📸 Captured DOM Visualize screenshot: ${domVisualScreenshotPath}`);

    // Jump to Step 5: Graded Coding Problems
    console.log('\n5. Testing Step 5: 4 Real-World Coding Problems & Live Sandbox...');
    const step5Tab = page.locator('.cs-step-tab').nth(4);
    await step5Tab.click();
    await page.waitForTimeout(1000);

    const problemCards = await page.locator('.cs-prob-card').count();
    assert(problemCards === 4, `All 4 real-world coding problems visible in problems panel, got ${problemCards}`);

    // Verify Code Sandbox textarea & Live Preview iframe
    const hasTextarea = await page.locator('.cs-code-textarea').isVisible();
    const hasIframe = await page.locator('.cs-preview-iframe').isVisible();
    assert(hasTextarea && hasIframe, 'Live Code Sandbox split view with DOM preview iframe rendered');

    // Submit code for Problem 1
    const testCodeBtn = page.locator('button:has-text("Submit & Test Code")');
    await testCodeBtn.click();
    await page.waitForTimeout(1500);

    // Verify test results tray
    const testResultsVisible = await page.locator('text=TEST CASES PASSED').or(page.locator('text=TEST SUITE FAILED')).isVisible();
    assert(testResultsVisible, 'Automated regex test runner evaluated code and displayed results tray');

    // Capture Screen 4: Problems & Code Sandbox
    const sandboxScreenshotPath = path.join(ARTIFACT_DIR, 'costudy_sandbox_problems_1440x900.png');
    await page.screenshot({ path: sandboxScreenshotPath });
    console.log(`  📸 Captured Problems & Sandbox screenshot: ${sandboxScreenshotPath}`);

    // 6. Test Step 8: Interactive AI Faculty Tutor
    console.log('\n6. Testing Step 8: AI Faculty Tutor...');
    const step8Tab = page.locator('.cs-step-tab').nth(7);
    await step8Tab.click();
    await page.waitForTimeout(600);

    const tutorInput = page.locator('.cs-stage-split-left input.cs-search-input');
    await tutorInput.fill('Why is doctype required for standards mode?');
    await page.locator('button:has-text("Send")').click();
    await page.waitForTimeout(1000);

    const tutorReply = await page.locator('text=Standards Mode').last().isVisible();
    assert(tutorReply, 'AI Faculty Tutor answered conceptual question regarding standards mode');

    // 7. Test Academic Campus Modal (B.Tech CSE 1-8 Semesters)
    console.log('\n7. Testing University Campus Modal (B.Tech CSE 8 Semesters)...');
    const academicCampusBtn = page.locator('.cs-btn-academic');
    await academicCampusBtn.click();
    await page.waitForSelector('.cs-semester-grid', { timeout: 10000 });
    await page.waitForTimeout(500);

    const semCards = await page.locator('.cs-semester-card').count();
    assert(semCards === 8, `University Campus modal rendered all 8 B.Tech CSE semesters, got ${semCards}`);

    // Capture Screen 5: Academic Campus Modal
    const campusScreenshotPath = path.join(ARTIFACT_DIR, 'costudy_academic_campus_modal_1440x900.png');
    await page.screenshot({ path: campusScreenshotPath });
    console.log(`  📸 Captured Academic Campus Modal screenshot: ${campusScreenshotPath}`);

    // Close modal
    await page.locator('.cs-modal-close-btn').click();
    await page.waitForTimeout(300);

    console.log(`\n========================================`);
    console.log(`✅ PLAYWRIGHT E2E RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Playwright E2E test execution error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runE2ETests();
