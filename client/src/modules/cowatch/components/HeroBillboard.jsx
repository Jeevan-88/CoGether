import React, { useState, useEffect } from 'react';
import { Play, Plus, Users, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import './HeroBillboard.css';

const FEATURED_ITEMS = [
  {
    id: 'feat-shogun',
    title: 'SHŌGUN',
    displayTitle: 'Shōgun',
    year: '2024',
    rating: 'TV-MA',
    length: '1 Season',
    genre: 'Drama • History',
    description: 'A gripping saga of power, culture and survival in feudal Japan, based on the global bestseller.',
    backdrop: '/assets/cinema/shogun_hero.png',
    thumb: '/assets/cinema/thumb_shogun.png',
    playbackMode: 'EXTERNAL_PROVIDER',
    providerName: 'Disney+ / Hulu',
    externalUrl: 'https://www.disneyplus.com'
  },
  {
    id: 'feat-dune-2',
    title: 'DUNE: PART TWO',
    displayTitle: 'Dune: Part Two',
    year: '2024',
    rating: 'PG-13',
    length: '2h 46m',
    genre: 'Sci-Fi • Adventure',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    backdrop: '/assets/cinema/dune_hero.jpg',
    thumb: '/assets/cinema/thumb_dune.png',
    playbackMode: 'EXTERNAL_PROVIDER',
    providerName: 'Max / Prime Video',
    externalUrl: 'https://www.max.com'
  },
  {
    id: 'feat-aot',
    title: 'ATTACK ON TITAN',
    displayTitle: 'Attack on Titan',
    year: '2023',
    rating: 'TV-MA',
    length: '4 Seasons',
    genre: 'Anime • Action',
    description: 'Humanity battles giant humanoids known as Titans that brought civilization to the brink of extinction.',
    backdrop: '/assets/cinema/aot_hero.jpg',
    thumb: '/assets/cinema/thumb_aot.png',
    playbackMode: 'EXTERNAL_PROVIDER',
    providerName: 'Crunchyroll',
    externalUrl: 'https://www.crunchyroll.com'
  },
  {
    id: 'feat-batman',
    title: 'THE BATMAN',
    displayTitle: 'The Batman',
    year: '2022',
    rating: 'PG-13',
    length: '2h 56m',
    genre: 'Action • Crime',
    description: 'In his second year of fighting crime, Batman pursues the Riddler, a sadistic serial killer targeting Gotham\'s corrupt elite.',
    backdrop: '/assets/cinema/batman_hero.jpg',
    thumb: '/assets/cinema/thumb_batman.png',
    playbackMode: 'EXTERNAL_PROVIDER',
    providerName: 'Max / Netflix',
    externalUrl: 'https://www.max.com'
  }
];

export default function HeroBillboard({
  content = null,
  onWatchNow,
  onWatchTogether,
  onAddToList
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(true);

  const activeItem = FEATURED_ITEMS[selectedIndex];

  // Auto advance hero every 8 seconds if not interacted
  useEffect(() => {
    const timer = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % FEATURED_ITEMS.length);
    }, 8500);
    return () => clearInterval(timer);
  }, []);

  const handleSelectIndex = (idx) => {
    if (idx === selectedIndex) return;
    setImgLoaded(false);
    setSelectedIndex(idx);
    setIsAdded(false);
  };

  const handlePrev = () => {
    setImgLoaded(false);
    setSelectedIndex((prev) => (prev - 1 + FEATURED_ITEMS.length) % FEATURED_ITEMS.length);
  };

  const handleNext = () => {
    setImgLoaded(false);
    setSelectedIndex((prev) => (prev + 1) % FEATURED_ITEMS.length);
  };

  const handleActionWatchNow = () => {
    if (onWatchNow) onWatchNow(activeItem);
  };

  const handleActionWatchTogether = () => {
    if (onWatchTogether) onWatchTogether(activeItem);
  };

  const handleToggleAddToList = () => {
    setIsAdded((prev) => !prev);
    if (onAddToList) onAddToList(activeItem);
  };

  return (
    <section className="cowatch-hero-panel cowatch-hero-billboard" aria-label="Featured Cinema Billboard">
      {/* ── 1. Background Artwork & Vignette ── */}
      <div className="cowatch-hero-art-layer">
        <img
          key={activeItem.backdrop}
          src={activeItem.backdrop}
          alt={activeItem.title}
          className={`cowatch-hero-art-img ${imgLoaded ? 'loaded' : ''}`}
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            // fallback gracefully
            e.currentTarget.src = '/assets/cinema/shogun_hero.png';
          }}
        />
        <div className="cowatch-hero-gradient-overlay" />
        <div className="cowatch-hero-bottom-vignette" />
      </div>

      {/* ── 2. Left Main Content ── */}
      <div className="cowatch-hero-left-col">
        <div className="cowatch-hero-main-info">
          {/* FEATURED Label */}
          <div className="cowatch-featured-tag">
            <span className="cowatch-featured-plane">✈</span>
            <span>FEATURED</span>
          </div>

          {/* Large Serif Title */}
          <h1 className="cowatch-hero-title-serif cowatch-hero-title" key={activeItem.title}>
            {activeItem.title}
          </h1>

          {/* Metadata Row */}
          <div className="cowatch-hero-meta-bar">
            <span>{activeItem.year}</span>
            <span className="meta-divider">|</span>
            <span>{activeItem.rating}</span>
            <span className="meta-divider">|</span>
            <span>{activeItem.length}</span>
            <span className="meta-divider">|</span>
            <span>{activeItem.genre}</span>
          </div>

          {/* Description */}
          <p className="cowatch-hero-description" key={activeItem.description}>
            {activeItem.description}
          </p>

          {/* Action Buttons Row */}
          <div className="cowatch-hero-buttons-row">
            <button
              type="button"
              className="btn-hero-watch-now"
              onClick={handleActionWatchNow}
              title={`Watch ${activeItem.displayTitle} now`}
            >
              <Play size={15} fill="#FFFFFF" />
              <span>Watch Now</span>
            </button>

            <button
              type="button"
              className="btn-hero-glass-action"
              onClick={handleToggleAddToList}
              title={isAdded ? "Remove from List" : "Add to My List"}
            >
              {isAdded ? <Check size={15} color="#00E676" /> : <Plus size={15} />}
              <span>{isAdded ? "Added to List" : "Add to List"}</span>
            </button>

            <button
              type="button"
              className="btn-hero-glass-action"
              onClick={handleActionWatchTogether}
              title="Watch together in synchronized party room"
            >
              <Users size={15} />
              <span>Watch Together</span>
            </button>
          </div>
        </div>

        {/* Bottom Carousel Pagination Dots & Arrows */}
        <div className="cowatch-hero-bottom-controls">
          <div className="hero-pagination-dots">
            {FEATURED_ITEMS.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`hero-dot ${idx === selectedIndex ? 'active' : ''}`}
                onClick={() => handleSelectIndex(idx)}
                aria-label={`Jump to slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="hero-arrows-group">
            <button
              type="button"
              className="btn-hero-arrow"
              onClick={handlePrev}
              title="Previous Title"
              aria-label="Previous Title"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="btn-hero-arrow"
              onClick={handleNext}
              title="Next Title"
              aria-label="Next Title"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Right Vertical Title Selector Stack ── */}
      <div className="cowatch-hero-right-col">
        {FEATURED_ITEMS.map((item, idx) => {
          const isActive = idx === selectedIndex;
          return (
            <div
              key={item.id}
              className={`hero-selector-card ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectIndex(idx)}
              role="button"
              tabIndex={0}
              aria-label={`Select ${item.displayTitle}`}
            >
              <div className="selector-thumb-wrap">
                <img
                  src={item.thumb}
                  alt={item.displayTitle}
                  className="selector-thumb-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {isActive && (
                  <div className="selector-play-overlay">
                    <Play size={14} fill="#FFFFFF" color="#FFFFFF" />
                  </div>
                )}
              </div>

              <div className="selector-info">
                <span className="selector-title">{item.displayTitle}</span>
                <span className="selector-genre">{item.genre}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
