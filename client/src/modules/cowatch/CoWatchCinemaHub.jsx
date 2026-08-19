import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, Play, Users, Sparkles, ArrowLeft, ExternalLink, Film, 
  Volume2, VolumeX, Flame, Star, Compass, Clapperboard, 
  Mic, Camera, MessageSquare, Copy, Check, ShieldCheck, Heart, Smile,
  User, ChevronDown, LogOut, Share2, Key, Link2, MonitorPlay, Radio, Trophy, Zap
} from 'lucide-react';
import { 
  ENTERTAINMENT_PILLARS,
  OTT_PLATFORMS, 
  CINEMA_DATABASE 
} from './cinemaCatalog.js';
import './CoWatchCinemaHub.css';

export default function CoWatchCinemaHub({ onBackToHome, initialUser }) {
  const [selectedPillar, setSelectedPillar] = useState('movies'); // 'movies' | 'anime' | 'sports'
  const [selectedPlatform, setSelectedPlatform] = useState('all');
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

  // Filter media based on Active Entertainment Pillar & OTT Platform
  const filteredMedia = CINEMA_DATABASE.filter(item => {
    const matchesPillar = item.pillar === selectedPillar;
    const matchesPlatform = selectedPlatform === 'all' || item.platformId === selectedPlatform;
    return matchesPillar && matchesPlatform;
  });

  // Spotlight banner media item
  const spotlightItem = filteredMedia[0] || CINEMA_DATABASE.find(item => item.pillar === selectedPillar) || CINEMA_DATABASE[0];

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
      {/* ── 1. PURE BLACK NAVBAR WITH THIN WHITE OUTLINE & LIGHT CURVE ── */}
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

      {/* ── 2. TOP-LEVEL ENTERTAINMENT PILLARS STRIP ── */}
      <section className="entertainment-pillars-section">
        <div className="pillars-container">
          <div className="pillars-switch-bar">
            {ENTERTAINMENT_PILLARS.map(pillar => (
              <button
                key={pillar.id}
                className={`pillar-switch-btn ${selectedPillar === pillar.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedPillar(pillar.id);
                  setSelectedPlatform('all');
                }}
              >
                <span className="pillar-btn-icon">{pillar.icon}</span>
                <span className="pillar-btn-label">{pillar.label}</span>
                {selectedPillar === pillar.id && <span className="pillar-active-underline" />}
              </button>
            ))}
          </div>
          <p className="pillar-tagline-text">
            {ENTERTAINMENT_PILLARS.find(p => p.id === selectedPillar)?.tagline}
          </p>
        </div>
      </section>

      {/* ── 3. OTT STREAMING PLATFORMS FILTER ROW ── */}
      <section className="ott-platforms-strip">
        <div className="platforms-container">
          <div className="platforms-pills-row">
            {OTT_PLATFORMS.map(platform => (
              <button
                key={platform.id}
                className={`platform-pill-btn ${selectedPlatform === platform.id ? 'active' : ''}`}
                onClick={() => setSelectedPlatform(platform.id)}
              >
                <span className="platform-pill-badge">{platform.badge}</span>
                <span className="platform-pill-name">{platform.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. SYNCHRONIZED THEATER STAGE (WHEN ACTIVE) ── */}
      {isPlayingTheater && activeMedia && (
        <section className="live-theater-stage-container">
          <div className="theater-inner-box">
            {/* Theater Stage Header */}
            <div className="theater-header-bar">
              <div className="theater-meta-left">
                <span className="live-red-indicator">● LIVE SYNCHRONIZED STREAM</span>
                <h2 className="theater-title">{activeMedia.title}</h2>
                <span className="theater-submeta">{activeMedia.platformName} • {activeMedia.category} • {activeMedia.duration}</span>
              </div>
              <div className="theater-meta-right">
                <button className="btn-close-theater" onClick={() => setIsPlayingTheater(false)}>
                  ✕ MINIMIZE THEATER
                </button>
              </div>
            </div>

            {/* Video Player + WebRTC Camera Overlay */}
            <div className="theater-screen-wrapper">
              <iframe
                src={activeMedia.embedUrl}
                title={activeMedia.title}
                className="theater-iframe-player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />

              {/* Floating Squad Floating Cam Tiles */}
              <div className="theater-floating-squad">
                <div className="squad-cam-card">
                  <div className="cam-sim-avatar">
                    <User size={20} />
                  </div>
                  <span className="cam-user-name">You (Host)</span>
                  <span className="cam-audio-pulse" />
                </div>
                <div className="squad-cam-card remote-friend">
                  <div className="cam-sim-avatar friend-avatar">
                    <User size={20} />
                  </div>
                  <span className="cam-user-name">Friend #1</span>
                  <span className="cam-audio-pulse" />
                </div>
              </div>

              {/* Floating Reaction Hearts & Emojis */}
              {activeReactions.map(r => (
                <div key={r.id} className="floating-party-emoji" style={{ left: `${r.x}%` }}>
                  {r.emoji}
                </div>
              ))}
            </div>

            {/* Theater Control Deck */}
            <div className="theater-bottom-deck">
              <div className="theater-controls-left">
                <button className={`btn-theater-control ${isMicOn ? 'active' : ''}`} onClick={() => setIsMicOn(!isMicOn)}>
                  <Mic size={15} /> <span>{isMicOn ? 'MIC LIVE' : 'MIC MUTED'}</span>
                </button>
                <button className={`btn-theater-control ${isCamOn ? 'active' : ''}`} onClick={() => setIsCamOn(!isCamOn)}>
                  <Camera size={15} /> <span>{isCamOn ? 'CAM ACTIVE' : 'CAM OFF'}</span>
                </button>
              </div>

              {/* Quick Reaction Emoji Bar */}
              <div className="theater-reactions-row">
                {['🔥', '🍿', '😂', '🤯', '❤️', '👏'].map(emoji => (
                  <button key={emoji} className="btn-reaction-tap" onClick={() => handleSendReaction(emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="theater-controls-right">
                <button className="btn-invite-squad-action" onClick={handleCopyPartyLink}>
                  {isCopied ? <Check size={14} /> : <Share2 size={14} />}
                  <span>{isCopied ? 'LINK COPIED!' : 'INVITE FRIENDS'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 5. SPOTLIGHT HERO BANNER ── */}
      {!isPlayingTheater && spotlightItem && (
        <section className="cowatch-hero-spotlight">
          <div className="hero-spotlight-card">
            <div 
              className="hero-spotlight-backdrop" 
              style={{ backgroundImage: `url(${spotlightItem.backdrop || spotlightItem.poster})` }}
            />
            <div className="hero-spotlight-gradient-overlay" />
            
            <div className="hero-spotlight-content">
              <div className="spotlight-top-tags">
                <span className="badge-featured">⭐ SPOTLIGHT SHOWCASE</span>
                <span className="badge-platform">{spotlightItem.platformBadge}</span>
                <span className="badge-rating">{spotlightItem.rating} ★</span>
              </div>
              <h2 className="spotlight-title">{spotlightItem.title}</h2>
              <p className="spotlight-synopsis">{spotlightItem.synopsis}</p>
              <div className="spotlight-metadata-row">
                <span><strong>Platform:</strong> {spotlightItem.platformName}</span>
                <span><strong>Genre:</strong> {spotlightItem.category}</span>
                <span><strong>Runtime:</strong> {spotlightItem.duration}</span>
                <span><strong>Cast:</strong> {spotlightItem.cast}</span>
              </div>
              <div className="spotlight-actions-row">
                <button className="btn-spotlight-watch-now" onClick={() => handleLaunchWatchParty(spotlightItem)}>
                  <Play size={18} fill="#000000" />
                  <span>WATCH WITH FRIENDS NOW</span>
                </button>
                <button className="btn-spotlight-copy-code" onClick={handleCopyPartyLink}>
                  <Link2 size={16} />
                  <span>GET SQUAD ROOM LINK</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 6. GIANT CINEMATIC CARDS DECK ── */}
      <section className="giant-cinema-cards-section">
        <div className="section-title-header">
          <div className="title-left">
            <span className="section-tag-mono">[ STREAMING CATALOG ]</span>
            <h3 className="section-heading">
              {selectedPillar === 'movies' && 'Blockbusters, Series & 4K Cinema'}
              {selectedPillar === 'anime' && 'Anime Universe & Simulcasts'}
              {selectedPillar === 'sports' && 'Live Stadium Matches & Arena Action'}
            </h3>
          </div>
          <div className="title-right">
            <span className="count-pill">{filteredMedia.length} TITLES AVAILABLE</span>
          </div>
        </div>

        {/* The Grid of Giant Netflix-Style Cards */}
        <div className="giant-cards-grid">
          {filteredMedia.map(item => (
            <div key={item.id} className="giant-movie-card">
              {/* Card Poster Frame */}
              <div className="card-poster-wrapper" onClick={() => handleLaunchWatchParty(item)}>
                <img src={item.poster} alt={item.title} className="card-poster-img" loading="lazy" />
                <div className="card-poster-vignette" />
                
                {/* Platform Badge on Top */}
                <div className="card-badge-container">
                  <span className="platform-tag-pill">{item.platformBadge}</span>
                  <span className="rating-tag-pill">{item.rating} ★</span>
                </div>

                {/* Hover Play Button Trigger */}
                <div className="card-hover-overlay">
                  <div className="hover-play-circle">
                    <Play size={24} fill="#000000" />
                  </div>
                  <span className="hover-cta-label">WATCH TOGETHER</span>
                </div>
              </div>

              {/* Card Meta Description */}
              <div className="card-info-box">
                <div className="card-title-row">
                  <h4 className="card-title-text" onClick={() => handleLaunchWatchParty(item)}>{item.title}</h4>
                  <span className="card-year-tag">{item.year}</span>
                </div>
                <div className="card-sub-info">
                  <span className="card-platform-text">{item.platformName}</span>
                  <span className="card-dot-sep">•</span>
                  <span className="card-duration-text">{item.duration}</span>
                </div>
                <p className="card-synopsis-text">{item.synopsis}</p>
                <div className="card-cast-text">
                  <strong>Cast:</strong> {item.cast}
                </div>

                {/* Instant Launch Action Button */}
                <button className="btn-card-launch-party" onClick={() => handleLaunchWatchParty(item)}>
                  <Play size={14} fill="#000000" />
                  <span>START SQUAD WATCH PARTY →</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
