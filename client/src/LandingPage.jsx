import React, { useState, useEffect, useRef } from 'react';
import { POKI_TOP_TRENDING, POKI_WEB_EXCLUSIVES, POKI_CATEGORY_HUBS } from './pokiCatalog.js';
import { Tv, Gamepad2, Sparkles, Play, Lock, CheckCircle2, ArrowRight, Video, ShoppingBag, BookOpen, Star, Flame, Eye, RefreshCw, Volume2, VolumeX, MessageSquare, Mic, Camera, Layers, Users, Maximize2, Move, Box } from 'lucide-react';
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

// FAMOUS HIGH-RES ONLINE GAME LOGOS FOR 3D CUBE FACES
const FAMOUS_GAME_TILES_FACE1 = [
  { name: 'Subway Surfers', img: 'https://img.gamemonetize.com/tmhj9i3trg8ot0u7h9qahh6flzn9zkjp/512x384.jpg' },
  { name: 'Temple Run 2', img: 'https://img.gamemonetize.com/q6u8ghlmkx9rhy48udltwan4cqmmoxxm/512x384.jpg' },
  { name: 'Smash Karts', img: 'https://img.gamemonetize.com/rrflwl9gzd8jw3wpk6mzgwfzi32pvnlp/512x384.jpg' },
  { name: 'Shell Shockers', img: 'https://img.gamemonetize.com/ou0bfqy1ejiobw4yb4ozvj23t85x2xxj/512x384.jpg' },
  { name: 'Moto X3M', img: 'https://img.gamemonetize.com/5q7rgv3nxbtcx1doq963t8t8ax6sc0ss/512x384.jpg' },
  { name: 'Car Stunt Master', img: 'https://img.gamemonetize.com/gixytcyqjodb9t1bd6z6c2bhuc0n2zqi/512x384.jpg' },
  { name: 'Retro Bowl', img: 'https://img.gamemonetize.com/zo8ocq9uu0gjavl3iazgiessapj6ov6n/512x384.jpg' },
  { name: 'Drive Mad', img: 'https://img.gamemonetize.com/fz2a4g1h9hdohgcyd7em6c6n3wggsfw0/512x384.jpg' },
  { name: 'Tuk Tuk Auto', img: 'https://img.gamemonetize.com/e3nqbd83zbz64dri00qtgftk6ke4reds/512x384.jpg' }
];

const FAMOUS_GAME_TILES_FACE2 = [
  { name: 'Shifted Realms', img: 'https://img.gamemonetize.com/ou0bfqy1ejiobw4yb4ozvj23t85x2xxj/512x384.jpg' },
  { name: 'Police Car Parking', img: 'https://img.gamemonetize.com/zo8ocq9uu0gjavl3iazgiessapj6ov6n/512x384.jpg' },
  { name: 'Mud Truck', img: 'https://img.gamemonetize.com/fz2a4g1h9hdohgcyd7em6c6n3wggsfw0/512x384.jpg' },
  { name: 'Season Change', img: 'https://img.gamemonetize.com/6xui5nnxg3d3r3frxs2003f38hjeig7r/512x384.jpg' },
  { name: 'Heroes Beware', img: 'https://img.gamemonetize.com/5q7rgv3nxbtcx1doq963t8t8ax6sc0ss/512x384.jpg' },
  { name: 'Subway Surfers', img: 'https://img.gamemonetize.com/tmhj9i3trg8ot0u7h9qahh6flzn9zkjp/512x384.jpg' },
  { name: 'Car Evolution', img: 'https://img.gamemonetize.com/rrflwl9gzd8jw3wpk6mzgwfzi32pvnlp/512x384.jpg' },
  { name: 'Offroad Jeep', img: 'https://img.gamemonetize.com/q6u8ghlmkx9rhy48udltwan4cqmmoxxm/512x384.jpg' },
  { name: 'Car Stunt', img: 'https://img.gamemonetize.com/gixytcyqjodb9t1bd6z6c2bhuc0n2zqi/512x384.jpg' }
];

