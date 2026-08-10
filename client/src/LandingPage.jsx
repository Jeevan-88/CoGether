import React, { useState, useEffect, useRef } from 'react';
import { POKI_TOP_TRENDING, POKI_WEB_EXCLUSIVES, POKI_CATEGORY_HUBS } from './pokiCatalog.js';
import { Tv, Gamepad2, Sparkles, Play, Lock, CheckCircle2, ArrowRight, Video, ShoppingBag, BookOpen, Star, Flame, Eye, RefreshCw, Volume2, VolumeX, MessageSquare, Mic, Camera, Layers, Users, Maximize2, Move, Box, ShoppingCart } from 'lucide-react';
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
  const [coshopScrollProgress, setCoshopScrollProgress] = useState(0);

  // FINAL PERFECT USER LOCKED CO-SHOP STAGE COORDINATES
  const [tunerTab, setTunerTab] = useState('letters');
  const [shelfY, setShelfY] = useState(217);
  const [shelfScale, setShelfScale] = useState(102);
  
  // 1. PERFECT WOODEN LETTERS (LOCKED: X=33, Y=-461, Size=140)
  const [lettersX, setLettersX] = useState(33);
  const [lettersY, setLettersY] = useState(-461);
  const [letterHeight, setLetterHeight] = useState(140);
  
  // 2. PERFECT LEFT JADE PLANT (LOCKED: X=50, Y=-202, Size=240)
  const [leftPlantX, setLeftPlantX] = useState(50);
  const [leftPlantY, setLeftPlantY] = useState(-202);
  const [leftPlantSize, setLeftPlantSize] = useState(240);

  // 3. PERFECT RIGHT JADE PLANT (LOCKED: X=-18, Y=-208, Size=240)
  const [rightPlantX, setRightPlantX] = useState(-18);
  const [rightPlantY, setRightPlantY] = useState(-208);
  const [rightPlantSize, setRightPlantSize] = useState(240);

  // 4. PERFECT CANVAS TOTE BAG (LOCKED: HookY=45, Height=213)
  const [toteTop, setToteTop] = useState(45);
  const [toteHeight, setToteHeight] = useState(213);
  const [showTuner, setShowTuner] = useState(false);

  const TUTORIAL_MESSAGES = [
    { sender: 'Alex', text: 'CoGether makes Co-Watch & Co-Play feel like real life! 🍿', color: '#a855f7' },
    { sender: 'Sam', text: 'Yooo! We are sitting in the same room! 🔥', color: '#3b82f6' },
    { sender: 'Alex', text: 'Let\'s start Co-Play Online Games next!', color: '#a855f7' }
  ];

  const [activeMsgIdx, setActiveMsgIdx] = useState(0);

  // ACCURATE SCROLL LISTENERS FOR HERO TAGLINE, STAGE SECTION, CO-PLAY SECTION & CO-SHOP SECTION
  useEffect(() => {
    let animId;
    let currStageVal = 0;
    let currHeroVal = 0;
    let currCoplayVal = 0;
    let currCoshopVal = 0;

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

        // 4. CO-SHOP Section Scroll & Room Illumination Tracking (Pinned 3-Sec Scroll Sequence)
        const coshopWrapper = document.querySelector('.sticky-pinned-coshop-stage-wrapper');
        if (coshopWrapper) {
          const rect = coshopWrapper.getBoundingClientRect();
          const totalScroll = coshopWrapper.clientHeight - vh;
          const targetCoshop = Math.min(Math.max(-rect.top / totalScroll, 0), 1);

          currCoshopVal += (targetCoshop - currCoshopVal) * 0.18; // Instant responsive scroll tracking!
          setCoshopScrollProgress(currCoshopVal);
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

  // STEP 1: HERO TAGLINE STARBURST CROSS LASER FLARE (heroScroll 0.02 -> 0.70)
  const isBurstActive = heroScroll > 0.02 && heroScroll < 0.85;
  const burstOpacity = isBurstActive ? Math.sin(((heroScroll - 0.02) / 0.83) * Math.PI) : 0;
  const crossScale = Math.min((heroScroll - 0.02) * 3.5, 1);

  // STEP 2: FULL 360-DEGREE INWARD ZIGZAG DOOR SPIN (Red -> Yellow) (scrollProgress 0.10 -> 0.70)
  const spinProgress = Math.min(Math.max((scrollProgress - 0.10) * 1.67, 0), 1);
  let doorSpinAngle = spinProgress * 360;

  if (spinProgress > 0.90 && spinProgress <= 0.97) {
    const endRatio = (spinProgress - 0.90) / 0.07;
    doorSpinAngle = 324 + endRatio * 36;
  } else if (spinProgress > 0.97) {
    doorSpinAngle = 360;
  }

  const isSpinning = doorSpinAngle > 1 && doorSpinAngle < 359;
  const isYellowCanvas = spinProgress > 0.40;
  const isYellowStage = spinProgress >= 0.96;

  let whiteLineOpacity = 0;
  if (scrollProgress >= 0.005 && spinProgress < 0.005) {
    whiteLineOpacity = 1;
  } else if (spinProgress >= 0.94 && spinProgress < 0.97) {
    whiteLineOpacity = (spinProgress - 0.94) / 0.03;
  } else if (spinProgress >= 0.97 && spinProgress <= 0.99) {
    whiteLineOpacity = 1 - (spinProgress - 0.97) / 0.02;
  }

  const isFullyLockedYellow = spinProgress >= 0.99;
  const bulletProgress = Math.min(Math.max((scrollProgress - 0.75) * 4.0, 0), 1);

  // STEP 4: CO-PLAY STICKY SCROLL ZOOM
  const coplayZoomProgress = Math.min(Math.max((coplayScrollProgress - 0.15) * 4.0, 0), 1);
  const coplayZoomScale = 1 + coplayZoomProgress * 14.0;
  const textZoomOpacity = coplayScrollProgress < 0.15 ? 1 : Math.max(1 - Math.max((coplayScrollProgress - 0.15) * 4.5, 0), 0);
  const gameboyBlendOpacity = Math.min(Math.max((coplayScrollProgress - 0.38) * 5.0, 0), 1);
  const coplaySplitProgress = Math.min(Math.max((coplayScrollProgress - 0.65) * 5.0, 0), 1);

  const COPLAY_TYPO_ITEMS = Array(12).fill('CO-PLAY');

  // STEP 5: CO-SHOP INTERACTIVE SCROLL ANIMATION CALCULATIONS
  // Phase 1 (0.20 -> 0.60): Log slants, letters slide down one-by-one into cart, log falls behind!
  const slantProgress = Math.min(Math.max((coshopScrollProgress - 0.20) * 2.5, 0), 1);
  const logTiltAngle = slantProgress * 32; // rotates up to 32deg

  const COSHOP_LETTERS_ARRAY = ['C', 'O', '-', 'S', 'H', 'O', 'P'];

  // Log falls behind outside page after letters slide out (slantProgress > 0.85)
  const logFallOpacity = slantProgress > 0.85 ? Math.max(1 - (slantProgress - 0.85) * 6.6, 0) : 1;
  const logFallY = slantProgress > 0.85 ? (slantProgress - 0.85) * 300 : 0;

  // Phase 2 (0.60 -> 0.85): Cart rolls to left carrying letters
  const cartRollProgress = Math.min(Math.max((coshopScrollProgress - 0.60) * 4.0, 0), 1);
  const cartTranslateX = -cartRollProgress * 110; // moves left up to -110vw

  // Phase 3 (0.75 -> 1.00): Dark Leaf Green Canvas slides in from right to left (100% -> 0%)
  const greenCanvasSlideProgress = Math.min(Math.max((coshopScrollProgress - 0.72) * 3.5, 0), 1);
  const greenCanvasTranslateX = 100 - greenCanvasSlideProgress * 100; // 100% -> 0%

  const REAL_WOODEN_LETTERS = [
    { id: 'c1', char: 'C', img: '/letters/wood_letter_C.png' },
    { id: 'o1', char: 'O', img: '/letters/wood_letter_O.png' },
    { id: 'h1', isBulbHyphen: true, img: '/wood_hyphen_bulb.png' },
    { id: 's1', char: 'S', img: '/letters/wood_letter_S.png' },
    { id: 'h2', char: 'H', img: '/letters/wood_letter_H.png' },
    { id: 'o2', char: 'O', img: '/letters/wood_letter_O.png', isHangingTote: true },
    { id: 'p1', char: 'P', img: '/letters/wood_letter_P.png' }
  ];

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
          {/* BACKGROUND VOID BOLD CONDENSED REVEAL TYPOGRAPHY */}
          <div
            className="center-void-condensed-typography"
            style={{
              display: spinProgress >= 0.95 ? 'none' : 'block'
            }}
          >
            <h1 className="katapult-condensed-headline">CO-WATCH</h1>
          </div>

          {/* LEFT DOOR PANEL */}
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

          {/* RIGHT DOOR PANEL */}
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

          {/* YELLOW STAGE WITH 3 CLEAN PISTOLS & 3 BULLETS */}
          {isFullyLockedYellow && (
            <div className="pistol-bullet-torn-paper-stage fade-in">
              <div className="ink-stage-header">
                <span className="ink-eyebrow-stamp">墨絵 • STREAMING HUBS</span>
                <h2 className="ink-title-kanji">SELECT STREAMING DESTINATION</h2>
              </div>

              <div className="torn-banners-container-3">
                {/* ROW 1 */}
                <div className="pistol-banner-row row-left">
                  <div className="pistol-static-wrapper pistol-left" style={{ position: 'relative' }}>
                    <img src="/pistol_artwork.png" alt="Pistol 1" className="pistol-ink-img facing-right" />
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

                {/* ROW 2 */}
                <div className="pistol-banner-row row-right">
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

                {/* ROW 3 */}
                <div className="pistol-banner-row row-left">
                  <div className="pistol-static-wrapper pistol-left" style={{ position: 'relative' }}>
                    <img src="/pistol_artwork.png" alt="Pistol 3" className="pistol-ink-img facing-right" />
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

                  <div
                    className="torn-paper-white-banner"
                    style={{
                      clipPath: `polygon(0 0, ${bulletProgress * 100}% 0, ${bulletProgress * 100}% 100%, 0 100%)`
                    }}
                    onClick={() => handleLaunch('watch')}
                  >
                    <div className="banner-content-inner">
                      <div className="banner-badge-tag anime-tag">🎬 MOVIES & TV SHOWS</div>
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

          {/* CLEAN WHITE VERTICAL ZIGZAG SEAM LINE */}
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

      {/* 3. CO-PLAY: STICKY PINNED 3D ZOOM & VERTICAL SPLIT DOOR SECTION */}
      <section className="sticky-pinned-coplay-stage-wrapper">
        <div className="sticky-pinned-coplay-stage-inner">
          <div className="underlying-white-page-reveal">
            <div className="white-page-grid-split">
              
              {/* LEFT HALF: 3D PC MONITOR */}
              <div className="left-hero-media-wrapper">
                <div className="user-3d-pc-monitor-wrapper">
                  <img src="/pc_monitor_artwork.png" alt="3D PC Monitor" className="user-pc-monitor-art" />
                  <div className="pc-monitor-screen-video-overlay">
                    <video autoPlay loop muted playsInline className="placeholder-demo-video">
                      <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
                      <source src="https://media.w3.org/2010/05/sintel/trailer.mp4" type="video/mp4" />
                    </video>
                  </div>
                </div>
              </div>

              {/* RIGHT HALF: 1000+ RUBIK'S CUBE */}
              <div className="right-games-rubiks-hub">
                <div className="vertical-filled-typography-column text-center-all">
                  <h3 className="hero-word-top text-center">P L A Y</h3>
                  <div className="giant-1000-cube-overlay-stack">
                    <h2 className="hero-word-giant-1000-behind">1,000+</h2>
                    <div className="embedded-diagonal-cube-box center-front-cube">
                      <AutomaticDiagonal3DRubiksCube />
                    </div>
                  </div>
                  <h4 className="hero-word-multiplayer text-center">MULTIPLAYER & ONLINE GAMES</h4>
                  <h4 className="hero-word-friends text-center">LIVE WITH FRIENDS</h4>
                </div>
              </div>

            </div>
          </div>

          {/* TOP DOOR */}
          <div
            className="coplay-split-door-top"
            style={{
              transform: `translateY(-${coplaySplitProgress * 100}%)`,
              zIndex: 20
            }}
          >
            <div className="coplay-door-canvas-content">
              {textZoomOpacity > 0.01 && (
                <div
                  className="coplay-zoomable-content-wrapper"
                  style={{
                    transform: `scale(${coplayZoomScale})`,
                    transformOrigin: 'center center',
                    opacity: textZoomOpacity
                  }}
                >
                  <div className="coplay-pure-typo-container">
                    <div className="coplay-typo-row">
                      <div className="coplay-typo-track scroll-left">
                        {COPLAY_TYPO_ITEMS.map((item, idx) => (
                          <span key={idx} className="coplay-typo-text text-small-white">{item} <span className="typo-dot">•</span></span>
                        ))}
                      </div>
                    </div>
                    <div className="coplay-typo-row row-center-zoom-target">
                      <div className="coplay-typo-track scroll-right">
                        {COPLAY_TYPO_ITEMS.map((item, idx) => (
                          <span key={idx} className="coplay-typo-text text-main-white">{item} <span className="typo-dot">•</span></span>
                        ))}
                      </div>
                    </div>
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
              <div className="gameboy-perfect-fit-overlay gameboy-top-half" style={{ opacity: gameboyBlendOpacity }}>
                <img src="/gameboy_pixel_art.png" alt="GameBoy Pixel Art" className="gameboy-fitted-img" />
              </div>
            </div>
          </div>

          {/* BOTTOM DOOR */}
          <div
            className="coplay-split-door-bottom"
            style={{
              transform: `translateY(${coplaySplitProgress * 100}%)`,
              zIndex: 20
            }}
          >
            <div className="coplay-door-canvas-content">
              {textZoomOpacity > 0.01 && (
                <div
                  className="coplay-zoomable-content-wrapper"
                  style={{
                    transform: `scale(${coplayZoomScale})`,
                    transformOrigin: 'center center',
                    opacity: textZoomOpacity
                  }}
                >
                  <div className="coplay-pure-typo-container">
                    <div className="coplay-typo-row">
                      <div className="coplay-typo-track scroll-left">
                        {COPLAY_TYPO_ITEMS.map((item, idx) => (
                          <span key={idx} className="coplay-typo-text text-small-white">{item} <span className="typo-dot">•</span></span>
                        ))}
                      </div>
                    </div>
                    <div className="coplay-typo-row row-center-zoom-target">
                      <div className="coplay-typo-track scroll-right">
                        {COPLAY_TYPO_ITEMS.map((item, idx) => (
                          <span key={idx} className="coplay-typo-text text-main-white">{item} <span className="typo-dot">•</span></span>
                        ))}
                      </div>
                    </div>
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
              <div className="gameboy-perfect-fit-overlay gameboy-bottom-half" style={{ opacity: gameboyBlendOpacity }}>
                <img src="/gameboy_pixel_art.png" alt="GameBoy Pixel Art" className="gameboy-fitted-img" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. PINNED CO-SHOP HUB SECTION (400VH STAGE: 3-SEC PAUSE -> PAC-MAN SWEEP -> SPLIT SCREEN HUB) */}
      <div className="sticky-pinned-coshop-stage-wrapper" style={{ height: '400vh', position: 'relative' }}>
        <section
          className="static-coshop-canvas-section"
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            width: '100%',
            backgroundColor: coshopScrollProgress > 0.15 ? '#c4cbd2' : '#11151c',
            backgroundImage: `radial-gradient(ellipse 120% 90% at 50% 35%, rgba(255, 255, 255, ${0.98 * Math.min(coshopScrollProgress * 2, 1)}) 0%, rgba(241, 245, 249, ${0.85 * Math.min(coshopScrollProgress * 2, 1)}) 35%, rgba(200, 208, 216, ${Math.min(coshopScrollProgress * 2, 1)}) 70%, #11151c 100%)`
          }}
        >
          {/* CALCULATED PAC-MAN FRONT MOUTH POSITION FOR PINPOINT ACCURACY */}
          {(() => {
            // Stage B: Pac-Man sweeps cleanly from coshopScrollProgress 0.35 to 0.80
            const inPacmanSweepWindow = coshopScrollProgress >= 0.35;
            // Linear progress 0.0 -> 1.0 during sweep window
            const pacProgress = Math.max(0, Math.min(1, (coshopScrollProgress - 0.35) / 0.45));
            // Pac-Man wrapper center left position in VW (-50vw offscreen left to +150vw offscreen right)
            const pacmanLeftVw = -50 + pacProgress * 200;
            // Pac-Man front mouth tip position in VW (wrapper left + 45vw front tip radius)
            const pacmanFrontTipVw = pacmanLeftVw + 45;

            // Pinpoint item devour thresholds in screen VW:
            // Left Plant: centered around 25vw
            const leftPlantEaten = pacmanFrontTipVw >= 25;
            // Wooden Log Shelf Base: spans 20vw to 80vw - vanishes ONLY after Pac-Man reaches the right end (85vw)!
            const shelfEaten = pacmanFrontTipVw >= 85;
            // Right Plant: centered around 75vw
            const rightPlantEaten = pacmanFrontTipVw >= 75;

            // Individual wooden letter thresholds across screen VW (C, O, -, S, H, O, P)
            const letterFrontThresholds = [35, 40, 47, 53, 58, 64, 70];

            return (
              <>
                {/* FOREGROUND STAGE CONTAINER (100% CRYSTAL CLEAR NATIVE 4K SHARPNESS) */}
                {coshopScrollProgress < 0.80 && (
                  <div className="coshop-static-center-container" style={{ position: 'relative', zIndex: 10 }}>
                    
                    {/* UNIFIED WOODEN LOG SHELF DISPLAY STAGE */}
                    <div
                      className="static-wooden-log-shelf-wrapper"
                      style={{
                        transform: `translateY(${shelfY}px) scale(${shelfScale / 100})`,
                        opacity: shelfEaten ? 0 : (0.35 + 0.65 * Math.min(coshopScrollProgress * 2, 1))
                      }}
                    >
                      
                      {/* WOODEN LOG SHELF ARTWORK BASE */}
                      <img
                        src="/wooden_shelf_artwork.png"
                        alt="Wooden Log Shelf"
                        className="static-wooden-log-shelf-img"
                        style={{
                          position: 'relative',
                          zIndex: 5,
                          filter: `drop-shadow(0 16px 24px rgba(0, 0, 0, ${0.65 - 0.25 * Math.min(coshopScrollProgress * 2, 1)}))`
                        }}
                      />

                      {/* SEPARATE: LEFT POTTED JADE PLANT */}
                      <img
                        src="/jade_plant_pot.png"
                        alt="Potted Jade Plant Left"
                        className="shelf-jade-plant plant-left"
                        style={{
                          height: `${leftPlantSize}px`,
                          position: 'absolute',
                          left: '20px',
                          bottom: '30px',
                          transform: `translate(${leftPlantX}px, ${leftPlantY}px)`,
                          zIndex: 40,
                          filter: `drop-shadow(0 16px 22px rgba(0, 0, 0, 0.65))`,
                          opacity: leftPlantEaten ? 0 : 1
                        }}
                      />

                      {/* SEPARATE: RIGHT POTTED JADE PLANT */}
                      <img
                        src="/jade_plant_pot.png"
                        alt="Potted Jade Plant Right"
                        className="shelf-jade-plant plant-right"
                        style={{
                          height: `${rightPlantSize}px`,
                          position: 'absolute',
                          right: '20px',
                          bottom: '30px',
                          transform: `translate(${rightPlantX}px, ${rightPlantY}px)`,
                          zIndex: 40,
                          filter: `drop-shadow(0 16px 22px rgba(0, 0, 0, 0.65))`,
                          opacity: rightPlantEaten ? 0 : 1
                        }}
                      />

                      {/* SEPARATE: 3D CARVED WOODEN "CO-SHOP" LETTERS TRACK */}
                      <div
                        className="static-letters-sitting-track"
                        style={{
                          position: 'absolute',
                          bottom: '30px',
                          left: '50%',
                          transform: `translateX(calc(-50% + ${lettersX}px)) translateY(${lettersY}px)`,
                          zIndex: 20
                        }}
                      >
                        {REAL_WOODEN_LETTERS.map((item, idx) => {
                          const itemThreshold = letterFrontThresholds[idx] || 50;
                          const isEaten = pacmanFrontTipVw >= itemThreshold;

                          return (
                            <div
                              key={item.id}
                              className="static-wood-letter-wrapper"
                              style={{
                                opacity: isEaten ? 0 : 1
                              }}
                            >
                              {item.isBulbHyphen ? (
                                <img
                                  src={item.img}
                                  alt="Wood Bulb Separator"
                                  className="static-wood-hyphen-bulb-img"
                                  style={{
                                    height: `${Math.round(letterHeight * 0.8)}px`,
                                    filter: `drop-shadow(0 0 ${16 * Math.min(coshopScrollProgress * 2, 1)}px rgba(251, 191, 36, ${0.85 * Math.min(coshopScrollProgress * 2, 1)})) drop-shadow(0 0 ${35 * Math.min(coshopScrollProgress * 2, 1)}px rgba(245, 158, 11, ${0.55 * Math.min(coshopScrollProgress * 2, 1)}))`
                                  }}
                                />
                              ) : (
                                <>
                                  <img
                                    src={item.img}
                                    alt={item.char}
                                    className="static-wood-letter-img"
                                    style={{
                                      height: `${letterHeight}px`,
                                      filter: `drop-shadow(0 16px 24px rgba(0, 0, 0, ${0.75 - 0.2 * Math.min(coshopScrollProgress * 2, 1)}))`
                                    }}
                                  />
                                  {item.isHangingTote && (
                                    <img
                                      src="/tote_bag.png"
                                      alt="Hanging Canvas Tote Bag"
                                      className="hanging-tote-bag-on-letter"
                                      style={{
                                        top: `${toteTop}px`,
                                        height: `${toteHeight}px`,
                                        zIndex: 15,
                                        filter: `drop-shadow(0 16px 22px rgba(0, 0, 0, 0.65))`,
                                        opacity: pacmanFrontTipVw >= 64 ? 0 : 1
                                      }}
                                    />
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>

                  </div>
                )}

                {/* STAGE B: SEAMLESS CLASSIC SVG PAC-MAN SWEEP (ONLY ACTIVE DURING SWEEP WINDOW UNTIL OFFSCREEN RIGHT) */}
                {inPacmanSweepWindow && coshopScrollProgress < 0.80 && (
                  <div
                    className="classic-svg-pacman-wrapper"
                    style={{
                      left: `${pacmanLeftVw}vw`
                    }}
                  >
                    <svg viewBox="0 0 100 100" className="pacman-seamless-svg">
                      <path
                        fill="#ffcc00"
                        d="M 50 50 L 98 22 A 48 48 0 1 0 98 78 Z"
                        className="pacman-animated-mouth-path"
                      />
                      <circle cx="48" cy="22" r="5.5" fill="#000000" />
                    </svg>
                  </div>
                )}

                {/* STAGE C: INTERACTIVE CO-SHOP SPLIT SCREEN HUB (ONLY LOADS AFTER PAC-MAN COMPLETELY EXITS OFFSCREEN RIGHT!) */}
                {coshopScrollProgress >= 0.80 && (
                  <div
                    className="coshop-split-screen-experience-wrapper"
                    style={{
                      opacity: Math.min(1, (coshopScrollProgress - 0.80) * 5),
                      transform: `translateY(${(1 - Math.min(1, (coshopScrollProgress - 0.80) * 5)) * 25}px)`
                    }}
                  >
                    {/* LEFT SIDE: TILTED BROWSER VIDEO SHARE FRAME (STYLE MATCHING REFERENCE PHOTO FRAME) */}
                    <div className="coshop-left-browser-frame-tilted">
                      <div className="browser-header-bar">
                        <div className="browser-dots">
                          <span className="dot red" />
                          <span className="dot yellow" />
                          <span className="dot green" />
                        </div>
                        <div className="browser-url-bar">
                          <Lock size={12} color="#10b981" />
                          <span>https://www.amazon.in/dp/co-shop-shared-session</span>
                        </div>
                      </div>

                      <div className="browser-content-mock">
                        <div className="shared-product-card-preview">
                          <div className="product-tag-sale">CO-SHOPPING LIVE</div>
                          <img src="/jade_plant_pot.png" alt="Featured Product" className="shared-prod-img" />
                          <div className="shared-prod-details">
                            <h4>Premium Brass Jade Plant Pot</h4>
                            <div className="prod-price-row">
                              <span className="price">₹1,299</span>
                              <span className="rating">★ 4.9 (2,450)</span>
                            </div>
                            <button className="btn-add-shared-cart">🛒 Add to Shared Cart</button>
                          </div>
                        </div>

                        {/* OVERLAY FRIENDS VIDEO CALL PIP */}
                        <div className="friends-video-pip-overlay">
                          <div className="pip-friend friend-alex">
                            <div className="pip-avatar">A</div>
                            <span>You</span>
                            <span className="live-dot" />
                          </div>
                          <div className="pip-friend friend-maya">
                            <div className="pip-avatar avatar-maya">M</div>
                            <span>Maya</span>
                            <span className="live-dot" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT SIDE: BOLD EDITORIAL INFO SECTION & REAL E-COMMERCE BRAND CAROUSEL */}
                    <div className="coshop-right-editorial-info">
                      <span className="gold-pill-tag">🛍️ LIVE CO-SHOPPING</span>
                      <h2 className="editorial-main-title">SHOP TOGETHER IN REAL-TIME</h2>
                      <p className="editorial-desc">
                        Screen share any website on live video calls with friends. Compare items, get instant opinions, build shared carts, and checkout together seamlessly.
                      </p>

                      {/* CONTINUOUS E-COMMERCE BRAND CAROUSEL / MARQUEE */}
                      <div className="ecommerce-brand-carousel-wrapper">
                        <span className="carousel-title-label">SUPPORTED SHOPPING WEBSITES:</span>
                        <div className="marquee-carousel-container">
                          <div className="marquee-carousel-track">
                            <div className="brand-logo-card brand-amazon"><span>Amazon.in</span></div>
                            <div className="brand-logo-card brand-flipkart"><span>Flipkart</span></div>
                            <div className="brand-logo-card brand-myntra"><span>Myntra</span></div>
                            <div className="brand-logo-card brand-meesho"><span>Meesho</span></div>
                            <div className="brand-logo-card brand-ajio"><span>Ajio</span></div>
                            <div className="brand-logo-card brand-nykaa"><span>Nykaa</span></div>
                            {/* Duplicate for seamless infinite loop */}
                            <div className="brand-logo-card brand-amazon"><span>Amazon.in</span></div>
                            <div className="brand-logo-card brand-flipkart"><span>Flipkart</span></div>
                            <div className="brand-logo-card brand-myntra"><span>Myntra</span></div>
                            <div className="brand-logo-card brand-meesho"><span>Meesho</span></div>
                            <div className="brand-logo-card brand-ajio"><span>Ajio</span></div>
                            <div className="brand-logo-card brand-nykaa"><span>Nykaa</span></div>
                          </div>
                        </div>
                      </div>

                      <button className="btn-launch-coshop-hub" onClick={() => handleLaunch('watch')}>
                        Launch Co-Shop Room <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </section>
      </div>

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
