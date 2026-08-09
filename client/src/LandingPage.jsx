import React, { useState, useEffect, useRef } from 'react';
import { POKI_TOP_TRENDING, POKI_WEB_EXCLUSIVES } from './pokiCatalog.js';
import { Tv, Gamepad2, Sparkles, Play, Lock, CheckCircle2, ArrowRight, Video, ShoppingBag, BookOpen, Star, Flame, Eye, RefreshCw, Volume2, VolumeX, MessageSquare, Mic, Camera, Layers, Users, Maximize2, Move } from 'lucide-react';
import './LandingPage.css';

export default function LandingPage({ onStartWatchParty, onStartGames, onStartMergedCam, onOpenPricing }) {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState(localStorage.getItem('sp_username') || '');
  const [isMuted, setIsMuted] = useState(true);
  const [camBoxSize, setCamBoxSize] = useState('md');
  const [tutorialStep, setTutorialStep] = useState(1);
  const [scrollProgress, setScrollProgress] = useState(0);
  const heroImgRef = useRef(null);

  const TUTORIAL_MESSAGES = [
    { sender: 'Alex', text: 'CoGether makes Co-Watch & Co-Play feel like real life! 🍿', color: '#a855f7' },
    { sender: 'Sam', text: 'Yooo! We are sitting in the same room! 🔥', color: '#3b82f6' },
    { sender: 'Alex', text: 'Let\'s start Co-Play Online Games next!', color: '#a855f7' }
  ];

  const [activeMsgIdx, setActiveMsgIdx] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight * 0.6;
      const progress = Math.min(window.scrollY / heroHeight, 1);
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveMsgIdx((prev) => (prev + 1) % TUTORIAL_MESSAGES.length);
      setTutorialStep((prev) => (prev % 3) + 1);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const generateCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  };

  const handleLaunch = (mode, customRoomId) => {
    const finalName = username.trim() || 'User_' + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem('sp_username', finalName);
    const finalRoom = customRoomId || roomCode.trim() || generateCode();

    if (mode === 'watch') onStartWatchParty(finalRoom, finalName);
    else if (mode === 'games') onStartGames(finalRoom, finalName);
    else if (mode === 'merged') onStartMergedCam(finalRoom, finalName);
  };

  const cycleCamSize = () => {
    if (camBoxSize === 'sm') setCamBoxSize('md');
    else if (camBoxSize === 'md') setCamBoxSize('lg');
    else setCamBoxSize('sm');
  };

  const allOnlineGames = [...POKI_TOP_TRENDING, ...POKI_WEB_EXCLUSIVES];

  // Target: navbar logo center coordinates (left-aligned inside 1400px container with 40px padding, 58px tall)
  const containerOffset = Math.max((window.innerWidth - 1400) / 2, 0);
  const navPaddingLeft = 40;
  const navLogoWidth = (58 / (3840 / 6824)); // ~103.1px width for 58px height
  const navLogoTargetX = containerOffset + navPaddingLeft + (navLogoWidth / 2);
  const navLogoTargetY = 40; // center of 80px fixed header

  const heroImgCenterX = window.innerWidth / 2;
  const heroImgCenterY = window.innerHeight / 2;

  // X & Y offsets from 50vw, 50vh to navbar target center
  const deltaX = navLogoTargetX - heroImgCenterX;
  const deltaY = navLogoTargetY - heroImgCenterY;

  const currentX = scrollProgress * deltaX;
  const currentY = scrollProgress * deltaY;

  // Scale from full hero width to 58px header logo height
  const heroImgHeight = (3840 / 6824) * window.innerWidth;
  const targetScale = 58 / heroImgHeight;
  const logoScale = 1 - (scrollProgress * (1 - targetScale));

  return (
    <div className="landing-page-official fade-in">
      {/* 1. FULLSCREEN HERO SECTION */}
      <section className="fullscreen-pure-black-hero" />

      {/* 2. BOLD RED SECTION: CO-WATCH HUB */}
      <section className="official-red-section">
        <div className="red-section-container">
          <div className="red-left-content">
            <div className="watch-together-badge">CO-WATCH HUB</div>
            <h2 className="red-section-headline">Synchronized Movies & TV Shows</h2>
            <p className="red-section-sub">
              Stream movies, TV shows, and videos synchronized to the exact millisecond with integrated real-time video calls.
            </p>
            <div className="how-it-works-switcher-box">
              <span className="switcher-label">CAMERA RESIZER (CoGether Room):</span>
              <div className="switcher-btns-row">
                <button className={`switch-btn ${camBoxSize === 'sm' ? 'active-size' : ''}`} onClick={() => setCamBoxSize('sm')}>Small</button>
                <button className={`switch-btn ${camBoxSize === 'md' ? 'active-size' : ''}`} onClick={() => setCamBoxSize('md')}>Medium</button>
                <button className={`switch-btn ${camBoxSize === 'lg' ? 'active-size' : ''}`} onClick={() => setCamBoxSize('lg')}>Large</button>
              </div>
            </div>
            <button className="btn-black-launch-party" onClick={() => handleLaunch('watch')}>
              Launch Co-Watch Room <ArrowRight size={18} />
            </button>
          </div>

          <div className="red-right-video-frame">
            <div className="video-player-box-red">
              <div className="video-overlay-bar">
                <span className="live-sync-pill"><span className="red-live-dot" /> CoGether Live Room</span>
                <div className="overlay-actions-right">
                  <button className="resize-cam-btn-icon" onClick={cycleCamSize}><Maximize2 size={14} /> Resize</button>
                  <button className="mute-toggle-ic-btn" onClick={() => setIsMuted(!isMuted)}>
                    {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                </div>
              </div>
              <video autoPlay loop muted={isMuted} playsInline className="commercial-cinematic-video">
                <source src="https://media.w3.org/2010/05/sintel/trailer.mp4" type="video/mp4" />
              </video>
              <div className="live-chat-video-overlay fade-in">
                <div className="chat-bubble-card">
                  <div className="bubble-sender" style={{ color: TUTORIAL_MESSAGES[activeMsgIdx].color }}>
                    <MessageSquare size={12} /> {TUTORIAL_MESSAGES[activeMsgIdx].sender}
                  </div>
                  <div className="bubble-text">{TUTORIAL_MESSAGES[activeMsgIdx].text}</div>
                </div>
              </div>
              <div className={`teleparty-merged-view-box zero-center-line size-${camBoxSize} fade-in`}>
                <div className="teleparty-header-strip">
                  <span className="good-icon">✓</span> CoGether Merged Room
                  <button className="quick-resize-ic" onClick={cycleCamSize}><Move size={11} /></button>
                </div>
                <div className="merged-shared-room-stage zero-line-stage">
                  <div className="guy-merged-side">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80" alt="Alex" />
                    <span className="guy-tag-badge"><span className="dot-green" /> Alex</span>
                  </div>
                  <div className="guy-merged-side">
                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80" alt="Sam" />
                    <span className="guy-tag-badge"><span className="dot-blue" /> Sam</span>
                  </div>
                </div>
              </div>
              <div className="app-tutorial-bottom-banner">
                <div className={`tutorial-step-item ${tutorialStep === 1 ? 'active' : ''}`}><span className="step-num">1</span> Pick Co-Watch or Co-Play</div>
                <div className={`tutorial-step-item ${tutorialStep === 2 ? 'active' : ''}`}><span className="step-num">2</span> Share Invite Link</div>
                <div className={`tutorial-step-item ${tutorialStep === 3 ? 'active' : ''}`}><span className="step-num">3</span> Hang Out Together Live</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CO-PLAY: ONLINE GAMES CAROUSEL */}
      <section className="games-carousel-section">
        <div className="carousel-header-bar">
          <div className="carousel-title-group">
            <span className="section-eyebrow-red">CO-PLAY SECTION</span>
            <h2>Multiplayer & Online Games</h2>
          </div>
          <button className="view-all-games-btn" onClick={() => handleLaunch('games')}>
            View All 2,000+ Games <ArrowRight size={16} />
          </button>
        </div>
        <div className="games-horizontal-scroll">
          {allOnlineGames.map((g, idx) => (
            <div key={g.id || idx} className="carousel-game-card" onClick={() => handleLaunch('games')}>
              <div className="game-card-thumb-wrapper">
                <img src={g.thumb} alt={g.title} />
                {g.badge && <span className="game-badge-tag">{g.badge}</span>}
              </div>
              <div className="game-card-details">
                <div className="game-card-title-row">
                  <h3>{g.title}</h3>
                  {g.rating && <span className="game-star-rating"><Star size={12} fill="#f59e0b" color="#f59e0b" /> {g.rating}</span>}
                </div>
                <p>{g.description}</p>
                <button className="btn-play-game-card"><Play size={14} fill="#fff" /> Co-Play Instantly</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. CO-SHOP & CO-STUDY */}
      <section className="co-experience-section">
        <div className="co-exp-grid">
          <div className="exp-card" onClick={() => handleLaunch('watch')}>
            <div className="exp-icon icon-red"><ShoppingBag size={28} /></div>
            <h3>Co-Shop</h3>
            <p>Browse products in shared screen sessions with your friends before buying.</p>
          </div>
          <div className="exp-card" onClick={() => handleLaunch('merged')}>
            <div className="exp-icon icon-black"><BookOpen size={28} /></div>
            <h3>Co-Study</h3>
            <p>Pomodoro focus timers, shared study desks, and silent video call accountability.</p>
          </div>
        </div>
      </section>

      {/* 5. PREMIUM */}
      <section className="premium-gateway-section">
        <div className="premium-banner-card">
          <div className="banner-left">
            <span className="gold-tag">COGETHER PREMIUM</span>
            <h2>₹49 / Month</h2>
            <p>Unlock unlimited Co-Watch rooms, full multiplayer games, Co-Shop & Co-Study desks.</p>
          </div>
          <button className="btn-gold-checkout" onClick={onOpenPricing}>
            Get Premium for ₹49 <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
