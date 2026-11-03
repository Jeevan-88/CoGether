import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Volume1, 
  Maximize, Minimize, Monitor, Loader2, RotateCcw, 
  Subtitles, Settings, AlertTriangle 
} from 'lucide-react';
import './CinemaPlayer.css';

export default function CinemaPlayer({
  videoSrc,
  contentTitle = 'CoWatch Cinema',
  contentYear,
  isHost = true,
  canControl = true,
  onPlaybackChange,
  remoteSyncState,
  onTheaterFullscreenToggle,
  isTheaterFullscreen = false
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const isApplyingRemoteSync = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [syncNotice, setSyncNotice] = useState(null);

  // Format seconds to H:MM:SS or M:SS
  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Activity detection for auto-hiding controls
  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
        setShowSpeedMenu(false);
      }
    }, 3200);
  }, []);

  // Handle Remote Sync Events with Multi-Tier Drift Correction
  useEffect(() => {
    if (!remoteSyncState || !videoRef.current) return;
    const v = videoRef.current;
    const { action, position, serverTimeMs, playbackRate: targetRate = 1.0 } = remoteSyncState;

    const now = Date.now();
    const elapsedSeconds = action === 'PLAY' && serverTimeMs ? Math.max(0, (now - serverTimeMs) / 1000) : 0;
    const targetPosition = (position ?? v.currentTime) + elapsedSeconds * targetRate;
    const driftMs = Math.abs((v.currentTime - targetPosition) * 1000);

    isApplyingRemoteSync.current = true;

    if (action === 'PLAY') {
      if (driftMs > 800) {
        v.currentTime = targetPosition;
        setSyncNotice('Adjusting sync...');
        setTimeout(() => setSyncNotice(null), 1200);
      }
      if (v.paused) {
        v.play().catch(() => {});
        setIsPlaying(true);
      }
    } else if (action === 'PAUSE') {
      if (!v.paused) {
        v.pause();
        setIsPlaying(false);
      }
      if (driftMs > 800) {
        v.currentTime = targetPosition;
      }
    } else if (action === 'SEEK') {
      v.currentTime = targetPosition;
      setCurrentTime(targetPosition);
    } else if (action === 'RATE_CHANGE') {
      v.playbackRate = targetRate;
      setPlaybackRate(targetRate);
    }

    setTimeout(() => {
      isApplyingRemoteSync.current = false;
    }, 250);
  }, [remoteSyncState]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!canControl || !videoRef.current) return;
    const v = videoRef.current;
    if (v.paused) {
      v.play().catch((err) => {
        console.warn('Playback request was prevented:', err);
      });
      setIsPlaying(true);
      onPlaybackChange?.({ action: 'PLAY', position: v.currentTime });
    } else {
      v.pause();
      setIsPlaying(false);
      onPlaybackChange?.({ action: 'PAUSE', position: v.currentTime });
    }
  };

  // Handle Seek
  const handleSeek = (e) => {
    if (!canControl || !videoRef.current) return;
    const target = parseFloat(e.target.value);
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    onPlaybackChange?.({ action: 'SEEK', position: target });
  };

  // Handle Volume Change
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  // Change Playback Speed
  const handleSpeedSelect = (rate) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    onPlaybackChange?.({ action: 'RATE_CHANGE', playbackRate: rate });
  };

  // Video-Only Fullscreen
  const toggleVideoFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsVideoFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsVideoFullscreen(false);
    }
  };

  // Listen to Fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsVideoFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in chat or input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current && canControl) {
          const newPos = Math.max(0, videoRef.current.currentTime - 5);
          videoRef.current.currentTime = newPos;
          setCurrentTime(newPos);
          onPlaybackChange?.({ action: 'SEEK', position: newPos });
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current && canControl) {
          const newPos = Math.min(duration, videoRef.current.currentTime + 5);
          videoRef.current.currentTime = newPos;
          setCurrentTime(newPos);
          onPlaybackChange?.({ action: 'SEEK', position: newPos });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextVol = Math.min(1, volume + 0.1);
        setVolume(nextVol);
        setIsMuted(false);
        if (videoRef.current) {
          videoRef.current.volume = nextVol;
          videoRef.current.muted = false;
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextVol = Math.max(0, volume - 0.1);
        setVolume(nextVol);
        if (videoRef.current) {
          videoRef.current.volume = nextVol;
        }
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleVideoFullscreen();
      } else if (e.key === 't') {
        e.preventDefault();
        onTheaterFullscreenToggle?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted, duration, canControl]);

  // Retry on error
  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`cinema-player-container ${!showControls && isPlaying ? 'controls-hidden' : ''}`}
      onMouseMove={handleUserActivity}
      onMouseEnter={handleUserActivity}
      onClick={handleUserActivity}
    >
      {/* Video Element (Native HTML5 playback engine) */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="cinema-video-element"
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        onLoadStart={() => {
          setIsLoading(true);
          setHasError(false);
        }}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            setDuration(videoRef.current.duration || 0);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
        onError={(e) => {
          setIsLoading(false);
          setHasError(true);
          setErrorMessage('Failed to load video stream. Check your network or source availability.');
        }}
        onClick={togglePlay}
      />

      {/* Sync Drift Notice Toast */}
      {syncNotice && (
        <div className="cinema-sync-toast">
          {syncNotice}
        </div>
      )}

      {/* Loading Spinner Overlay */}
      {isLoading && !hasError && (
        <div className="cinema-spinner-overlay">
          <Loader2 className="cinema-spinner-icon" size={48} />
          <span>Buffering cinema stream...</span>
        </div>
      )}

      {/* Error Overlay with Retry */}
      {hasError && (
        <div className="cinema-error-overlay">
          <AlertTriangle size={42} style={{ color: '#e50914', marginBottom: '8px' }} />
          <h3>Stream Playback Interrupted</h3>
          <p>{errorMessage}</p>
          <button type="button" className="btn-cinema-retry" onClick={handleRetry}>
            <RotateCcw size={14} /> Retry Playback
          </button>
        </div>
      )}

      {/* Big Center Play Button Overlay on Pause */}
      {!isPlaying && !isLoading && !hasError && (
        <div className="cinema-center-play-overlay" onClick={togglePlay}>
          <div className="center-play-disc">
            <Play size={38} fill="#ffffff" style={{ marginLeft: '4px' }} />
          </div>
        </div>
      )}

      {/* ── CUSTOM CINEMA CONTROLS OVERLAY ── */}
      <div className={`cinema-controls-bar ${showControls ? 'visible' : ''}`}>
        {/* Scrubber / Progress Bar */}
        <div className="cinema-scrubber-wrapper">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            disabled={!canControl}
            className="cinema-scrubber-input"
            style={{
              background: `linear-gradient(to right, #e50914 ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`
            }}
          />
        </div>

        {/* Controls Row */}
        <div className="cinema-controls-row">
          {/* Left Controls: Play/Pause, Volume, Time */}
          <div className="cinema-controls-left">
            <button
              type="button"
              className="btn-player-icon"
              onClick={togglePlay}
              disabled={!canControl}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
            </button>

            <div className="cinema-volume-group">
              <button
                type="button"
                className="btn-player-icon"
                onClick={toggleMute}
                title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={19} />
                ) : volume < 0.5 ? (
                  <Volume1 size={19} />
                ) : (
                  <Volume2 size={19} />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="cinema-volume-slider"
                style={{
                  background: `linear-gradient(to right, #fff ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)`
                }}
              />
            </div>

            <div className="cinema-time-display">
              <span className="current-time">{formatTime(currentTime)}</span>
              <span className="time-separator">/</span>
              <span className="total-time">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Center Info: Title & Year */}
          <div className="cinema-title-badge">
            <span className="title-text">{contentTitle}</span>
            {contentYear && <span className="year-pill">{contentYear}</span>}
          </div>

          {/* Right Controls: Speed, Subtitles, Theater Fullscreen, Video Fullscreen */}
          <div className="cinema-controls-right">
            {/* Playback Rate Dropdown */}
            <div className="cinema-speed-control-wrapper">
              <button
                type="button"
                className="btn-player-icon btn-speed-indicator"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                title="Playback Speed"
              >
                <span>{playbackRate === 1 ? '1x' : `${playbackRate}x`}</span>
              </button>

              {showSpeedMenu && (
                <div className="cinema-speed-popover">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      className={`speed-option ${playbackRate === rate ? 'active' : ''}`}
                      onClick={() => handleSpeedSelect(rate)}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Captions Toggle */}
            <button
              type="button"
              className={`btn-player-icon ${captionsOn ? 'active-gold' : ''}`}
              onClick={() => setCaptionsOn(!captionsOn)}
              title="Subtitles"
            >
              <Subtitles size={18} />
            </button>

            {/* Theater Fullscreen (Entire watch-room enters fullscreen, chat stays visible) */}
            <button
              type="button"
              className={`btn-player-icon ${isTheaterFullscreen ? 'active-gold' : ''}`}
              onClick={onTheaterFullscreenToggle}
              title={isTheaterFullscreen ? 'Exit Theater Fullscreen (t)' : 'Theater Fullscreen (t)'}
            >
              <Monitor size={18} />
            </button>

            {/* Video-Only Fullscreen (Only the movie player expands to full screen) */}
            <button
              type="button"
              className="btn-player-icon"
              onClick={toggleVideoFullscreen}
              title={isVideoFullscreen ? 'Exit Fullscreen (f)' : 'Fullscreen (f)'}
            >
              {isVideoFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
