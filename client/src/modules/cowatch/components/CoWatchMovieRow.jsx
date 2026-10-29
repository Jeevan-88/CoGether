import React, { useRef } from 'react';
import { Flame, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import ContentCard from './ContentCard.jsx';
import './CoWatchMovieRow.css';

export default function CoWatchMovieRow({
  title = 'Trending Now',
  subtitle = null,
  icon: Icon = Flame,
  items = [],
  favoritesList = new Set(),
  onToggleFavorite,
  onWatchSolo,
  onWatchParty,
  onViewAll
}) {
  const trackRef = useRef(null);

  const scrollLeft = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: -360, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: 360, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="cowatch-movie-row-section cowatch-catalog-section" aria-label={title}>
      {/* ── 1. Row Header ── */}
      <div className="cowatch-row-header">
        <div className="cowatch-row-title-cluster">
          <div className="cowatch-row-icon-flame">
            <Icon size={14} />
          </div>
          <div>
            <h2 className="cowatch-row-title">{title}</h2>
            {subtitle && (
              <p className="cowatch-rail-subtitle" style={{ fontSize: '11px', color: '#817A7C', margin: '2px 0 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="cowatch-row-actions-cluster">
          {onViewAll && (
            <button
              type="button"
              className="btn-row-view-all"
              onClick={onViewAll}
            >
              View All
            </button>
          )}

          <div className="row-arrows-pair">
            <button
              type="button"
              className="btn-row-nav-arrow"
              onClick={scrollLeft}
              title="Previous titles"
              aria-label="Previous titles"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              className="btn-row-nav-arrow"
              onClick={scrollRight}
              title="Next titles"
              aria-label="Next titles"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Scrollable Cards Track & Floating Arrow ── */}
      <div className="cowatch-row-scroll-container">
        <div className="cowatch-row-scroll-track" ref={trackRef}>
          {items.map((item) => (
            <ContentCard
              key={item.id}
              content={item}
              isFavorited={favoritesList.has(item.id)}
              onToggleFavorite={onToggleFavorite}
              onWatchSolo={onWatchSolo}
              onWatchParty={onWatchParty}
            />
          ))}
        </div>

        {items.length > 4 && (
          <button
            type="button"
            className="btn-floating-edge-arrow"
            onClick={scrollRight}
            title="Scroll forward"
            aria-label="Scroll forward"
          >
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </section>
  );
}
