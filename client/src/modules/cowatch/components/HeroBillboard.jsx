import React from 'react';
import { Play, Users } from 'lucide-react';

export default function HeroBillboard({ content, onWatchNow, onWatchTogether }) {
  if (!content) return null;

  const isCompanion = content.playbackMode === 'EXTERNAL_PROVIDER';

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return `${h}h ${rem > 0 ? `${rem}m` : ''}`;
    }
    return `${m}m`;
  };

  const metaString = [
    content.year || '',
    formatDuration(content.duration),
    content.genre || '',
    content.providerName || ''
  ].filter(Boolean).join(' · ');

  return (
    <section className="cowatch-hero-billboard">
      <img
        src={content.backdrop || content.thumbnail}
        alt={content.title}
        className="cowatch-hero-backdrop"
      />
      <div className="cowatch-hero-vignette" />

      <div className="cowatch-hero-content">
        {metaString && (
          <div className="cowatch-hero-meta-line">
            {metaString}
          </div>
        )}

        <h1 className="cowatch-hero-title">{content.title}</h1>
        
        {content.description && (
          <p className="cowatch-hero-desc">{content.description}</p>
        )}

        <div className="cowatch-hero-actions-row">
          <button
            type="button"
            className="btn-hero-watch-now"
            onClick={() => onWatchNow(content)}
          >
            <Play size={14} fill="#060608" />
            <span>{isCompanion ? 'Open Media' : 'Watch'}</span>
          </button>

          <button
            type="button"
            className="btn-hero-watch-party"
            onClick={() => onWatchTogether(content)}
          >
            <Users size={14} />
            <span>Watch Together</span>
          </button>
        </div>
      </div>
    </section>
  );
}
