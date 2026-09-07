import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Tv, Play, Users, ArrowLeft, ExternalLink, Film, 
  Volume2, VolumeX, Flame, Star, Compass, Clapperboard, 
  Mic, Camera, MessageSquare, Copy, Check, ShieldCheck,
  User, ChevronDown, LogOut, Share2, Key, Link2, MonitorPlay, Radio, 
  Layers, Info, Sparkles, HelpCircle, Download, CheckCircle2, ArrowRight,
  Search, SlidersHorizontal, ChevronLeft, ChevronRight, Volume1, Maximize2,
  Subtitles, Settings, Send, ShieldAlert, Lock, Globe, Video, RefreshCw, AlertCircle
} from 'lucide-react';
import { 
  HEAVY_DRM_PLATFORMS,
  OPEN_NON_DRM_PLATFORMS,
  VERIFIED_CLEAN_MOVIES
} from './cinemaCatalog.js';
import CoWatchPartyRoom from './CoWatchPartyRoom.jsx';
import './CoWatchCinemaHub.css';

export default function CoWatchCinemaHub({ onBackToHome, initialUser, initialRoomId, initialUsername }) {
  // Page Modes: 'cinema_hub' | 'theater_room' | 'ott_universe'
  const [viewMode, setViewMode] = useState(() => initialRoomId ? 'theater_room' : 'cinema_hub');
  const currentUsername = initialUsername || initialUser?.name || localStorage.getItem('sp_username') || 'Guest_' + Math.floor(100 + Math.random() * 900);
  
  // DRM Categorization Tab: 'heavy_drm' (Category 1) | 'open_stream' (Category 2)
  const [activeDrmTab, setActiveDrmTab] = useState('heavy_drm');
  const [selectedOttPlatform, setSelectedOttPlatform] = useState(null);

  // Active Theater Movie & Stream Engine ('direct_mp4' or 'web_embed')
  const [activeMovie, setActiveMovie] = useState(VERIFIED_CLEAN_MOVIES[0]);
  const [streamEngine, setStreamEngine] = useState(() => VERIFIED_CLEAN_MOVIES[0]?.videoSrc ? 'direct_mp4' : 'web_embed');
  const [customStreamUrl, setCustomStreamUrl] = useState('');
  
  // Advanced Theater Controls
  const [volumeBoost, setVolumeBoost] = useState(100); // 0 to 200%
  const [isSubtitlesOn, setIsSubtitlesOn] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('1080p HD');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // Synchronized Chat
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'CoGether System', text: 'Low-latency WebRTC sync channel established.', time: 'Now' },
    { id: 2, sender: 'Party Host', text: 'Direct in-app player is active! Video is streaming.', time: 'Just now' }
  ]);
  const [inputChat, setInputChat] = useState('');

  // Profile & Room State
  const [isCopied, setIsCopied] = useState(false);
  const [isRoomCopied, setIsRoomCopied] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [roomCode] = useState(() => initialRoomId || ('CW-' + Math.floor(100000 + Math.random() * 900000)));
  
  const profileMenuRef = useRef(null);
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);

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

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Adjust video element volume if native video is playing
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = Math.min(1.0, volumeBoost / 100);
    }
  }, [volumeBoost]);

  const handleLaunchMovie = (movie) => {
    setActiveMovie(movie);
    setStreamEngine(movie.videoSrc ? 'direct_mp4' : 'web_embed');
    setViewMode('theater_room');
  };

  /**
   * Direct In-App Video Stream Resolver
   * Converts ANY input (NBA, YouTube, Twitch, MP4, HLS, or direct link) to play DIRECTLY inside player
   */
  const handleStreamCustomUrl = (e) => {
    e?.preventDefault();
    if (!customStreamUrl.trim()) return;
    const url = customStreamUrl.trim();

    // 1. YouTube & YouTube Live
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([\w-]{11})/);
      const ytId = match ? match[1] : '';
      const finalEmbed = ytId ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&enablejsapi=1` : url;
      
      setActiveMovie({
        id: Date.now(),
        title: 'YouTube Direct In-App Stream',
        year: new Date().getFullYear(),
        category: 'YouTube Live',
        description: 'Direct in-app video stream with synchronized chat.',
        poster: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=800&q=80',
        videoSrc: null,
        embedUrl: finalEmbed
      });
      setStreamEngine('web_embed');
      setViewMode('theater_room');
      return;
    }

    // 2. Twitch Stream
    if (url.includes('twitch.tv')) {
      const channelMatch = url.match(/twitch\.tv\/([\w]+)/);
      const channel = channelMatch ? channelMatch[1] : '';
      const finalEmbed = `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&autoplay=true`;
      
      setActiveMovie({
        id: Date.now(),
        title: `Twitch Live: ${channel}`,
        year: new Date().getFullYear(),
        category: 'Twitch Live',
        description: `Direct Twitch in-app player for ${channel}.`,
        poster: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
        videoSrc: null,
        embedUrl: finalEmbed
      });
      setStreamEngine('web_embed');
      setViewMode('theater_room');
      return;
    }

    // 3. Direct Video Files (.mp4, .webm, .ogg, .m3u8)
    if (url.match(/\.(mp4|webm|ogg|m3u8|mov)(\?.*)?$/i)) {
      setActiveMovie({
        id: Date.now(),
        title: 'Direct Video Player',
        year: new Date().getFullYear(),
        category: 'Direct MP4 Stream',
        description: 'Direct in-app video player.',
        poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
        videoSrc: url,
        embedUrl: null
      });
      setStreamEngine('direct_mp4');
      setViewMode('theater_room');
      return;
    }

    // 4. Any other URL (NBA, sports, website stream) -> Play DIRECTLY inside player!
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    setActiveMovie({
      id: Date.now(),
      title: 'Direct In-App Stream',
      year: new Date().getFullYear(),
      category: 'Direct Web Video',
      description: 'Streaming directly in the CoGether master player.',
      poster: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
      videoSrc: null,
      embedUrl: normalizedUrl
    });
    setStreamEngine('web_embed');
    setViewMode('theater_room');
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

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!inputChat.trim()) return;
    const newMsg = {
      id: Date.now(),
      sender: initialUser?.name || 'You (Host)',
      text: inputChat.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newMsg]);
    setInputChat('');
  };

  // ── DEDICATED 100DVH CO-WATCH PARTY ROOM SURFACE ──
  if (viewMode === 'theater_room' && activeMovie) {
    return (
      <CoWatchPartyRoom
        movie={activeMovie}
        streamEngine={streamEngine}
        roomId={roomCode}
        username={currentUsername}
        onBack={() => setViewMode('cinema_hub')}
        onLeave={() => {
          setViewMode('cinema_hub');
          onBackToHome?.();
        }}
      />
    );
  }

  return (
    <div className="cowatch-cinema-universe fade-in">
      {/* ── 1. FLOATING PURE BLACK NAVBAR ── */}
      <header className="cinema-top-header">
        {/* LEFT: Profile Trigger */}
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

                {/* Leave Action */}
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

      {/* ── 2. HERO BANNER (ONLY ON CINEMA HUB VIEW) ── */}
      {viewMode === 'cinema_hub' && (
        <section className="cowatch-banner-wrapper">
          <div className="cowatch-announcement-banner">
            <div className="banner-text-content">
              <span className="banner-sub-tag">[ STREAM CINEMA TOGETHER ]</span>
              <h2 className="banner-headline">
                Watch Shows, Anime, Series, Movies & Live Sports Together
              </h2>
              <p className="banner-description">
                Direct in-app clean video streaming for open media, and synchronized companion setup for heavy DRM platforms.
              </p>
            </div>

            {/* Paper-Style Badge Button to open OTT Category Universe */}
            <div className="banner-action-side">
              <button 
                className="paper-style-click-badge"
                onClick={() => {
                  setViewMode('ott_universe');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span className="paper-badge-tag">DRM & OPEN STREAM HUBS</span>
                <div className="paper-badge-main-text">
                  <strong>CLICK HERE!</strong>
                  <ArrowRight size={16} />
                </div>
                <span className="paper-badge-sub">
                  NETFLIX • PRIME • DISNEY+ • SPORTS
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW MODE 1: FREE CINEMA HUB & DIRECT CUSTOM STREAM BAR
          ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'cinema_hub' && (
        <main className="free-cinema-main-container fade-in">
          {/* ── DIRECT URL STREAM INPUT BAR ── */}
          <section className="search-filter-section">
            <form onSubmit={handleStreamCustomUrl} className="custom-url-stream-bar">
              <Video size={18} className="search-icon" />
              <input 
                type="text"
                placeholder="Paste ANY video URL (NBA, YouTube, Twitch, MP4, Live stream) to play directly in-app..."
                value={customStreamUrl}
                onChange={(e) => setCustomStreamUrl(e.target.value)}
                className="cinema-search-input"
              />
              <button type="submit" className="btn-stream-now-action">
                <Play size={13} fill="#000000" />
                <span>PLAY IN PLAYER</span>
              </button>
            </form>
          </section>

          {/* ── YELLOW CANVAS WITH VERIFIED CLEAN DIRECT MOVIES ── */}
          <section className="netflix-rows-section">
            <div className="yellow-canvas-header-meta">
              <div>
                <h3 className="netflix-row-header-title">Free to Watch Masterpieces on CoGether</h3>
                <span className="canvas-sub-info">Direct plain video streaming • Zero ads, zero website chrome</span>
              </div>
              <span className="canvas-count-tag">{VERIFIED_CLEAN_MOVIES.length} MOVIES READY</span>
            </div>

            <div className="public-domain-movies-grid">
              {VERIFIED_CLEAN_MOVIES.map(movie => (
                <div 
                  key={movie.id} 
                  className="public-domain-movie-card"
                  onClick={() => handleLaunchMovie(movie)}
                >
                  <div className="pd-poster-frame">
                    <img 
                      src={movie.poster} 
                      alt={movie.title} 
                      className="pd-poster-img"
                      loading="lazy"
                    />
                    <div className="pd-poster-gradient" />

                    {/* Top Badges */}
                    <span className="pd-category-pill">{movie.category}</span>
                    <span className="pd-year-pill">{movie.year}</span>

                    {/* Title at bottom */}
                    <div className="pd-card-bottom-title">
                      <span className="pd-movie-title-txt">{movie.title}</span>
                    </div>

                    {/* Hover Reveal Overlay with Description & Watch Now */}
                    <div className="pd-hover-reveal-overlay">
                      <div className="pd-hover-header">
                        <span className="pd-hover-badge">DIRECT STREAM READY</span>
                        <span className="pd-hover-cat">{movie.category} • {movie.year}</span>
                      </div>

                      <h4 className="pd-hover-title">{movie.title}</h4>
                      <p className="pd-hover-desc">{movie.description}</p>

                      <button className="btn-pd-watch-now" onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchMovie(movie);
                      }}>
                        <Play size={14} fill="#000000" />
                        <span>WATCH NOW</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}


      {/* ══════════════════════════════════════════════════════════════════════
          VIEW MODE 3: FULL-PAGE OTT UNIVERSE (CATEGORY 1 DRM vs CATEGORY 2 OPEN)
          ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'ott_universe' && (
        <main className="ott-universe-full-page fade-in">
          {/* Header */}
          <div className="ott-universe-clean-header">
            <div className="ott-header-top-row">
              <button className="btn-return-cinema-hub" onClick={() => setViewMode('cinema_hub')}>
                <ArrowLeft size={16} /> <span>← BACK TO FREE CINEMA</span>
              </button>
              <span className="ott-count-pill">
                {activeDrmTab === 'heavy_drm' ? 'CATEGORY 1: 16 DRM SERVICES' : 'CATEGORY 2: 24 OPEN SERVICES'}
              </span>
            </div>

            <h2 className="ott-page-main-title">Streaming Platforms & Connection Architecture</h2>
            <p className="ott-page-subtitle">
              Choose between Heavy DRM services (requires account sync) or Free Open streams (direct playback).
            </p>

            {/* Two Master Category Tabs */}
            <div className="ott-drm-master-tabs">
              <button 
                className={`drm-tab-btn ${activeDrmTab === 'heavy_drm' ? 'active-red-tab' : ''}`}
                onClick={() => {
                  setActiveDrmTab('heavy_drm');
                  setSelectedOttPlatform(null);
                }}
              >
                <Lock size={15} />
                <span>CATEGORY 1: HEAVY DRM PLATFORMS (16)</span>
              </button>

              <button 
                className={`drm-tab-btn ${activeDrmTab === 'open_stream' ? 'active-yellow-tab' : ''}`}
                onClick={() => {
                  setActiveDrmTab('open_stream');
                  setSelectedOttPlatform(null);
                }}
              >
                <Globe size={15} />
                <span>CATEGORY 2: FREE & OPEN STREAMING (24)</span>
              </button>
            </div>
          </div>

          {/* ── CATEGORY 1: HEAVY DRM PLATFORM GUIDE (RED CANVAS) ── */}
          {activeDrmTab === 'heavy_drm' && (
            <div className="drm-category-intro-banner red-border-banner fade-in">
              <div className="intro-badge-row">
                <ShieldAlert size={20} className="red-icon" />
                <span className="drm-intro-tag">CATEGORY 1: HARDWARE DRM PROTECTED (WIDEVINE / FAIRPLAY / PLAYREADY)</span>
              </div>
              <h3 className="drm-intro-heading">How 2+ People Connect & Watch Together</h3>
              <p className="drm-intro-desc">
                These platforms utilize browser-level hardware encryption (Encrypted Media Extensions / CDMs).
                Standard screen-sharing or simple iframes turn into a <strong>black screen</strong>.
              </p>

              {/* Exact 3 Steps on how two people connect */}
              <div className="drm-two-user-steps-grid">
                <div className="two-user-step-card">
                  <span className="user-step-num">STEP 1</span>
                  <h4>Both Members Sign In</h4>
                  <p>Both you and your friends open the official platform (e.g., Netflix) in separate browser tabs with your own active accounts.</p>
                </div>
                <div className="two-user-step-card">
                  <span className="user-step-num">STEP 2</span>
                  <h4>Connect Room Code ({roomCode})</h4>
                  <p>Open the CoGether Companion extension in your tab and paste your active Room Code to link the squad together.</p>
                </div>
                <div className="two-user-step-card">
                  <span className="user-step-num">STEP 3</span>
                  <h4>Synchronized Playback & Call</h4>
                  <p>Play, pause, and seek actions are instantly synchronized with a low-latency floating video call and squad voice chat.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── CATEGORY 2: OPEN & FREE PLATFORM GUIDE (YELLOW CANVAS) ── */}
          {activeDrmTab === 'open_stream' && (
            <div className="drm-category-intro-banner yellow-border-banner fade-in">
              <div className="intro-badge-row">
                <Globe size={20} className="yellow-icon" />
                <span className="drm-intro-tag yellow-txt">CATEGORY 2: OPEN VIDEO MANIFESTS & ZERO DRM</span>
              </div>
              <h3 className="drm-intro-heading">Direct In-App Playback & Embed Streaming</h3>
              <p className="drm-intro-desc">
                These platforms do not enforce hardware-locked encryption for web playback.
                You can paste direct video links or launch synchronized in-app theater streams directly!
              </p>

              {/* Quick direct stream input */}
              <form onSubmit={handleStreamCustomUrl} className="category-open-stream-form">
                <input 
                  type="text" 
                  placeholder="Paste direct video URL (MP4 / YouTube / Live stream)..."
                  value={customStreamUrl}
                  onChange={(e) => setCustomStreamUrl(e.target.value)}
                  className="open-stream-input"
                />
                <button type="submit" className="btn-open-stream-submit">
                  <Play size={13} fill="#000000" /> <span>PLAY IN THEATER</span>
                </button>
              </form>
            </div>
          )}

          {/* ── PLATFORM DETAIL DRAWER (WHEN CLICKED) ── */}
          {selectedOttPlatform && (
            <div className={`ott-platform-detail-drawer ${activeDrmTab === 'heavy_drm' ? 'red-canvas-drawer' : 'yellow-canvas-drawer'} fade-in`}>
              <div className="drawer-header-row">
                <div className="drawer-title-col">
                  <div className="drawer-logo-badge-wrap">
                    {selectedOttPlatform.logoUrl ? (
                      <img src={selectedOttPlatform.logoUrl} alt={selectedOttPlatform.name} className="drawer-header-logo" />
                    ) : null}
                  </div>
                  <div>
                    <h3 className="drawer-platform-name">{selectedOttPlatform.name} Connection Guide</h3>
                    <span className="drawer-drm-note">{selectedOttPlatform.badge} • {selectedOttPlatform.summary}</span>
                  </div>
                </div>
                <button className="btn-close-drawer" onClick={() => setSelectedOttPlatform(null)}>
                  ✕ CLOSE
                </button>
              </div>

              {/* Actions */}
              <div className="drawer-action-triggers">
                <a 
                  href={selectedOttPlatform.directUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn-launch-ott-tab"
                >
                  <span>OPEN {selectedOttPlatform.name.toUpperCase()}</span>
                  <ExternalLink size={15} />
                </a>

                <button className="btn-copy-room-trigger" onClick={handleCopyRoomCode}>
                  <Key size={15} />
                  <span>{isRoomCopied ? 'ROOM CODE COPIED!' : `COPY ROOM CODE (${roomCode})`}</span>
                </button>

                <button className="btn-copy-squad-trigger" onClick={handleCopyPartyLink}>
                  <Share2 size={15} />
                  <span>{isCopied ? 'INVITE LINK COPIED!' : 'SHARE SQUAD INVITE LINK'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── 5 PER ROW: PURE LOGO OVALISH CARDS ── */}
          <div className="ott-platforms-five-col-grid">
            {(activeDrmTab === 'heavy_drm' ? HEAVY_DRM_PLATFORMS : OPEN_NON_DRM_PLATFORMS).map(platform => (
              <div 
                key={platform.id} 
                className={`ott-ovalish-card ${selectedOttPlatform?.id === platform.id ? 'active-ott-card' : ''}`}
                onClick={() => setSelectedOttPlatform(platform)}
                title={`Click to view connection instructions for ${platform.name}`}
              >
                <div className="ott-logo-matte-container">
                  {platform.logoUrl ? (
                    <img 
                      src={platform.logoUrl} 
                      alt={`${platform.name} Logo`} 
                      className="ott-exact-official-logo" 
                      loading="lazy"
                    />
                  ) : (
                    <span className="ott-text-fallback-logo">{platform.name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* ── 6. COGETHER LUXURY FOOTER ── */}
      <footer className="cowatch-luxury-footer">
        <div className="footer-inner-wrapper">
          <div className="footer-left-col">
            <h4 className="footer-brand-title">CO-WATCH <span>CINEMA</span></h4>
            <p className="footer-brand-desc">
              Direct Plain Video Streaming, DRM Extension Synchronization & Low-Latency WebRTC P2P Video Chat.
            </p>
          </div>

          <div className="footer-center-col">
            <span className="footer-webrtc-badge">● WEBRTC 2.0 P2P SYNC ACTIVE</span>
            <span className="footer-room-info">Active Party Room: <strong>{roomCode}</strong></span>
          </div>

          <div className="footer-right-col">
            <button className="btn-footer-back-home" onClick={onBackToHome}>
              <span>BACK TO COGETHER HOME</span>
              <ArrowLeft size={14} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
