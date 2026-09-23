import React, { useState, useEffect } from 'react';
import { 
  Tv, ExternalLink, Timer, Play, Pause, AlertTriangle, 
  CheckCircle2, Users, Radio, ShieldAlert, Sparkles 
} from 'lucide-react';

export default function CompanionHUDStage({
  content,
  roomCode,
  isHost,
  controlPolicy,
  onPlaybackChange,
  remoteSyncState
}) {
  const [countdown, setCountdown] = useState(null);
  const [partyStatus, setPartyStatus] = useState('PAUSED');
  const [syncedPosition, setSyncedPosition] = useState(0);

  const providerName = content?.providerName || 'Streaming Provider';
  const deepLink = content?.externalUrl || 'https://www.netflix.com';

  const canControl = controlPolicy === 'EVERYONE' || isHost;

  useEffect(() => {
    if (!remoteSyncState) return;
    if (remoteSyncState.action === 'PLAY') setPartyStatus('STREAMING');
    if (remoteSyncState.action === 'PAUSE') setPartyStatus('PAUSED');
    if (remoteSyncState.position !== undefined) setSyncedPosition(remoteSyncState.position);
  }, [remoteSyncState]);

  const handleStartCountdown = () => {
    if (!canControl) return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          setPartyStatus('STREAMING');
          onPlaybackChange?.({ action: 'PLAY', position: syncedPosition });
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTogglePlay = () => {
    if (!canControl) return;
    if (partyStatus === 'STREAMING') {
      setPartyStatus('PAUSED');
      onPlaybackChange?.({ action: 'PAUSE', position: syncedPosition });
    } else {
      setPartyStatus('STREAMING');
      onPlaybackChange?.({ action: 'PLAY', position: syncedPosition });
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="theater-video-pane" style={{ padding: '36px', overflowY: 'auto' }}>
      <div className="companion-stage-box">
        <div className="companion-logo-badge">
          <Tv size={36} style={{ color: 'var(--cw-gold-primary)' }} />
        </div>

        <div>
          <h2 className="companion-status-title">CoGether Watch Companion</h2>
          <span style={{ fontSize: '13px', color: 'var(--cw-gold-light)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700 }}>
            {providerName} • Synchronized Room {roomCode}
          </span>
        </div>

        {/* DRM Advisory Notice */}
        <div className="companion-notice-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontWeight: 700, color: '#ff6b72' }}>
            <ShieldAlert size={16} />
            <span>DRM Hardware Protected Media</span>
          </div>
          Due to studio Widevine/FairPlay encryption, streaming video cannot be captured via screen-sharing (renders as a black screen).
          Instead, <strong>each participant streams {content?.title} through their own authorized account</strong> while CoGether synchronizes timeline timestamps, voices, and cameras.
        </div>

        {/* Sync Status Box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          background: 'var(--cw-bg-surface)',
          border: '1px solid var(--cw-border-gold)',
          borderRadius: 'var(--cw-radius-lg)',
          padding: '20px 36px',
          boxShadow: '0 0 20px var(--cw-gold-glow)'
        }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--cw-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Playback State
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <Radio size={14} style={{ color: partyStatus === 'STREAMING' ? '#00e676' : 'var(--cw-crimson-primary)' }} />
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                {countdown !== null ? `STARTING IN ${countdown}...` : partyStatus}
              </span>
            </div>
          </div>

          <div style={{ width: '1px', height: '40px', background: 'var(--cw-border-subtle)' }} />

          <div>
            <span style={{ fontSize: '11px', color: 'var(--cw-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Target Timestamp
            </span>
            <div style={{ fontSize: '20px', fontFamily: 'var(--cw-font-mono)', fontWeight: 800, color: 'var(--cw-gold-light)', marginTop: '4px' }}>
              {formatSeconds(syncedPosition)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="companion-action-row">
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-companion-open-tab"
            style={{ textDecoration: 'none' }}
          >
            <ExternalLink size={16} />
            <span>Open in {providerName}</span>
          </a>

          {canControl && (
            <>
              <button
                type="button"
                className="btn-companion-countdown"
                onClick={handleStartCountdown}
                disabled={countdown !== null}
              >
                <Timer size={16} />
                <span>Ready 3-2-1 Countdown</span>
              </button>

              <button
                type="button"
                className="btn-companion-countdown"
                onClick={handleTogglePlay}
                style={{ borderColor: 'var(--cw-border-crimson)', color: '#fff' }}
              >
                {partyStatus === 'STREAMING' ? <Pause size={16} /> : <Play size={16} />}
                <span>{partyStatus === 'STREAMING' ? 'Pause Sync' : 'Resume Sync'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
