import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Pin, PinOff, EyeOff, Volume2, User } from 'lucide-react';
import { ActiveSpeakerDetector } from './ActiveSpeakerDetector.js';
import './CoWatchCameraTile.css';

export default function CoWatchCameraTile({
  stream,
  label = 'Guest',
  isLocal = false,
  micEnabled = true,
  cameraEnabled = true,
  isPinned = false,
  onTogglePin,
  onHideSelf
}) {
  const videoRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Attach MediaStream to Video Element
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraEnabled]);

  // Real Web Audio API Active Speaker Detection
  useEffect(() => {
    if (!stream || !micEnabled) {
      setIsSpeaking(false);
      return;
    }

    const detector = new ActiveSpeakerDetector(stream, (speaking) => {
      setIsSpeaking(speaking);
    });

    return () => detector.cleanup();
  }, [stream, micEnabled]);

  const initials = (label || 'U').slice(0, 2).toUpperCase();

  return (
    <div
      className={`cowatch-camera-tile ${isLocal ? 'is-local' : ''} ${isSpeaking ? 'is-speaking' : ''} ${isPinned ? 'is-pinned' : ''}`}
      title={`${label}${isLocal ? ' (You)' : ''}`}
    >
      {/* Video Feed or Avatar Fallback */}
      {cameraEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="cowatch-tile-video"
        />
      ) : (
        <div className="cowatch-avatar-fallback">
          <div className="zoom-avatar-circle">
            <span className="avatar-initials">{initials}</span>
          </div>
          <span className="avatar-subtext">{label}</span>
        </div>
      )}

      {/* Top-Right Hover Action Bar */}
      <div className="cowatch-tile-hover-bar">
        {onTogglePin && (
          <button
            type="button"
            className={`btn-tile-action ${isPinned ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            title={isPinned ? 'Unpin camera' : 'Pin camera'}
          >
            {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
          </button>
        )}
        {isLocal && onHideSelf && (
          <button
            type="button"
            className="btn-tile-action"
            onClick={(e) => {
              e.stopPropagation();
              onHideSelf();
            }}
            title="Hide self view"
          >
            <EyeOff size={12} />
          </button>
        )}
      </div>

      {/* Zoom-Style Bottom-Left Nameplate */}
      <div className="zoom-tile-nameplate">
        <span className={`zoom-mic-status ${micEnabled ? 'mic-on' : 'mic-muted'}`} title={micEnabled ? 'Mic active' : 'Muted'}>
          {micEnabled ? <Mic size={10} /> : <MicOff size={10} />}
        </span>
        <span className="zoom-user-name">
          {label} {isLocal && <span className="zoom-you-tag">You</span>}
        </span>
        {isSpeaking && (
          <span className="zoom-speaking-indicator" title="Speaking">
            <Volume2 size={10} />
          </span>
        )}
      </div>
    </div>
  );
}
