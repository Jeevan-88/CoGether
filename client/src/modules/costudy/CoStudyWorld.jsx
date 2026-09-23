import React, { useState } from 'react';
import './CoStudyLayout.css';
import LearningCityMap from './components/LearningCityMap';
import BuildingInteriorView from './components/BuildingInteriorView';
import LessonStage from './components/LessonStage';
import SemesterCampusModal from './components/SemesterCampusModal';
import MergedCameraView from './MergedCameraView';

/**
 * CoStudy World — 2D Learning City & Gamified CSE Knowledge World
 * Master container managing HUD, View States, and Learning Loops.
 */
export default function CoStudyWorld() {
  // Current view state: 'CITY_MAP', 'BUILDING_INTERIOR', 'LESSON_STAGE', 'STUDY_ROOM'
  const [currentView, setCurrentView] = useState('CITY_MAP');

  // Selected building & node
  const [selectedBuilding, setSelectedBuilding] = useState({
    id: 'bld_html',
    slug: 'html-building',
    name: 'HTML Building',
    district_id: 'dist_web'
  });
  const [selectedNode, setSelectedNode] = useState(null);
  const [subjectContext, setSubjectContext] = useState(null);

  // Search & Modals
  const [searchQuery, setSearchQuery] = useState('');
  const [showCampusModal, setShowCampusModal] = useState(false);

  // Gamification Player Stats
  const [playerStats, setPlayerStats] = useState({
    level: 1,
    xp: 150,
    streakDays: 3,
    activeMission: 'HTML Building • Document Anatomy'
  });

  // Navigate to Building Interior
  const handleSelectBuilding = (building) => {
    setSelectedBuilding(building);
    setCurrentView('BUILDING_INTERIOR');
  };

  // Navigate to Lesson Stage
  const handleSelectNode = (node, roadmapData) => {
    setSelectedNode(node);
    setSubjectContext(roadmapData?.subject || null);
    setCurrentView('LESSON_STAGE');
  };

  // Node completed handler
  const handleNodeComplete = (nodeId, evalResult) => {
    setPlayerStats((prev) => ({
      ...prev,
      xp: prev.xp + 100,
      activeMission: 'HTML Building • Elements Lab'
    }));
  };

  // Selection from University Semester Modal
  const handleSelectSubjectFromCampus = (subject) => {
    setSelectedBuilding({
      id: subject.building_id,
      slug: subject.building_slug || 'html-building',
      name: subject.building_name || subject.name,
      district_id: 'dist_web'
    });
    setCurrentView('BUILDING_INTERIOR');
  };

  return (
    <div className="costudy-root">
      {/* ────────────────── TOP HUD ────────────────── */}
      <header className="cs-hud">
        {/* Brand & Badge */}
        <div className="cs-hud-brand">
          <div
            className="cs-brand-badge"
            onClick={() => setCurrentView('CITY_MAP')}
            title="Return to City Map"
          >
            <span>🏙️</span>
            <span>CO-STUDY WORLD</span>
          </div>
          <span className="cs-brand-tag">CSE CITY</span>
        </div>

        {/* Center: Mission Pill & City Search */}
        <div className="cs-hud-center">
          <div className="cs-mission-pill" title="Current Active Objective">
            <span className="cs-mission-dot" />
            <span style={{ color: '#888' }}>MISSION:</span>
            <span>{playerStats.activeMission}</span>
          </div>

          <div className="cs-search-input-wrap">
            <span className="cs-search-icon">🔍</span>
            <input
              type="text"
              className="cs-search-input"
              placeholder="Search CSE buildings, algorithms, or concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Right Actions & Player Stats */}
        <div className="cs-hud-actions">
          <div className="cs-stat-chip" title="Continuous Study Streak">
            <span>🔥</span>
            <span>{playerStats.streakDays}D STREAK</span>
          </div>

          <div className="cs-stat-chip" title="Knowledge XP">
            <span>⚡</span>
            <span>{playerStats.xp} XP</span>
          </div>

          <button
            className="cs-btn-academic"
            onClick={() => setShowCampusModal(true)}
            title="Open B.Tech CSE University Curriculum"
          >
            <span>🎓</span>
            <span>B.Tech CSE Campus</span>
          </button>

          <button
            className="cs-btn-studyroom"
            onClick={() => setCurrentView(currentView === 'STUDY_ROOM' ? 'CITY_MAP' : 'STUDY_ROOM')}
            title="Launch Duo Camera Co-Working Study Desk"
          >
            <span>📹</span>
            <span>{currentView === 'STUDY_ROOM' ? 'Exit Room' : 'Duo Study Room'}</span>
          </button>
        </div>
      </header>

      {/* ────────────────── BODY AREA ────────────────── */}
      <main className="cs-body-area">
        {/* Breadcrumb Navigation Bar */}
        <div className="cs-subnav-bar">
          <div className="cs-breadcrumb">
            <span
              className="cs-crumb-link"
              onClick={() => setCurrentView('CITY_MAP')}
            >
              2D City Map
            </span>

            {currentView !== 'CITY_MAP' && selectedBuilding && (
              <>
                <span className="cs-crumb-separator">/</span>
                <span
                  className={currentView === 'BUILDING_INTERIOR' ? 'cs-crumb-active' : 'cs-crumb-link'}
                  onClick={() => setCurrentView('BUILDING_INTERIOR')}
                >
                  {selectedBuilding.name}
                </span>
              </>
            )}

            {currentView === 'LESSON_STAGE' && selectedNode && (
              <>
                <span className="cs-crumb-separator">/</span>
                <span className="cs-crumb-active">
                  Node 0{selectedNode.node_order}: {selectedNode.title}
                </span>
              </>
            )}

            {currentView === 'STUDY_ROOM' && (
              <>
                <span className="cs-crumb-separator">/</span>
                <span className="cs-crumb-active">Shared Virtual Study Desk</span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#777' }}>
              DISTRICT: WEB & CLOUD SYSTEMS
            </span>
          </div>
        </div>

        {/* 1. 2D City Map View */}
        {currentView === 'CITY_MAP' && (
          <LearningCityMap
            searchQuery={searchQuery}
            onSelectBuilding={handleSelectBuilding}
          />
        )}

        {/* 2. Building Interior Campus Roadmap */}
        {currentView === 'BUILDING_INTERIOR' && (
          <BuildingInteriorView
            building={selectedBuilding}
            onSelectNode={handleSelectNode}
            onBackToCity={() => setCurrentView('CITY_MAP')}
          />
        )}

        {/* 3. 10-Step Lesson Stage */}
        {currentView === 'LESSON_STAGE' && (
          <LessonStage
            nodeId={selectedNode?.id || 'node_html_01'}
            subject={subjectContext}
            onNodeComplete={handleNodeComplete}
            onBackToRoadmap={() => setCurrentView('BUILDING_INTERIOR')}
          />
        )}

        {/* 4. Duo Camera Study Room */}
        {currentView === 'STUDY_ROOM' && (
          <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
            <MergedCameraView />
          </div>
        )}
      </main>

      {/* University Campus Modal (B.Tech CSE 1-8 Semesters) */}
      {showCampusModal && (
        <SemesterCampusModal
          onClose={() => setShowCampusModal(false)}
          onSelectSubject={handleSelectSubjectFromCampus}
        />
      )}
    </div>
  );
}