// AUTOMATIC DIAGONAL 3D ROTATABLE GAME RUBIK'S CUBE COMPONENT
function AutomaticDiagonal3DRubiksCube() {
  return (
    <div className="automatic-diagonal-3d-stage stage-massive">
      {/* CONTINUOUS AUTOMATIC DIAGONAL ROTATION CUBE BODY */}
      <div className="rubiks-cube-diagonal-body cube-massive">
        {/* FACE 1: FRONT */}
        <div className="cube-face face-front">
          {FAMOUS_GAME_TILES_FACE1.map((g, idx) => (
            <div key={idx} className="cube-tile-cell">
              <img src={g.img} alt={g.name} />
            </div>
          ))}
        </div>

        {/* FACE 2: BACK */}
        <div className="cube-face face-back">
          {FAMOUS_GAME_TILES_FACE2.map((g, idx) => (
            <div key={idx} className="cube-tile-cell">
              <img src={g.img} alt={g.name} />
            </div>
          ))}
        </div>

        {/* FACE 3: RIGHT */}
        <div className="cube-face face-right">
          {FAMOUS_GAME_TILES_FACE1.map((g, idx) => (
            <div key={idx} className="cube-tile-cell">
              <img src={g.img} alt={g.name} />
            </div>
          ))}
        </div>

        {/* FACE 4: LEFT */}
        <div className="cube-face face-left">
          {FAMOUS_GAME_TILES_FACE2.map((g, idx) => (
            <div key={idx} className="cube-tile-cell">
              <img src={g.img} alt={g.name} />
            </div>
          ))}
        </div>

        {/* FACE 5: TOP */}
        <div className="cube-face face-top">
          {FAMOUS_GAME_TILES_FACE1.map((g, idx) => (
            <div key={idx} className="cube-tile-cell">
              <img src={g.img} alt={g.name} />
            </div>
          ))}
        </div>

        {/* FACE 6: BOTTOM */}
        <div className="cube-face face-bottom">
          {FAMOUS_GAME_TILES_FACE2.map((g, idx) => (
            <div key={idx} className="cube-tile-cell">
              <img src={g.img} alt={g.name} />
            </div>
          ))}
        </div>
      </div>

      {/* FLOOR REFLECTION SHADOW */}
      <div className="cube-3d-floor-shadow shadow-massive" />
    </div>
  );
}

