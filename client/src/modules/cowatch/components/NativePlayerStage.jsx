import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  Subtitles, Settings 
} from 'lucide-react';

export default function NativePlayerStage({
  videoSrc,
  contentTitle,
  isHost,
  controlPolicy = 'HOST_ONLY',
  onPlaybackChange,
  remoteSyncState,
  reactionsList = []
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [quality, setQuality] = useState('1080p');
  const [syncStatus, setSyncStatus] = useState('SYNCED'); // 'SYNCED' | 'DRIFTING' | 'RECONNECTING'

  const controlsTimeoutRef = useRef(null);
  const isApplyingRemoteSync = useRef(false);

  const canControl = controlPolicy === 'EVERYONE' || isHost;

  // Handle Remote Sync Events with Multi-Tier Drift Correction
  useEffect(() => {
    if (!remoteSyncState || !videoRef.current) return;
    const v = videoRef.current;
    const { action, position, serverTimeMs, playbackRate = 1.0 } = remoteSyncState;

    const now = Date.now();
    const elapsedSeconds = action === 'PLAY' ? Math.max(0, (now - serverTimeMs) / 1000) : 0;
    const targetPosition = position + elapsedSeconds * playbackRate;
    const driftMs = Math.abs((v.currentTime - targetPosition) * 1000);

    isApplyingRemoteSync.current = true;

    // Multi-Tier Drift Correction (Quiet user-facing status without technical dump)
    if (driftMs > 750) {
      v.currentTime = targetPosition;
      setSyncStatus('DRIFTING');
      setTimeout(() => setSyncStatus('SYNCED'), 1200);
    } else if (driftMs > 100) {
      v.playbackRate = v.currentTime < targetPosition ? 1.04 : 0.96;
      setSyncStatus('DRIFTING');
      setTimeout(() => {
        if (videoRef.current) videoRef.current.playbackRate = 1.0;
        setSyncStatus('SYNCED');
      }, 1500);
    } else {
      setSyncStatus('SYNCED');
    }

    if (action === 'PLAY' && v.paused) {
      v.play().catch(() => {});
      setIsPlaying(true);
    } else if (action === 'PAUSE' && !v.paused) {
      v.pause();
      setIsPlaying(false);
    } else if (action === 'SEEK') {
      v.currentTime = targetPosition;
    }

    setTimeout(() => {
      isApplyingRemoteSync.current = false;
    }, 250);
  }, [remoteSyncState]);

  // Volume & Audio
  useEffect(() => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = 0;
    } else {
      videoRef.current.volume = Math.min(1.0, volume / 100);
    }
  }, [volume, isMuted]);

  const handlePlayToggle = () => {
    if (!canControl || !videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      onPlaybackChange?.({ action: 'PAUSE', position: videoRef.current.currentTime });
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      onPlaybackChange?.({ action: 'PLAY', position: videoRef.current.currentTime });
    }
  };

  const handleSeek = (e) => {
    if (!canControl || !videoRef.current) return;
    const target = Number(e.target.value);
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    onPlaybackChange?.({ action: 'SEEK', position: target });
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={containerRef}
      className="theater-video-pane"
      onMouseMove={handleMouseMove}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000',
        overflow: 'hidden',
        cursor: showControls ? 'default' : 'none'
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="cinema-native-video"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onClick={handlePlayToggle}
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />

      {/* Floating Reactions Overlay */}
      <div className="floating-reactions-container">
        {reactionsList.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(12, 13, 16, 0.85)',
              border: '1px solid rgba(229, 9, 20, 0.4)',
              borderRadius: '20px',
              animation: 'fadeIn 0.25s ease'
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--cw-gold-light)', fontWeight: 300 }}>
              {r.senderName}
            </span>
            <span style={{ fontSize: '16px' }}>{r.emoji}</span>
          </div>
        ))}
      </div>

      {/* Custom Minimal Controls Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          background: 'linear-gradient(0deg, rgba(5,5,7,0.95) 0%, rgba(5,5,7,0.7) 60%, transparent 100%)',
          padding: '14px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          transition: 'opacity 0.25s ease',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          zIndex: 25
        }}
      >
        {/* Scrubber Timeline */}
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          disabled={!canControl}
          style={{
            width: '100%',
            accentColor: 'var(--cw-crimson-primary)',
            cursor: canControl ? 'pointer' : 'not-allowed',
            height: '3px'
          }}
        />

        {/* Action Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              type="button"
              onClick={handlePlayToggle}
              disabled={!canControl}
              style={{
                background: 'transparent',
                border: 'none',
                color: canControl ? '#fff' : 'var(--cw-text-muted)',
                cursor: canControl ? 'pointer' : 'not-allowed',
                padding: '4px'
              }}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setIsMuted(false);
                setVolume(Number(e.target.value));
              }}
              style={{ width: '70px', accentColor: 'var(--cw-gold-primary)', cursor: 'pointer', height: '3px' }}
            />

            <span style={{ fontSize: '11px', color: 'var(--cw-text-muted)', fontWeight: 300 }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Captions Toggle */}
            <button
              type="button"
              onClick={() => setCaptionsOn(!captionsOn)}
              style={{
                background: 'transparent',
                border: 'none',
                color: captionsOn ? 'var(--cw-gold-primary)' : 'var(--cw-text-muted)',
                cursor: 'pointer',
                padding: '4px'
              }}
              title="Toggle Captions"
            >
              <Subtitles size={16} />
            </button>

            {/* Quality Selector */}
            <button
              type="button"
              onClick={() => setQuality(quality === '1080p' ? '720p' : '1080p')}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--cw-border-subtle)',
                borderRadius: '4px',
                color: 'var(--cw-text-secondary)',
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 6px',
                cursor: 'pointer'
              }}
              title="Stream Quality"
            >
              {quality}
            </button>

            {/* Minimal Sync Indicator */}
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.6px',
              padding: '3px 8px',
              borderRadius: '12px',
              background: syncStatus === 'SYNCED' ? 'rgba(212, 175, 55, 0.12)' : 'rgba(229, 9, 20, 0.18)',
              border: `1px solid ${syncStatus === 'SYNCED' ? 'rgba(212, 175, 55, 0.4)' : 'var(--cw-border-crimson)'}`,
              color: syncStatus === 'SYNCED' ? 'var(--cw-gold-light)' : '#ff8a90'
            }}>
              {syncStatus}
            </span>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
