import React, { useState, useEffect, useRef } from 'react';
import { POKI_TOP_TRENDING, POKI_WEB_EXCLUSIVES } from './pokiCatalog.js';
import { Tv, Gamepad2, Sparkles, Play, Lock, CheckCircle2, ArrowRight, Video, ShoppingBag, BookOpen, Star, Flame, Eye, RefreshCw, Volume2, VolumeX, MessageSquare, Mic, Camera, Layers, Users, Maximize2, Move } from 'lucide-react';
import './LandingPage.css';

const MOVIE_STREAMING_APPS = [
  { name: 'Netflix', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg' },
  { name: 'Disney+ Hotstar', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Disney%2B_Hotstar_logo.svg' },
  { name: 'Prime Video', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png' },
  { name: 'HBO Max', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg' },
  { name: 'Apple TV+', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg' },
  { name: 'Hulu', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Hulu_Logo.svg' },
  { name: 'Sony LIV', logo: 'https://upload.wikimedia.org/wikipedia/en/7/7b/SonyLIV_logo.png' },
  { name: 'Zee5', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/ZEE5_logo.svg' }
];

const SPORTS_CHANNELS = [
  { name: 'ESPN+', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/ESPN%2B_logo.svg' },
  { name: 'Sky Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Sky_Sports_logo_2020.svg' },
  { name: 'DAZN', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/DAZN_Logo_Master_RGB_2018.svg' },
  { name: 'Sony Sports', logo: 'https://upload.wikimedia.org/wikipedia/en/7/7b/SonyLIV_logo.png' },
  { name: 'Star Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Disney%2B_Hotstar_logo.svg' },
  { name: 'Eurosport', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/06/Eurosport_logo.svg' },
  { name: 'NBA TV', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/NBA_TV.svg' },
  { name: 'Willow HD', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Willow_TV_logo.svg' }
];

const ANIME_NETWORKS = [
  { name: 'Crunchyroll', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Crunchyroll_Logo.svg' },
  { name: 'Funimation', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Funimation_Logo.svg' },
  { name: 'HiDive', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/36/HiDive_logo.svg' },
  { name: 'Ani-One Asia', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Ani-One_Asia.png' },
  { name: 'Muse Asia', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Muse_Asia_Logo.png' },
  { name: 'Netflix Anime', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg' },
  { name: 'Toonami', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Toonami_2012_logo.png' },
  { name: 'Tubi Anime', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Tubi_logo.svg' }
];

export default function LandingPage({ onStartWatchParty, onStartGames, onStartMergedCam, onOpenPricing }) {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState(localStorage.getItem('sp_username') || '');
  const [isMuted, setIsMuted] = useState(true);
  const [camBoxSize, setCamBoxSize] = useState('md');
  const [tutorialStep, setTutorialStep] = useState(1);
  const [scrollProgress, setScrollProgress] = useState(0);

  const TUTORIAL_MESSAGES = [
    { sender: 'Alex', text: 'CoGether makes Co-Watch & Co-Play feel like real life! 🍿', color: '#a855f7' },
    { sender: 'Sam', text: 'Yooo! We are sitting in the same room! 🔥', color: '#3b82f6' },
    { sender: 'Alex', text: 'Let\'s start Co-Play Online Games next!', color: '#a855f7' }
  ];

  const [activeMsgIdx, setActiveMsgIdx] = useState(0);

  // ACCURATE HERO-TO-STAGE SCROLL TRACKING
  useEffect(() => {
    let animId;
    let currVal = 0;

    const loop = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      const stageWrapper = document.querySelector('.sticky-pinned-red-stage-wrapper');

      let target = 0;
      if (stageWrapper) {
        const stageTopOffset = stageWrapper.offsetTop;
        const totalHeight = stageWrapper.clientHeight;
        
        if (scrollY < stageTopOffset) {
          target = (scrollY / stageTopOffset) * 0.22;
        } else {
          const stageScroll = scrollY - stageTopOffset;
          const stageMaxScroll = totalHeight - vh;
          target = 0.22 + Math.min(Math.max(stageScroll / stageMaxScroll, 0), 1) * 0.78;
        }
      } else {
        target = Math.min(scrollY / (vh * 2), 1);
      }

      currVal += (target - currVal) * 0.12;
      setScrollProgress(currVal);
      animId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animId);
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

  // STEP 1: INITIAL HERO STATE IS 100% PLAIN CLEAN BLACK (scrollProgress <= 0.02)
  // AS USER SCROLLS DOWN (0.02 -> 0.25), STARBURST CROSS LASER FLARE PULSES
  const isBurstActive = scrollProgress > 0.02 && scrollProgress < 0.30;
  const burstOpacity = isBurstActive ? Math.sin(((scrollProgress - 0.02) / 0.28) * Math.PI) : 0;
  const crossScale = Math.min((scrollProgress - 0.02) * 4.0, 1);

  // STEP 2: 360-DEGREE INWARD DOOR FLIP (Red -> Yellow) (scrollProgress 0.22 -> 0.40)
  // Multiplier 5.8 ensures the 360deg spin completes & yellow doors interlock 100% flat with zero gap early!
  const spinProgress = Math.min(Math.max((scrollProgress - 0.22) * 5.8, 0), 1);
  const doorSpinAngle = spinProgress * 360;

  const isSpinning = doorSpinAngle > 2 && doorSpinAngle < 358;
  const isYellowCanvas = spinProgress > 0.40;

  // SOLID YELLOW LOCK: Locks flat smoothly when spinProgress >= 0.85 or scrollProgress >= 0.38!
  const isFullyLockedYellow = spinProgress >= 0.85 || scrollProgress >= 0.38;

  // WHITE ZIGZAG CRACK SEAM LINE OVERLAY:
  // Visible when Red stage appears (scrollProgress >= 0.15) UNTIL exact millisecond door spin starts (spinProgress < 0.005)!
  const showWhiteLine = scrollProgress >= 0.15 && spinProgress < 0.005;

  // STEP 3: BULLET STRIKES SHOOT OUT OF BARRELS (scrollProgress > 0.45)
  // Multiplier 2.5 ensures bullets travel across screen smoothly as you scroll!
  const bulletProgress = Math.min(Math.max((scrollProgress - 0.45) * 2.5, 0), 1);

  return (
    <div className="landing-page-official fade-in">
      {/* 1. TALL FULLSCREEN BLACK HERO SECTION */}
      <section className="fullscreen-pure-black-hero">
        <div className="hero-center-content-wrapper">
          <div className="genz-tagline-container">
            <p
              className="genz-tagline-text"
              style={{
                opacity: scrollProgress < 0.30 ? 1 : 0,
                filter: burstOpacity > 0 ? `brightness(${1 + burstOpacity * 3.5})` : 'none'
              }}
            >
              WATCH • PLAY • SHOP • STUDY WITH YOUR INNER CIRCLE
            </p>

            {/* HORIZONTAL & VERTICAL CROSS LASER BEAMS + CENTER STARBURST FLARE */}
            {isBurstActive && (
              <div
                className="procedural-lightburst-flare"
                style={{
                  opacity: burstOpacity,
                  transform: `translate(-50%, -50%) scale(${0.7 + burstOpacity * 2.2})`,
                  pointerEvents: 'none',
                  display: 'block'
                }}
              >
                <div className="flare-core-burst" />
                <div className="horizontal-laser-beam" style={{ transform: `translateY(-50%) scaleX(${1 + crossScale * 2})` }} />
                <div className="vertical-laser-beam" style={{ transform: `translateX(-50%) scaleY(${1 + crossScale * 2})` }} />
                <div className="diagonal-laser-beam-1" />
                <div className="diagonal-laser-beam-2" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. STICKY PINNED RED CO-WATCH SECTION WITH 360-DEGREE INWARD ZIGZAG DOOR SPIN */}
      <section className="sticky-pinned-red-stage-wrapper">
        <div className={`sticky-pinned-red-stage-inner ${isFullyLockedYellow ? 'bg-full-yellow' : ''}`}>
          {/* BACKGROUND VOID BOLD CONDENSED REVEAL TYPOGRAPHY (Z-INDEX 1 BEHIND DOORS) */}
          <div className="center-void-condensed-typography">
            <h1 className="katapult-condensed-headline">CO-WATCH</h1>
          </div>

          {/* LEFT DOOR PANEL (Z-INDEX 5 IN FRONT OF BACKGROUND TEXT) */}
          <div
            className={`door-half-panel door-panel-left ${isYellowCanvas ? 'bg-yellow' : 'bg-red'} ${isSpinning ? 'is-spinning' : ''} ${isFullyLockedYellow ? 'no-clip' : ''}`}
            style={{
              transform: isFullyLockedYellow ? 'none' : `rotateY(${-doorSpinAngle}deg)`
            }}
          >
            {!isYellowCanvas ? (
              <div className="door-content-left-red">
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
            ) : (
              <div className="plain-yellow-half" />
            )}
          </div>

          {/* RIGHT DOOR PANEL (Z-INDEX 5 IN FRONT OF BACKGROUND TEXT) */}
          <div
            className={`door-half-panel door-panel-right ${isYellowCanvas ? 'bg-yellow' : 'bg-red'} ${isSpinning ? 'is-spinning' : ''} ${isFullyLockedYellow ? 'no-clip' : ''}`}
            style={{
              transform: isFullyLockedYellow ? 'none' : `rotateY(${doorSpinAngle}deg)`
            }}
          >
            {!isYellowCanvas ? (
              <div className="door-content-right-red">
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
            ) : (
              <div className="plain-yellow-half" />
            )}
          </div>

          {/* YELLOW STAGE WITH 3 CLEAN PISTOLS & 3 BULLETS (1 BULLET PER GUN BARREL IN INSIDE POSITIONS) */}
          {isFullyLockedYellow && (
            <div className="pistol-bullet-torn-paper-stage fade-in">
              <div className="ink-stage-header">
                <span className="ink-eyebrow-stamp">墨絵 • STREAMING HUBS</span>
                <h2 className="ink-title-kanji">SELECT STREAMING DESTINATION</h2>
              </div>

              <div className="torn-banners-container-3">
                {/* ROW 1 (TOP): GUN 1 (LEFT SIDE) -> BULLET 1 (TOP ROW INSIDE GUN BARREL, LEFT TO RIGHT) */}
                <div className="pistol-banner-row row-left">
                  <div className="pistol-static-wrapper pistol-left" style={{ position: 'relative' }}>
                    <img src="/pistol_artwork.png" alt="Pistol 1" className="pistol-ink-img facing-right" />
                    
                    {/* Bullet 1 (Top Row): Starts INSIDE Gun 1 barrel and shoots left-to-right off screen */}
                    <div
                      className="bullet-flying-wrapper bullet-row-1"
                      style={{
                        position: 'absolute',
                        left: `calc(190px + ${bulletProgress * 90}vw)`,
                        top: '42px',
                        transform: 'translateY(-50%)',
                        opacity: bulletProgress > 0 && bulletProgress < 0.98 ? 1 : 0,
                        zIndex: 100
                      }}
                    >
                      <img src="/bullet_artwork.png" alt="Bullet 1" className="bullet-img facing-right" />
                    </div>
                  </div>

                  {/* Torn White Paper Banner 1 Unrolling Behind Bullet 1 */}
                  <div
                    className="torn-paper-white-banner"
                    style={{
                      clipPath: `polygon(0 0, ${bulletProgress * 100}% 0, ${bulletProgress * 100}% 100%, 0 100%)`
                    }}
                    onClick={() => handleLaunch('watch')}
                  >
                    <div className="banner-content-inner">
                      <div className="banner-badge-tag">🎬 MOVIES & TV SHOWS</div>
                      <div className="marquee-track scroll-left">
                        {[...MOVIE_STREAMING_APPS, ...MOVIE_STREAMING_APPS].map((app, idx) => (
                          <div key={idx} className="marquee-app-item">
                            <img src={app.logo} alt={app.name} onError={(e) => { e.target.style.display = 'none'; }} />
                            <span>{app.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ROW 2 (MIDDLE): GUN 2 (RIGHT SIDE FLIPPED) -> BULLET 2 (MIDDLE ROW INSIDE GUN BARREL, RIGHT TO LEFT) */}
                <div className="pistol-banner-row row-right">
                  {/* Torn White Paper Banner 2 Unrolling Reverse Behind Bullet 2 */}
                  <div
                    className="torn-paper-white-banner"
                    style={{
                      clipPath: `polygon(${100 - bulletProgress * 100}% 0, 100% 0, 100% 100%, ${100 - bulletProgress * 100}% 100%)`
                    }}
                    onClick={() => handleLaunch('watch')}
                  >
                    <div className="banner-content-inner">
                      <div className="banner-badge-tag sports-tag">⚽ LIVE SPORTS CHANNELS</div>
                      <div className="marquee-track scroll-right">
                        {[...SPORTS_CHANNELS, ...SPORTS_CHANNELS].map((app, idx) => (
                          <div key={idx} className="marquee-app-item">
                            <img src={app.logo} alt={app.name} onError={(e) => { e.target.style.display = 'none'; }} />
                            <span>{app.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pistol-static-wrapper pistol-right" style={{ position: 'relative' }}>
                    <img src="/pistol_artwork.png" alt="Pistol 2" className="pistol-ink-img facing-left" />

                    {/* Bullet 2 (Middle Row): Starts INSIDE Gun 2 barrel and shoots right-to-left off screen */}
                    <div
                      className="bullet-flying-wrapper bullet-row-2"
                      style={{
                        position: 'absolute',
                        right: `calc(190px + ${bulletProgress * 90}vw)`,
                        top: '42px',
                        transform: 'translateY(-50%)',
                        opacity: bulletProgress > 0 && bulletProgress < 0.98 ? 1 : 0,
                        zIndex: 100
                      }}
                    >
                      <img src="/bullet_artwork.png" alt="Bullet 2" className="bullet-img facing-left" />
                    </div>
                  </div>
                </div>

                {/* ROW 3 (BOTTOM): GUN 3 (LEFT SIDE) -> BULLET 3 (BOTTOM ROW INSIDE GUN BARREL, LEFT TO RIGHT) */}
                <div className="pistol-banner-row row-left">
                  <div className="pistol-static-wrapper pistol-left" style={{ position: 'relative' }}>
                    <img src="/pistol_artwork.png" alt="Pistol 3" className="pistol-ink-img facing-right" />

                    {/* Bullet 3 (Bottom Row): Starts INSIDE Gun 3 barrel and shoots left-to-right off screen */}
                    <div
                      className="bullet-flying-wrapper bullet-row-3"
                      style={{
                        position: 'absolute',
                        left: `calc(190px + ${bulletProgress * 90}vw)`,
                        top: '42px',
                        transform: 'translateY(-50%)',
                        opacity: bulletProgress > 0 && bulletProgress < 0.98 ? 1 : 0,
                        zIndex: 100
                      }}
                    >
                      <img src="/bullet_artwork.png" alt="Bullet 3" className="bullet-img facing-right" />
                    </div>
                  </div>

                  {/* Torn White Paper Banner 3 Unrolling Behind Bullet 3 */}
                  <div
                    className="torn-paper-white-banner"
                    style={{
                      clipPath: `polygon(0 0, ${bulletProgress * 100}% 0, ${bulletProgress * 100}% 100%, 0 100%)`
                    }}
                    onClick={() => handleLaunch('watch')}
                  >
                    <div className="banner-content-inner">
                      <div className="banner-badge-tag anime-tag">⛩️ ANIME STREAMING HUB</div>
                      <div className="marquee-track scroll-left">
                        {[...ANIME_NETWORKS, ...ANIME_NETWORKS].map((app, idx) => (
                          <div key={idx} className="marquee-app-item">
                            <img src={app.logo} alt={app.name} onError={(e) => { e.target.style.display = 'none'; }} />
                            <span>{app.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CLEAN WHITE VERTICAL ZIGZAG SEAM LINE OVERLAY */}
          <div
            className="vertical-zigzag-crack-container"
            style={{
              opacity: showWhiteLine ? 1 : 0,
              zIndex: 100
            }}
          >
            <svg className="vertical-zigzag-svg" viewBox="0 0 40 1200" preserveAspectRatio="none">
              <path
                d="M20,0 L5,60 L35,120 L5,180 L35,240 L5,300 L35,360 L5,420 L35,480 L5,540 L35,600 L5,660 L35,720 L5,780 L35,840 L5,900 L35,960 L5,1020 L35,1080 L5,1140 L20,1200"
                fill="none"
                stroke="#ffffff"
                strokeWidth="4"
              />
            </svg>
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
