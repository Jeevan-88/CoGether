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
 * - Resizable sizing presets (S / M / L) + interactive drag-resize handle
 * - Modes: GROUPED, SEPARATE (individual draggable locations), MERGED (real-time body cutout compositor)
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
  // Sizing mode: 'S' | 'M' | 'L'
  const [sizePreset, setSizePreset] = useState('M');
  const [customSize, setCustomSize] = useState(null); // { width, height }
  const [optedOutPeers, setOptedOutPeers] = useState({});

  // Grouped position (default: bottom-left)
  const [position, setPosition] = useState({
    x: 24,
    y: Math.max(80, window.innerHeight - 340)
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const overlayRef = useRef(null);

  // Compute active dimensions
  const getPresetDimensions = useCallback(() => {
    if (layoutMode === 'MERGED') {
      if (sizePreset === 'S') return { width: 440, height: 280 };
      if (sizePreset === 'L') return { width: 660, height: 420 };
      return { width: 540, height: 340 };
    }
    if (sizePreset === 'S') return { width: 330, height: 190 };
    if (sizePreset === 'L') return { width: 560, height: 300 };
    return { width: 420, height: 230 };
  }, [layoutMode, sizePreset]);

  const activeDimensions = customSize || getPresetDimensions();

  const handleDragStart = useCallback((clientX, clientY) => {
    setIsDragging(true);
    dragStartPos.current = { x: clientX, y: clientY };
    elementStartPos.current = { x: position.x, y: position.y };
  }, [position]);

  const onMouseDown = (e) => {
    if (
      e.target.closest('button') || 
      e.target.closest('video') || 
      e.target.closest('canvas') ||
      e.target.closest('.overlay-resize-handle')
    ) return;
    handleDragStart(e.clientX, e.clientY);
  };

  const onTouchStart = (e) => {
    if (
      e.target.closest('button') || 
      e.target.closest('video') || 
      e.target.closest('canvas') ||
      e.target.closest('.overlay-resize-handle')
    ) return;
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  // Dragging reposition loop
  useEffect(() => {
    const handleMove = (clientX, clientY) => {
      if (!isDragging) return;
      const deltaX = clientX - dragStartPos.current.x;
      const deltaY = clientY - dragStartPos.current.y;

      const overlayWidth = activeDimensions.width;
      const overlayHeight = isMinimized ? 44 : activeDimensions.height;

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

      const minW = layoutMode === 'MERGED' ? 400 : 300;
      const minH = layoutMode === 'MERGED' ? 240 : 160;
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
  }, [isResizing, position, layoutMode]);

  const toggleMergeOptOut = (id) => {
    setOptedOutPeers((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const remotePeerIds = Object.keys(remoteStreams);
  const totalTiles = 1 + remotePeerIds.length;

  // IF SEPARATE MODE: render individual floating tiles
  if (layoutMode === 'SEPARATE') {
    return (
      <div className="separate-cameras-container">
        <div className="separate-mode-switcher-pill" style={{ left: `${position.x}px`, top: `${position.y}px` }}>
          <span className="switcher-label">SEPARATE CAMS ({totalTiles})</span>
          <button
            type="button"
            className="btn-mode-quick"
            onClick={() => setLayoutMode('GROUPED')}
            title="Switch to Grouped Dock"
          >
            <LayoutGrid size={12} />
            <span>Group</span>
          </button>
          <button
            type="button"
            className="btn-mode-quick"
            onClick={() => setLayoutMode('MERGED')}
            title="Switch to Merged Virtual Room"
          >
            <Sparkles size={12} />
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

        {/* Remote Peers */}
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
      ref={overlayRef}
      className={`draggable-camera-overlay mode-${layoutMode.toLowerCase()} size-${sizePreset.toLowerCase()} ${isDragging ? 'is-dragging' : ''} ${isResizing ? 'is-resizing' : ''} ${isMinimized ? 'is-minimized' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '280px' : `${activeDimensions.width}px`
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      aria-label="Floating Camera Overlay"
    >
      {/* ── Drag Header Bar with Anti-Collision Layout ── */}
      <div className="camera-overlay-drag-handle">
        {/* Left: Grip & Player Tag */}
        <div className="handle-left">
          <GripHorizontal size={14} className="grip-icon" />
          <span className="handle-title">
            {totalTiles > 1 ? `${totalTiles} PLAYERS` : 'CAMERA'}
          </span>
        </div>

        {/* Center: Mode Tabs */}
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
            title="Merged Body Cutout Scene"
          >
            <Sparkles size={10} className="tab-icon" />
            <span>Merge</span>
          </button>
        </div>

        {/* Right: Sizing Presets & Actions */}
        <div className="handle-right-actions">
          <div className="overlay-size-selector">
            <button
              type="button"
              className={`btn-size-opt ${sizePreset === 'S' && !customSize ? 'active' : ''}`}
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
              className={`btn-size-opt ${sizePreset === 'M' && !customSize ? 'active' : ''}`}
              onClick={() => {
                setSizePreset('M');
                setCustomSize(null);
              }}
              title="Regular Size"
            >
              M
            </button>
            <button
              type="button"
              className={`btn-size-opt ${sizePreset === 'L' && !customSize ? 'active' : ''}`}
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
            className="btn-overlay-action"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand Camera' : 'Minimize Camera'}
            aria-label={isMinimized ? 'Expand Camera' : 'Minimize Camera'}
          >
            {isMinimized ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {onClose && (
            <button
              type="button"
              className="btn-overlay-action btn-close-overlay"
              onClick={onClose}
              title="Close Camera"
              aria-label="Close Camera"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Camera Feeds Body ── */}
      {!isMinimized && (
        <div 
          className="camera-overlay-body-wrapper"
          style={{ height: `${activeDimensions.height - 38}px` }}
        >
          {layoutMode === 'MERGED' ? (
            <div className="overlay-merged-viewport">
              <MergedCameraStage
                localStream={localStream}
                remoteStreams={remoteStreams}
                currentUsername={currentUsername}
                cameraEnabled={cameraEnabled}
                onToggleMergeOptOut={toggleMergeOptOut}
                optedOutPeers={optedOutPeers}
                onFallbackToNormal={() => setLayoutMode('GROUPED')}
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

      {/* ── Interactive Drag-to-Resize Handle on Bottom-Right ── */}
      {!isMinimized && (
        <div
          className="overlay-resize-handle"
          onMouseDown={handleResizeStart}
          title="Drag to resize camera overlay"
        >
          <div className="resize-lines" />
        </div>
      )}
    </div>
  );
}
