/**
 * CoStudy Learning Repository
 * Manages learning nodes, interactive lessons, problems, quests,
 * and user progress / mastery tracking.
 */

const { db } = require('../../packages/database');
const { logger } = require('../../packages/observability');

class LearningRepository {
  /**
   * Get subject details and campus roadmap nodes
   */
  async getSubjectRoadmap(subjectIdOrSlug, userId = null) {
    const subjectQuery = `
      SELECT 
        s.id, s.building_id, s.slug, s.name, s.description, s.syllabus_code, s.icon,
        b.name AS building_name, b.slug AS building_slug, b.prerequisite_building_ids,
        d.name AS district_name, d.theme_color AS district_color
      FROM costudy.subjects s
      JOIN costudy.buildings b ON b.id = s.building_id
      JOIN costudy.districts d ON d.id = b.district_id
      WHERE s.id = $1 OR s.slug = $1 OR b.id = $1 OR b.slug = $1;
    `;
    const sRes = await db.query(subjectQuery, [subjectIdOrSlug]);
    const subject = sRes.rows[0];
    if (!subject) return null;

    const nodesQuery = `
      SELECT 
        n.id, n.subject_id, n.node_order, n.slug, n.title, 
        n.location_type, n.description, n.estimated_minutes,
        p.status, p.score, p.mastery_pct
      FROM costudy.learning_nodes n
      LEFT JOIN costudy.user_progress p ON p.node_id = n.id AND p.user_id = $2
      WHERE n.subject_id = $1
      ORDER BY n.node_order ASC;
    `;
    const nRes = await db.query(nodesQuery, [subject.id, userId || 'anonymous']);

    const questQuery = `
      SELECT id, subject_id, title, theme_name, brief, objective, reward_xp, badge_title
      FROM costudy.quests
      WHERE subject_id = $1;
    `;
    const qRes = await db.query(questQuery, [subject.id]);

    return {
      subject,
      nodes: nRes.rows.map((node) => ({
        ...node,
        status: node.status || 'NOT_STARTED',
        score: node.score || 0,
        masteryPct: node.mastery_pct || 0
      })),
      quest: qRes.rows[0] || null
    };
  }

  /**
   * Get full node detail with lesson and 4 real problems
   */
  async getNodeDetails(nodeId, userId = null) {
    const nodeQuery = `
      SELECT 
        n.id, n.subject_id, n.node_order, n.slug, n.title, 
        n.location_type, n.description, n.estimated_minutes,
        s.name AS subject_name, s.slug AS subject_slug,
        b.name AS building_name, b.slug AS building_slug,
        p.status, p.score, p.mastery_pct
      FROM costudy.learning_nodes n
      JOIN costudy.subjects s ON s.id = n.subject_id
      JOIN costudy.buildings b ON b.id = s.building_id
      LEFT JOIN costudy.user_progress p ON p.node_id = n.id AND p.user_id = $2
      WHERE n.id = $1;
    `;
    const nRes = await db.query(nodeQuery, [nodeId, userId || 'anonymous']);
    const node = nRes.rows[0];
    if (!node) return null;

    const lessonQuery = `
      SELECT id, node_id, title, summary, content_markdown, key_takeaways, sandbox_starter_code
      FROM costudy.lessons
      WHERE node_id = $1;
    `;
    const lRes = await db.query(lessonQuery, [nodeId]);
    const lesson = lRes.rows[0] || null;

    let problems = [];
    if (lesson) {
      const probQuery = `
        SELECT 
          id, lesson_id, problem_order, title, difficulty, description, 
          starter_code, test_cases_json, solution_code
        FROM costudy.problems
        WHERE lesson_id = $1
        ORDER BY problem_order ASC;
      `;
      const pRes = await db.query(probQuery, [lesson.id]);
      problems = pRes.rows.map((p) => ({
        ...p,
        test_cases: p.test_cases_json,
        points: 25
      }));
    }

    return {
      node: {
        ...node,
        status: node.status || 'NOT_STARTED',
        score: node.score || 0,
        masteryPct: node.mastery_pct || 0
      },
      lesson,
      problems
    };
  }

  /**
   * Get a single problem by ID
   */
  async getProblemById(problemId) {
    const query = `
      SELECT 
        id, lesson_id, problem_order, title, difficulty, description, 
        starter_code, test_cases_json, solution_code
      FROM costudy.problems
      WHERE id = $1;
    `;
    const res = await db.query(query, [problemId]);
    return res.rows[0] || null;
  }

  /**
   * Record node completion and mastery
   */
  async recordNodeProgress(userId, nodeId, { status = 'COMPLETED', score = 100, masteryPct = 100 } = {}) {
    const query = `
      INSERT INTO costudy.user_progress (user_id, node_id, status, score, mastery_pct, completed_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (user_id, node_id) DO UPDATE SET
        status = EXCLUDED.status,
        score = GREATEST(costudy.user_progress.score, EXCLUDED.score),
        mastery_pct = GREATEST(costudy.user_progress.mastery_pct, EXCLUDED.mastery_pct),
        completed_at = CASE WHEN costudy.user_progress.completed_at IS NULL THEN NOW() ELSE costudy.user_progress.completed_at END,
        updated_at = NOW()
      RETURNING *;
    `;
    const res = await db.query(query, [userId, nodeId, status, score, masteryPct]);
    return res.rows[0];
  }

  /**
   * Retrieve total user progress across the city
   */
  async getUserCityProgress(userId) {
    const progressQuery = `
      SELECT 
        p.node_id, p.status, p.score, p.mastery_pct, p.completed_at,
        n.title AS node_title, n.subject_id, s.name AS subject_name, s.building_id
      FROM costudy.user_progress p
      JOIN costudy.learning_nodes n ON n.id = p.node_id
      JOIN costudy.subjects s ON s.id = n.subject_id
      WHERE p.user_id = $1;
    `;
    const pRes = await db.query(progressQuery, [userId]);

    const unlocksQuery = `
      SELECT unlock_type, entity_id, unlocked_at
      FROM costudy.user_unlocks
      WHERE user_id = $1;
    `;
    const uRes = await db.query(unlocksQuery, [userId]);

    return {
      userId,
      completedNodes: pRes.rows,
      unlocks: uRes.rows,
      totalScore: pRes.rows.reduce((sum, r) => sum + (r.score || 0), 0)
    };
  }
}

const learningRepository = new LearningRepository();
module.exports = { learningRepository };
