import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  RotateCcw, Sparkles, Film, Globe, ShieldAlert, ExternalLink
} from 'lucide-react';
import CoWatchCameraTile from './CoWatchCameraTile.jsx';
import './CoWatchVideoStage.css';

export default function CoWatchVideoStage({
  movie,
  streamEngine = 'direct_mp4', // 'direct_mp4' | 'web_embed'
  videoSyncPayload,
  onBroadcastSync,
  incomingReaction,
  layoutMode = 'RAIL', // 'RAIL' | 'TRAY' | 'OVERLAY' | 'CINEMA'
  overlayParticipants = [],
  pinnedParticipantId,
  onTogglePin,
  isCinemaMode = false,
  roomCode
}) {
  const stageRef = useRef(null);
  const videoRef = useRef(null);

  // Playback & Volume State
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(100); // 0 to 200%
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Floating Reactions Queue
  const [reactionsList, setReactionsList] = useState([]);

  // Handle incoming floating reactions
  useEffect(() => {
    if (!incomingReaction) return;
    const newReaction = {
      id: incomingReaction.id || Math.random(),
      emoji: incomingReaction.emoji,
      senderName: incomingReaction.senderName || 'Friend',
      time: Date.now()
    };
    setReactionsList((prev) => [...prev.slice(-8), newReaction]);

    const timer = setTimeout(() => {
      setReactionsList((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2800);

    return () => clearTimeout(timer);
  }, [incomingReaction]);

  // Handle Remote Video Sync
  const isApplyingRemoteSyncRef = useRef(false);

  useEffect(() => {
    if (!videoSyncPayload || !videoRef.current || streamEngine !== 'direct_mp4') return;

    const { action, currentTime: remoteTime } = videoSyncPayload;
    const v = videoRef.current;

    isApplyingRemoteSyncRef.current = true;

    if (remoteTime !== undefined && Math.abs(v.currentTime - remoteTime) > 1.2) {
      v.currentTime = remoteTime;
    }

    if (action === 'play' && v.paused) {
      v.play().catch(() => {});
      setIsPlaying(true);
    } else if (action === 'pause' && !v.paused) {
      v.pause();
      setIsPlaying(false);
    }

    setTimeout(() => {
      isApplyingRemoteSyncRef.current = false;
    }, 200);
  }, [videoSyncPayload, streamEngine]);

  // Decoupled Video Audio Management (Independent from Mic)
  useEffect(() => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = 0;
    } else {
      // 0 - 100 maps to 0.0 - 1.0. For 100-200% volume boost, native clamped at 1.0
      videoRef.current.volume = Math.min(1.0, volume / 100);
    }
  }, [volume, isMuted]);

  // HTML5 Video Event Handlers
  const handleLocalPlay = () => {
    setIsPlaying(true);
    if (!isApplyingRemoteSyncRef.current && videoRef.current) {
      onBroadcastSync?.({ action: 'play', currentTime: videoRef.current.currentTime });
    }
  };

  const handleLocalPause = () => {
    setIsPlaying(false);
    if (!isApplyingRemoteSyncRef.current && videoRef.current) {
      onBroadcastSync?.({ action: 'pause', currentTime: videoRef.current.currentTime });
    }
  };

  const handleLocalSeek = (e) => {
    const newTime = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      onBroadcastSync?.({ action: 'seek', currentTime: newTime });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  // Fullscreen Management
  const toggleFullscreen = () => {
    if (!stageRef.current) return;
    if (!document.fullscreenElement) {
      stageRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Fade out player overlay controls after inactivity
  const handleMouseMove = () => {
    setShowControlsOverlay(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControlsOverlay(false);
    }, 2800);
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isDirectMp4 = streamEngine === 'direct_mp4' && movie?.videoSrc;

  return (
    <div
      ref={stageRef}
      className={`cowatch-video-stage-root ${isCinemaMode ? 'is-cinema-mode' : ''} ${isFullscreen ? 'is-fullscreen' : ''}`}
      onMouseMove={handleMouseMove}
    >
      {/* Recessed Inset Video Frame */}
      <div className="cowatch-video-frame-inner">
        {isDirectMp4 ? (
          <div className="native-video-wrapper">
            <video
              ref={videoRef}
              src={movie.videoSrc}
              playsInline
              autoPlay
              onPlay={handleLocalPlay}
              onPause={handleLocalPause}
              onTimeUpdate={handleTimeUpdate}
              className="cowatch-html5-video"
            />

            {/* Custom Cinema Player Control Bar */}
            <div className={`video-custom-controls-bar ${showControlsOverlay ? 'is-visible' : 'is-hidden'}`}>
              <div className="progress-timeline-row">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleLocalSeek}
                  className="video-seek-slider"
                />
              </div>

              <div className="controls-action-row">
                <div className="ctrl-left-group">
                  <button
                    type="button"
                    className="btn-play-pause-toggle"
                    onClick={() => {
                      if (videoRef.current) {
                        if (isPlaying) videoRef.current.pause();
                        else videoRef.current.play();
                      }
                    }}
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>

                  <button
                    type="button"
                    className="btn-volume-mute-toggle"
                    onClick={() => setIsMuted(!isMuted)}
                    title={isMuted ? 'Unmute Video' : 'Mute Video'}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setIsMuted(false);
                      setVolume(Number(e.target.value));
                    }}
                    className="volume-slider-compact"
                    title={`Video Volume: ${volume}%`}
                  />

                  {volume > 100 && (
                    <span className="boost-tag">{volume}% BOOST</span>
                  )}

                  <span className="time-display">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="ctrl-right-group">
                  <span className="live-sync-pill">
                    ● SYNCED ({roomCode})
                  </span>

                  <button
                    type="button"
                    className="btn-fs-toggle"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : movie?.embedUrl ? (
          <div className="embed-iframe-wrapper">
            <iframe
              src={movie.embedUrl}
              title={movie.title || 'CoWatch Stream'}
              className="cowatch-embed-iframe"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="video-empty-placeholder">
            <Film size={48} className="placeholder-icon" />
            <h3>Select a movie or stream to start watching together</h3>
          </div>
        )}

        {/* Floating Camera Overlays (when layoutMode === 'OVERLAY' or in Fullscreen) */}
        {(layoutMode === 'OVERLAY' || isFullscreen) && overlayParticipants.length > 0 && (
          <div className="video-corner-cam-overlays fade-in">
            {overlayParticipants.slice(0, 3).map((p) => (
              <div key={p.id} className="corner-cam-slot">
                <CoWatchCameraTile
                  stream={p.stream}
                  label={p.username}
                  isLocal={p.isLocal}
                  micEnabled={p.micEnabled}
                  cameraEnabled={p.cameraEnabled}
                  isPinned={pinnedParticipantId === p.id}
                  onTogglePin={() => onTogglePin?.(p.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Safe-Area Floating Reactions Layer (along right edge, never over center/subtitles) */}
        <div className="video-floating-reactions-safe-zone">
          {reactionsList.map((reaction) => (
            <div key={reaction.id} className="floating-reaction-item rise-and-fade">
              <span className="reaction-sender-badge">{reaction.senderName}</span>
              <span className="reaction-emoji-graphic">{reaction.emoji}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
