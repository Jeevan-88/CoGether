import React, { useState, useMemo } from 'react';
import { CINEMA_DATABASE, CINEMA_CATEGORIES, OTT_PLATFORMS } from './cinemaCatalog.js';
import { 
  Tv, Play, Users, Search, ArrowLeft, X, Maximize, Minimize, 
  Share2, Copy, Check, Star, ExternalLink, Video, VideoOff, 
  Mic, MicOff, MessageSquare, Flame, Sparkles, Film, Heart 
} from 'lucide-react';
import './CoWatchCinemaHub.css';

export default function CoWatchCinemaHub({ onBackToHome, onLaunchWatchParty, initialUser }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activePlatformModal, setActivePlatformModal] = useState(null);
  
  // Floating Camera Overlay State in Theater Mode
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isMicActive, setIsMicActive] = useState(true);
  const [theaterReaction, setTheaterReaction] = useState(null);

  // Filter Titles
  const filteredTitles = useMemo(() => {
    return CINEMA_DATABASE.filter((item) => {
      const matchesCat = activeCategory === 'all' || 
                         activeCategory === 'platforms' || 
                         item.category === activeCategory;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.platform.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleShareWatchParty = (movieTitle) => {
    const roomCode = 'cinema-' + Math.floor(1000 + Math.random() * 9000);
    const link = `${window.location.origin}?room=${roomCode}&mode=watch`;
    navigator.clipboard.writeText(link);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSendReaction = (emoji) => {
    setTheaterReaction(emoji);
    setTimeout(() => setTheaterReaction(null), 1800);
  };

  return (
    <div className="cowatch-cinema-hub-wrapper">
      {/* ── 1. CINEMA TOP NAVIGATION HEADER ── */}
      <header className="cinema-header-bar">
        <div className="cinema-header-left">
          <button className="btn-cinema-back-home" onClick={onBackToHome}>
            <ArrowLeft size={18} /> BACK TO HOME
          </button>
          <div className="cinema-brand-title">
            <span className="cinema-mono-tag">4K MILLISECOND SYNC</span>
            <h1 className="cinema-main-title">CO-WATCH CINEMA & OTT</h1>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="cinema-search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search Oppenheimer, Stranger Things, Hotstar Cricket, Demon Slayer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* PARTY LAUNCH & OTT PLATFORM QUICK PILLS */}
        <div className="cinema-header-right">
          <button className="btn-cinema-party-launch" onClick={() => handleShareWatchParty('Cinema Party')}>
            <Users size={18} /> {copiedCode ? 'PARTY LINK COPIED! 🚀' : 'CREATE WATCH PARTY'}
          </button>
        </div>
      </header>

      {/* ── 2. OTT PLATFORM SHORTCUT TILES BAR ── */}
      <section className="ott-platform-pills-bar">
        <div className="platform-track">
          <span className="platform-track-label">STREAMING ON:</span>
          {OTT_PLATFORMS.map((plat) => (
            <div 
              key={plat.id} 
              className="ott-pill-card"
              onClick={() => setActivePlatformModal(plat)}
            >
              <img src={plat.logo} alt={plat.name} className="ott-pill-logo" />
              <span className="ott-pill-name">{plat.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. CATEGORY TABS BAR ── */}
      <nav className="cinema-category-tabs">
        <div className="category-scroll-track">
          {CINEMA_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`cat-pill-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── 4. FEATURED HERO SPOTLIGHT BANNER ── */}
      {!searchQuery && activeCategory === 'all' && (
        <section 
          className="cinema-hero-spotlight"
          style={{
            backgroundImage: `linear-gradient(to right, #09090b 20%, rgba(9, 9, 11, 0.7) 60%, rgba(9, 9, 11, 0.2) 100%), url(${CINEMA_DATABASE[0].backdrop})`
          }}
        >
          <div className="spotlight-content-left">
            <span className="spotlight-platform-badge">⭐ {CINEMA_DATABASE[0].platformBadge}</span>
            <h2 className="spotlight-movie-title">{CINEMA_DATABASE[0].title}</h2>
            <div className="spotlight-meta-row">
              <span className="meta-rating">★ {CINEMA_DATABASE[0].rating}</span>
              <span className="meta-dot">•</span>
              <span>{CINEMA_DATABASE[0].year}</span>
              <span className="meta-dot">•</span>
              <span>{CINEMA_DATABASE[0].duration}</span>
              <span className="meta-dot">•</span>
              <span className="meta-genre">{CINEMA_DATABASE[0].genre}</span>
            </div>
            <p className="spotlight-synopsis-text">{CINEMA_DATABASE[0].synopsis}</p>
            <div className="spotlight-action-buttons">
              <button 
                className="btn-spotlight-watch-now"
                onClick={() => setSelectedMovie(CINEMA_DATABASE[0])}
              >
                <Play size={20} fill="#000000" /> WATCH IN 4K SYNC
              </button>
              <button 
                className="btn-spotlight-party-invite"
                onClick={() => handleShareWatchParty(CINEMA_DATABASE[0].title)}
              >
                <Users size={18} /> INVITE SQUAD TO ROOM
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── 5. CINEMA POSTERS GRID & CAROUSELS ── */}
      <main className="cinema-catalog-section">
        <div className="catalog-header-row">
          <h3 className="section-heading">
            {activeCategory === 'all' ? '🍿 TRENDING MOVIES, SERIES & LIVE SPORTS' : `🎬 ${activeCategory.toUpperCase()}`}
          </h3>
          <span className="titles-counter-badge">{filteredTitles.length} TITLES READY TO STREAM</span>
        </div>

        <div className="cinema-posters-grid">
          {filteredTitles.map((item) => (
            <div 
              key={item.id} 
              className="cinema-card"
              onClick={() => setSelectedMovie(item)}
            >
              <div className="poster-wrapper">
                <img src={item.poster} alt={item.title} className="poster-img" loading="lazy" />
                <span className="card-platform-tag">{item.platformBadge}</span>
                <div className="card-hover-overlay">
                  <button className="btn-hover-play">
                    <Play size={26} fill="#ffffff" />
                  </button>
                  <span className="hover-play-text">START SYNCED CINEMA</span>
                </div>
              </div>
              <div className="card-details">
                <h4 className="card-title">{item.title}</h4>
                <div className="card-sub-info">
                  <span className="card-rating">★ {item.rating}</span>
                  <span className="card-year">{item.year}</span>
                </div>
                <span className="card-genre-text">{item.genre}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ── 6. FULLSCREEN CINEMA THEATER MODAL WITH 2-WAY LIVE CAM OVERLAY ── */}
      {selectedMovie && (
        <div className="cinema-theater-overlay fade-in">
          <div className={`cinema-theater-modal ${isFullScreen ? 'is-fullscreen' : ''}`}>
            {/* TOP BAR */}
            <div className="theater-header-bar">
              <div className="theater-title-info">
                <span className="theater-badge">CO-WATCH THEATER</span>
                <h3 className="theater-name">{selectedMovie.title}</h3>
                <span className="theater-genre">({selectedMovie.genre})</span>
              </div>
              <div className="theater-actions-bar">
                <button className="btn-theater-party" onClick={() => handleShareWatchParty(selectedMovie.title)}>
                  <Users size={16} /> SQUAD SYNC LINK
                </button>
                <button 
                  className="btn-theater-tool" 
                  onClick={() => setIsFullScreen(!isFullScreen)}
                >
                  {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
                <button className="btn-theater-close" onClick={() => setSelectedMovie(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* VIDEO STAGE WITH FLOATING EXTENSION-STYLE CAMERA OVERLAY */}
            <div className="theater-stage-container">
              {/* EMBEDDED CINEMA PLAYER */}
              <iframe
                src={selectedMovie.embedUrl}
                title={selectedMovie.title}
                className="cinema-iframe-player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
              />

              {/* FLOATING 2-WAY LIVE VIDEO / CAMERA EXTENSION OVERLAY */}
              <div className="floating-extension-cam-dock">
                <div className="cam-dock-header">
                  <span className="cam-live-indicator">🔴 LIVE SQUAD CAM</span>
                  <div className="cam-dock-toggles">
                    <button 
                      className={`cam-toggle-btn ${isCameraActive ? 'active' : ''}`}
                      onClick={() => setIsCameraActive(!isCameraActive)}
                    >
                      {isCameraActive ? <Video size={13} /> : <VideoOff size={13} />}
                    </button>
                    <button 
                      className={`cam-toggle-btn ${isMicActive ? 'active' : ''}`}
                      onClick={() => setIsMicActive(!isMicActive)}
                    >
                      {isMicActive ? <Mic size={13} /> : <MicOff size={13} />}
                    </button>
                  </div>
                </div>

                {/* USER VIDEO TILE */}
                <div className="cam-video-preview-box">
                  {isCameraActive ? (
                    <div className="live-avatar-cam">
                      <span className="user-cam-avatar">🧑‍💻</span>
                      <span className="user-cam-label">YOU (HOST)</span>
                    </div>
                  ) : (
                    <div className="cam-off-placeholder">CAMERA MUTED</div>
                  )}
                </div>

                {/* SQUAD FRIEND TILE */}
                <div className="cam-video-preview-box friend-box">
                  <div className="live-avatar-cam">
                    <span className="user-cam-avatar">🍿</span>
                    <span className="user-cam-label">FRIEND_99 (SYNCED)</span>
                  </div>
                </div>
              </div>

              {/* FLOATING EMOJI REACTION POPUP */}
              {theaterReaction && (
                <div className="theater-reaction-popup bounce-in">
                  <span className="reaction-giant-emoji">{theaterReaction}</span>
                </div>
              )}
            </div>

            {/* THEATER FOOTER & LIVE SYNC CONTROLS */}
            <div className="theater-footer-controls">
              <div className="footer-synopsis-col">
                <strong>SYNOPSIS:</strong> <span>{selectedMovie.synopsis}</span>
              </div>
              <div className="footer-reactions-dock">
                <span className="react-label">REACTIONS:</span>
                {['🍿', '🔥', '❤️', '😱', '😂', '👏'].map((emoji) => (
                  <button 
                    key={emoji} 
                    className="reaction-bubble-btn"
                    onClick={() => handleSendReaction(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. OTT PLATFORM LAUNCH MODAL (NETFLIX / HOTSTAR / PRIME EXTENSION SYNC) ── */}
      {activePlatformModal && (
        <div className="ott-launch-overlay fade-in">
          <div className="ott-launch-card">
            <button className="ott-modal-close-btn" onClick={() => setActivePlatformModal(null)}>
              <X size={18} />
            </button>
            <div className="ott-modal-header" style={{ borderBottomColor: activePlatformModal.accentColor }}>
              <img src={activePlatformModal.logo} alt={activePlatformModal.name} className="ott-modal-logo" />
              <h2>LAUNCH {activePlatformModal.name.toUpperCase()} WITH SQUAD CAM</h2>
              <p>{activePlatformModal.tagline}</p>
            </div>

            <div className="ott-instructions-body">
              <div className="step-item">
                <span className="step-num">1</span>
                <p>Click below to open <strong>{activePlatformModal.name}</strong> directly in your browser.</p>
              </div>
              <div className="step-item">
                <span className="step-num">2</span>
                <p>Use your CoGether floating camera & mic overlay window to stay in live 2-way call with your friends.</p>
              </div>
              <div className="step-item">
                <span className="step-num">3</span>
                <p>Enjoy 4K video playback with zero lag or buffering!</p>
              </div>
            </div>

            <div className="ott-actions-row">
              <a 
                href={activePlatformModal.directUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="btn-launch-ott-direct"
                style={{ background: activePlatformModal.accentColor }}
              >
                OPEN {activePlatformModal.name.toUpperCase()} NOW <ExternalLink size={18} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
