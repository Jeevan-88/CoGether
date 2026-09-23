import React, { useState, useEffect } from 'react';
import { API_URL } from '../../../config/api.js';

const API_BASE = API_URL;

/**
 * Academic Semester Campus Modal
 * University View: B.Tech CSE 4 Years, Semesters 1 through 8.
 * Maps university courses to physical Knowledge Buildings in the city.
 */
export default function SemesterCampusModal({ onClose, onSelectSubject }) {
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCurriculum() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/v1/costudy/curriculum`);
        const data = await res.json();
        if (data.success && data.semesters) {
          setCurriculum(data.semesters);
        }
      } catch (err) {
        console.error('Failed to load university curriculum:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCurriculum();
  }, []);

  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div
        className="cs-modal-content"
        style={{ maxWidth: '960px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cs-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>🎓</span>
            <div>
              <div className="cs-modal-title">B.Tech Computer Science & Engineering</div>
              <div style={{ fontSize: '0.78rem', color: '#666', fontWeight: 700 }}>
                4-Year Academic Progression • 8 Semesters mapped to City Buildings
              </div>
            </div>
          </div>
          <button className="cs-modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="cs-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', fontWeight: 800 }}>
              Loading University Curriculum Registry...
            </div>
          ) : (
            <div className="cs-semester-grid">
              {curriculum.map((sem) => {
                const semNum = sem.semesterNumber || sem.semester;
                const yearNum = sem.yearNumber || Math.ceil(semNum / 2);
                const courses = sem.courses || sem.subjects || [];
                const totalCredits = courses.reduce((sum, c) => sum + (c.credits || 4), 0);

                return (
                  <div key={semNum} className="cs-semester-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="cs-sem-year-badge">YEAR {yearNum}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#666' }}>
                        {totalCredits} Credits
                      </span>
                    </div>

                    <div className="cs-sem-title">SEMESTER {semNum}</div>

                    <div className="cs-sem-subjects-list">
                      {courses.map((course) => (
                        <div
                          key={course.id}
                          className="cs-sem-subj-item"
                          onClick={() => {
                            if (onSelectSubject) onSelectSubject(course);
                            onClose();
                          }}
                          style={{ cursor: 'pointer' }}
                          title={`Go to ${course.building_name || 'Building'}`}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {course.subject_title || course.name}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#888' }}>
                            🏢
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
