import React, { useState, useEffect, useRef } from 'react';
import { Tv, Gamepad2, Sparkles, Play, Lock, CheckCircle2, ArrowRight, Video, ShoppingBag, BookOpen, Star, Flame, Eye, RefreshCw, Volume2, VolumeX, MessageSquare, Mic, Camera, Layers, Users, Maximize2, Move, Box, ShoppingCart } from 'lucide-react';
import HeroSection from './sections/HeroSection.jsx';
import CoWatchPistolStage from './sections/CoWatchPistolStage.jsx';
import CoPlayGameBoyStage from './sections/CoPlayGameBoyStage.jsx';
import CoShopSlantedStage from './sections/CoShopSlantedStage.jsx';
import './LandingPage.css';

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
    zoomTargetX: 27.2,
    zoomTargetY: 50.6,
    panX: 26.5,
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
  const oPanShiftPct = zoomFactor * 29.0; // Shifts text rightward by 29% to center 'O' at 50vw during zoom
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
      <HeroSection
        heroScroll={heroScroll}
        isBurstActive={isBurstActive}
        burstOpacity={burstOpacity}
        crossScale={crossScale}
      />

      {/* 2. STICKY PINNED RED CO-WATCH SECTION WITH 360-DEGREE INWARD ZIGZAG DOOR SPIN */}
      <CoWatchPistolStage
        isFullyLockedYellow={isFullyLockedYellow}
        isYellowStage={isYellowStage}
        spinProgress={spinProgress}
        isYellowCanvas={isYellowCanvas}
        isSpinning={isSpinning}
        doorSpinAngle={doorSpinAngle}
        camBoxSize={camBoxSize}
        setCamBoxSize={setCamBoxSize}
        cycleCamSize={cycleCamSize}
        handleLaunch={handleLaunch}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        activeMsgIdx={activeMsgIdx}
        tutorialStep={tutorialStep}
        bulletProgress={bulletProgress}
        whiteLineOpacity={whiteLineOpacity}
      />

      {/* ── PAUSE SPACER: 60vh breathing room before Co-Play ── */}
      <div style={{ height: '60vh', background: '#000000' }} />

      {/* 3. CO-PLAY: STICKY PINNED 3D ZOOM & VERTICAL SPLIT DOOR SECTION */}
      <CoPlayGameBoyStage
        coplaySplitProgress={coplaySplitProgress}
        textZoomOpacity={textZoomOpacity}
        coplayZoomScale={coplayZoomScale}
        gameboyBlendOpacity={gameboyBlendOpacity}
        onOpenGamesHub={onOpenGamesHub}
        onStartGames={onStartGames}
      />

      {/* ── PAUSE SPACER: 60vh breathing room before Co-Shop ── */}
      <div style={{ height: '60vh', background: '#11151c' }} />

      {/* 4. PINNED CO-SHOP HUB SECTION (500VH STAGE: HD PAUSE -> PAC-MAN SWEEP -> SPLIT SCREEN HUB) */}
      <CoShopSlantedStage
        coshopScrollProgress={coshopScrollProgress}
        shelfY={shelfY}
        shelfScale={shelfScale}
        leftPlantSize={leftPlantSize}
        leftPlantX={leftPlantX}
        leftPlantY={leftPlantY}
        rightPlantSize={rightPlantSize}
        rightPlantX={rightPlantX}
        rightPlantY={rightPlantY}
        lettersX={lettersX}
        lettersY={lettersY}
        letterHeight={letterHeight}
        toteTop={toteTop}
        toteHeight={toteHeight}
        tabletConfig={tabletConfig}
        handleLaunch={handleLaunch}
      />

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
                  {/* GRADUATION CAP / MORTARBOARD ON TOP OF 'O' 🎓 */}
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
          {effectiveCostudyScroll >= 0.35 && (
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
