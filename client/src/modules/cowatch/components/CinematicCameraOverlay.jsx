import React, { useState, useEffect, useRef, useCallback } from 'react';
import './CinematicCameraOverlay.css';
import * as MP from '@mediapipe/selfie_segmentation';

const SelfieSegmentation = MP.SelfieSegmentation || MP.default?.SelfieSegmentation || window.SelfieSegmentation;

export const OVERLAY_STYLES = [
  { id: 'cinema_together', label: 'Cinema Together (Default)' },
  { id: 'floating_portraits', label: 'Floating Portraits' },
  { id: 'shoulder_view', label: 'Shoulder View' },
  { id: 'group_couch', label: 'Group Couch' },
  { id: 'directors_view', label: 'Director’s View' }
];

export default function CinematicCameraOverlay({
  participants,
  cameraStream,
  containerRef,
  areControlsVisible = true
}) {
  // Preset Style
  const [stylePreset, setStylePreset] = useState('cinema_together');
  // Background removal toggle
  const [isBgRemovalEnabled, setIsBgRemovalEnabled] = useState(true);
  const [isSegmenterReady, setIsSegmenterReady] = useState(false);

  // Participant positions: { [name]: { xPercent: number, yPercent: number, zIndex: number, hidden: boolean } }
  const [positions, setPositions] = useState({});

  // Active drag state
  const isDraggingRef = useRef(false);
  const dragTargetRef = useRef(null);
  const dragDataRef = useRef({});

  // Hidden video element for MediaPipe input
  const hiddenVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const segmenterRef = useRef(null);
  const animFrameRef = useRef(null);

  // Compute Default Coordinates for Presets
  const getDefaultPositions = useCallback((preset, parts) => {
    const map = {};
    const count = parts.length;

    parts.forEach((p, idx) => {
      let xPercent = 50;
      let yPercent = 50;

      if (preset === 'cinema_together') {
        // Seated along bottom edge
        const step = 70 / Math.max(1, count);
        xPercent = 18 + idx * step;
        yPercent = 66; // pinned near bottom
      } else if (preset === 'floating_portraits') {
        // Softly floating on the right side
        xPercent = 76;
        yPercent = 15 + idx * 26;
      } else if (preset === 'shoulder_view') {
        // Pinned near bottom-right edge like someone sitting beside
        if (p.me) {
          xPercent = 72;
          yPercent = 58;
        } else {
          xPercent = 76;
          yPercent = 12 + idx * 24;
        }
      } else if (preset === 'group_couch') {
        // 2-3 participants together on bottom couch
        if (count === 1) {
          xPercent = 42;
          yPercent = 66;
        } else if (count === 2) {
          xPercent = idx === 0 ? 34 : 52;
          yPercent = 66;
        } else {
          const offsets = [32, 48, 64];
          xPercent = offsets[idx % offsets.length];
          yPercent = 66;
        }
      } else if (preset === 'directors_view') {
        // Movable view with corners
        const corners = [
          { x: 12, y: 15 },
          { x: 74, y: 15 },
          { x: 74, y: 64 },
          { x: 12, y: 64 }
        ];
        xPercent = corners[idx % corners.length].x;
        yPercent = corners[idx % corners.length].y;
      }

      map[p.n] = {
        xPercent,
        yPercent,
        zIndex: 10 + idx,
        hidden: false
      };
    });

    return map;
  }, []);

  // Initialize or reset positions when preset or participants change
  useEffect(() => {
    setPositions((prev) => {
      const defaults = getDefaultPositions(stylePreset, participants);
      // Keep existing custom coordinates if already set for a participant
      const merged = { ...defaults };
      participants.forEach((p) => {
        if (prev[p.n]) {
          merged[p.n] = {
            ...defaults[p.n],
            zIndex: prev[p.n].zIndex || defaults[p.n].zIndex,
            hidden: prev[p.n].hidden || false
          };
        }
      });
      return merged;
    });
  }, [stylePreset, participants, getDefaultPositions]);

  // Connect hidden video to camera stream
  useEffect(() => {
    if (hiddenVideoRef.current && cameraStream) {
      hiddenVideoRef.current.srcObject = cameraStream;
      hiddenVideoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  // Initialize MediaPipe SelfieSegmentation
  useEffect(() => {
    if (!SelfieSegmentation) {
      console.warn('SelfieSegmentation not available, using graceful camera box fallback');
      return;
    }

    try {
      const segmenter = new SelfieSegmentation({
        locateFile: (file) => `/mediapipe/selfie_segmentation/${file}`
      });

      segmenter.setOptions({
        modelSelection: 1, // 1 for landscape
        selfieMode: true
      });

      segmenter.onResults((results) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw segmentation mask
        ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

        // 2. Only keep pixels inside mask (removes background)
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        ctx.restore();
      });

      segmenterRef.current = segmenter;
      setIsSegmenterReady(true);
    } catch (err) {
      console.warn('Error loading MediaPipe Selfie Segmentation, falling back:', err);
    }

    return () => {
      if (segmenterRef.current) {
        try {
          segmenterRef.current.close();
        } catch (e) {}
        segmenterRef.current = null;
      }
    };
  }, []);

  // Frame processing loop
  useEffect(() => {
    if (!cameraStream || !isBgRemovalEnabled || !segmenterRef.current) return;

    let isRunning = true;
    let lastTime = 0;

    const processFrame = async (time) => {
      if (!isRunning) return;

      // Throttle to ~25 fps for smooth, lightweight inference
      if (time - lastTime >= 40) {
        lastTime = time;
        const video = hiddenVideoRef.current;
        if (video && video.readyState >= 2 && segmenterRef.current) {
          try {
            await segmenterRef.current.send({ image: video });
          } catch (e) {
            // Drop frame gracefully on error
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraStream, isBgRemovalEnabled, isSegmenterReady]);

  // ── Drag & Drop Handlers ──
  const handlePointerDown = (e, name) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;
    dragTargetRef.current = name;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    const cRect = containerRef.current?.getBoundingClientRect() || {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
    const tRect = e.currentTarget.getBoundingClientRect();

    dragDataRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      tileLeft: tRect.left - cRect.left,
      tileTop: tRect.top - cRect.top,
      containerWidth: cRect.width,
      containerHeight: cRect.height,
      tileWidth: tRect.width,
      tileHeight: tRect.height
    };
  };

  const handlePointerMove = (e, name) => {
    if (!isDraggingRef.current || dragTargetRef.current !== name) return;

    const {
      pointerX,
      pointerY,
      tileLeft,
      tileTop,
      containerWidth,
      containerHeight,
      tileWidth,
      tileHeight
    } = dragDataRef.current;

    const deltaX = e.clientX - pointerX;
    const deltaY = e.clientY - pointerY;

    let newLeft = tileLeft + deltaX;
    let newTop = tileTop + deltaY;

    // Boundary clamping
    newLeft = Math.max(0, Math.min(newLeft, containerWidth - tileWidth));
    newTop = Math.max(0, Math.min(newTop, containerHeight - tileHeight));

    const xPercent = (newLeft / containerWidth) * 100;
    const yPercent = (newTop / containerHeight) * 100;

    setPositions((prev) => ({
      ...prev,
      [name]: {
        ...(prev[name] || {}),
        xPercent,
        yPercent
      }
    }));
  };

  const handlePointerUp = (e, name) => {
    if (dragTargetRef.current === name) {
      isDraggingRef.current = false;
      dragTargetRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // Layering Helpers
  const bringForward = (name) => {
    setPositions((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        zIndex: (prev[name]?.zIndex || 10) + 2
      }
    }));
  };

  const sendBackward = (name) => {
    setPositions((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        zIndex: Math.max(1, (prev[name]?.zIndex || 10) - 2)
      }
    }));
  };

  const toggleHide = (name) => {
    setPositions((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        hidden: !prev[name]?.hidden
      }
    }));
  };

  const resetLayout = () => {
    setPositions(getDefaultPositions(stylePreset, participants));
  };

  return (
    <div className="cw-cinematic-studio">
      {/* Hidden processing video */}
      <video
        ref={hiddenVideoRef}
        playsInline
        muted
        autoPlay
        style={{ display: 'none' }}
      />

      {/* Floating Camera Studio Controls */}
      <div className={`cw-studio-toolbar ${!areControlsVisible ? 'cw-tb-hidden' : ''}`}>
        <div className="cw-studio-tag">
          <span>●</span>
          <span>Camera Studio</span>
        </div>

        {/* Preset Selector */}
        <select
          className="cw-studio-select"
          value={stylePreset}
          onChange={(e) => setStylePreset(e.target.value)}
          title="Select Virtual Studio Overlay Style"
        >
          {OVERLAY_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Background Removal Cutout Toggle */}
        <button
          type="button"
          className={`cw-toggle-btn ${isBgRemovalEnabled ? 'active' : ''}`}
          onClick={() => setIsBgRemovalEnabled((prev) => !prev)}
          title="Toggle Real-Time Background Removal"
        >
          <span className="toggle-indicator" />
          <span>{isBgRemovalEnabled ? 'BG Cutout: ON' : 'BG Cutout: OFF'}</span>
        </button>

        {/* Reset Positions Action */}
        <button
          type="button"
          className="cw-reset-btn"
          onClick={resetLayout}
          title="Reset Participant Overlay Positions"
        >
          ↺ Reset Layout
        </button>
      </div>

      {/* Draggable Participant Cutouts Stage */}
      <div className={`cw-cinematic-stage-layer cw-style-${stylePreset}`}>
        {participants.map((p) => {
          const pos = positions[p.n] || { xPercent: 50, yPercent: 50, zIndex: 10, hidden: false };
          if (pos.hidden) return null;

          const isMe = p.me;
          const isSegmented = isBgRemovalEnabled && isMe && cameraStream;

          // Dimensions based on preset
          let tileW = 180;
          let tileH = 180;
          if (stylePreset === 'cinema_together' || stylePreset === 'group_couch') {
            tileW = 220;
            tileH = 200;
          } else if (stylePreset === 'shoulder_view' && isMe) {
            tileW = 270;
            tileH = 240;
          }

          return (
            <div
              key={p.n}
              className="cw-participant-cutout"
              style={{
                width: `${tileW}px`,
                height: `${tileH}px`,
                left: `${pos.xPercent}%`,
                top: `${pos.yPercent}%`,
                zIndex: pos.zIndex
              }}
              onPointerDown={(e) => handlePointerDown(e, p.n)}
              onPointerMove={(e) => handlePointerMove(e, p.n)}
              onPointerUp={(e) => handlePointerUp(e, p.n)}
              onPointerCancel={(e) => handlePointerUp(e, p.n)}
            >
              {/* Layering Mini Toolbar on hover */}
              <div className="cw-cutout-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="cw-layer-btn"
                  title="Bring Forward"
                  onClick={() => bringForward(p.n)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="cw-layer-btn"
                  title="Send Backward"
                  onClick={() => sendBackward(p.n)}
                >
                  ▼
                </button>
                <button
                  type="button"
                  className="cw-layer-btn"
                  title="Hide Camera"
                  onClick={() => toggleHide(p.n)}
                >
                  ✕
                </button>
              </div>

              {/* Drag Handle Tag */}
              <div className="cw-cutout-drag-handle">::: DRAG</div>

              {/* Body Cutout Canvas OR Fallback Box */}
              {isSegmented ? (
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={240}
                  className="cw-cutout-canvas"
                />
              ) : (
                <div className="cw-cutout-boxed">
                  {isMe && cameraStream ? (
                    <video
                      autoPlay
                      muted
                      playsInline
                      ref={(el) => {
                        if (el && el.srcObject !== cameraStream) el.srcObject = cameraStream;
                      }}
                    />
                  ) : (
                    <div
                      className="cw-cutout-avatar"
                      style={{ background: `linear-gradient(135deg, ${p.c[0]}, ${p.c[1]})` }}
                    >
                      {p.n[0]}
                    </div>
                  )}
                </div>
              )}

              {/* Name Badge */}
              <div className="cw-cutout-name-pill">
                <span className="dot" />
                <span>{p.n}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
