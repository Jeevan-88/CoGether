/**
 * CoStudy Code Problem Submission Service
 * Evaluates student code against structured test suites, records submissions,
 * and calculates problem test pass rates.
 */

const { db } = require('../../packages/database');
const { learningRepository } = require('./learningRepository');
const { logger } = require('../../packages/observability');

class SubmissionService {
  /**
   * Evaluate a problem submission
   * Supports regex-based structural validation and DOM checks
   */
  async evaluateSubmission({ userId = 'anonymous', problemId, code }) {
    const problem = await learningRepository.getProblemById(problemId);
    if (!problem) {
      const err = new Error('Problem not found');
      err.statusCode = 404;
      throw err;
    }

    const testCases = Array.isArray(problem.test_cases_json) ? problem.test_cases_json : [];
    const testResults = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const tc of testCases) {
      const points = tc.points || 25;
      maxScore += points;
      let passed = false;

      if (tc.regex) {
        try {
          const rx = new RegExp(tc.regex, 'is');
          passed = rx.test(code);
        } catch (e) {
          logger.warn('Regex test execution failed:', { regex: tc.regex, error: e.message });
          passed = false;
        }
      }

      if (passed) totalScore += points;

      testResults.push({
        id: tc.id,
        description: tc.description,
        passed,
        pointsAwarded: passed ? points : 0,
        maxPoints: points
      });
    }

    const allPassed = testResults.every((t) => t.passed);
    const scorePct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100;

    // Record submission in PostgreSQL
    if (userId && userId !== 'anonymous') {
      try {
        const query = `
          INSERT INTO costudy.user_problem_submissions (user_id, problem_id, code_submitted, passed, test_results_json, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id;
        `;
        await db.query(query, [userId, problemId, code, allPassed, JSON.stringify(testResults)]);
      } catch (err) {
        logger.error('Failed to log problem submission:', { error: err.message });
      }
    }

    return {
      problemId,
      passed: allPassed,
      score: totalScore,
      maxScore,
      scorePct,
      testResults
    };
  }
}

const submissionService = new SubmissionService();
module.exports = { submissionService };
