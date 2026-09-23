import React from 'react';
import { Play, Users, ExternalLink, Heart } from 'lucide-react';

export default function ContentCard({
  content,
  isFavorited = false,
  onToggleFavorite,
  onWatchSolo,
  onWatchParty
}) {
  const isCompanion = content.playbackMode === 'EXTERNAL_PROVIDER';
  const isYouTube = content.playbackMode === 'YOUTUBE_PLAYER';
  const isFree = content.playbackMode === 'NATIVE_PLAYER' && (content.sourceType === 'PUBLIC_DOMAIN' || content.sourceType === 'OPEN_LICENSE');

  const formatRuntime = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return `${h}h ${rem > 0 ? `${rem}m` : ''}`;
    }
    return `${m}m`;
  };

  const getSubtleBadge = () => {
    if (isFree) {
      return <span className="card-minimal-badge badge-free">FREE</span>;
    }
    if (isYouTube) {
      return <span className="card-minimal-badge badge-yt">YOUTUBE</span>;
    }
    if (content.providerId === 'netflix') {
      return <span className="card-minimal-badge badge-netflix">NETFLIX</span>;
    }
    if (content.providerId === 'crunchyroll') {
      return <span className="card-minimal-badge badge-crunchy">CRUNCHYROLL</span>;
    }
    if (content.providerId === 'prime_video') {
      return <span className="card-minimal-badge badge-prime">PRIME</span>;
    }
    if (content.providerId === 'disney_plus') {
      return <span className="card-minimal-badge badge-disney">DISNEY+</span>;
    }
    if (content.providerId === 'jiohotstar') {
      return <span className="card-minimal-badge badge-hotstar">HOTSTAR</span>;
    }
    return null;
  };

  const metadataString = [
    content.year || '',
    formatRuntime(content.duration),
    content.genre || ''
  ].filter(Boolean).join(' · ');

  return (
    <div className="cowatch-content-card" onClick={() => onWatchParty(content)}>
      <div className="card-poster-wrapper">
        <img
          src={content.thumbnail || content.backdrop}
          alt={content.title}
          className="card-poster-img"
          loading="lazy"
        />
        {getSubtleBadge()}
      </div>

      <div className="card-details-box">
        {metadataString && (
          <span className="card-metadata-line">
            {metadataString}
          </span>
        )}

        <h3 className="card-title-text" title={content.title}>
          {content.title}
        </h3>

        {content.description && (
          <p className="card-desc-factual">
            {content.description}
          </p>
        )}

        <div className="card-actions-row">
          <button
            type="button"
            className="btn-card-watch"
            onClick={(e) => {
              e.stopPropagation();
              onWatchSolo(content);
            }}
          >
            {isCompanion ? (
              <>
                <ExternalLink size={12} />
                <span>Open</span>
              </>
            ) : (
              <>
                <Play size={11} fill="currentColor" />
                <span>Watch</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-card-party"
            onClick={(e) => {
              e.stopPropagation();
              onWatchParty(content);
            }}
            title="Watch Together"
          >
            <Users size={12} />
            <span>Watch Together</span>
          </button>

          {onToggleFavorite && (
            <button
              type="button"
              className={`btn-card-heart ${isFavorited ? 'favorited' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(content.id);
              }}
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={13} fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
