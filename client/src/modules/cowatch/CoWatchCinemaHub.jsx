import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, Play, Users, Sparkles, ArrowLeft, ExternalLink, Film, 
  Volume2, VolumeX, Flame, Star, Compass, Clapperboard, 
  Mic, Camera, MessageSquare, Copy, Check, ShieldCheck, Heart, Smile,
  User, ChevronDown, LogOut, Share2, Key, Link2
} from 'lucide-react';
import { 
  OTT_PLATFORMS, 
  LANGUAGE_COMPARTMENTS,
  CINEMA_DATABASE 
} from './cinemaCatalog.js';
import './CoWatchCinemaHub.css';

export default function CoWatchCinemaHub({ onBackToHome, initialUser }) {
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeMedia, setActiveMedia] = useState(CINEMA_DATABASE[0]);
  const [isPlayingTheater, setIsPlayingTheater] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRoomCopied, setIsRoomCopied] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [activeReactions, setActiveReactions] = useState([]);
  const [roomCode] = useState(() => 'CW-' + Math.floor(100000 + Math.random() * 900000));
  
  const profileMenuRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter movies based on Language & Category compartments
  const filteredMedia = CINEMA_DATABASE.filter(item => {
    // Language check
    let matchesLanguage = true;
    if (selectedLanguage === 'free') {
      matchesLanguage = item.isFree === true;
    } else if (selectedLanguage !== 'all') {
      matchesLanguage = item.language === selectedLanguage;
    }

    // Category check
    let matchesCategory = true;
    if (selectedCategory !== 'all') {
      matchesCategory = item.category === selectedCategory;
    }

    return matchesLanguage && matchesCategory;
  });

  const handleLaunchWatchParty = (media) => {
    setActiveMedia(media);
    setIsPlayingTheater(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyPartyLink = (e) => {
    e?.stopPropagation();
    const link = `${window.location.origin}?room=${roomCode}&mode=watch`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleCopyRoomCode = (e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(roomCode);
    setIsRoomCopied(true);
    setTimeout(() => setIsRoomCopied(false), 2500);
  };

  const handleSendReaction = (emoji) => {
    const newReaction = { id: Date.now(), emoji, x: Math.random() * 80 + 10 };
    setActiveReactions(prev => [...prev, newReaction]);
    setTimeout(() => {
      setActiveReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 2000);
  };

  return (
    <div className="cowatch-cinema-universe fade-in">
      {/* ── PURE BLACK NAVBAR WITH WHITE OUTLINE ALL SIDES ── */}
      <header className="cinema-top-header">
        {/* LEFT: Profile Icon + Dropdown Menu */}
        <div className="cinema-header-left">
          <div className="profile-menu-wrapper" ref={profileMenuRef}>
            <button 
              className={`btn-profile-trigger ${isProfileOpen ? 'active' : ''}`}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              title="Party Profile & Squad Link"
            >
              <div className="profile-avatar-square">
                <User size={17} />
              </div>
              <span className="profile-user-name">{initialUser?.name || 'PARTY HOST'}</span>
              <ChevronDown size={14} className={`profile-chevron ${isProfileOpen ? 'rotated' : ''}`} />
            </button>

            {/* Profile Dropdown Card */}
            {isProfileOpen && (
              <div className="profile-dropdown-card fade-in">
                <div className="dropdown-user-header">
                  <div className="dropdown-avatar-sq-lg">
                    <User size={24} />
                  </div>
                  <div className="dropdown-user-details">
                    <h4>{initialUser?.name || 'PARTY HOST'}</h4>
                    <span className="user-role-tag">● ACTIVE IN ROOM</span>
                  </div>
                </div>

                <div className="dropdown-divider" />

                {/* Room Code Compartment */}
                <div className="dropdown-section">
                  <span className="dropdown-section-label">ROOM CODE</span>
                  <div className="dropdown-copy-box" onClick={handleCopyRoomCode}>
                    <span className="mono-code">{roomCode}</span>
                    <button className="btn-inline-copy">
                      {isRoomCopied ? <Check size={13} className="copied-yellow" /> : <Copy size={13} />}
                      <span>{isRoomCopied ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                </div>

                {/* Squad Sync Link Compartment */}
                <div className="dropdown-section">
                  <span className="dropdown-section-label">SQUAD SYNC LINK</span>
                  <div className="dropdown-copy-box" onClick={handleCopyPartyLink}>
                    <span className="mono-link-preview">{`${window.location.origin}?room=${roomCode}&mode=watch`}</span>
                    <button className="btn-inline-copy">
                      {isCopied ? <Check size={13} className="copied-yellow" /> : <Copy size={13} />}
                      <span>{isCopied ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                </div>

                <div className="dropdown-divider" />

                {/* Leave / Back to Home Action */}
                <button className="dropdown-leave-btn" onClick={onBackToHome}>
                  <LogOut size={14} /> <span>LEAVE PARTY & GO HOME</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: BOLD YELLOW CO-WATCH + ITALIC CURSIVE SUBTITLE */}
        <div className="cinema-header-center">
          <div className="cowatch-center-branding">
            <h1 className="cowatch-bold-yellow-title">CO-WATCH</h1>
            <span className="cowatch-cursive-subtitle">watch together</span>
          </div>
        </div>

        {/* RIGHT: Quick Back to Home */}
        <div className="cinema-header-right">
          <button className="btn-cinema-back-subtle" onClick={onBackToHome}>
            <ArrowLeft size={13} /> <span>BACK TO HOME</span>
          </button>
        </div>
      </header>

      {/* ── MULTI-LANGUAGE COMPARTMENTS BAR ── */}
      <div className="language-compartments-strip">
        <div className="compartment-container">
          <span className="compartment-label">COMPARTMENTS:</span>
          <div className="compartment-pills">
            {LANGUAGE_COMPARTMENTS.map(lang => (
              <button
                key={lang.id}
                className={`compartment-pill-btn ${selectedLanguage === lang.id ? 'active' : ''}`}
                onClick={() => setSelectedLanguage(lang.id)}
              >
                <span className="pill-icon">{lang.icon}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── THEATER STREAMING SCREEN (IF PLAYING) ── */}
      {isPlayingTheater && (
        <section className="cinema-theater-screen-section fade-in">
          <div className="theater-screen-wrapper">
            <div className="theater-player-container">
              {activeMedia.embedUrl.endsWith('.mp4') ? (
                <video 
                  src={activeMedia.embedUrl} 
                  controls 
                  autoPlay 
                  className="theater-video-frame"
                />
              ) : (
                <iframe
                  src={activeMedia.embedUrl}
                  title={activeMedia.title}
                  className="theater-video-frame"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}

              {/* FLOATING 2-WAY LIVE SQUAD CAM OVERLAY */}
              <div className="floating-squad-cam-dock">
                <div className="dock-header">
                  <span className="live-rec-dot" />
                  <span>SQUAD CAM</span>
                </div>
                <div className="squad-cam-grid">
                  <div className="squad-cam-tile">
                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80" 
                      alt="You" 
                    />
                    <span className="cam-name-tag">You (Host)</span>
                  </div>
                  <div className="squad-cam-tile">
                    <img 
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80" 
                      alt="Alex" 
                    />
                    <span className="cam-name-tag">Alex</span>
                  </div>
                </div>

                <div className="squad-cam-controls">
                  <button 
                    className={`btn-cam-ctrl ${isMicOn ? 'active' : 'muted'}`} 
                    onClick={() => setIsMicOn(!isMicOn)}
                  >
                    <Mic size={12} />
                  </button>
                  <button 
                    className={`btn-cam-ctrl ${isCamOn ? 'active' : 'muted'}`} 
                    onClick={() => setIsCamOn(!isCamOn)}
                  >
                    <Camera size={12} />
                  </button>
                </div>
              </div>

              {/* FLOATING EMOJI REACTIONS */}
              <div className="floating-reactions-canvas">
                {activeReactions.map(r => (
                  <div key={r.id} className="reaction-bubble" style={{ left: `${r.x}%` }}>
                    {r.emoji}
                  </div>
                ))}
              </div>
            </div>

            {/* THEATER CONTROLS & INFO BAR */}
            <div className="theater-info-bar">
              <div className="theater-title-block">
                <span className="theater-badge-tag">{activeMedia.platformBadge}</span>
                <h2>{activeMedia.title}</h2>
                <p>{activeMedia.synopsis}</p>
              </div>

              <div className="theater-action-group">
                <div className="reaction-emoji-bar">
                  {['🍿', '🔥', '❤️', '😱', '😂', '👏'].map(emoji => (
                    <button key={emoji} className="btn-emoji-send" onClick={() => handleSendReaction(emoji)}>
                      {emoji}
                    </button>
                  ))}
                </div>
                <button className="btn-close-theater" onClick={() => setIsPlayingTheater(false)}>
                  CLOSE THEATER ✕
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── SPOTLIGHT HERO CINEMA BANNER ── */}
      {!isPlayingTheater && (
        <section className="cinema-hero-spotlight" style={{ backgroundImage: `url(${activeMedia.backdrop})` }}>
          <div className="hero-spotlight-overlay">
            <div className="spotlight-badge-row">
              <span className="badge-exclusive-tag">[ 4K ULTRA HD SYNC ]</span>
              <span className="badge-platform-tag">{activeMedia.platformBadge}</span>
            </div>

            <h1 className="spotlight-title">{activeMedia.title}</h1>

            <div className="spotlight-metadata-row">
              <span className="meta-pill rating-pill">★ {activeMedia.rating}</span>
              <span className="meta-pill">{activeMedia.year}</span>
              <span className="meta-pill">{activeMedia.duration}</span>
              <span className="meta-pill genre-pill">{activeMedia.genre}</span>
            </div>

            <p className="spotlight-synopsis">{activeMedia.synopsis}</p>

            <div className="spotlight-cta-row">
              <button className="btn-spotlight-play" onClick={() => handleLaunchWatchParty(activeMedia)}>
                <Play size={18} fill="#000000" /> <span>PLAY 4K STREAM</span>
              </button>
              <button className="btn-spotlight-party" onClick={handleCopyPartyLink}>
                <Users size={18} /> <span>CREATE SQUAD ROOM</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── OTT PLATFORM COMPARTMENTS (NETFLIX, HOTSTAR, PRIME, YOUTUBE) ── */}
      <section className="cinema-platforms-strip">
        <div className="section-header-compact">
          <div className="header-title-wrapper">
            <span className="eyebrow-accent">DIRECT LAUNCHERS</span>
            <h3>SUPPORTED OTT PLATFORMS</h3>
          </div>
        </div>

        <div className="ott-platforms-grid">
          {OTT_PLATFORMS.map(platform => (
            <a 
              key={platform.id} 
              href={platform.directUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="ott-platform-card"
              style={{ '--platform-accent': platform.accentColor }}
            >
              <div className="platform-card-top">
                <img src={platform.logo} alt={platform.name} className="platform-logo-img" />
                <ExternalLink size={14} className="ext-link-icon" />
              </div>
              <h4 className="platform-name">{platform.name}</h4>
              <p className="platform-tagline">{platform.tagline}</p>
              <div className="platform-action-badge">LAUNCH WITH EXTENSION →</div>
            </a>
          ))}
        </div>
      </section>

      {/* ── MOVIE COMPARTMENT GRID ── */}
      <section className="cinema-catalog-section">
        <div className="section-header-compact">
          <div className="header-title-wrapper">
            <span className="eyebrow-accent">STREAMING LIBRARY</span>
            <h3>{selectedLanguage === 'free' ? 'FREE TO WATCH MOVIES' : 'FEATURED MOVIES & SERIES'}</h3>
          </div>
          <div className="total-movies-count">{filteredMedia.length} TITLES AVAILABLE</div>
        </div>

        <div className="cinema-movies-grid">
          {filteredMedia.map(media => (
            <div 
              key={media.id} 
              className="cinema-movie-card"
              onClick={() => handleLaunchWatchParty(media)}
            >
              <div className="poster-image-wrapper">
                <img src={media.poster} alt={media.title} className="movie-poster-img" />
                <div className="poster-overlay-gradient" />
                
                <div className="poster-top-badges">
                  {media.isFree && <span className="badge-free-pill">FREE</span>}
                  <span className="badge-rating-pill">★ {media.rating}</span>
                </div>

                <div className="poster-hover-play-btn">
                  <Play size={24} fill="#000000" />
                </div>
              </div>

              <div className="movie-card-details">
                <span className="movie-platform-label">{media.platformBadge}</span>
                <h4 className="movie-card-title">{media.title}</h4>
                <div className="movie-card-meta">
                  <span>{media.year}</span>
                  <span className="bullet-sep">•</span>
                  <span>{media.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
