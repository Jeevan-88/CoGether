import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  GripHorizontal, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2, 
  X, ChevronDown, ChevronUp, Layers, Split, LayoutGrid, Sparkles 
} from 'lucide-react';
import VideoTile from '../../videoroom/VideoTile.jsx';
import MergedCameraStage from './MergedCameraStage.jsx';
import './DraggableCameraOverlay.css';

/**
 * DraggableFloatingTile
 * An individual floating camera tile for 'SEPARATE' mode
 */
function DraggableFloatingTile({ stream, label, isLocal, micEnabled, cameraEnabled, initialPos = { x: 24, y: 100 } }) {
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

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPos({
        x: Math.max(10, Math.min(window.innerWidth - 180, startPos.current.x + dx)),
        y: Math.max(50, Math.min(window.innerHeight - 150, startPos.current.y + dy))
      });
    };
    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      className={`separate-floating-camera-tile ${isDragging ? 'is-dragging' : ''}`}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      onMouseDown={onMouseDown}
    >
      <div className="separate-tile-drag-bar">
        <GripHorizontal size={12} />
        <span>{label}</span>
      </div>
      <div className="separate-tile-video-wrap">
        <VideoTile
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
 * DraggableCameraOverlay
 * Full-featured Floating Camera System supporting:
 * - Up to 3 players
 * - Resizable sizing presets (S / M / L)
 * - Modes: GROUPED, SEPARATE (individual draggable locations), MERGED (virtual background with face cutout)
 * - Per-player merge opt-out
 * - Visible in fullscreen
 */
