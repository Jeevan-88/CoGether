import React, { useState, useEffect } from 'react';
import HeroSection from './sections/HeroSection.jsx';
import CoWatchPistolStage from './sections/CoWatchPistolStage.jsx';
import CoPlayGameBoyStage from './sections/CoPlayGameBoyStage.jsx';
import CoShopSlantedStage from './sections/CoShopSlantedStage.jsx';
import CoStudyDeckStage from './sections/CoStudyDeckStage.jsx';
import KeypassPricingStage from './sections/KeypassPricingStage.jsx';
import LandingFooter from './sections/LandingFooter.jsx';
import './LandingPage.css';

/**
 * LandingPage Orchestrator Component
 * Composes the 6 modular interactive product stages and the footer.
 * Controls master smooth rate-limited scroll physics and state interpolation.
 */
export default function LandingPage({
  onStartWatchParty,
  onStartGames,
  onStartMergedCam,
  onOpenPricing,
  onOpenGamesHub,
  onOpenCinemaHub
}) {
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

  // Calibrator & deck state
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

  const [activeNodeckSlide, setActiveNodeckSlide] = useState(1);

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

  const [shelfY] = useState(217);
  const [shelfScale] = useState(102);
  const [lettersX] = useState(33);
  const [lettersY] = useState(-461);
  const [letterHeight] = useState(140);
  const [leftPlantX] = useState(50);
  const [leftPlantY] = useState(-202);
  const [leftPlantSize] = useState(240);
  const [rightPlantX] = useState(-18);
  const [rightPlantY] = useState(-208);
  const [rightPlantSize] = useState(240);
  const [toteTop] = useState(45);
  const [toteHeight] = useState(213);
  const [activeMsgIdx, setActiveMsgIdx] = useState(0);

  // ─────────────────────────────────────────────────────────────────────────────
  // MASTER SCROLL RATE LIMITER — Intercepts wheel events and caps scroll speed.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let targetScrollY = window.scrollY;
    let currentScrollY = window.scrollY;
    let scrollRafId;

    const onWheel = (e) => {
      e.preventDefault();
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
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
      currentScrollY += (targetScrollY - currentScrollY) * 0.07;
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

  // SCROLL SPEED LIMITER — 60fps frame clamped animation steps
  useEffect(() => {
    let animId;
    let currStageVal = 0;
    let currHeroVal = 0;
    let currCoplayVal = 0;
    let currCoshopVal = 0;
    let currCostudyVal = 0;

    const HERO_MAX_STEP    = 0.008;
    const STAGE_MAX_STEP   = 0.003;
    const COPLAY_MAX_STEP  = 0.003;
    const COSHOP_MAX_STEP  = 0.002;

    const clampedStep = (current, target, maxStep) => {
      const diff = target - current;
      if (Math.abs(diff) <= maxStep) return target;
      return current + maxStep * Math.sign(diff);
    };

    const loop = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;

      // 1. Hero Scroll
      const targetHero = Math.min(scrollY / (vh * 0.65), 1);
      currHeroVal = clampedStep(currHeroVal, targetHero, HERO_MAX_STEP);
      setHeroScroll(currHeroVal);

      // 2. Co-Watch Stage
      const stageWrapper = document.querySelector('.sticky-pinned-red-stage-wrapper');
      if (stageWrapper) {
        const rect = stageWrapper.getBoundingClientRect();
        const totalScroll = stageWrapper.clientHeight - vh;
        const targetProgress = Math.min(Math.max(-rect.top / totalScroll, 0), 1);
        currStageVal = clampedStep(currStageVal, targetProgress, STAGE_MAX_STEP);
        setScrollProgress(currStageVal);
      }

      // 3. Co-Play Stage
      const coplayWrapper = document.querySelector('.sticky-pinned-coplay-stage-wrapper');
      if (coplayWrapper) {
        const rect = coplayWrapper.getBoundingClientRect();
        const totalScroll = coplayWrapper.clientHeight - vh;
        const targetCoplay = Math.min(Math.max(-rect.top / totalScroll, 0), 1);
        currCoplayVal = clampedStep(currCoplayVal, targetCoplay, COPLAY_MAX_STEP);
        setCoplayScrollProgress(currCoplayVal);
      }

      // 4. Co-Shop Stage
      const coshopWrapper = document.querySelector('.sticky-pinned-coshop-stage-wrapper');
      if (coshopWrapper) {
        const rect = coshopWrapper.getBoundingClientRect();
        const totalScroll = coshopWrapper.clientHeight - vh;
        const targetCoshop = Math.min(Math.max(-rect.top / totalScroll, 0), 1);
        currCoshopVal = clampedStep(currCoshopVal, targetCoshop, COSHOP_MAX_STEP);
        setCoshopScrollProgress(currCoshopVal);
      }

      // 5. Co-Study Stage
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
      setActiveMsgIdx((prev) => (prev + 1) % 3);
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

  // STEP 1: Hero Flare Calculations
  const isBurstActive = heroScroll > 0.02 && heroScroll < 0.85;
  const burstOpacity = isBurstActive ? Math.sin(((heroScroll - 0.02) / 0.83) * Math.PI) : 0;
  const crossScale = Math.min((heroScroll - 0.02) * 3.5, 1);

  // STEP 2: 360-Degree Door Spin Calculations
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
  const bulletProgress = Math.min(Math.max((scrollProgress - 0.50) * 4.0, 0), 1);

  // STEP 3: Co-Play Zoom Calculations
  const coplayZoomProgress = Math.min(Math.max((coplayScrollProgress - 0.08) * 3.7, 0), 1);
  const coplayZoomScale = 1 + coplayZoomProgress * 14.0;
  const textZoomOpacity = coplayScrollProgress < 0.08 ? 1 : Math.max(1 - Math.max((coplayScrollProgress - 0.08) * 4.5, 0), 0);
  const gameboyBlendOpacity = Math.min(Math.max((coplayScrollProgress - 0.35) * 4.35, 0), 1);
  const coplaySplitProgress = Math.min(Math.max((coplayScrollProgress - 0.58) * 5.0, 0), 1);

  // STEP 5: Co-Study Zoom Calculations
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

  const effectiveCostudyScroll = oTuner.overrideScroll !== null ? oTuner.overrideScroll : costudyScrollProgress;
  const dotsRotationDeg = effectiveCostudyScroll * 1800;

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
  
  const zoomFactor = Math.min(Math.max((effectiveCostudyScroll - 0.08) * 2.5, 0), 1);
  const portalZoomScale = 1 + Math.pow(zoomFactor, 3.2) * 65;
  const oPanShiftPct = zoomFactor * 29.0;
  const portalOpacity = effectiveCostudyScroll > 0.50 ? Math.max(0, 1 - (effectiveCostudyScroll - 0.50) * 7) : 1;

  return (
    <div className="landing-page-official fade-in">
      {/* 1. TALL FULLSCREEN BLACK HERO SECTION */}
      <HeroSection
        heroScroll={heroScroll}
        isBurstActive={isBurstActive}
        burstOpacity={burstOpacity}
        crossScale={crossScale}
      />

      {/* 2. STICKY PINNED RED CO-WATCH SECTION */}
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

      {/* 4. PINNED CO-SHOP HUB SECTION */}
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
      <CoStudyDeckStage
        effectiveCostudyScroll={effectiveCostudyScroll}
        oTuner={oTuner}
        oPanShiftPct={oPanShiftPct}
        portalZoomScale={portalZoomScale}
        portalOpacity={portalOpacity}
        handleSetTargetPoint={handleSetTargetPoint}
        dotsRotationDeg={dotsRotationDeg}
        activeNodeckSlide={activeNodeckSlide}
        setActiveNodeckSlide={setActiveNodeckSlide}
        handleLaunch={handleLaunch}
      />

      {/* 6. EDITORIAL PRICING SECTION */}
      <section className="inverted-triangle-key-section">
        <KeypassPricingStage onOpenPricing={onOpenPricing} />
        <LandingFooter />
      </section>
    </div>
  );
}
