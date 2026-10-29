import React from 'react';
import './ContentDetailsModal.css';

export default function ContentDetailsModal({
  isOpen,
  content,
  onClose,
  onPlayDirect,
  onWatchTogether
}) {
  if (!isOpen || !content) return null;

  const isFreeOrYouTube =
    content.sourceType === 'PUBLIC_DOMAIN' ||
    content.sourceType === 'OPEN_LICENSE' ||
    content.sourceType === 'YOUTUBE' ||
    content.playbackMode === 'NATIVE_PLAYER' ||
    content.playbackMode === 'YOUTUBE_PLAYER';

  const defaultPoster =
    content.poster ||
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80';

  const defaultBackdrop =
    content.backdrop ||
    content.poster ||
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80';

  return (
    <div className="cd-overlay" onClick={onClose}>
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
        {/* Backdrop Banner */}
        <div
          className="cd-backdrop"
          style={{ backgroundImage: `url(${defaultBackdrop})` }}
        >
          <div className="cd-backdrop-gradient" />
          <button className="cd-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="cd-content">
          <div className="cd-header-row">
            <img
              src={defaultPoster}
              alt={content.title}
              className="cd-poster"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80';
              }}
            />
            <div className="cd-titles">
              <div className="cd-platform-badge">
                <span className="dot" />
                <span>{content.providerName || (isFreeOrYouTube ? 'CoWatch Free Cinema' : 'Subscription Content')}</span>
              </div>
              <h2 className="cd-title">{content.title}</h2>
              <div className="cd-metadata-pills">
                {content.year && <span className="cd-pill">{content.year}</span>}
                {content.runtime && <span className="cd-pill">{content.runtime}</span>}
                {content.genre && <span className="cd-pill">{content.genre}</span>}
                {content.rating && (
                  <span className="cd-pill rating">
                    ★ {content.rating}
                  </span>
                )}
                {content.quality && <span className="cd-pill">{content.quality}</span>}
              </div>
            </div>
          </div>

          {/* Synopsis */}
          <div className="cd-synopsis">
            {content.description ||
              'Experience this cinematic title together with crystal-clear audio, synchronized timestamps, and real-time party reactions.'}
          </div>

          {/* License & Rights attribution */}
          <div className="cd-attribution-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              {content.sourceType === 'PUBLIC_DOMAIN' && (
                <span><strong>Public Domain Master:</strong> Legally free to broadcast, perform, and stream worldwide without DRM restrictions.</span>
              )}
              {content.sourceType === 'OPEN_LICENSE' && (
                <span><strong>Creative Commons (CC-BY 3.0):</strong> Open-source cinema authored by the Blender Animation Foundation.</span>
              )}
              {content.sourceType === 'YOUTUBE' && (
                <span><strong>Official YouTube Embed:</strong> Broadcasted under YouTube Terms of Service via iframe embed API.</span>
              )}
              {!isFreeOrYouTube && (
                <span><strong>DRM Protected Content:</strong> Requires active subscriber credentials on {content.providerName || 'the official provider'}.</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="cd-actions-row">
            {isFreeOrYouTube ? (
              <>
                <button
                  type="button"
                  className="wt-btn wt-btn-primary"
                  onClick={() => {
                    onClose();
                    onPlayDirect(content);
                  }}
                >
                  ▶ Watch Free (Instant)
                </button>
                <button
                  type="button"
                  className="wt-btn wt-btn-secondary"
                  onClick={() => {
                    onClose();
                    onWatchTogether(content);
                  }}
                >
                  👥 Watch Together
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="wt-btn wt-btn-primary"
                  onClick={() => {
                    onClose();
                    onWatchTogether(content);
                  }}
                >
                  👥 Watch Together Setup
                </button>
                {content.externalUrl && (
                  <button
                    type="button"
                    className="wt-btn wt-btn-secondary"
                    onClick={() => window.open(content.externalUrl, '_blank')}
                  >
                    ↗ Visit {content.providerName || 'Platform'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
