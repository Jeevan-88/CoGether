import React, { useState, useEffect, useRef } from 'react';
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

export default function LandingPage({ onStartWatchParty, onStartGames, onStartMergedCam, onOpenPricing, onOpenGamesHub, onOpenCinemaHub }) {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState(localStorage.getItem('sp_username') || '');
  const [isMuted, setIsMuted] = useState(true);
  const [camBoxSize, setCamBoxSize] = useState('md');
  const [tutorialStep, setTutorialStep] = useState(1);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [heroScroll, setHeroScroll] = useState(0);
  const [coplayScrollProgress, setCoplayScrollProgress] = useState(0);
  const [coshopScrollProgress, setCoshopScrollProgress] = useState(0);
  const [costudyScrollProgress, setCostudyScrollProgress] = useState(0);

  // PERFECT CIRCULAR 'O', WHITE DOTS & PINPOINT ZOOM CALIBRATOR CONFIG
  const [oTuner, setOTuner] = useState({
    dotsRadius: 43.5,
    dotSize: 3.0,
    holeSize: 46,
    oScale: 1.00,
    oOffsetY: 0,
    zoomTargetX: 30.5,
    zoomTargetY: 50.0,
    panX: 30.5,
    maxZoom: 65,
    showReticle: false,
    showTuner: false,
    overrideScroll: null
  });

  // NODECK.ONLINE INTERACTIVE DECK SLIDE STATE
  const [activeNodeckSlide, setActiveNodeckSlide] = useState(1);

  // FINAL LOCKED TABLET DISPLAY OVERLAY CONFIG
  const [tabletConfig] = useState({
    top: 63.5,
    left: 48.9,
    width: 305,
    height: 161,
    borderRadius: 6,
    rotateX: 1.5,
    rotateY: 1.0,
    rotateZ: 0.0,
    skewX: -0.5,
    skewY: 0.5,
    perspective: 800
  });
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

  // ─────────────────────────────────────────────────────────────────────────────
  // MASTER SCROLL RATE LIMITER — Intercepts wheel events and caps scroll speed.
  // No matter how fast the user scrolls, the PAGE ITSELF moves slowly so every
  // sticky animation section has enough time to fully play through.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let targetScrollY = window.scrollY;
    let currentScrollY = window.scrollY;
    let scrollRafId;

    const onWheel = (e) => {
      e.preventDefault(); // Block native scroll entirely

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      // Cap each wheel tick to 60px max (prevents trackpad inertia from flying)
      // Then apply 0.45 sensitivity multiplier (45% of normal scroll speed)
      const cappedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 60) * 0.45;
      targetScrollY = Math.max(0, Math.min(maxScroll, targetScrollY + cappedDelta));
    };

    const onKeyDown = (e) => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        targetScrollY = Math.min(maxScroll, targetScrollY + 120);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        targetScrollY = Math.max(0, targetScrollY - 120);
      } else if (e.key === 'End') {
        e.preventDefault();
        targetScrollY = maxScroll;
      } else if (e.key === 'Home') {
        e.preventDefault();
        targetScrollY = 0;
      }
    };

    const scrollLoop = () => {
      // Smooth lerp: page glides slowly toward target (factor 0.07 = silky glide)
      currentScrollY += (targetScrollY - currentScrollY) * 0.07;

      // Snap when very close to avoid floating-point jitter
      if (Math.abs(targetScrollY - currentScrollY) < 0.5) {
        currentScrollY = targetScrollY;
      }

      window.scrollTo({ top: currentScrollY, behavior: 'instant' });
      scrollRafId = requestAnimationFrame(scrollLoop);
    };

    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('keydown', onKeyDown, { passive: false });
    scrollLoop();

    return () => {
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('keydown', onKeyDown);
      cancelAnimationFrame(scrollRafId);
    };
  }, []);

  // SCROLL SPEED LIMITER — animations always play at full pace regardless of how fast user scrolls
  useEffect(() => {
    let animId;
    let currStageVal = 0;
    let currHeroVal = 0;
    let currCoplayVal = 0;
    let currCoshopVal = 0;
    let currCostudyVal = 0;

    // MAX STEP PER FRAME: controls how fast each section's animation plays at 60fps
    // Lower = slower max animation speed. At 60fps, full 0→1 range:
    //   0.002 = ~8s minimum | 0.003 = ~5.5s | 0.004 = ~4s
    const HERO_MAX_STEP    = 0.008; // Hero tagline — quick fade
    const STAGE_MAX_STEP   = 0.003; // Pistol/bullet reveal — cinematic slow
    const COPLAY_MAX_STEP  = 0.003; // Co-Play door/cube — cinematic slow
    const COSHOP_MAX_STEP  = 0.002; // Co-Shop Pac-Man devour — very slow, full detail

    const clampedStep = (current, target, maxStep) => {
      const diff = target - current;
      if (Math.abs(diff) <= maxStep) return target;
      return current + maxStep * Math.sign(diff);
    };

    const loop = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;

      // 1. Hero Scroll — velocity capped
      const targetHero = Math.min(scrollY / (vh * 0.65), 1);
      currHeroVal = clampedStep(currHeroVal, targetHero, HERO_MAX_STEP);
      setHeroScroll(currHeroVal);

      // 2. Stage Section (Pistol/Bullet Reveal) — velocity capped
      const stageWrapper = document.querySelector('.sticky-pinned-red-stage-wrapper');
      if (stageWrapper) {
        const rect = stageWrapper.getBoundingClientRect();
        const totalScroll = stageWrapper.clientHeight - vh;
        const targetStage = Math.min(Math.max(-rect.top / totalScroll, 0), 1);
        currStageVal = clampedStep(currStageVal, targetStage, STAGE_MAX_STEP);
        setScrollProgress(currStageVal);
      }

      // 3. Co-Play Section (Door Spin / Cube Zoom) — velocity capped
      const coplayWrapper = document.querySelector('.sticky-pinned-coplay-stage-wrapper');
      if (coplayWrapper) {
        const rect = coplayWrapper.getBoundingClientRect();
        const totalScroll = coplayWrapper.clientHeight - vh;
        const targetCoplay = Math.min(Math.max(-rect.top / totalScroll, 0), 1);
        currCoplayVal = clampedStep(currCoplayVal, targetCoplay, COPLAY_MAX_STEP);
        setCoplayScrollProgress(currCoplayVal);
      }

      // 4. Co-Shop Section (HD Pause → Pac-Man Devour → Diagonal Split) — velocity capped
      const coshopWrapper = document.querySelector('.sticky-pinned-coshop-stage-wrapper');
      if (coshopWrapper) {
        const rect = coshopWrapper.getBoundingClientRect();
        const totalScroll = coshopWrapper.clientHeight - vh;
        const targetCoshop = Math.min(Math.max(-rect.top / totalScroll, 0), 1);
        currCoshopVal = clampedStep(currCoshopVal, targetCoshop, COSHOP_MAX_STEP);
        setCoshopScrollProgress(currCoshopVal);
      }

      // 5. Co-Study Section (NOTHIN'-style Typography + Cards Reveal) — velocity capped
      const costudyWrapper = document.querySelector('.sticky-pinned-costudy-stage-wrapper');
      if (costudyWrapper) {
        const rect = costudyWrapper.getBoundingClientRect();
        const totalScroll = costudyWrapper.clientHeight - vh;
        const targetCostudy = Math.min(Math.max(-rect.top / totalScroll, 0), 1);
        currCostudyVal = clampedStep(currCostudyVal, targetCostudy, 0.003);
        setCostudyScrollProgress(currCostudyVal);
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

    if (mode === 'watch') {
      if (onOpenCinemaHub) onOpenCinemaHub();
      else onStartWatchParty(finalRoom, finalName);
    }
    else if (mode === 'games') {
      if (onOpenGamesHub) onOpenGamesHub();
      else onStartGames(finalRoom, finalName);
    }
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

  // STEP 2: FULL 360-DEGREE INWARD ZIGZAG DOOR SPIN (Red -> Yellow) (scrollProgress 0.08 -> 0.50)
  const spinProgress = Math.min(Math.max((scrollProgress - 0.08) * 2.38, 0), 1);
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
  // Bullets finish revealing smoothly from 0.50 to 0.75, then HOLD 100% from 0.75 to 1.00 for a 2s reading pause!
  const bulletProgress = Math.min(Math.max((scrollProgress - 0.50) * 4.0, 0), 1);

  // STEP 4: CO-PLAY STICKY SCROLL ZOOM
  // Zoom: 0.08 -> 0.35 | GameBoy Blend: 0.35 -> 0.58 | Split Door Reveal: 0.58 -> 0.78 | 0.78 -> 1.00: 2s HOLD READING PAUSE
  const coplayZoomProgress = Math.min(Math.max((coplayScrollProgress - 0.08) * 3.7, 0), 1);
  const coplayZoomScale = 1 + coplayZoomProgress * 14.0;
  const textZoomOpacity = coplayScrollProgress < 0.08 ? 1 : Math.max(1 - Math.max((coplayScrollProgress - 0.08) * 4.5, 0), 0);
  const gameboyBlendOpacity = Math.min(Math.max((coplayScrollProgress - 0.35) * 4.35, 0), 1);
  const coplaySplitProgress = Math.min(Math.max((coplayScrollProgress - 0.58) * 5.0, 0), 1);

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

  const handleSetTargetPoint = (e) => {
    if (!oTuner.showReticle) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setOTuner(prev => ({
      ...prev,
      zoomTargetX: parseFloat(xPct.toFixed(1)),
      zoomTargetY: parseFloat(yPct.toFixed(1))
    }));
  };

  // STEP 6: CO-STUDY INTERACTIVE SCROLL ANIMATION CALCULATIONS
  const effectiveCostudyScroll = oTuner.overrideScroll !== null ? oTuner.overrideScroll : costudyScrollProgress;
  const dotsRotationDeg = effectiveCostudyScroll * 1800; // spins up to 5 full rotations as user scrolls!

  // Sync active slide with scroll progress
  useEffect(() => {
    if (effectiveCostudyScroll < 0.45) {
      setActiveNodeckSlide(1);
    } else if (effectiveCostudyScroll >= 0.45 && effectiveCostudyScroll < 0.65) {
      setActiveNodeckSlide(2);
    } else if (effectiveCostudyScroll >= 0.65 && effectiveCostudyScroll < 0.85) {
      setActiveNodeckSlide(3);
    } else if (effectiveCostudyScroll >= 0.85) {
      setActiveNodeckSlide(4);
    }
  }, [effectiveCostudyScroll]);
  
  // Smooth camera pan offset + Exponential Zoom directly into the letter 'O'
  const zoomFactor = Math.min(Math.max((effectiveCostudyScroll - 0.08) * 2.5, 0), 1);
  const portalZoomScale = 1 + Math.pow(zoomFactor, 3.2) * 65;
  const oPanShiftPct = zoomFactor * 30.5; // Shifts text rightward to center 'O' precisely at 50vw during zoom
  const portalOpacity = effectiveCostudyScroll > 0.50 ? Math.max(0, 1 - (effectiveCostudyScroll - 0.50) * 7) : 1;

  // 4 Diagonal Black Square Wipe Cards (Top-Left, Bottom-Right, Top-Right, Bottom-Left)
  const sq1Progress = Math.min(Math.max((effectiveCostudyScroll - 0.45) * 5.0, 0), 1);
  const sq1X = (1 - sq1Progress) * -120;
  const sq1Y = (1 - sq1Progress) * -120;

  const sq2Progress = Math.min(Math.max((effectiveCostudyScroll - 0.58) * 5.0, 0), 1);
  const sq2X = (1 - sq2Progress) * 120;
  const sq2Y = (1 - sq2Progress) * 120;

  const sq3Progress = Math.min(Math.max((effectiveCostudyScroll - 0.70) * 5.0, 0), 1);
  const sq3X = (1 - sq3Progress) * 120;
  const sq3Y = (1 - sq3Progress) * -120;

  const sq4Progress = Math.min(Math.max((effectiveCostudyScroll - 0.82) * 5.0, 0), 1);
  const sq4X = (1 - sq4Progress) * -120;
  const sq4Y = (1 - sq4Progress) * 120;

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
      <section className="sticky-pinned-red-stage-wrapper" style={{ height: '450vh', position: 'relative' }}>
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
                  <div className={`cogether-merged-view-box zero-center-line size-${camBoxSize} fade-in`}>
                    <div className="cogether-header-strip">
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

      {/* ── PAUSE SPACER: 60vh breathing room before Co-Play ── */}
      <div style={{ height: '60vh', background: '#000000' }} />

      {/* 3. CO-PLAY: STICKY PINNED 3D ZOOM & VERTICAL SPLIT DOOR SECTION */}
      <section className="sticky-pinned-coplay-stage-wrapper" style={{ height: '450vh', position: 'relative' }}>
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

              {/* RIGHT HALF: 100+ ONLINE GAMES ARCADE HUB */}
              <div 
                className="right-games-rubiks-hub" 
                onClick={onOpenGamesHub || onStartGames}
                style={{ cursor: 'pointer' }}
              >
                <div className="vertical-filled-typography-column text-center-all">
                  <h3 className="hero-word-top text-center">P L A Y</h3>
                  <div className="giant-1000-cube-overlay-stack">
                    <h2 className="hero-word-giant-1000-behind">100+</h2>
                    <div className="embedded-diagonal-cube-box center-front-cube">
                      <AutomaticDiagonal3DRubiksCube />
                    </div>
                  </div>
                  <h4 className="hero-word-multiplayer text-center">MULTIPLAYER & ONLINE GAMES</h4>
                  <button 
                    className="btn-arcade-explore-pill" 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenGamesHub) onOpenGamesHub();
                      else if (onStartGames) onStartGames();
                    }}
                    style={{
                      marginTop: '14px',
                      background: '#FFE500',
                      color: '#000000',
                      border: '3px solid #000000',
                      borderRadius: '30px',
                      padding: '10px 24px',
                      fontFamily: "'Impact', sans-serif",
                      fontSize: '1.05rem',
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      boxShadow: '4px 4px 0px #000000'
                    }}
                  >
                    🎮 OPEN 100+ GAMES ARCADE →
                  </button>
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

      {/* ── PAUSE SPACER: 60vh breathing room before Co-Shop ── */}
      <div style={{ height: '60vh', background: '#11151c' }} />

      {/* 4. PINNED CO-SHOP HUB SECTION (500VH STAGE: HD PAUSE -> PAC-MAN SWEEP -> SPLIT SCREEN HUB) */}
      <div className="sticky-pinned-coshop-stage-wrapper" style={{ height: '500vh', position: 'relative' }}>
        <section
          className="static-coshop-canvas-section"
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            width: '100%',
            backgroundColor: coshopScrollProgress > 0.15 ? '#c4cbd2' : '#11151c'
          }}
        >
          {(() => {
            // ── PIECEWISE PROGRESS MAPPER (with internal pauses between stages) ──
            const raw = coshopScrollProgress;
            let p;
            if (raw <= 0.20)      p = raw * (0.25 / 0.20);
            else if (raw <= 0.25) p = 0.25;                                        // Hold 1 (~2s pause)
            else if (raw <= 0.55) p = 0.25 + ((raw - 0.25) / 0.30) * 0.35;        // Pacman sweep (0.25 -> 0.60)
            else if (raw <= 0.78) p = 0.60 + ((raw - 0.55) / 0.23) * 0.25;        // Vertical split 3D room reveal (0.60 -> 0.85)
            else                  p = 0.85 + Math.min(1, (raw - 0.78) / 0.10) * 0.15; // Final hold 2
            const csp = Math.min(1, Math.max(0, p));

            // ── PAC-MAN: sweep from -55vw to 110vw during csp 0.25 -> 0.60 ──
            const pacProgress = Math.max(0, Math.min(1, (csp - 0.25) / 0.35));
            const pacmanLeftVw = -55 + pacProgress * 165;
            const pacFront = pacmanLeftVw + 48;

            const eaten = {
              C:          pacFront >= 33,
              O1:         pacFront >= 40,
              leftPlant:  pacFront >= 45,
              bulb:       pacFront >= 50,
              S:          pacFront >= 55,
              H:          pacFront >= 61,
              O2:         pacFront >= 66,
              tote:       pacFront >= 66,
              P:          pacFront >= 72,
              rightPlant: pacFront >= 77,
              shelf:      pacFront >= 90,
            };

            const letterFrontThresholds = [eaten.C, eaten.O1, eaten.bulb, eaten.S, eaten.H, eaten.O2, eaten.P];
            const isPacmanActive = csp >= 0.25 && csp < 0.60;

            // ── VERTICAL SPLIT 3D ROOM REVEAL PROGRESS (0 -> 1) ──
            const revealProgress = Math.max(0, Math.min(1, (csp - 0.60) / 0.25));

            const roomBright = Math.min(csp * (1 / 0.25), 1);

            const BRAND_LIST = [
              { name: 'Amazon', logo: 'https://www.google.com/s2/favicons?domain=amazon.in&sz=64' },
              { name: 'Myntra', logo: 'https://www.google.com/s2/favicons?domain=myntra.com&sz=64' },
              { name: 'Flipkart', logo: 'https://www.google.com/s2/favicons?domain=flipkart.com&sz=64' },
              { name: 'Blinkit', logo: 'https://www.google.com/s2/favicons?domain=blinkit.com&sz=64' },
              { name: 'Ajio', logo: 'https://www.google.com/s2/favicons?domain=ajio.com&sz=64' },
              { name: 'Nykaa', logo: 'https://www.google.com/s2/favicons?domain=nykaa.com&sz=64' },
            ];

            return (
              <>
                {/* 1. STAGE A: SHELF strictly before Pac-Man */}
                {csp < 0.25 && (
                  <div className="coshop-static-center-container" style={{ position: 'relative', zIndex: 10 }}>
                    <div
                      className="static-wooden-log-shelf-wrapper"
                      style={{
                        transform: `translateY(${shelfY}px) scale(${shelfScale / 100})`,
                        opacity: 0.35 + 0.65 * roomBright
                      }}
                    >
                      <img src="/wooden_shelf_artwork.png" alt="Wooden Log Shelf" className="static-wooden-log-shelf-img"
                        style={{ position: 'relative', zIndex: 5, filter: `drop-shadow(0 16px 24px rgba(0,0,0,${0.65 - 0.25 * roomBright}))` }} />

                      <img src="/jade_plant_pot.png" alt="Left Plant" className="shelf-jade-plant plant-left"
                        style={{ height: `${leftPlantSize}px`, position: 'absolute', left: '20px', bottom: '30px',
                          transform: `translate(${leftPlantX}px, ${leftPlantY}px)`, zIndex: 40,
                          filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.65))' }} />

                      <img src="/jade_plant_pot.png" alt="Right Plant" className="shelf-jade-plant plant-right"
                        style={{ height: `${rightPlantSize}px`, position: 'absolute', right: '20px', bottom: '30px',
                          transform: `translate(${rightPlantX}px, ${rightPlantY}px)`, zIndex: 40,
                          filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.65))' }} />

                      <div className="static-letters-sitting-track"
                        style={{ position: 'absolute', bottom: '30px', left: '50%',
                          transform: `translateX(calc(-50% + ${lettersX}px)) translateY(${lettersY}px)`, zIndex: 20 }}>
                        {REAL_WOODEN_LETTERS.map((item, idx) => (
                          <div key={item.id} className="static-wood-letter-wrapper">
                            {item.isBulbHyphen ? (
                              <img src={item.img} alt="Bulb" className="static-wood-hyphen-bulb-img"
                                style={{ height: `${Math.round(letterHeight * 0.8)}px`,
                                  filter: `drop-shadow(0 0 ${16 * roomBright}px rgba(251,191,36,${0.85 * roomBright})) drop-shadow(0 0 ${35 * roomBright}px rgba(245,158,11,${0.55 * roomBright}))` }} />
                            ) : (
                              <>
                                <img src={item.img} alt={item.char} className="static-wood-letter-img"
                                  style={{ height: `${letterHeight}px`, filter: `drop-shadow(0 16px 24px rgba(0,0,0,${0.75 - 0.2 * roomBright}))` }} />
                                {item.isHangingTote && (
                                  <img src="/tote_bag.png" alt="Tote Bag" className="hanging-tote-bag-on-letter"
                                    style={{ top: `${toteTop}px`, height: `${toteHeight}px`, zIndex: 15,
                                      filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.65))' }} />
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. DURING PAC-MAN SWEEP: shelf devouring + clean yellow Pac-Man */}
                {isPacmanActive && (
                  <>
                    <div className="coshop-static-center-container" style={{ position: 'relative', zIndex: 10 }}>
                      <div className="static-wooden-log-shelf-wrapper"
                        style={{ transform: `translateY(${shelfY}px) scale(${shelfScale / 100})`,
                          opacity: eaten.shelf ? 0 : 1 }}>
                        <img src="/wooden_shelf_artwork.png" alt="Shelf" className="static-wooden-log-shelf-img"
                          style={{ position: 'relative', zIndex: 5, filter: `drop-shadow(0 16px 24px rgba(0,0,0,0.4))` }} />

                        <img src="/jade_plant_pot.png" alt="Left Plant" className="shelf-jade-plant plant-left"
                          style={{ height: `${leftPlantSize}px`, position: 'absolute', left: '20px', bottom: '30px',
                            transform: `translate(${leftPlantX}px, ${leftPlantY}px)`, zIndex: 40,
                            filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.65))',
                            opacity: eaten.leftPlant ? 0 : 1, transition: 'opacity 0.15s' }} />

                        <img src="/jade_plant_pot.png" alt="Right Plant" className="shelf-jade-plant plant-right"
                          style={{ height: `${rightPlantSize}px`, position: 'absolute', right: '20px', bottom: '30px',
                            transform: `translate(${rightPlantX}px, ${rightPlantY}px)`, zIndex: 40,
                            filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.65))',
                            opacity: eaten.rightPlant ? 0 : 1, transition: 'opacity 0.15s' }} />

                        <div className="static-letters-sitting-track"
                          style={{ position: 'absolute', bottom: '30px', left: '50%',
                            transform: `translateX(calc(-50% + ${lettersX}px)) translateY(${lettersY}px)`, zIndex: 20 }}>
                          {REAL_WOODEN_LETTERS.map((item, idx) => {
                            const isEaten = letterFrontThresholds[idx];
                            return (
                              <div key={item.id} className="static-wood-letter-wrapper"
                                style={{ opacity: isEaten ? 0 : 1, transition: 'opacity 0.15s' }}>
                                {item.isBulbHyphen ? (
                                  <img src={item.img} alt="Bulb" className="static-wood-hyphen-bulb-img"
                                    style={{ height: `${Math.round(letterHeight * 0.8)}px`,
                                      filter: `drop-shadow(0 0 16px rgba(251,191,36,0.85)) drop-shadow(0 0 35px rgba(245,158,11,0.55))`,
                                      opacity: eaten.bulb ? 0 : 1 }} />
                                ) : (
                                  <>
                                    <img src={item.img} alt={item.char} className="static-wood-letter-img"
                                      style={{ height: `${letterHeight}px`, filter: `drop-shadow(0 16px 24px rgba(0,0,0,0.55))` }} />
                                    {item.isHangingTote && (
                                      <img src="/tote_bag.png" alt="Tote" className="hanging-tote-bag-on-letter"
                                        style={{ top: `${toteTop}px`, height: `${toteHeight}px`, zIndex: 15,
                                          filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.65))',
                                          opacity: eaten.tote ? 0 : 1, transition: 'opacity 0.15s' }} />
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* CLEAN PAC-MAN (Yellow SVG, NO ICON ON BODY!) */}
                    <div className="classic-svg-pacman-wrapper" style={{ left: `${pacmanLeftVw}vw`, zIndex: 50 }}>
                      <svg viewBox="0 0 100 100" className="pacman-seamless-svg">
                        <path fill="#ffcc00" d="M 50 50 L 98 22 A 48 48 0 1 0 98 78 Z" className="pacman-animated-mouth-path" />
                        <circle cx="48" cy="22" r="5.5" fill="#000000" />
                      </svg>
                    </div>
                  </>
                )}

                {/* 3. VERTICAL SPLIT 3D MASTERPIECE ROOM STAGE (Left half slides DOWN from Top | Right half slides UP from Bottom) */}
                {revealProgress > 0 && (
                  <div className="coshop-vertical-split-container" style={{ opacity: Math.min(1, revealProgress * 1.5) }}>
                    {/* LEFT HALF: Grey 3D room half — Slides DOWN from Top */}
                    <div
                      className="coshop-left-vertical-panel"
                      style={{
                        transform: `translateY(${(1 - revealProgress) * -100}%)`
                      }}
                    />

                    {/* RIGHT HALF: Green 3D room half — Slides UP from Bottom */}
                    <div
                      className="coshop-right-vertical-panel"
                      style={{
                        transform: `translateY(${(1 - revealProgress) * 100}%)`
                      }}
                    />

                    {/* TABLET DISPLAY: LIVE CO-SHOP VIDEO CALL SHOPPING WITH FRIEND (appears ONLY AFTER image locks in place) */}
                    {revealProgress >= 0.95 && (
                      <div
                        className="coshop-tablet-screen-overlay"
                        style={{
                          top: `${tabletConfig.top}%`,
                          left: `${tabletConfig.left}%`,
                          width: `${tabletConfig.width}px`,
                          height: `${tabletConfig.height}px`,
                          borderRadius: `${tabletConfig.borderRadius}px`,
                          transform: `translate(-50%, -50%) perspective(${tabletConfig.perspective}px) rotateX(${tabletConfig.rotateX}deg) rotateY(${tabletConfig.rotateY}deg) rotateZ(${tabletConfig.rotateZ}deg) skewX(${tabletConfig.skewX}deg) skewY(${tabletConfig.skewY}deg)`,
                          opacity: Math.min(1, (revealProgress - 0.95) / 0.05)
                        }}
                      >
                        {/* HEADER BAR INSIDE TABLET DISPLAY */}
                        <div className="tablet-coshop-header-bar">
                          <div className="store-pill">
                            <span className="live-red-dot" /> Amazon.in | CO-LIVE 🔴
                          </div>
                          <div className="shared-cart-pill">
                            🛒 Shared Cart (2 items • ₹2,598)
                          </div>
                        </div>

                        {/* LIVE SHOPPING VIDEO PLAY BODY */}
                        <div className="tablet-video-content-body">
                          <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="tablet-coshop-live-video"
                          >
                            <source src="https://media.w3.org/2010/05/sintel/trailer.mp4" type="video/mp4" />
                          </video>

                          {/* TWO FRIENDS LIVE VIDEO CALL OVERLAYS */}
                          <div className="friend-video-avatar avatar-left">
                            <div className="avatar-video-box">
                              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" alt="Jeevan (You)" />
                              <span className="live-cam-badge">Jeevan (You)</span>
                            </div>
                            <div className="reaction-bubble-pop">😍 "Love the brass finish!"</div>
                          </div>

                          <div className="friend-video-avatar avatar-right">
                            <div className="avatar-video-box">
                              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" alt="Maya (Friend)" />
                              <span className="live-cam-badge">Maya (Friend)</span>
                            </div>
                            <div className="reaction-bubble-pop">🛒 "Added to shared cart!"</div>
                          </div>

                          {/* BOTTOM SHOPPING ACTION CARD */}
                          <div className="tablet-product-bottom-card">
                            <div className="product-info-left">
                              <span className="prod-title">🪴 Brass Jade Plant Pot — Premium</span>
                              <span className="prod-price">₹1,299 <s className="old-price">₹2,499</s></span>
                            </div>
                            <button className="btn-buy-together-now" onClick={() => handleLaunch('watch')}>
                              Checkout Together →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </section>
      </div>

      {/* 5. STICKY PINNED CO-STUDY SHOWCASE SECTION */}
      <div className="sticky-pinned-costudy-stage-wrapper" style={{ height: '450vh', position: 'relative' }}>
        <section className="costudy-sticky-stage">
          {effectiveCostudyScroll < 0.65 && (
            <div
              className={`centered-costudy-headline-wrapper ${oTuner.showReticle ? 'clickable-target-active' : ''}`}
              style={{
                transform: `translate(calc(-50% + ${oPanShiftPct}%), -50%) scale(${portalZoomScale})`,
                transformOrigin: `${oTuner.zoomTargetX}% ${oTuner.zoomTargetY}%`,
                opacity: portalOpacity
              }}
              onClick={handleSetTargetPoint}
            >
              <div className="costudy-text-row">
                <span className="char-c">C</span>
                <div className="co-letter-o-custom-circle">
                  {/* GRADUATION CAP / MORTARBOARD ON TOP-LEFT CURVE OF 'C' 🎓 */}
                  <img src="/graduation_cap.png" alt="Graduation Cap" className="o-graduation-cap" />
                  <div className="o-black-circle-body"><div className="o-cream-center-hole" style={{ width: `46%`, height: `46%` }} /></div>
                  <svg className="o-dots-ring-perfect" viewBox="0 0 100 100" style={{ transform: `translate(-50%, -50%) rotate(${dotsRotationDeg}deg)` }}>
                    {Array.from({ length: 12 }).map((_, i) => {
                      const angle = (i * 30 * Math.PI) / 180;
                      const cx = 50 + 43.5 * Math.cos(angle);
                      const cy = 50 + 43.5 * Math.sin(angle);
                      return <circle key={i} cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="3.0" fill="#ffffff" />;
                    })}
                  </svg>
                </div>
                <span className="char-hyphen">-</span>
                <span className="char-study">STUDY</span>
              </div>
            </div>
          )}
          {/* NODECK.ONLINE STYLE INTERACTIVE DECK SHOWCASE (POPS IN AFTER ZOOMING THROUGH 'O') */}
          {effectiveCostudyScroll >= 0.50 && (
            <div className={`nodeck-stage-container ${activeNodeckSlide === 1 || activeNodeckSlide === 4 ? 'bg-pink' : 'bg-cream'} fade-in`}>
              {/* TOP BRANDING TAG BADGE */}
              <div className="nodeck-top-header">
                <span className="nodeck-top-tag-pill">
                  {activeNodeckSlide === 1 && '01 / THE PROBLEM'}
                  {activeNodeckSlide === 2 && '02 / THE MANIFESTO'}
                  {activeNodeckSlide === 3 && '03 / WHAT WE DON\'T DO'}
                  {activeNodeckSlide === 4 && '04 / WIN THE EXAM.'}
                </span>
              </div>

              {/* MAIN SLIDE CONTENT CANVAS AREA WITH 3D PAGE FLIP ANIMATION */}
              <div className="nodeck-slide-canvas-animated">
                {/* SLIDE 1: THE PROBLEM (PINK BG, STUDYING ALONE WITH ARTISTIC ILLUSTRATION) */}
                {activeNodeckSlide === 1 && (
                  <div key="slide-1" className="nodeck-slide1-split-layout nodeck-slide-page-flip">
                    <div className="nodeck-slide1-text-left">
                      <h2 className="nodeck-huge-headline text-left-aligned">
                        EVERY YEAR, MILLIONS OF HOURS ARE WASTED <mark className="nodeck-highlighter-green">STUDYING ALONE</mark>. CRAMMING <mark className="nodeck-highlighter-green">NOBODY ENJOYS</mark>, DISTRACTIONS <mark className="nodeck-highlighter-green">NOBODY ESCAPES</mark>, AND NOTES NOBODY REMEMBERS.
                      </h2>
                    </div>
                    <div className="nodeck-slide1-art-frame">
                      <div className="art-frame-badge">LO-FI STUDY VIBES 🎧</div>
                      <img src="/costudy_illustration.jpg" alt="Artistic Co-Study Desk" className="nodeck-art-img" />
                    </div>
                  </div>
                )}

                {/* SLIDE 2: THE MANIFESTO & SPLIT-SCREEN VIDEO CALL SHOWCASE */}
                {activeNodeckSlide === 2 && (
                  <div key="slide-2" className="nodeck-slide2-split-layout nodeck-slide-page-flip">
                    <div className="nodeck-slide2-text-left">
                      <h2 className="nodeck-huge-headline text-left-aligned">
                        THE BEST STUDY SESSION IS A SHARED ONE.<sup>1</sup><br />
                        THE BEST DESK IS A CO-STUDY DESK.<sup>2</sup><br />
                        <mark className="nodeck-highlighter-green">THE BEST EXAM SCORE IS A TOP ONE.<sup>3</sup></mark>
                      </h2>
                      <div className="nodeck-footnotes-row" style={{ justifyContent: 'flex-start' }}>
                        <span><sup>1</sup> YES, WE MEAN IT.</span>
                        <span><sup>2</sup> LIVE 2-WAY CAM & LO-FI BEATS.</span>
                        <span><sup>3</sup> PRACTICE = DISTINCTIONS.</span>
                      </div>
                    </div>
                    <div className="nodeck-video-art-frame">
                      <div className="video-frame-badge">🔴 LIVE 2-WAY CAM STUDY</div>
                      <img src="/costudy_video_split.jpg" alt="Split Screen Live Study Room" className="nodeck-art-img" />
                    </div>
                  </div>
                )}

                {/* SLIDE 3: WHAT WE DON'T DO (CREAM BG, PINNED PAPER WITH STRIKETHROUGH STUDY HABITS) */}
                {activeNodeckSlide === 3 && (
                  <div key="slide-3" className="nodeck-slide3-layout nodeck-slide-page-flip">
                    <div className="nodeck-slide3-left">
                      <h2>WHAT WE<br /><mark className="nodeck-highlighter-green">DON'T DO</mark></h2>
                    </div>
                    <div className="nodeck-pinned-paper-card">
                      <span className="nodeck-red-pushpin">📍</span>
                      <ul className="nodeck-strikethrough-list">
                        <li>1. SOLITARY ISOLATED CRAMMING</li>
                        <li>2. ENDLESS INSTAGRAM DISTRACTIONS</li>
                        <li>3. BORING LONE READINGS</li>
                        <li>4. PASSIVE NO-ACCOUNTABILITY STUDYING</li>
                        <li>5. MEANINGLESS 100-PAGE DENSE PDFS</li>
                      </ul>
                      <p className="nodeck-pinned-caption">
                        THESE THINGS HAVE ONE THING IN COMMON: THEY FEEL LIKE STUDYING WITHOUT PRODUCING RESULTS. CO-STUDY REPLACES ISOLATION WITH LIVE STUDYMATES, SYNCED MUSIC, AND REAL FOCUS.
                      </p>
                    </div>
                  </div>
                )}

                {/* SLIDE 4: WIN THE EXAM (PINK BG, 3 CO-STUDY CARDS) */}
                {activeNodeckSlide === 4 && (
                  <div key="slide-4" className="nodeck-cards-grid nodeck-slide-page-flip">
                    {/* CARD 1 */}
                    <div className="nodeck-deck-card">
                      <span className="nodeck-card-tag">01 / VIRTUAL DESKS</span>
                      <div className="nodeck-card-body">
                        VIRTUAL QUIET DESKS.<br />
                        SCREEN SHARE.<br />
                        LO-FI RAIN BEATS.<br />
                        ZERO DISTRACTION.
                      </div>
                      <button className="nodeck-card-action-btn" onClick={() => handleLaunch('watch')}>
                        Join Study Desk <ArrowRight size={16} />
                      </button>
                    </div>

                    {/* CARD 2 */}
                    <div className="nodeck-deck-card">
                      <span className="nodeck-card-tag">02 / TRIVIA BATTLES</span>
                      <div className="nodeck-card-body">
                        WE FIND WHAT'S KILLING YOUR FOCUS AND HELP YOU CRUSH IT WITH MULTIPLAYER QUIZ BATTLES.
                      </div>
                      <button className="nodeck-card-action-btn" onClick={() => handleLaunch('watch')}>
                        Play Quiz Battles <ArrowRight size={16} />
                      </button>
                    </div>

                    {/* CARD 3 */}
                    <div className="nodeck-deck-card">
                      <span className="nodeck-card-tag">03 / LIVE CANVAS</span>
                      <div className="nodeck-card-body">
                        MORE DISTINCTIONS.<br />
                        FEWER DERAILS.<br />
                        TOP MARKS.
                      </div>
                      <button className="nodeck-card-action-btn" onClick={() => handleLaunch('watch')}>
                        Open Shared Desk <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* BOTTOM FIXED NODECK NAVIGATION DOCK BAR */}
              <div className="nodeck-bottom-dock">
                <button
                  className="btn-nodeck-nav"
                  onClick={() => setActiveNodeckSlide(prev => Math.max(1, prev - 1))}
                  disabled={activeNodeckSlide === 1}
                >
                  ⟨ PREV
                </button>
                <div
                  className="btn-nodeck-menu-circle"
                  onClick={() => setActiveNodeckSlide(prev => (prev % 4) + 1)}
                  title="Toggle Slide"
                >
                  ≡
                </div>
                <button
                  className="btn-nodeck-nav"
                  onClick={() => setActiveNodeckSlide(prev => Math.min(4, prev + 1))}
                  disabled={activeNodeckSlide === 4}
                >
                  NEXT ⟩
                </button>
              </div>

              {/* SLIDE COUNTER BADGE */}
              <div className="nodeck-slide-badge">
                SLIDE {activeNodeckSlide}/4
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 6. NO ART MUSIC & LACOSTE EDITORIAL PRICING SECTION */}
      <section className="inverted-triangle-key-section">
        {/* CENTER KEY HERO DISPLAY */}
        <div className="center-black-inverted-triangle">
          <h2 className="key-section-title">
            THE MASTER KEYPASS.
          </h2>
          <p className="key-section-subtitle-mono">
            One pass. Millisecond-synced 4K cinema, private study desks, live game rooms & collective cart.
          </p>

          {/* STATIC CHROME KEY WITH SLEEK WHITE EDGE GLOW & MONOCHROME PRICE TAG */}
          <div className="wavy-floating-key-wrapper">
            <img src="/plain_crystal_key.png" alt="Monochrome Master Keypass" className="glowing-wavy-key-img" />
            <div className="hanging-thread-line" />
            <span className="hanging-price-tag-badge">KEYPASS // ₹49 / MO</span>
          </div>

          <br />
          <button 
            className="btn-triangle-key-buy" 
            onClick={onOpenPricing}
            onMouseEnter={() => setIsCursorHovering(true)}
            onMouseLeave={() => setIsCursorHovering(false)}
          >
            ACQUIRE KEYPASS - ₹49 →
          </button>
        </div>

        {/* EDITORIAL REALITY CHECK CARDS (OBSIDIAN CHARCOAL & WARM CREAM) */}
        <div className="triangle-side-cards-wrapper">
          {/* LEFT CHARCOAL MATTE CARD */}
          <div 
            className="side-psych-card left-card-red"
            onMouseEnter={() => setIsCursorHovering(true)}
            onMouseLeave={() => setIsCursorHovering(false)}
          >
            <span className="side-card-badge">[ 01 // PSYCHOLOGICAL REALITY ]</span>
            <p className="side-card-body">
              <strong>Why would you not acquire this key?</strong> Do you really want your crush or partner studying and watching cinema with someone else while you scroll feeds alone in silence?
            </p>
          </div>

          {/* RIGHT EDITORIAL CREAM CARD */}
          <div 
            className="side-psych-card right-card-pink"
            onMouseEnter={() => setIsCursorHovering(true)}
            onMouseLeave={() => setIsCursorHovering(false)}
          >
            <span className="side-card-badge">[ 02 // PERFORMANCE METRIC ]</span>
            <p className="side-card-body">
              <strong>Are you gonna let your circle hit straight A's</strong> in private 4K Co-Study rooms while you're locked out crying over laggy 480p screen shares?
            </p>
          </div>
        </div>

        {/* BOTTOM FULL-WIDTH EDITORIAL BANNER */}
        <div 
          className="bottom-gold-truth-card"
          onMouseEnter={() => setIsCursorHovering(true)}
          onMouseLeave={() => setIsCursorHovering(false)}
        >
          <span className="truth-mono-tag">[ 03 // THE VERDICT ]</span>
          <p className="truth-quote-text">
            "I READ THE REALITY CHECK. THE ARCHITECTURE IS UNDENIABLE. TAKE THE ₹49 AND UNLOCK EVERYTHING."
          </p>
          <button 
            className="btn-truth-claim-key" 
            onClick={onOpenPricing}
            onMouseEnter={() => setIsCursorHovering(true)}
            onMouseLeave={() => setIsCursorHovering(false)}
          >
            CLAIM UNLIMITED ACCESS →
          </button>
        </div>

        {/* MINIMALIST STUDIO FOOTER */}
        <footer className="jeevan-official-footer" style={{ position: 'relative', zIndex: 20 }}>
          <div className="footer-watermark-row">
            <span className="creator-tag">COGETHER // DIRECTED BY JEEVAN YADAV</span>
            <div className="footer-links">
              <a href="mailto:jeevan@cogether.app">EMAIL</a>
              <a href="https://github.com/Jeevan-88/CoGether.git" target="_blank" rel="noreferrer">REPOSITORY</a>
              <a href="#privacy">TERMS & PRIVACY</a>
            </div>
          </div>
          <p className="copyright-text">
            © 2026 COGETHER INC. ALL RIGHTS RESERVED. ARCHITECTURE BY JEEVAN YADAV.
          </p>
        </footer>
      </section>
    </div>
  );
}
