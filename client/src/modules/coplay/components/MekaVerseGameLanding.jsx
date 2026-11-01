import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Info, Layers, Eye, Zap, Shield, Check, ChevronDown } from 'lucide-react';
import { getGameLandingData } from '../gameLandingData.js';
import './MekaVerseGameLanding.css';

export default function MekaVerseGameLanding({ game, onBackToCatalog, onLaunchPlay }) {
  const data = getGameLandingData(game?.id || '2048');
  const [activeSection, setActiveSection] = useState('hero');

  // Scroll spy to highlight active section in the floating nav
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'about', 'features', 'gallery', 'play'];
      const scrollPosition = window.scrollY + 200;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="mekaverse-game-root">
      {/* ──────────────────────────────────────────────────────────────────
          1. STICKY TRANSPARENT NAVIGATION HEADER
          ────────────────────────────────────────────────────────────────── */}
      <header className="mekaverse-nav-header">
        <div className="mekaverse-nav-left">
          <button 
            type="button" 
            className="mekaverse-btn-back" 
            onClick={onBackToCatalog}
            title="Return to CoPlay Catalog"
          >
            <ArrowLeft size={13} />
            <span>CATALOG</span>
          </button>
          <div className="mekaverse-brand-lockup">
            <span className="mekaverse-diamond-glyph">◆</span>
            <span>COPLAY // {data.title}</span>
          </div>
        </div>

        {/* Center Floating Section Navigator */}
        <nav className="mekaverse-floating-nav" aria-label="Section Navigation">
          <button
            type="button"
            className={`mekaverse-nav-item ${activeSection === 'hero' ? 'active' : ''}`}
            onClick={() => scrollToSection('hero')}
          >
            {activeSection === 'hero' && <span className="active-diamond">◆</span>}
            <span>OVERVIEW</span>
          </button>
          <button
            type="button"
            className={`mekaverse-nav-item ${activeSection === 'about' ? 'active' : ''}`}
            onClick={() => scrollToSection('about')}
          >
            {activeSection === 'about' && <span className="active-diamond">◆</span>}
            <span>ABOUT</span>
          </button>
          <button
            type="button"
            className={`mekaverse-nav-item ${activeSection === 'features' ? 'active' : ''}`}
            onClick={() => scrollToSection('features')}
          >
            {activeSection === 'features' && <span className="active-diamond">◆</span>}
            <span>FEATURES</span>
          </button>
          <button
            type="button"
            className={`mekaverse-nav-item ${activeSection === 'gallery' ? 'active' : ''}`}
            onClick={() => scrollToSection('gallery')}
          >
            {activeSection === 'gallery' && <span className="active-diamond">◆</span>}
            <span>GALLERY</span>
          </button>
        </nav>

        {/* Right Play Action */}
        <div className="mekaverse-nav-right">
          <button
            type="button"
            className="btn-mekaverse-play-nav"
            onClick={() => onLaunchPlay(game)}
            title="Launch Game Interface"
          >
            <span>◆ PLAY NOW</span>
          </button>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────────────
          2. SECTION A: FULL-SCREEN MONUMENTAL HERO
          ────────────────────────────────────────────────────────────────── */}
      <section id="hero" className="mekaverse-section-hero">
        <div 
          className="mekaverse-hero-art-bg"
          style={{ backgroundImage: `url("${data.heroImage}")` }}
        />

        <div className="mekaverse-hero-content">
          <div className="mekaverse-hero-kicker">
            <span className="kicker-glyph">◆</span>
            <span>{data.kicker}</span>
          </div>

          {/* Stacked Roobert 80px Title with Signature 1px Underline Marks */}
          <div className="mekaverse-display-title-stack">
            {data.displayLines.map((line, idx) => (
              <div key={idx} className="mekaverse-title-line-wrap">
                <h1 className="mekaverse-display-text">{line}</h1>
                <div className="mekaverse-underline-mark" />
              </div>
            ))}
          </div>

          <p className="mekaverse-hero-tagline">{data.tagline}</p>

          <div className="mekaverse-hero-actions">
            <button
              type="button"
              className="btn-mekaverse-diamond-play"
              onClick={() => onLaunchPlay(game)}
            >
              <span>◆ PLAY NOW</span>
            </button>
            <button
              type="button"
              className="btn-mekaverse-explore"
              onClick={() => scrollToSection('about')}
            >
              EXPLORE // ABOUT
            </button>
          </div>
        </div>

        <div className="mekaverse-scroll-hint">
          <span>SCROLL // 01</span>
          <ChevronDown size={14} />
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────
          3. SECTION B: ABOUT THE GAME (CINEMATIC SCENE & CONCEPT)
          ────────────────────────────────────────────────────────────────── */}
      <section id="about" className="mekaverse-section-about">
        <div className="mekaverse-section-eyebrow">
          <span className="eb-marker">◆</span>
          <span>02 // THE ARCHITECTURE & CONCEPT</span>
        </div>

        <h2 className="mekaverse-editorial-headline">{data.conceptTitle}</h2>
        <p className="mekaverse-editorial-lead">{data.conceptDesc}</p>

        {/* Monospace Technical Grid */}
        <div className="mekaverse-technical-grid">
          {data.mechanics.map((mech, i) => (
            <div key={i} className="mekaverse-tech-col">
              <div className="mekaverse-tech-label">{mech.label}</div>
              <p className="mekaverse-tech-text">{mech.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────
          4. SECTION C: GAMEPLAY & FEATURES (TECHNICAL CARDS)
          ────────────────────────────────────────────────────────────────── */}
      <section id="features" className="mekaverse-section-features">
        <div className="mekaverse-section-eyebrow">
          <span className="eb-marker">◆</span>
          <span>03 // MECHANICS & MODES</span>
        </div>

        <h2 className="mekaverse-editorial-headline">SYSTEM CAPABILITIES</h2>

        {/* Features 4-quadrant cards */}
        <div className="mekaverse-features-quad">
          {data.features.map((feat, i) => (
            <div key={i} className="mekaverse-feature-card">
              <span className="mekaverse-feat-num">{feat.num} // SPEC</span>
              <div>
                <h3 className="mekaverse-feat-title">{feat.title}</h3>
                <p className="mekaverse-feat-desc">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls & Specs Stage */}
        <div className="mekaverse-specs-stage">
          {/* Controls Column */}
          <div className="mekaverse-specs-column">
            <h4>INPUT CONTROLS & BINDINGS</h4>
            <div className="mekaverse-specs-list">
              {data.controls.map((ctrl, i) => (
                <div key={i} className="mekaverse-spec-row">
                  <span className="mekaverse-spec-label">{ctrl.key}</span>
                  <span className="mekaverse-spec-val">{ctrl.action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Provenance Specs Column */}
          <div className="mekaverse-specs-column">
            <h4>TECHNICAL SPECIFICATIONS</h4>
            <div className="mekaverse-specs-list">
              {data.specs.map((spec, i) => (
                <div key={i} className="mekaverse-spec-row">
                  <span className="mekaverse-spec-label">{spec.label}</span>
                  <span className={`mekaverse-spec-val ${spec.label === 'STATUS' ? 'active-tag' : ''}`}>
                    {spec.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────
          5. SECTION D: CINEMATIC IMAGE GALLERY
          ────────────────────────────────────────────────────────────────── */}
      <section id="gallery" className="mekaverse-section-gallery">
        <div className="mekaverse-section-eyebrow">
          <span className="eb-marker">◆</span>
          <span>04 // VISUAL ARTIFACTS</span>
        </div>

        <h2 className="mekaverse-editorial-headline">RENDERED WORLD EXHIBITION</h2>

        <div className="mekaverse-gallery-track">
          {data.galleryImages.map((img, i) => (
            <div key={i} className="mekaverse-gallery-frame">
              <img src={img.url} alt={img.title} loading="lazy" />
              <div className="mekaverse-gallery-overlay">
                <span className="mekaverse-gallery-title">{img.title}</span>
                <span className="mekaverse-gallery-caption">{img.caption}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────
          6. SECTION E: FINAL PLAY INVITATION
          ────────────────────────────────────────────────────────────────── */}
      <section id="play" className="mekaverse-section-play">
        <div className="mekaverse-section-eyebrow" style={{ justifyContent: 'center' }}>
          <span className="eb-marker">◆</span>
          <span>05 // ENTER THE ARENA</span>
        </div>

        <h2 className="mekaverse-cta-display">YOUR TURN TO PLAY</h2>
        <p className="mekaverse-cta-desc">
          Connect to a live duel room, race friends on split boards, or play solo in zero latency.
        </p>

        <button
          type="button"
          className="btn-mekaverse-launch-massive"
          onClick={() => onLaunchPlay(game)}
        >
          <span>◆ LAUNCH GAMEPLAY NOW</span>
        </button>
      </section>
    </div>
  );
}
