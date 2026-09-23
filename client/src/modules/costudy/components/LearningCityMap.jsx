import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../../../config/api.js';

const API_BASE = API_URL;

function getIconEmoji(iconStr, defaultEmoji = '🏛️') {
  if (!iconStr) return defaultEmoji;
  const map = {
    Terminal: '💻',
    Zap: '⚡',
    Shield: '🛡️',
    Globe: '🌐',
    Code2: '🧑‍💻',
    Database: '🗄️',
    Radio: '📡',
    Cpu: '🧠',
    Layers: '🥞',
    Server: '🖥️',
    Boxes: '📦',
    FileCode: '📄',
    FileCode2: '📄',
    Palette: '🎨',
    Settings: '⚙️',
    Sigma: '📐',
    BarChart: '📊',
    Wifi: '📶',
    Binary: '🔢',
    GitBranch: '🌿',
    Lock: '🔒',
    Award: '🏆',
    FolderTree: '🌳',
    FormInput: '📝',
    Video: '🎥',
    Eye: '👁️'
  };
  return map[iconStr] || iconStr;
}

/**
 * 2D Interactive Learning City Map
 * Renders 15 Knowledge Districts, Road Networks, Buildings, and Ambient Life.
 */
export default function LearningCityMap({ onSelectBuilding, searchQuery = '' }) {
  const [districts, setDistricts] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pan & Zoom camera state - centered on Web & Programming districts
  const [camera, setCamera] = useState({ x: -750, y: 0, zoom: 0.82 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const viewportRef = useRef(null);

  useEffect(() => {
    async function loadCity() {
      try {
        setLoading(true);
        const [distRes, bldRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/costudy/districts`).then((r) => r.json()),
          fetch(`${API_BASE}/api/v1/costudy/buildings`).then((r) => r.json())
        ]);

        if (distRes.success) setDistricts(distRes.districts || []);
        if (bldRes.success) setBuildings(bldRes.buildings || []);
      } catch (err) {
        console.error('Failed to load learning city map data:', err);
        setError('Failed to connect to city grid.');
      } finally {
        setLoading(false);
      }
    }
    loadCity();
  }, []);

  // Pan handlers
  const handleMouseDown = (e) => {
    // Only left click drags canvas
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      camX: camera.x,
      camY: camera.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setCamera((prev) => ({
      ...prev,
      x: dragStartRef.current.camX + dx,
      y: dragStartRef.current.camY + dy
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const handleZoom = (delta) => {
    setCamera((prev) => {
      const nextZoom = Math.min(Math.max(prev.zoom + delta, 0.45), 1.5);
      return { ...prev, zoom: nextZoom };
    });
  };

  const resetCamera = () => {
    setCamera({ x: -450, y: -250, zoom: 0.9 });
  };

  // Jump camera directly to a district
  const jumpToDistrict = (district) => {
    const x = -(district.grid_x * 0.9) + 400;
    const y = -(district.grid_y * 0.9) + 250;
    setCamera({ x, y, zoom: 1.0 });
  };

  // Filter buildings if user typed search query
  const filteredBuildings = buildings.filter((b) => {
    if (!searchQuery.trim()) return true;
    return (
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div
      className="cs-map-viewport"
      ref={viewportRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 2D Infinite City World Canvas */}
      <div
        className="cs-city-world-canvas"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`
        }}
      >
        {/* Road Grid Lines */}
        <div className="cs-road-network">
          <div className="cs-road-h" style={{ top: '680px' }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="cs-road-dash-h" />
            ))}
          </div>
          <div className="cs-road-h" style={{ top: '1350px' }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="cs-road-dash-h" />
            ))}
          </div>
          <div className="cs-road-v" style={{ left: '950px' }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="cs-road-dash-v" />
            ))}
          </div>
          <div className="cs-road-v" style={{ left: '1950px' }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="cs-road-dash-v" />
            ))}
          </div>
        </div>

        {/* 15 Knowledge Districts */}
        {districts.map((dist, idx) => {
          const districtBuildings = filteredBuildings.filter(
            (b) => b.district_id === dist.id
          );

          return (
            <div
              key={dist.id}
              className="cs-district-zone"
              style={{
                left: `${dist.grid_x || 100 + (idx % 4) * 580}px`,
                top: `${dist.grid_y || 100 + Math.floor(idx / 4) * 480}px`,
                width: '480px',
                minHeight: '380px',
                borderTopColor: dist.theme_color || '#CCFF00',
                borderTopWidth: '8px'
              }}
            >
              <div className="cs-district-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.4rem' }}>{getIconEmoji(dist.icon, '🏛️')}</span>
                  <div>
                    <div className="cs-district-name">{dist.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#666' }}>
                      {dist.description}
                    </div>
                  </div>
                </div>
                <span
                  className="cs-district-badge"
                  style={{
                    backgroundColor: dist.theme_color || '#CCFF00',
                    color: '#0B0B0B'
                  }}
                >
                  DISTRICT {String(idx + 1).padStart(2, '0')}
                </span>
              </div>

              {/* District Buildings Grid */}
              <div className="cs-district-buildings-grid">
                {districtBuildings.map((bld) => {
                  const isHtml = bld.slug === 'html-building';
                  const isLocked = bld.status === 'LOCKED';

                  return (
                    <div
                      key={bld.id}
                      className={`cs-building-card ${
                        isHtml ? 'active-target' : ''
                      } ${isLocked ? 'locked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBuilding(bld);
                      }}
                      title={bld.name}
                    >
                      <div className="cs-bld-top">
                        <span className="cs-bld-icon">{getIconEmoji(bld.icon, '🏢')}</span>
                        <span
                          className="cs-bld-status-badge"
                          style={{
                            background: isHtml ? '#CCFF00' : isLocked ? '#CCC' : '#FAF7EE'
                          }}
                        >
                          {isHtml ? 'ACTIVE MISSION' : isLocked ? 'LOCKED' : 'OPEN'}
                        </span>
                      </div>
                      <div>
                        <div className="cs-bld-title">{bld.name}</div>
                        <div className="cs-bld-meta">
                          <span>{bld.total_nodes || 6} Nodes</span>
                          <span>{isHtml ? 'Level 1' : 'Core'}</span>
                        </div>
                      </div>
                      <div className="cs-bld-bar-track">
                        <div
                          className="cs-bld-bar-fill"
                          style={{ width: isHtml ? '25%' : '0%' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Jump District Dock */}
      <div className="cs-district-dock">
        <span style={{ fontSize: '0.75rem', fontWeight: 900, marginRight: '4px' }}>
          CITY DISTRICTS:
        </span>
        {districts.map((d) => (
          <button
            key={d.id}
            className="cs-dock-pill"
            onClick={() => jumpToDistrict(d)}
          >
            {getIconEmoji(d.icon, '🏛️')} {d.name.replace(' District', '')}
          </button>
        ))}
      </div>

      {/* Floating Map Pan/Zoom Controls */}
      <div className="cs-map-controls">
        <button
          className="cs-map-btn"
          onClick={() => handleZoom(0.15)}
          title="Zoom In"
        >
          +
        </button>
        <button
          className="cs-map-btn"
          onClick={() => handleZoom(-0.15)}
          title="Zoom Out"
        >
          −
        </button>
        <button
          className="cs-map-btn"
          onClick={resetCamera}
          title="Reset View"
          style={{ fontSize: '0.8rem' }}
        >
          RESET
        </button>
      </div>
    </div>
  );
}
