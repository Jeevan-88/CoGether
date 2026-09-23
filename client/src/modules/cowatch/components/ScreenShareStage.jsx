import React, { useState, useRef, useEffect } from 'react';
import { Monitor, ShieldAlert, StopCircle, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';

export default function ScreenShareStage({
  isSharing,
  screenStream,
  sharingUserName = 'Host',
  onStartShare,
  onStopShare,
  onOpenProvider,
  onSwitchToSyncMode
}) {
  const videoRef = useRef(null);
  const [showProtectedFailureNotice, setShowProtectedFailureNotice] = useState(false);

  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  return (
    <div className="theater-video-pane" style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      {screenStream ? (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />

          {/* Top Attribution Bar */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(6, 6, 8, 0.9)',
            border: '1px solid rgba(229, 9, 20, 0.5)',
            borderRadius: '20px',
            padding: '6px 14px',
            zIndex: 20,
            backdropFilter: 'blur(8px)'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e676' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', letterSpacing: '0.5px' }}>
              SHARING: {sharingUserName}&apos;s Screen / Tab
            </span>
            {onStopShare && (
              <button
                type="button"
                onClick={onStopShare}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--cw-crimson-primary)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  cursor: 'pointer'
                }}
              >
                <StopCircle size={11} />
                <span>Stop Share</span>
              </button>
            )}
          </div>

          {/* Protected Playback Notice Trigger */}
          <button
            type="button"
            onClick={() => setShowProtectedFailureNotice((prev) => !prev)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(18, 19, 24, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '5px 12px',
              color: 'var(--cw-text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
              zIndex: 20
            }}
          >
            <AlertTriangle size={12} style={{ color: 'var(--cw-gold-primary)' }} />
            <span>Black screen issue?</span>
          </button>

          {/* Protected Playback DRM Failure Overlay */}
          {showProtectedFailureNotice && (
            <div style={{
              position: 'absolute',
              top: '60px',
              right: '20px',
              maxWidth: '380px',
              background: 'rgba(12, 13, 16, 0.97)',
              border: '1px solid var(--cw-border-crimson)',
              borderRadius: '10px',
              padding: '16px',
              zIndex: 30,
              boxShadow: '0 8px 30px rgba(0,0,0,0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff7b82', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                <ShieldAlert size={16} />
                <span>Protected Playback Detected</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: 'var(--cw-text-secondary)' }}>
                Protected playback can&apos;t be shared from this browser. Open the service on your own device and use CoGether Sync instead.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                {onOpenProvider && (
                  <button
                    type="button"
                    onClick={onOpenProvider}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      background: 'var(--cw-bg-surface)',
                      border: '1px solid var(--cw-border-subtle)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '11px',
                      padding: '8px 10px',
                      cursor: 'pointer'
                    }}
                  >
                    <ExternalLink size={12} />
                    <span>Open Provider</span>
                  </button>
                )}
                {onSwitchToSyncMode && (
                  <button
                    type="button"
                    onClick={onSwitchToSyncMode}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      background: 'var(--cw-crimson-primary)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '11px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    <RefreshCw size={12} />
                    <span>Use Watch Sync</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Screen Share Selection & Consent HUD */
        <div className="companion-stage-box" style={{ maxWidth: '600px' }}>
          <div className="companion-logo-badge" style={{ borderColor: 'var(--cw-border-crimson)' }}>
            <Monitor size={32} style={{ color: 'var(--cw-crimson-primary)' }} />
          </div>

          <div>
            <h2 className="companion-status-title">Screen Share Watch Together</h2>
            <span style={{ fontSize: '12px', color: 'var(--cw-text-secondary)', fontWeight: 300 }}>
              Share your browser tab, application window, or full screen directly with participants.
            </span>
          </div>

          <div className="companion-notice-card" style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontWeight: 600, color: '#ff7b82', fontSize: '12px' }}>
              <ShieldAlert size={14} />
              <span>Protected Playback Limitation</span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: 'var(--cw-text-secondary)', fontWeight: 300 }}>
              Protected playback can&apos;t be shared from this browser. Open the service on your own device and use CoGether Sync instead.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '360px' }}>
            <button
              type="button"
              className="btn-hero-watch-party"
              onClick={onStartShare}
              style={{ padding: '12px 20px', justifyContent: 'center' }}
            >
              <Monitor size={15} />
              <span>Share Tab, Window, or Screen</span>
            </button>

            {onSwitchToSyncMode && (
              <button
                type="button"
                className="btn-cowatch-join-room"
                onClick={onSwitchToSyncMode}
                style={{ padding: '10px 18px', justifyContent: 'center' }}
              >
                <span>Use Individual Sync Instead</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
