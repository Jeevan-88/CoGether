import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripHorizontal, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2, X, ChevronDown, ChevronUp } from 'lucide-react';
import VideoTile from '../../videoroom/VideoTile.jsx';
import './DraggableCameraOverlay.css';

/**
 * DraggableCameraOverlay
 * Floating Picture-in-Picture camera overlay that can be dragged to any desired position on the screen.
 * Supports:
 * - Mouse and touch drag handlers with viewport collision prevention
 * - Local player camera + remote peer camera
 * - Quick collapse / minimize toggle
 * - Clean dark neomorphic styling with subtle arcade accents
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
  // Default position: bottom-left above bottom boundary
  const [position, setPosition] = useState({
    x: 24,
    y: Math.max(80, window.innerHeight - 260)
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const dragRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });

  // Handle Drag Start (Mouse & Touch)
  const handleDragStart = useCallback((clientX, clientY) => {
    setIsDragging(true);
    dragStartPos.current = { x: clientX, y: clientY };
    elementStartPos.current = { x: position.x, y: position.y };
  }, [position]);

  const onMouseDown = (e) => {
    // Only drag when clicking header or drag handle
    if (e.target.closest('button') || e.target.closest('video')) return;
    handleDragStart(e.clientX, e.clientY);
  };

  const onTouchStart = (e) => {
    if (e.target.closest('button') || e.target.closest('video')) return;
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  // Drag Movement Listener
  useEffect(() => {
    const handleMove = (clientX, clientY) => {
      if (!isDragging) return;

      const deltaX = clientX - dragStartPos.current.x;
      const deltaY = clientY - dragStartPos.current.y;

      const overlayWidth = isMinimized ? 200 : 260;
      const overlayHeight = isMinimized ? 44 : 180;

      // Bound within viewport limits
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
  }, [isDragging, isMinimized]);

  const remotePeerIds = Object.keys(remoteStreams);
  const totalTiles = 1 + remotePeerIds.length;

  return (
    <div
      ref={dragRef}
      className={`draggable-camera-overlay ${isDragging ? 'is-dragging' : ''} ${isMinimized ? 'is-minimized' : ''}`}
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
            {totalTiles > 1 ? `${totalTiles} CAMERAS` : 'YOUR CAMERA'}
          </span>
        </div>

        <div className="handle-right-actions">
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

      {/* ── Camera Feeds (Collapsed when minimized) ── */}
      {!isMinimized && (
        <div className={`camera-overlay-body ${totalTiles > 1 ? 'has-multiple' : ''}`}>
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

      {/* ── Overlay Quick Controls Bar ── */}
      {!isMinimized && (
        <div className="camera-overlay-controls">
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
      )}
    </div>
  );
}