export default function DraggableCameraOverlay({
  localStream,
  remoteStreams = {},
  currentUsername = 'You',
  micEnabled = true,
  cameraEnabled = true,
  onToggleMic,
  onToggleCamera,
  onClose
}) {
  // Layout mode: 'GROUPED' | 'SEPARATE' | 'MERGED'
  const [layoutMode, setLayoutMode] = useState('GROUPED');
  // Sizing mode: 'S' (220px) | 'M' (320px) | 'L' (440px)
  const [sizePreset, setSizePreset] = useState('M');
  const [optedOutPeers, setOptedOutPeers] = useState({});

  // Grouped position (default: bottom-left)
  const [position, setPosition] = useState({
    x: 24,
    y: Math.max(80, window.innerHeight - 270)
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback((clientX, clientY) => {
    setIsDragging(true);
    dragStartPos.current = { x: clientX, y: clientY };
    elementStartPos.current = { x: position.x, y: position.y };
  }, [position]);

  const onMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('video') || e.target.closest('canvas')) return;
    handleDragStart(e.clientX, e.clientY);
  };

  const onTouchStart = (e) => {
    if (e.target.closest('button') || e.target.closest('video') || e.target.closest('canvas')) return;
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handleMove = (clientX, clientY) => {
      if (!isDragging) return;
      const deltaX = clientX - dragStartPos.current.x;
      const deltaY = clientY - dragStartPos.current.y;

      const overlayWidth = sizePreset === 'S' ? 220 : sizePreset === 'L' ? 440 : 320;
      const overlayHeight = isMinimized ? 44 : 220;

      const maxX = Math.max(0, window.innerWidth - overlayWidth - 10);
      const maxY = Math.max(52, window.innerHeight - overlayHeight - 10);

      const newX = Math.min(Math.max(10, elementStartPos.current.x + deltaX), maxX);
      const newY = Math.min(Math.max(52, elementStartPos.current.y + deltaY), maxY);

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
  }, [isDragging, isMinimized, sizePreset]);

  const toggleMergeOptOut = (id) => {
    setOptedOutPeers((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const remotePeerIds = Object.keys(remoteStreams);
  const totalTiles = 1 + remotePeerIds.length;

  // If in SEPARATE mode, render individual draggable floating tiles across the screen
  if (layoutMode === 'SEPARATE') {
    return (
      <div className="separate-cameras-container">
        {/* Floating Switcher Pill */}
        <div className="separate-mode-switcher-pill" style={{ left: `${position.x}px`, top: `${position.y}px` }}>
          <span className="switcher-label">SEPARATE CAMS ({totalTiles})</span>
          <button
            type="button"
            className="btn-mode-quick"
            onClick={() => setLayoutMode('GROUPED')}
            title="Switch to Grouped Dock"
          >
            <LayoutGrid size={13} />
            <span>Group</span>
          </button>
          <button
            type="button"
            className="btn-mode-quick"
            onClick={() => setLayoutMode('MERGED')}
            title="Switch to Merged Virtual Room"
          >
            <Sparkles size={13} />
            <span>Merge</span>
          </button>
        </div>

        {/* Local Player Tile */}
        <DraggableFloatingTile
          stream={localStream}
          label={`${currentUsername} (You)`}
          isLocal={true}
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
          initialPos={{ x: 24, y: window.innerHeight - 220 }}
        />

        {/* Remote Peers (up to 2) */}
        {remotePeerIds.map((peerId, idx) => {
          const peer = remoteStreams[peerId];
          return (
            <DraggableFloatingTile
              key={peerId}
              stream={peer.stream}
              label={peer.username || `Player ${idx + 2}`}
              isLocal={false}
              micEnabled={peer.micEnabled}
              cameraEnabled={peer.cameraEnabled}
              initialPos={{ x: 220 + idx * 190, y: window.innerHeight - 220 }}
            />
          );
        })}
      </div>
    );
  }

  // GROUPED or MERGED mode
  return (
    <div
      className={`draggable-camera-overlay mode-${layoutMode.toLowerCase()} size-${sizePreset.toLowerCase()} ${isDragging ? 'is-dragging' : ''} ${isMinimized ? 'is-minimized' : ''}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      aria-label="Floating Camera Overlay"
    >
      {/* ── Drag Header Bar ── */}
      <div className="camera-overlay-drag-handle">
        <div className="handle-left">
          <GripHorizontal size={14} className="grip-icon" />
          <span className="handle-title">
            {totalTiles > 1 ? `${totalTiles} PLAYERS` : 'CAMERA'}
          </span>

          {/* Mode Switchers */}
          <div className="overlay-mode-pills">
            <button
              type="button"
              className={`btn-mode-tab ${layoutMode === 'GROUPED' ? 'active' : ''}`}
              onClick={() => setLayoutMode('GROUPED')}
              title="Grouped Cameras"
            >
              Group
            </button>
            <button
              type="button"
              className={`btn-mode-tab ${layoutMode === 'SEPARATE' ? 'active' : ''}`}
              onClick={() => setLayoutMode('SEPARATE')}
              title="Separate Draggable Tiles"
            >
              Separate
            </button>
            <button
              type="button"
              className={`btn-mode-tab ${layoutMode === 'MERGED' ? 'active' : ''}`}
              onClick={() => setLayoutMode('MERGED')}
              title="Merged Shared Background"
            >
              Merge
            </button>
          </div>
        </div>

        <div className="handle-right-actions">
          {/* Size Preset Toggle */}
          <div className="overlay-size-selector">
            <button
              type="button"
              className={`btn-size-opt ${sizePreset === 'S' ? 'active' : ''}`}
              onClick={() => setSizePreset('S')}
              title="Compact Size"
            >
              S
            </button>
            <button
              type="button"
              className={`btn-size-opt ${sizePreset === 'M' ? 'active' : ''}`}
              onClick={() => setSizePreset('M')}
              title="Regular Size"
            >
              M
            </button>
            <button
              type="button"
              className={`btn-size-opt ${sizePreset === 'L' ? 'active' : ''}`}
              onClick={() => setSizePreset('L')}
              title="Large Size"
            >
              L
            </button>
          </div>

          <button
            type="button"
            className="btn-overlay-action"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand Camera' : 'Minimize Camera'}
            aria-label={isMinimized ? 'Expand Camera' : 'Minimize Camera'}
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {onClose && (
            <button
              type="button"
              className="btn-overlay-action btn-close-overlay"
              onClick={onClose}
              title="Close Camera"
              aria-label="Close Camera"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Camera Feeds Body ── */}
      {!isMinimized && (
        <div className="camera-overlay-body-wrapper">
          {layoutMode === 'MERGED' ? (
            <div className="overlay-merged-viewport">
              <MergedCameraStage
                localStream={localStream}
                remoteStreams={remoteStreams}
                currentUsername={currentUsername}
                onToggleMergeOptOut={toggleMergeOptOut}
                optedOutPeers={optedOutPeers}
              />
            </div>
          ) : (
            <div className={`camera-overlay-body ${totalTiles > 1 ? 'has-multiple' : ''} total-${totalTiles}`}>
              <div className="overlay-tile-slot">
                <VideoTile
                  stream={localStream}
                  label={currentUsername}
                  isLocal={true}
                  micEnabled={micEnabled}
                  cameraEnabled={cameraEnabled}
                />
              </div>

              {remotePeerIds.map((peerId) => {
                const peer = remoteStreams[peerId];
                return (
                  <div key={peerId} className="overlay-tile-slot">
                    <VideoTile
                      stream={peer.stream}
                      label={peer.username || 'Peer'}
                      isLocal={false}
                      micEnabled={peer.micEnabled}
                      cameraEnabled={peer.cameraEnabled}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Quick Controls Bar ── */}
      {!isMinimized && (
        <div className="camera-overlay-controls">
          <div className="overlay-ctrl-group">
            <button
              type="button"
              className={`overlay-ctrl-btn ${!micEnabled ? 'is-off' : ''}`}
              onClick={onToggleMic}
              title={micEnabled ? 'Mute Mic' : 'Unmute Mic'}
            >
              {micEnabled ? <Mic size={13} /> : <MicOff size={13} />}
            </button>
            <button
              type="button"
              className={`overlay-ctrl-btn ${!cameraEnabled ? 'is-off' : ''}`}
              onClick={onToggleCamera}
              title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {cameraEnabled ? <Video size={13} /> : <VideoOff size={13} />}
            </button>
          </div>
          <span className="overlay-identity-tag">COGETHER CAM</span>
        </div>
      )}
    </div>
  );
}
