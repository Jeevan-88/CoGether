import React, { useState, useEffect } from 'react';
import { API_URL } from '../../../config/api.js';

const API_BASE = API_URL;

/**
 * Building Interior & Campus Roadmap View
 * Renders the building's physical campus roadmap nodes and the active enterprise quest.
 */
export default function BuildingInteriorView({ building, onSelectNode, onBackToCity }) {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRoadmap() {
      try {
        setLoading(true);
        const identifier = building.slug || building.id;
        const res = await fetch(`${API_BASE}/api/v1/costudy/subjects/${identifier}/roadmap`);
        const data = await res.json();

        if (data.success) {
          setRoadmap(data);
        } else {
          setError(data.error || 'Failed to load building roadmap');
        }
      } catch (err) {
        console.error('Failed to load roadmap:', err);
        setError('Connection error while entering building.');
      } finally {
        setLoading(false);
      }
    }

    if (building) {
      loadRoadmap();
    }
  }, [building]);

  if (loading) {
    return (
      <div className="cs-interior-view" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>Entering {building?.name || 'Building'}...</div>
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="cs-interior-view" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#C62828' }}>{error || 'Building roadmap unavailable.'}</div>
        <button
          className="cs-node-action-btn"
          style={{ marginTop: '16px' }}
          onClick={onBackToCity}
        >
          Return to City Map
        </button>
      </div>
    );
  }

  const { subject, nodes = [], quest } = roadmap;

  return (
    <div className="cs-interior-view">
      {/* Interior Hero Banner */}
      <div className="cs-interior-hero">
        <div className="cs-interior-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              className="cs-district-badge"
              style={{
                backgroundColor: subject.district_color || '#CCFF00',
                color: '#0B0B0B'
              }}
            >
              {subject.district_name || 'Web District'}
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#666' }}>
              CODE: {subject.syllabus_code || 'CS-WEB-101'}
            </span>
          </div>

          <h1>{subject.name}</h1>
          <p style={{ maxWidth: '640px', fontSize: '0.95rem', color: '#444', lineHeight: 1.4, margin: 0 }}>
            {subject.description}
          </p>

          <div className="cs-interior-meta">
            <span className="cs-stat-chip">📍 6 Campus Nodes</span>
            <span className="cs-stat-chip">⚡ 400 Total XP</span>
            <span className="cs-stat-chip">🏆 Level 1 Mastery Certificate</span>
          </div>
        </div>

        {/* Themed Enterprise Quest Card */}
        {quest && (
          <div className="cs-interior-quest-box">
            <span className="cs-quest-tag">ACTIVE DISTRICT QUEST</span>
            <div className="cs-quest-title">{quest.title}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FF3366', marginBottom: '6px' }}>
              ROLE: {quest.theme_name}
            </div>
            <div className="cs-quest-brief">{quest.brief}</div>
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>REWARD: +{quest.reward_xp} XP</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#0B0B0B', color: '#CCFF00', padding: '2px 6px', borderRadius: '4px' }}>
                🏅 {quest.badge_title}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sequential Campus Roadmap Nodes */}
      <div className="cs-roadmap-container">
        <div className="cs-roadmap-header">
          <span>🏛️</span>
          <span>Sequential Campus Learning Path</span>
          <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 700, marginLeft: 'auto' }}>
            Complete nodes to unlock campus wings
          </span>
        </div>

        <div className="cs-nodes-grid">
          {nodes.map((node, index) => {
            const isFirst = index === 0;
            const isCompleted = node.status === 'COMPLETED';
            const isLocked = !isFirst && !isCompleted;

            return (
              <div
                key={node.id}
                className={`cs-node-card ${isCompleted ? 'completed' : ''}`}
                onClick={() => onSelectNode(node, roadmap)}
              >
                <div>
                  <div className="cs-node-top">
                    <span className="cs-node-num-badge">0{node.node_order}</span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        background: '#ECE7DA',
                        border: '1px solid #0B0B0B',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}
                    >
                      {node.location_type || 'LAB'}
                    </span>
                  </div>
                  <h3 className="cs-node-title" style={{ marginTop: '10px' }}>
                    {node.title}
                  </h3>
                  <p className="cs-node-desc">{node.description}</p>
                </div>

                <div className="cs-node-footer">
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#666' }}>
                    ⏱️ ~{node.estimated_minutes} mins
                  </span>
                  <button
                    className="cs-node-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNode(node, roadmap);
                    }}
                  >
                    {isCompleted ? 'REVIEW' : 'START LESSON →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
