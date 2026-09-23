/**
 * Phase 4.0 CoStudy World Architecture & Services Test Suite
 * Validates database schema, city repository, learning repository,
 * problem test validation service, and AI viva interview scoring.
 */

const { db } = require('../packages/database');
const { cityRepository } = require('../services/costudy/cityRepository');
const { learningRepository } = require('../services/costudy/learningRepository');
const { submissionService } = require('../services/costudy/submissionService');
const { interviewService } = require('../services/costudy/interviewService');

async function runPhase4Tests() {
  console.log('🧪 Starting Phase 4.0 CoStudy Architecture Tests...\n');
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
    // 1. Validate Database Schema & 15 Districts
    console.log('1. Validating 15 Knowledge Districts in Database...');
    const districts = await cityRepository.getDistricts();
    assert(districts && districts.length === 15, `Expected 15 knowledge districts, got ${districts?.length}`);
    const webDistrict = districts.find(d => d.slug === 'web' || d.id === 'dist_web');
    assert(webDistrict !== undefined, 'Web District exists in knowledge grid');

    // 2. Validate Buildings & Placement
    console.log('\n2. Validating Core Knowledge Buildings...');
    const buildings = await cityRepository.getBuildings();
    assert(buildings && buildings.length >= 25, `Expected at least 25 core buildings, got ${buildings?.length}`);
    const htmlBuilding = buildings.find(b => b.slug === 'html-building' || b.id === 'bld_html');
    assert(htmlBuilding !== undefined, 'HTML Building exists and is placed in Web District');
    assert(htmlBuilding?.district_id === 'dist_web', 'HTML Building mapped to Web District');

    // 3. Validate University Curriculum Progression (B.Tech CSE 1-8 Semesters)
    console.log('\n3. Validating B.Tech CSE University Curriculum Mapping...');
    const curriculumData = await cityRepository.getCurriculum('B.Tech CSE');
    const semesters = curriculumData?.semesters;
    assert(semesters && semesters.length === 8, `Expected 8 semesters for B.Tech CSE, got ${semesters?.length}`);
    const sem1 = semesters.find(s => s.semesterNumber === 1);
    assert(sem1 && sem1.courses?.length >= 2, 'Semester 1 contains core foundation subjects');

    // 4. Validate HTML Building Campus Roadmap (6 Location Nodes)
    console.log('\n4. Validating HTML Building Roadmap & Nodes...');
    const roadmap = await learningRepository.getSubjectRoadmap('html-building');
    assert(roadmap !== null, 'HTML Subject roadmap resolved from building slug');
    assert(roadmap?.nodes?.length === 6, `Expected 6 physical location nodes for HTML, got ${roadmap?.nodes?.length}`);
    const node1 = roadmap?.nodes?.[0];
    assert(node1?.title === 'HTML Architecture & Document Anatomy', `First node is Document Anatomy, got "${node1?.title}"`);
    assert(node1?.location_type === 'RECEPTION', `First node location type is RECEPTION, got "${node1?.location_type}"`);
    assert(roadmap?.quest !== null, 'Themed enterprise quest is present in roadmap');

    // 5. Validate Node 1 Details, Lesson, and 4 Coding Problems
    console.log('\n5. Validating Node 1 Details & 4 Real-World Coding Problems...');
    const nodeDetails = await learningRepository.getNodeDetails(node1.id);
    assert(nodeDetails?.lesson !== null, 'Lesson theory content exists for Node 1');
    assert(nodeDetails?.problems?.length === 4, `Expected 4 real problems for Node 1, got ${nodeDetails?.problems?.length}`);
    const prob1 = nodeDetails.problems[0];
    assert(prob1.title.includes('Document Skeleton'), `Problem 1 title contains Document Skeleton: "${prob1.title}"`);
    assert(prob1.test_cases?.length >= 2, `Problem 1 has at least 2 automated test cases`);

    // 6. Validate Automated Code Evaluation (submissionService)
    console.log('\n6. Validating Automated Code Evaluation Runner...');
    // Correct solution
    const validCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CoStudy Enterprise</title>
</head>
<body>
  <h1>Welcome to CoStudy</h1>
</body>
</html>`;
    const validEval = await submissionService.evaluateSubmission({
      problemId: prob1.id,
      code: validCode
    });
    assert(validEval.passed === true, 'Correct HTML markup passes all automated test cases');
    assert(validEval.score === validEval.maxScore, `Score earned matches problem points (${validEval.score}/${validEval.maxScore})`);

    // Incorrect solution (missing viewport and doctype)
    const invalidCode = `<html><head><title>Test</title></head><body><h1>Hi</h1></body></html>`;
    const invalidEval = await submissionService.evaluateSubmission({
      problemId: prob1.id,
      code: invalidCode
    });
    assert(invalidEval.passed === false, 'Markup missing DOCTYPE and viewport fails test suite');
    assert(invalidEval.testResults.some(t => !t.passed), 'Failing test case accurately reported');

    // 7. Validate Adaptive AI Viva Interview Service
    console.log('\n7. Validating AI Viva Interview Service...');
    const vivaQuestions = await interviewService.getQuestionsForLesson(nodeDetails.lesson.id);
    assert(vivaQuestions && vivaQuestions.length >= 2, `Expected at least 2 viva questions, got ${vivaQuestions?.length}`);

    // Strong technical answer covering all viva questions
    const strongAnswers = [
      {
        id: 'q1',
        answer: 'The doctype declaration instructs the browser to render in standard mode, preventing quirky quirks mode. It specifies the HTML5 rendering engine browser standard.'
      },
      {
        id: 'q2',
        answer: 'An article is a self-contained and independent element suitable for syndication with its own heading. A section is a thematic grouping.'
      },
      {
        id: 'q3',
        answer: 'Semantic tags like header, nav, and main create direct landmarks in the accessibility dom tree for screen reader keyboard navigation, unlike generic div tags.'
      }
    ];
    const strongEval = await interviewService.evaluateInterview({
      lessonId: nodeDetails.lesson.id,
      answers: strongAnswers
    });
    assert(strongEval.passed === true, `Strong technical viva defense passes (score: ${strongEval.totalScore})`);
    assert(strongEval.totalScore >= 60, `Score ${strongEval.totalScore} is at or above passing threshold (60)`);

    // Weak / vague answer
    const weakAnswers = [
      { id: vivaQuestions[0].id, answer: 'it is for html' },
      { id: vivaQuestions[1]?.id || 'viva_2', answer: 'divs are boxes' }
    ];
    const weakEval = await interviewService.evaluateInterview({
      lessonId: nodeDetails.lesson.id,
      answers: weakAnswers
    });
    assert(weakEval.passed === false, `Vague viva answers do not pass (score: ${weakEval.totalScore})`);
    assert(weakEval.totalScore < 60, `Score ${weakEval.totalScore} is below threshold`);

    console.log(`\n========================================`);
    console.log(`✅ TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Unexpected test error:', err);
    process.exit(1);
  }
}

runPhase4Tests();
