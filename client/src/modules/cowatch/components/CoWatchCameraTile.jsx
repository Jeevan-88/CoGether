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
          <div className="cowatch-avatar-badge">
            <span className="avatar-initials">{initials}</span>
          </div>
          <span className="avatar-subtext">{label}</span>
        </div>
      )}

      {/* Speaking Glow Ripple */}
      {isSpeaking && (
        <div className="speaking-indicator-ring" />
      )}

      {/* Top Hover Action Bar */}
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

      {/* Bottom Info Bar: Unobtrusive Corner Badge */}
      <div className="cowatch-tile-bottom-bar">
        <div className="tile-identity-tag">
          <span className="tile-user-name">
            {label} {isLocal && <span className="you-pill">YOU</span>}
          </span>
          {isSpeaking && (
            <span className="speaking-wave-badge" title="Speaking">
              <Volume2 size={11} className="speaking-icon" />
            </span>
          )}
        </div>

        <div className={`tile-mic-indicator ${micEnabled ? 'mic-on' : 'mic-muted'}`} title={micEnabled ? 'Mic Active' : 'Muted'}>
          {micEnabled ? <Mic size={11} /> : <MicOff size={11} />}
        </div>
      </div>
    </div>
  );
}
