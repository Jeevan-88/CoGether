import React from 'react';
import { Play, Star } from 'lucide-react';
import './ContentCard.css';

export default function ContentCard({
  content,
  isFavorited = false,
  onToggleFavorite,
  onWatchSolo,
  onWatchParty
}) {
  if (!content) return null;

  const displayTitle = content.title || 'Untitled';
  const displayYear = content.year || '2024';
  
  // Format duration into "2h 46m"
  const formatDuration = (seconds) => {
    if (!seconds) return '2h 15m';
    if (typeof seconds === 'string' && seconds.includes('h')) return seconds;
    const m = Math.floor(seconds / 60);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return `${h}h ${rem > 0 ? `${rem}m` : ''}`;
    }
    return `${m}m`;
  };

  const displayRuntime = content.runtime || formatDuration(content.duration);
  const displayRating = content.rating || (content.score ? content.score.toFixed(1) : '8.6');
  const qualityBadge = content.quality || (content.is4K ? '4K' : (content.year >= 2020 ? '4K' : 'HD'));
  const isNativeMedia = content.playbackMode === 'NATIVE_PLAYER' || content.sourceType === 'PUBLIC_DOMAIN' || content.isFree;

  // Source type badge
  let sourceBadge = null;
  if (content.badge) {
    sourceBadge = { label: content.badge, cls: 'badge-custom' };
  } else if (isNativeMedia) {
    sourceBadge = { label: 'FREE STREAM', cls: 'badge-free' };
  } else if (content.playbackMode === 'YOUTUBE_PLAYER' || content.sourceType === 'YOUTUBE') {
    sourceBadge = { label: 'YOUTUBE', cls: 'badge-yt' };
  } else if (content.playbackMode === 'EXTERNAL_PROVIDER') {
    sourceBadge = { label: content.providerName || 'COMPANION', cls: 'badge-drm' };
  }

  const posterSrc = content.poster || content.thumbnail || content.backdrop || '/assets/cinema/poster_dune.png';

  const handleClick = (e) => {
    if (onWatchParty) {
      onWatchParty(content);
    } else if (onWatchSolo) {
      onWatchSolo(content);
    }
  };

  return (
    <div
      className={`cowatch-portrait-card ${isNativeMedia ? 'cowatch-content-card' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      title={`${displayTitle} (${displayYear}) — Watch together`}
      aria-label={`${displayTitle}`}
    >
      {/* ── 1. Poster Artwork & Quality Badge ── */}
      <div className="portrait-poster-box">
        <img
          src={posterSrc}
          alt={displayTitle}
          className="portrait-poster-img"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = '/assets/cinema/poster_dune.png';
          }}
        />

        {/* Source Badge (Top Left) */}
        {sourceBadge && (
          <span className={`portrait-source-badge ${sourceBadge.cls}`}>
            {sourceBadge.label}
          </span>
        )}

        {/* Quality Pill Badge (4K / HD) */}
        <span className="portrait-quality-badge">{qualityBadge}</span>

        {/* Hover Action Scrim */}
        <div className="portrait-hover-scrim">
          <button 
            type="button" 
            className="hover-play-circle btn-card-party"
            onClick={(e) => {
              e.stopPropagation();
              if (onWatchParty) onWatchParty(content);
              else if (onWatchSolo) onWatchSolo(content);
            }}
            aria-label={`Start Watch Party for ${displayTitle}`}
          >
            <Play size={16} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: '2px' }} />
          </button>
        </div>
      </div>

      {/* ── 2. Metadata Beneath Poster ── */}
      <div className="portrait-meta-block">
        <span className="portrait-title">{displayTitle}</span>

        <div className="portrait-sub-row">
          <span className="portrait-runtime">
            {displayYear} · {displayRuntime}
          </span>

          <div className="portrait-rating">
            <Star size={11} className="rating-star-icon" />
            <span>{displayRating}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
