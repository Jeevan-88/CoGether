import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { getGameLandingData } from '../gameLandingData.js';
import './AppleGameDetail.css';

export default function AppleGameDetail({ 
  game, 
  onBackToCatalog, 
  onLaunchPlay,
  onOpenInviteModal 
}) {
  const data = getGameLandingData(game?.id || '2048');
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const winH = window.innerHeight || 800;
      // When scrolled past the 4 scenes into the white editorial sections
      setIsScrolledPastHero(scrollY > winH * 3.4);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scenes = data.scenes || [];
  const about = data.about || {};
  const howToPlay = data.howToPlay || [];
  const features = data.features || [];
  const modes = data.modes || [];

  return (
    <div className="apple-cinematic-page-root">
      {/* ──────────────────────────────────────────────────────────────────
          MINIMAL FIXED GAME TITLE (EXTREME UPPER-LEFT)
          Displays only current game name in elegant white typography
          ────────────────────────────────────────────────────────────────── */}
      <header className={`apple-cinematic-fixed-bar ${isScrolledPastHero ? 'scrolled-light-theme' : ''}`}>
        <div className="apple-fixed-left-cluster">
          <button 
            type="button" 
            className="apple-cinematic-back-btn" 
            onClick={onBackToCatalog}
            title="Return to CoPlay Catalog"
          >
            <ArrowLeft size={15} />
            <span>Catalog</span>
          </button>
          <div className="apple-fixed-title-divider" />
          <span className="apple-fixed-game-name">{data.title}</span>
        </div>

        <div className="apple-fixed-right-cluster">
          <button
            type="button"
            className="apple-fixed-play-btn"
            onClick={() => onLaunchPlay(game)}
          >
            <Play size={13} fill="#1d1d1f" />
            <span>PLAY NOW</span>
          </button>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────────────
          FOUR FULL-SCREEN CINEMATIC SCENES (MEKAVERSE DIAGONAL OVERLAP)
          Slanted boundaries, overlapping layers, pure visual storytelling
          ────────────────────────────────────────────────────────────────── */}
      <div className="apple-cinematic-scenes-stack">
        {scenes.map((scene, idx) => (
          <section 
            key={idx} 
            className={`apple-cinematic-scene-viewport apple-scene-${idx + 1}`}
            id={`scene-${idx + 1}`}
          >
            <div className="apple-scene-media-layer">
              <img 
                src={scene.image} 
                alt={`${data.title} scene ${idx + 1}`} 
                className="apple-scene-full-img"
                loading={idx === 0 ? "eager" : "lazy"}
              />
              <div className="apple-scene-scrim-overlay" />
            </div>

            {/* Scene 1: Only Game Name, Subtitle and Play Button */}
            {idx === 0 && (
              <div className="apple-scene-hero-content">
                <h1 className="apple-hero-monumental-title">{data.title}</h1>
                <p className="apple-hero-subtitle">{data.subtitle}</p>

                <div className="apple-hero-actions-row">
                  <button
                    type="button"
                    className="apple-btn-play-hero"
                    onClick={() => onLaunchPlay(game)}
                  >
                    <Play size={18} fill="#1d1d1f" />
                    <span>PLAY NOW</span>
                  </button>
                  {onOpenInviteModal && (
                    <button
                      type="button"
                      className="apple-btn-friend-hero"
                      onClick={onOpenInviteModal}
                    >
                      <Users size={16} />
                      <span>Play with Friend</span>
                    </button>
                  )}
                  <div className="apple-scroll-prompt">
                    <span>Scroll to explore</span>
                    <ChevronDown size={15} className="apple-bounce-chevron" />
                  </div>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          EDITORIAL SECTIONS (APPLE WHITE & STUDIO GREY)
          Simple, meaningful, human-written content
          ────────────────────────────────────────────────────────────────── */}
      <div className="apple-editorial-sections-wrapper">
        
        {/* ── 1. ABOUT THE GAME ── */}
        <section className="apple-editorial-section apple-about-section" id="about">
          <div className="apple-editorial-grid">
            <div className="apple-editorial-col-text">
              <span className="apple-editorial-tag">About</span>
              <h2 className="apple-editorial-title">{about.title || `About ${data.title}`}</h2>
              <p className="apple-editorial-desc">{about.desc1}</p>
              {about.desc2 && <p className="apple-editorial-desc secondary">{about.desc2}</p>}
            </div>
            <div className="apple-editorial-col-media">
              <div className="apple-editorial-frame">
                <img 
                  src={about.image || scenes[1]?.image || scenes[0]?.image} 
                  alt={data.title} 
                  className="apple-editorial-img"
                  loading="lazy" 
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. HOW TO PLAY ── */}
        {howToPlay.length > 0 && (
          <section className="apple-editorial-section studio-bg" id="how-to-play">
            <div className="apple-editorial-container">
              <span className="apple-editorial-tag">Guide</span>
              <h2 className="apple-editorial-title">How to Play</h2>

              <div className="apple-steps-grid">
                {howToPlay.map((item, i) => (
                  <div key={i} className="apple-step-card">
                    <span className="apple-step-num">{item.step}</span>
                    <h3 className="apple-step-title">{item.title}</h3>
                    <p className="apple-step-desc">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── 3. FEATURES ── */}
        {features.length > 0 && (
          <section className="apple-editorial-section" id="features">
            <div className="apple-editorial-container">
              <span className="apple-editorial-tag">Overview</span>
              <h2 className="apple-editorial-title">Features</h2>

              <div className="apple-features-grid">
                {features.map((feat, i) => (
                  <div key={i} className="apple-feat-card">
                    <h3 className="apple-feat-title">{feat.title}</h3>
                    <p className="apple-feat-desc">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── 4. PLAY NOW CTA ── */}
        <section className="apple-editorial-section studio-bg apple-cta-section" id="play-now">
          <div className="apple-editorial-container apple-cta-box">
            <h2 className="apple-cta-headline">{data.ctaHeadline || `Ready to Play ${data.title}?`}</h2>
            <p className="apple-cta-sub">{data.ctaSubtext || 'Start solo or invite friends to a live race on CoPlay.'}</p>
            
            <div className="apple-cta-buttons">
              <button
                type="button"
                className="apple-btn-play-hero apple-btn-play-large"
                onClick={() => onLaunchPlay(game)}
              >
                <Play size={20} fill="#1d1d1f" />
                <span>PLAY NOW</span>
              </button>
              <button
                type="button"
                className="apple-btn-catalog-back"
                onClick={onBackToCatalog}
              >
                <span>Back to Catalog</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
