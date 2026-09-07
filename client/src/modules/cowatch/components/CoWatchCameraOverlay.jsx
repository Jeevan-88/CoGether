import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  GripHorizontal, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2, 
  X, ChevronDown, ChevronUp, LayoutGrid, Split, Move
} from 'lucide-react';
import CoWatchCameraTile from './CoWatchCameraTile.jsx';
import './CoWatchCameraOverlay.css';

/**
 * CoWatchFloatingCameraTile
 * An individual floating camera card used in 'SEPARATE' (Split) mode.
 * Can be dragged independently anywhere on the screen.
 */
function CoWatchFloatingCameraTile({ 
  stream, 
  label, 
  isLocal, 
  micEnabled, 
  cameraEnabled, 
  initialPos = { x: 30, y: 100 } 
}) {
  const [pos, setPos] = useState(initialPos);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const onMouseDown = (e) => {
    if (e.target.closest('button')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: pos.x, y: pos.y };
  };

  const onTouchStart = (e) => {
    if (e.target.closest('button')) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    startPos.current = { x: pos.x, y: pos.y };
  };

  useEffect(() => {
    const handleMove = (clientX, clientY) => {
      if (!isDragging) return;
      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;
      setPos({
        x: Math.max(10, Math.min(window.innerWidth - 220, startPos.current.x + dx)),
        y: Math.max(50, Math.min(window.innerHeight - 160, startPos.current.y + dy))
      });
    };

    const onMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  return (
    <div
      className={`cowatch-floating-split-tile ${isDragging ? 'is-dragging' : ''}`}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      <div className="split-tile-drag-header">
        <GripHorizontal size={12} className="split-drag-grip" />
        <span className="split-tile-title">{label}</span>
      </div>
      <div className="split-tile-video-container">
        <CoWatchCameraTile
          stream={stream}
          label={label}
          isLocal={isLocal}
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
        />
      </div>
    </div>
  );
}

/**
 * CoWatchCameraOverlay
 * Full-featured Floating Camera System for Co-Watch:
 * - Grouped mode: Cameras placed side-by-side in one draggable container
 * - Split mode: Individual draggable rectangular tiles scattered/placed anywhere
 * - Sizing presets (S / M / L) + interactive corner mouse drag-to-resize handle
 * - Anti-collision header bar with minimize & close
 * - Zoom-style rectangular camera feeds with active speaker outlines
 */
export default function CoWatchCameraOverlay({
  localStream,
  remoteStreams = {},
  currentUsername = 'You',
  micEnabled = true,
  cameraEnabled = true,
  onToggleMic,
  onToggleCamera,
  onClose
}) {
  // Layout mode: 'GROUPED' (side-by-side) | 'SEPARATE' (split into individual cards)
  const [layoutMode, setLayoutMode] = useState('GROUPED');
  // Sizing mode: 'S' | 'M' | 'L'
  const [sizePreset, setSizePreset] = useState('M');
  const [customSize, setCustomSize] = useState(null); // { width, height }

  // Overlay window position (default: bottom-left over video)
  const [position, setPosition] = useState({
    x: 28,
    y: Math.max(70, window.innerHeight - 270)
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const overlayRef = useRef(null);

  const remotePeerIds = Object.keys(remoteStreams);
  const totalTiles = 1 + remotePeerIds.length;

  // Preset Dimensions based on participant count
  const getPresetDimensions = useCallback(() => {
    if (totalTiles <= 1) {
      if (sizePreset === 'S') return { width: 270, height: 185 };
      if (sizePreset === 'L') return { width: 440, height: 285 };
      return { width: 340, height: 225 };
    }
    if (totalTiles === 2) {
      if (sizePreset === 'S') return { width: 440, height: 165 };
      if (sizePreset === 'L') return { width: 680, height: 240 };
      return { width: 550, height: 195 };
    }
    // 3 or more participants side-by-side
    if (sizePreset === 'S') return { width: 570, height: 155 };
    if (sizePreset === 'L') return { width: 880, height: 230 };
    return { width: 720, height: 190 };
  }, [sizePreset, totalTiles]);

  const activeDimensions = customSize || getPresetDimensions();

  // Dragging reposition handlers
  const handleDragStart = useCallback((clientX, clientY) => {
    setIsDragging(true);
    dragStartPos.current = { x: clientX, y: clientY };
    elementStartPos.current = { x: position.x, y: position.y };
  }, [position]);

  const onMouseDown = (e) => {
    if (
      e.target.closest('button') || 
      e.target.closest('video') || 
      e.target.closest('.overlay-resize-handle')
    ) return;
    handleDragStart(e.clientX, e.clientY);
  };

  const onTouchStart = (e) => {
    if (
      e.target.closest('button') || 
      e.target.closest('video') || 
      e.target.closest('.overlay-resize-handle')
    ) return;
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handleMove = (clientX, clientY) => {
      if (!isDragging) return;
      const deltaX = clientX - dragStartPos.current.x;
      const deltaY = clientY - dragStartPos.current.y;

      const overlayWidth = activeDimensions.width;
      const overlayHeight = isMinimized ? 38 : activeDimensions.height;

      const maxX = Math.max(0, window.innerWidth - overlayWidth - 10);
      const maxY = Math.max(50, window.innerHeight - overlayHeight - 10);

      const newX = Math.min(Math.max(10, elementStartPos.current.x + deltaX), maxX);
      const newY = Math.min(Math.max(50, elementStartPos.current.y + deltaY), maxY);

      setPosition({ x: newX, y: newY });
    };

    const onMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleDragEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, isMinimized, activeDimensions]);

  // Interactive Drag-to-Resize Handler
  const handleResizeStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      w: activeDimensions.width,
      h: activeDimensions.height
    };
  };

  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!isResizing) return;
      const dx = e.clientX - resizeStartPos.current.x;
      const dy = e.clientY - resizeStartPos.current.y;

      const minW = totalTiles >= 3 ? 480 : totalTiles === 2 ? 380 : 240;
      const minH = 140;
      const maxW = window.innerWidth - position.x - 10;
      const maxH = window.innerHeight - position.y - 10;

      const newW = Math.min(Math.max(minW, resizeStartPos.current.w + dx), maxW);
      const newH = Math.min(Math.max(minH, resizeStartPos.current.h + dy), maxH);

      setCustomSize({ width: Math.round(newW), height: Math.round(newH) });
    };

    const handleResizeEnd = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, position, totalTiles]);

  // ── SEPARATE (SPLIT) MODE: Independent floating rectangular cards ──
  if (layoutMode === 'SEPARATE') {
    return (
      <div className="cowatch-separate-overlay-layer">
        {/* Quick Switcher Dock Pill */}
        <div className="cowatch-separate-mode-pill" style={{ left: `${position.x}px`, top: `${position.y}px` }}>
          <span className="split-mode-label">SPLIT CAMERAS ({totalTiles})</span>
          <button
            type="button"
            className="btn-regroup-cams"
            onClick={() => setLayoutMode('GROUPED')}
            title="Dock back to side-by-side overlay"
          >
            <LayoutGrid size={13} />
            <span>Group Side-by-Side</span>
          </button>
          {onClose && (
            <button
              type="button"
              className="btn-close-split"
              onClick={onClose}
              title="Close camera overlay"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Local Participant Card */}
        <CoWatchFloatingCameraTile
          stream={localStream}
          label={`${currentUsername} (You)`}
          isLocal={true}
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
          initialPos={{ x: 28, y: window.innerHeight - 200 }}
        />

        {/* Remote Peers Cards */}
        {remotePeerIds.map((peerId, idx) => {
          const peer = remoteStreams[peerId];
          return (
            <CoWatchFloatingCameraTile
              key={peerId}
              stream={peer.stream}
              label={peer.username || `Friend ${idx + 2}`}
              isLocal={false}
              micEnabled={peer.micEnabled}
              cameraEnabled={peer.cameraEnabled}
              initialPos={{ 
                x: Math.min(window.innerWidth - 240, 260 + idx * 220), 
                y: window.innerHeight - 200 
              }}
            />
          );
        })}
      </div>
    );
  }

  // ── GROUPED (SIDE-BY-SIDE) MODE: Unified draggable overlay bar ──
  return (
    <div
      ref={overlayRef}
      className={`cowatch-camera-overlay-root ${isDragging ? 'is-dragging' : ''} ${isResizing ? 'is-resizing' : ''} ${isMinimized ? 'is-minimized' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '260px' : `${activeDimensions.width}px`
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      aria-label="CoWatch Floating Camera Overlay"
    >
      {/* ── Anti-Collision Header Bar ── */}
      <div className="cowatch-overlay-drag-handle">
        <div className="handle-left-block">
          <GripHorizontal size={14} className="drag-grip-icon" />
          <span className="handle-badge-title">
            {totalTiles > 1 ? `${totalTiles} CAMERAS` : 'CAMERA'}
          </span>
        </div>

        {/* Mode Switcher: Side-by-Side vs Split */}
        <div className="overlay-layout-tabs">
          <button
            type="button"
            className={`btn-layout-tab ${layoutMode === 'GROUPED' ? 'active' : ''}`}
            onClick={() => setLayoutMode('GROUPED')}
            title="Side-by-side grouped strip"
          >
            <LayoutGrid size={11} />
            <span>Side-by-Side</span>
          </button>
          <button
            type="button"
            className={`btn-layout-tab ${layoutMode === 'SEPARATE' ? 'active' : ''}`}
            onClick={() => setLayoutMode('SEPARATE')}
            title="Split into independent floating cameras"
          >
            <Split size={11} />
            <span>Split</span>
          </button>
        </div>

        {/* Size Presets & Window Actions */}
        <div className="handle-right-block">
          <div className="size-presets-group">
            <button
              type="button"
              className={`btn-preset-size ${sizePreset === 'S' && !customSize ? 'active' : ''}`}
              onClick={() => {
                setSizePreset('S');
                setCustomSize(null);
              }}
              title="Compact Size"
            >
              S
            </button>
            <button
              type="button"
              className={`btn-preset-size ${sizePreset === 'M' && !customSize ? 'active' : ''}`}
              onClick={() => {
                setSizePreset('M');
                setCustomSize(null);
              }}
              title="Medium Size"
            >
              M
            </button>
            <button
              type="button"
              className={`btn-preset-size ${sizePreset === 'L' && !customSize ? 'active' : ''}`}
              onClick={() => {
                setSizePreset('L');
                setCustomSize(null);
              }}
              title="Large Size"
            >
              L
            </button>
          </div>

          <button
            type="button"
            className="btn-overlay-ctrl"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand cameras' : 'Minimize cameras'}
            aria-label={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {onClose && (
            <button
              type="button"
              className="btn-overlay-ctrl btn-close"
              onClick={onClose}
              title="Close camera overlay"
              aria-label="Close"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Side-by-Side Plain Rectangular Camera Grid ── */}
      {!isMinimized && (
        <div 
          className="cowatch-overlay-body-container"
          style={{ height: `${activeDimensions.height - 36}px` }}
        >
          <div className={`cowatch-side-by-side-grid count-${Math.min(3, totalTiles)}`}>
            {/* Local User Camera */}
            <div className="overlay-rect-slot">
              <CoWatchCameraTile
                stream={localStream}
                label={currentUsername}
                isLocal={true}
                micEnabled={micEnabled}
                cameraEnabled={cameraEnabled}
              />
            </div>

            {/* Remote Peers Cameras */}
            {remotePeerIds.slice(0, 2).map((peerId) => {
              const peer = remoteStreams[peerId];
              return (
                <div key={peerId} className="overlay-rect-slot">
                  <CoWatchCameraTile
                    stream={peer.stream}
                    label={peer.username || 'Friend'}
                    isLocal={false}
                    micEnabled={peer.micEnabled}
                    cameraEnabled={peer.cameraEnabled}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Interactive Corner Drag-to-Resize Handle ── */}
      {!isMinimized && (
        <div
          className="overlay-resize-handle"
          onMouseDown={handleResizeStart}
          title="Drag to resize overlay"
        >
          <div className="resize-corner-lines" />
        </div>
      )}
    </div>
  );
}