export default function LandingPage({ onStartWatchParty, onStartGames, onStartMergedCam, onOpenPricing }) {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState(localStorage.getItem('sp_username') || '');
  const [isMuted, setIsMuted] = useState(true);
  const [camBoxSize, setCamBoxSize] = useState('md');
  const [tutorialStep, setTutorialStep] = useState(1);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [heroScroll, setHeroScroll] = useState(0);
  const [coplayScrollProgress, setCoplayScrollProgress] = useState(0);

  const TUTORIAL_MESSAGES = [
    { sender: 'Alex', text: 'CoGether makes Co-Watch & Co-Play feel like real life! 🍿', color: '#a855f7' },
    { sender: 'Sam', text: 'Yooo! We are sitting in the same room! 🔥', color: '#3b82f6' },
    { sender: 'Alex', text: 'Let\'s start Co-Play Online Games next!', color: '#a855f7' }
  ];

  const [activeMsgIdx, setActiveMsgIdx] = useState(0);

  // ACCURATE SCROLL LISTENERS FOR HERO TAGLINE, STAGE SECTION & CO-PLAY SECTION
  useEffect(() => {
    let animId;
    let currStageVal = 0;
    let currHeroVal = 0;
    let currCoplayVal = 0;

    const loop = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;

      // 1. Direct Hero Scroll (0.0 -> 1.0 during initial 600px scroll)
      const targetHero = Math.min(scrollY / (vh * 0.65), 1);
      currHeroVal += (targetHero - currHeroVal) * 0.10;
      setHeroScroll(currHeroVal);

      // 2. Stage Section Scroll Tracking
      const stageWrapper = document.querySelector('.sticky-pinned-red-stage-wrapper');
      if (stageWrapper) {
        const rect = stageWrapper.getBoundingClientRect();
        const totalScroll = stageWrapper.clientHeight - vh;
        const targetStage = Math.min(Math.max(-rect.top / totalScroll, 0), 1);

        currStageVal += (targetStage - currStageVal) * 0.05;
        setScrollProgress(currStageVal);
      }

      // 3. CO-PLAY Section Scroll Tracking
      const coplayWrapper = document.querySelector('.sticky-pinned-coplay-stage-wrapper');
      if (coplayWrapper) {
        const rect = coplayWrapper.getBoundingClientRect();
        const totalScroll = coplayWrapper.clientHeight - vh;
        const targetCoplay = Math.min(Math.max(-rect.top / totalScroll, 0), 1);

        currCoplayVal += (targetCoplay - currCoplayVal) * 0.08;
        setCoplayScrollProgress(currCoplayVal);
      }

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

  // STEP 1: HERO TAGLINE STARBURST CROSS LASER FLARE (heroScroll 0.02 -> 0.70)
  const isBurstActive = heroScroll > 0.02 && heroScroll < 0.85;
  const burstOpacity = isBurstActive ? Math.sin(((heroScroll - 0.02) / 0.83) * Math.PI) : 0;
  const crossScale = Math.min((heroScroll - 0.02) * 3.5, 1);

  // STEP 2: FULL 360-DEGREE INWARD ZIGZAG DOOR SPIN (Red -> Yellow) (scrollProgress 0.10 -> 0.70)
  const spinProgress = Math.min(Math.max((scrollProgress - 0.10) * 1.67, 0), 1);
  let doorSpinAngle = spinProgress * 360;

  // ACCELERATE FINAL CLOSING ANGLE (spinProgress 0.90 -> 0.97):
  if (spinProgress > 0.90 && spinProgress <= 0.97) {
    const endRatio = (spinProgress - 0.90) / 0.07;
    doorSpinAngle = 324 + endRatio * 36;
  } else if (spinProgress > 0.97) {
    doorSpinAngle = 360;
  }

  const isSpinning = doorSpinAngle > 1 && doorSpinAngle < 359;
  const isYellowCanvas = spinProgress > 0.40;

  // STAGE BACKGROUND BECOMES SOLID YELLOW ONLY AT VERY END (spinProgress >= 0.96) WHEN DOORS ARE ALMOST CLOSED!
  const isYellowStage = spinProgress >= 0.96;

  // WHITE LIGHTNING ZIGZAG CRACK SEAM LINE:
  let whiteLineOpacity = 0;
  if (scrollProgress >= 0.005 && spinProgress < 0.005) {
    whiteLineOpacity = 1;
  } else if (spinProgress >= 0.94 && spinProgress < 0.97) {
    whiteLineOpacity = (spinProgress - 0.94) / 0.03;
  } else if (spinProgress >= 0.97 && spinProgress <= 0.99) {
    whiteLineOpacity = 1 - (spinProgress - 0.97) / 0.02;
  }

  // SOLID YELLOW LOCK: Triggers ONLY AFTER doors complete 360deg spin & white line vanishes in yellow (spinProgress >= 0.99)!
  const isFullyLockedYellow = spinProgress >= 0.99;

  // STEP 3: SLOW SYNCHRONIZED BULLET MOVEMENT + TORN PAPER UNROLLING (scrollProgress 0.75 -> 0.98)
  const bulletProgress = Math.min(Math.max((scrollProgress - 0.75) * 4.0, 0), 1);

  // STEP 4: CO-PLAY STICKY SCROLL ZOOM, GAMEBOY PAUSE & VERTICAL SPLIT REVEAL WITH 2-SECOND WHITE PAGE DWELL
  const coplayZoomProgress = Math.min(Math.max((coplayScrollProgress - 0.15) * 4.0, 0), 1);
  const coplayZoomScale = 1 + coplayZoomProgress * 14.0;

  // Text marquee opacity: Fades out completely as zoom enters black interior (REACHES EXACT 0 OPACITY BY 0.38!)
  const textZoomOpacity = coplayScrollProgress < 0.15 ? 1 : Math.max(1 - Math.max((coplayScrollProgress - 0.15) * 4.5, 0), 0);

  // GameBoy console opacity (Appears on PURE PITCH BLACK AFTER text has completely vanished!):
  const gameboyBlendOpacity = Math.min(Math.max((coplayScrollProgress - 0.38) * 5.0, 0), 1);

  // Vertical split door opening progress (0.65 -> 0.85):
  const coplaySplitProgress = Math.min(Math.max((coplayScrollProgress - 0.65) * 5.0, 0), 1);

  const COPLAY_TYPO_ITEMS = Array(12).fill('CO-PLAY');

  return (
    <div className="landing-page-official fade-in">
      {/* 1. TALL FULLSCREEN BLACK HERO SECTION */}
      <section className="fullscreen-pure-black-hero">
        <div className="hero-center-content-wrapper">
          <div className="genz-tagline-container">
            <p
              className="genz-tagline-text"
              style={{
                opacity: heroScroll < 0.80 ? 1 : 0,
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
        <div className={`sticky-pinned-red-stage-inner ${isFullyLockedYellow || isYellowStage ? 'bg-full-yellow' : ''}`}>
          {/* BACKGROUND VOID BOLD CONDENSED REVEAL TYPOGRAPHY (Z-INDEX 1 BEHIND DOORS - HIDDEN ONLY AT VERY END AT 0.95) */}
          <div
            className="center-void-condensed-typography"
            style={{
              display: spinProgress >= 0.95 ? 'none' : 'block'
            }}
          >
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
                    
                    {/* Bullet 1 (Top Row): Starts INSIDE Gun 1 barrel and travels in perfect sync with unrolling paper */}
                    <div
                      className="bullet-flying-wrapper bullet-row-1"
                      style={{
                        position: 'absolute',
                        left: `calc(190px + ${bulletProgress * 70}vw)`,
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

                    {/* Bullet 2 (Middle Row): Starts INSIDE Gun 2 barrel and travels in perfect sync with unrolling paper */}
                    <div
                      className="bullet-flying-wrapper bullet-row-2"
                      style={{
                        position: 'absolute',
                        right: `calc(190px + ${bulletProgress * 70}vw)`,
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

                    {/* Bullet 3 (Bottom Row): Starts INSIDE Gun 3 barrel and travels in perfect sync with unrolling paper */}
                    <div
                      className="bullet-flying-wrapper bullet-row-3"
                      style={{
                        position: 'absolute',
                        left: `calc(190px + ${bulletProgress * 70}vw)`,
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
                      <div className="banner-badge-tag anime-tag">git🎬 MOVIES & TV SHOWS</div>
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

          {/* CLEAN WHITE VERTICAL ZIGZAG SEAM LINE OVERLAY WITH DYNAMIC FADE-IN & FADE-AWAY */}
          <div
            className="vertical-zigzag-crack-container"
            style={{
              opacity: whiteLineOpacity,
              transition: 'opacity 0.15s ease',
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

      {/* 3. CO-PLAY: STICKY PINNED 3D ZOOM, GAMEBOY PAUSE & VERTICAL SPLIT DOOR SECTION */}
      <section className="sticky-pinned-coplay-stage-wrapper">
        <div className="sticky-pinned-coplay-stage-inner">
          
          {/* UNDERLYING PRISTINE WHITE PAGE REVEALED AS SPLIT DOORS OPEN (1.5fr / 1fr ULTRA-MASSIVE SPLIT) */}
          <div className="underlying-white-page-reveal">
            <div className="white-page-grid-split">
              
              {/* LEFT HALF (1.5fr): ULTRA-MASSIVE 3D PC MONITOR WITH PERFECT PERMANENT 3D TILTED DISPLAY SCREEN */}
              <div className="left-hero-media-wrapper">
                <div className="user-3d-pc-monitor-wrapper">
                  {/* USER'S 3D PC MONITOR ARTWORK IMAGE */}
                  <img src="/pc_monitor_artwork.png" alt="3D PC Monitor" className="user-pc-monitor-art" />

                  {/* 100% PERFECTLY LOCKED FITTED SCREEN VIDEO DISPLAY */}
                  <div className="pc-monitor-screen-video-overlay">
                    <video autoPlay loop muted playsInline className="placeholder-demo-video">
                      <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
                      <source src="https://media.w3.org/2010/05/sintel/trailer.mp4" type="video/mp4" />
                    </video>
                  </div>
                </div>
              </div>

              {/* RIGHT HALF (1fr): 1000+ CENTERED BEHIND 3D ROTATING RUBIK'S CUBE */}
              <div className="right-games-rubiks-hub">
                <div className="vertical-filled-typography-column text-center-all">
                  
                  {/* TOP WORD: P L A Y (CENTERED) */}
                  <h3 className="hero-word-top text-center">P L A Y</h3>
                  
                  {/* GIANT OVERLAPPING CENTER LAYER: 1,000+ BEHIND THE 3D ROTATING CUBE */}
                  <div className="giant-1000-cube-overlay-stack">
                    {/* GIANT RED 1,000+ TEXT BEHIND (Z-INDEX 1) */}
                    <h2 className="hero-word-giant-1000-behind">1,000+</h2>

                    {/* 3D ROTATING RUBIK'S CUBE FLOATING IN FRONT (Z-INDEX 5) */}
                    <div className="embedded-diagonal-cube-box center-front-cube">
                      <AutomaticDiagonal3DRubiksCube />
                    </div>
                  </div>

                  {/* BELOW WORD: MULTIPLAYER & ONLINE GAMES (CENTERED) */}
                  <h4 className="hero-word-multiplayer text-center">MULTIPLAYER & ONLINE GAMES</h4>

                  {/* BOTTOM WORD: LIVE WITH FRIENDS (CENTERED) */}
                  <h4 className="hero-word-friends text-center">LIVE WITH FRIENDS</h4>

                </div>
              </div>

            </div>
          </div>

          {/* TOP VERTICAL SPLIT DOOR PANEL (MOVES VERTICALLY UP: translateY(-100%)) */}
          <div
            className="coplay-split-door-top"
            style={{
              transform: `translateY(-${coplaySplitProgress * 100}%)`,
              zIndex: 20
            }}
          >
            <div className="coplay-door-canvas-content">
              
              {/* ZOOMABLE MARQUEE & CO-PLAY TYPOGRAPHY CONTAINER (ZOOMS & FADES OUT COMPLETELY BEFORE GAMEBOY APPEARS) */}
              {textZoomOpacity > 0.01 && (
                <div
                  className="coplay-zoomable-content-wrapper"
                  style={{
                    transform: `scale(${coplayZoomScale})`,
                    transformOrigin: 'center center',
                    opacity: textZoomOpacity
                  }}
                >
                  {/* 3 STACKED MARQUEE ROWS SLIDING HORIZONTALLY */}
                  <div className="coplay-pure-typo-container">
                    {/* ROW 1: SLIDING LEFT TO RIGHT */}
                    <div className="coplay-typo-row">
                      <div className="coplay-typo-track scroll-left">
                        {COPLAY_TYPO_ITEMS.map((item, idx) => (
                          <span key={idx} className="coplay-typo-text text-small-white">{item} <span className="typo-dot">•</span></span>
                        ))}
                      </div>
                    </div>

                    {/* ROW 2 (CENTER): MAIN BOLD WHITE CO-PLAY MARQUEE ROW THAT ZOOM TARGETS */}
                    <div className="coplay-typo-row row-center-zoom-target">
                      <div className="coplay-typo-track scroll-right">
                        {COPLAY_TYPO_ITEMS.map((item, idx) => (
                          <span key={idx} className="coplay-typo-text text-main-white">{item} <span className="typo-dot">•</span></span>
                        ))}
                      </div>
                    </div>

                    {/* ROW 3: SLIDING LEFT TO RIGHT */}
                    <div className="coplay-typo-row">
                      <div className="coplay-typo-track scroll-left">
                        {COPLAY_TYPO_ITEMS.map((item, idx) => (
                          <span key={idx} className="coplay-typo-text text-stroke">{item} <span className="typo-dot">•</span></span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GAMEBOY PIXEL ART IMAGE (PURE PITCH BLACK, ZERO GLOW, ZERO SHADOW, PERFECT UN-ZOOMED FIT) */}
              <div
                className="gameboy-perfect-fit-overlay gameboy-top-half"
                style={{
                  opacity: gameboyBlendOpacity
                }}
              >
                <img src="/gameboy_pixel_art.png" alt="GameBoy Pixel Art" className="gameboy-fitted-img" />
              </div>

            </div>
          </div>

          {/* BOTTOM VERTICAL SPLIT DOOR PANEL (MOVES VERTICALLY DOWN: translateY(100%)) */}
          <div
            className="coplay-split-door-bottom"
            style={{
              transform: `translateY(${coplaySplitProgress * 100}%)`,
              zIndex: 20
            }}
          >
            <div className="coplay-door-canvas-content">
              
              {/* ZOOMABLE MARQUEE & CO-PLAY TYPOGRAPHY CONTAINER (ZOOMS & FADES OUT COMPLETELY BEFORE GAMEBOY APPEARS) */}
              {textZoomOpacity > 0.01 && (
                <div
                  className="coplay-zoomable-content-wrapper"
                  style={{
                    transform: `scale(${coplayZoomScale})`,
                    transformOrigin: 'center center',
                    opacity: textZoomOpacity
                  }}
                >
                  {/* 3 STACKED MARQUEE ROWS SLIDING HORIZONTALLY */}
                  <div className="coplay-pure-typo-container">
                    {/* ROW 1: SLIDING LEFT TO RIGHT */}
                    <div className="coplay-typo-row">
                      <div className="coplay-typo-track scroll-left">
                        {COPLAY_TYPO_ITEMS.map((item, idx) => (
                          <span key={idx} className="coplay-typo-text text-small-white">{item} <span className="typo-dot">•</span></span>
                        ))}
                      </div>
                    </div>

                    {/* ROW 2 (CENTER): MAIN BOLD WHITE CO-PLAY MARQUEE ROW THAT ZOOM TARGETS */}
                    <div className="coplay-typo-row row-center-zoom-target">
                      <div className="coplay-typo-track scroll-right">
                        {COPLAY_TYPO_ITEMS.map((item, idx) => (
                          <span key={idx} className="coplay-typo-text text-main-white">{item} <span className="typo-dot">•</span></span>
                        ))}
                      </div>
                    </div>

                    {/* ROW 3: SLIDING LEFT TO RIGHT */}
                    <div className="coplay-typo-row">
                      <div className="coplay-typo-track scroll-left">
                        {COPLAY_TYPO_ITEMS.map((item, idx) => (
                          <span key={idx} className="coplay-typo-text text-stroke">{item} <span className="typo-dot">•</span></span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GAMEBOY PIXEL ART IMAGE (PURE PITCH BLACK, ZERO GLOW, ZERO SHADOW, PERFECT UN-ZOOMED FIT) */}
              <div
                className="gameboy-perfect-fit-overlay gameboy-bottom-half"
                style={{
                  opacity: gameboyBlendOpacity
                }}
              >
                <img src="/gameboy_pixel_art.png" alt="GameBoy Pixel Art" className="gameboy-fitted-img" />
              </div>

            </div>
          </div>

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
