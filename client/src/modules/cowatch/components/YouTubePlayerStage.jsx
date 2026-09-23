import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, AlertCircle, Play, Pause, Sparkles } from 'lucide-react';

export default function YouTubePlayerStage({
  videoId,
  contentTitle,
  isHost,
  controlPolicy,
  onPlaybackChange,
  remoteSyncState,
  reactionsList = []
}) {
  const [hasEmbedError, setHasEmbedError] = useState(false);
  const iframeRef = useRef(null);

  const cleanVideoId = videoId || 'jfKfPfyJRdk';
  const embedUrl = `https://www.youtube-nocookie.com/embed/${cleanVideoId}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`;

  // Relay playback commands to YouTube IFrame via postMessage
  useEffect(() => {
    if (!remoteSyncState || !iframeRef.current) return;
    const { action, position } = remoteSyncState;

    try {
      if (action === 'PLAY') {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        );
      } else if (action === 'PAUSE') {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          '*'
        );
      } else if (action === 'SEEK' && position !== undefined) {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [position, true] }),
          '*'
        );
      }
    } catch (e) {}
  }, [remoteSyncState]);

  return (
    <div className="theater-video-pane" style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      {hasEmbedError ? (
        <div className="companion-stage-box" style={{ maxWidth: '580px' }}>
          <AlertCircle size={48} style={{ color: 'var(--cw-crimson-primary)' }} />
          <h3 style={{ margin: 0, color: '#fff' }}>Playback Restricted by Creator</h3>
          <p style={{ color: 'var(--cw-text-secondary)', fontSize: '13px' }}>
            The video owner does not permit playback inside external embeds. You can still watch it directly on YouTube while keeping your CoGether room connected for audio/video social voice.
          </p>
          <a
            href={`https://www.youtube.com/watch?v=${cleanVideoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-hero-watch-now"
            style={{ textDecoration: 'none' }}
          >
            <ExternalLink size={15} />
            <span>Open on YouTube</span>
          </a>
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={contentTitle || 'YouTube Watch Party'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 'none' }}
            onError={() => setHasEmbedError(true)}
          />

          {/* Floating Reactions */}
          <div style={{
            position: 'absolute',
            right: '24px',
            bottom: '40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'none',
            zIndex: 30
          }}>
            {reactionsList.map((r) => (
              <div
                key={r.id}
                style={{
                  background: 'rgba(15, 16, 19, 0.85)',
                  border: '1px solid var(--cw-border-gold)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px var(--cw-gold-glow)'
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--cw-gold-light)', fontWeight: 700 }}>
                  {r.senderName}
                </span>
                <span style={{ fontSize: '18px' }}>{r.emoji}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
