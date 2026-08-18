import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Maximize2, User } from 'lucide-react';

export default function VideoTile({ stream, label, isLocal, micEnabled = true, cameraEnabled = true }) {
  const videoRef = useRef(null);
  const tileRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const toggleFullscreen = () => {
    if (tileRef.current) {
      if (!document.fullscreenElement) {
        tileRef.current.requestFullscreen().catch(err => console.error(err));
      } else {
        document.exitFullscreen().catch(err => console.error(err));
      }
    }
  };

  return (
    <div ref={tileRef} className={`video-tile ${isLocal ? 'tile-local' : ''}`}>
      {cameraEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="tile-video-element"
        />
      ) : (
        <div className="avatar-fallback">
          <div className="avatar-circle-tile">
            {(label || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="avatar-name">{label}</span>
        </div>
      )}

      {/* Overlays */}
      <div className="tile-overlay-bottom">
        <div className="tile-user-info">
          <span className="user-label">{label} {isLocal && '(You)'}</span>
          <span className={`mic-badge ${micEnabled ? 'mic-on' : 'mic-off'}`}>
            {micEnabled ? <Mic size={13} /> : <MicOff size={13} />}
          </span>
        </div>

        <button className="tile-fs-btn" onClick={toggleFullscreen} title="Toggle Fullscreen">
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
}
