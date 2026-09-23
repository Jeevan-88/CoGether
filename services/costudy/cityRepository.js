/**
 * CoStudy City Repository
 * Manages knowledge districts, 2D learning city buildings, road networks,
 * and universal curriculum mappings for the academic campus view.
 */

const { db } = require('../../packages/database');
const { logger } = require('../../packages/observability');

class CityRepository {
  /**
   * Retrieve all 15 knowledge districts with building counts
   */
  async getDistricts() {
    const query = `
      SELECT 
        d.id, d.slug, d.name, d.theme_color, d.accent_color, 
        d.description, d.order_index, d.icon, d.position_x, d.position_y,
        COUNT(b.id)::INTEGER AS total_buildings
      FROM costudy.districts d
      LEFT JOIN costudy.buildings b ON b.district_id = d.id
      GROUP BY d.id
      ORDER BY d.order_index ASC;
    `;
    const res = await db.query(query);
    return res.rows;
  }

  /**
   * Retrieve all buildings or filter by district
   */
  async getBuildings(districtId = null) {
    let query = `
      SELECT 
        b.id, b.district_id, b.slug, b.name, b.category, 
        b.prerequisite_building_ids, b.total_nodes, b.icon, 
        b.position_x, b.position_y, b.status,
        d.name AS district_name, d.theme_color AS district_color,
        s.id AS subject_id, s.slug AS subject_slug
      FROM costudy.buildings b
      JOIN costudy.districts d ON d.id = b.district_id
      LEFT JOIN costudy.subjects s ON s.building_id = b.id
    `;
    const params = [];
    if (districtId) {
      query += ` WHERE b.district_id = $1`;
      params.push(districtId);
    }
    query += ` ORDER BY b.position_y ASC, b.position_x ASC;`;
    const res = await db.query(query, params);
    return res.rows;
  }

  /**
   * Get single building by ID or slug with its universal subject
   */
  async getBuildingById(idOrSlug) {
    const query = `
      SELECT 
        b.id, b.district_id, b.slug, b.name, b.category, 
        b.prerequisite_building_ids, b.total_nodes, b.icon, 
        b.position_x, b.position_y, b.status,
        d.name AS district_name, d.theme_color AS district_color,
        s.id AS subject_id, s.slug AS subject_slug, s.description AS subject_description
      FROM costudy.buildings b
      JOIN costudy.districts d ON d.id = b.district_id
      LEFT JOIN costudy.subjects s ON s.building_id = b.id
      WHERE b.id = $1 OR b.slug = $1;
    `;
    const res = await db.query(query, [idOrSlug]);
    return res.rows[0] || null;
  }

  /**
   * Retrieve universal curriculum mappings organized into Year 1-4 and Semesters 1-8
   */
  async getCurriculum(degree = 'B.Tech CSE') {
    const query = `
      SELECT 
        cm.id, cm.university_name, cm.degree, cm.year_number, cm.semester_number,
        cm.subject_id, cm.subject_title, cm.is_core, cm.credits,
        s.slug AS subject_slug, s.syllabus_code, s.icon AS subject_icon,
        b.id AS building_id, b.name AS building_name, b.icon AS building_icon,
        d.name AS district_name, d.theme_color AS district_color
      FROM costudy.curriculum_mappings cm
      JOIN costudy.subjects s ON s.id = cm.subject_id
      JOIN costudy.buildings b ON b.id = s.building_id
      JOIN costudy.districts d ON d.id = b.district_id
      WHERE cm.degree = $1
      ORDER BY cm.year_number ASC, cm.semester_number ASC, cm.subject_title ASC;
    `;
    const res = await db.query(query, [degree]);
    
    // Group into 8 semesters
    const semesters = {};
    for (let s = 1; s <= 8; s++) {
      semesters[s] = {
        semesterNumber: s,
        yearNumber: Math.ceil(s / 2),
        courses: []
      };
    }

    res.rows.forEach((row) => {
      if (semesters[row.semester_number]) {
        semesters[row.semester_number].courses.push(row);
      }
    });

    return {
      degree,
      semesters: Object.values(semesters)
    };
  }
}

const cityRepository = new CityRepository();
module.exports = { cityRepository };
