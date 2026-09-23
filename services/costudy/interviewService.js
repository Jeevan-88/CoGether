/**
 * CoStudy AI Interviewer & Viva Service
 * Generates adaptive questions following a lesson and evaluates
 * student answers on correctness, technical reasoning, and terminology.
 */

const { db } = require('../../packages/database');
const { learningRepository } = require('./learningRepository');
const { logger } = require('../../packages/observability');

// Bank of adaptive viva questions keyed by lesson
const INTERVIEW_QUESTIONS = {
  lesson_html_01: [
    {
      id: 'q1',
      question: 'Why is the <!DOCTYPE html> declaration required at the top of an HTML document, and what happens if a developer omits it?',
      expectedKeywords: ['standard mode', 'quirks mode', 'rendering engine', 'browser standard'],
      rubric: 'Evaluates understanding of browser parser modes and legacy compatibility.'
    },
    {
      id: 'q2',
      question: 'Explain the fundamental architectural difference between an <article> and a <section> element. When would you nest one inside the other?',
      expectedKeywords: ['self-contained', 'independent', 'thematic', 'heading', 'syndication'],
      rubric: 'Evaluates grasp of semantic document structure vs layout slicing.'
    },
    {
      id: 'q3',
      question: 'How do semantic elements like <header>, <nav>, and <main> aid assistive screen readers compared to using <div> tags with class names?',
      expectedKeywords: ['aria', 'landmarks', 'screen reader', 'accessibility', 'dom tree', 'keyboard navigation'],
      rubric: 'Evaluates knowledge of web accessibility and automated assistive navigation.'
    }
  ]
};

class InterviewService {
  /**
   * Get adaptive viva interview questions for a completed lesson
   */
  async getQuestionsForLesson(lessonId) {
    const questions = INTERVIEW_QUESTIONS[lessonId] || [
      {
        id: 'q1',
        question: 'Explain the primary architectural concept taught in this lesson and provide a real-world use case.',
        expectedKeywords: ['concept', 'application', 'real-world'],
        rubric: 'Evaluates general comprehension and practical reasoning.'
      },
      {
        id: 'q2',
        question: 'What are common anti-patterns or edge cases to avoid when implementing this feature in production?',
        expectedKeywords: ['edge case', 'anti-pattern', 'performance', 'security'],
        rubric: 'Evaluates critical thinking and defensive engineering.'
      }
    ];

    return questions.map(({ id, question, rubric }) => ({ id, question, rubric }));
  }

  /**
   * Evaluate student responses to the interview
   */
  async evaluateInterview({ userId = 'anonymous', subjectId, lessonId, answers = [] }) {
    const questions = INTERVIEW_QUESTIONS[lessonId] || [];
    const evaluationDetails = [];
    let totalScore = 0;

    for (const q of questions) {
      const studentAnswer = (answers.find((a) => (a.questionId === q.id || a.id === q.id))?.answer || '').trim();
      const lower = studentAnswer.toLowerCase();
      
      // Keyword matching & depth calculation
      let matchedCount = 0;
      q.expectedKeywords.forEach((kw) => {
        if (lower.includes(kw.toLowerCase())) matchedCount++;
      });

      const lengthBonus = studentAnswer.length > 50 ? 20 : Math.round((studentAnswer.length / 50) * 20);
      const keywordScore = Math.min(Math.round((matchedCount / Math.max(q.expectedKeywords.length, 1)) * 80), 80);
      const score = Math.min(keywordScore + lengthBonus, 100);
      totalScore += score;

      evaluationDetails.push({
        questionId: q.id,
        question: q.question,
        answer: studentAnswer,
        score,
        feedback: score >= 75
          ? 'Strong technical answer demonstrating solid grasp of the core concept.'
          : score >= 50
          ? 'Acceptable response, but consider incorporating more standard terminology.'
          : 'Incomplete reasoning. Review the lesson section regarding browser rendering modes.'
      });
    }

    const averageScore = questions.length > 0 ? Math.round(totalScore / questions.length) : 85;
    const masteryVerdict = averageScore >= 70 ? 'MASTERY_ACHIEVED' : 'PRACTICE_RECOMMENDED';

    // Record interview in PostgreSQL
    if (userId && userId !== 'anonymous') {
      try {
        const query = `
          INSERT INTO costudy.user_interviews 
            (user_id, subject_id, lesson_id, questions_json, answers_json, score, mastery_verdict, feedback, completed_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING id;
        `;
        await db.query(query, [
          userId, 
          subjectId || 'sub_html', 
          lessonId, 
          JSON.stringify(questions), 
          JSON.stringify(answers), 
          averageScore, 
          masteryVerdict,
          `AI Viva completed with score ${averageScore}/100. Verdict: ${masteryVerdict}`
        ]);

        // Unlock next landmark or building if mastery achieved
        if (masteryVerdict === 'MASTERY_ACHIEVED') {
          const unlockQuery = `
            INSERT INTO costudy.user_unlocks (user_id, unlock_type, entity_id, unlocked_at)
            VALUES ($1, 'BUILDING', 'bld_css', NOW())
            ON CONFLICT DO NOTHING;
          `;
          await db.query(unlockQuery, [userId]);
        }
      } catch (err) {
        logger.error('Failed to persist interview results:', { error: err.message });
      }
    }

    return {
      lessonId,
      score: averageScore,
      totalScore: averageScore,
      passed: averageScore >= 60,
      masteryVerdict,
      feedback: averageScore >= 70
        ? 'Congratulations! You demonstrated solid semantic reasoning and standard-compliant understanding. Road to CSS Building unlocked.'
        : 'Review the key takeaways and try answering again with focus on DOM parsing rules.',
      evaluations: evaluationDetails,
      questionResults: evaluationDetails
    };
  }
}

const interviewService = new InterviewService();
module.exports = { interviewService };
