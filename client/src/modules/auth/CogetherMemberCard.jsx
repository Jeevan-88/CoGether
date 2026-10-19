import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Printer,
  Download,
  Edit3,
  CheckCircle2,
  Gamepad2,
  ShoppingBag,
  Film,
  BookOpen,
  RotateCcw,
  CreditCard,
  Sparkles
} from 'lucide-react';
import CogetherAvatarRenderer from './CogetherAvatarRenderer';

const COGETHER_SERVICES = [
  {
    id: 'coplay',
    name: 'CoPlay',
    tagline: 'Play together live',
    icon: Gamepad2
  },
  {
    id: 'coshop',
    name: 'CoShop',
    tagline: 'Shop side by side',
    icon: ShoppingBag
  },
  {
    id: 'cowatch',
    name: 'CoWatch',
    tagline: 'Watch in sync',
    icon: Film
  },
  {
    id: 'costudy',
    name: 'CoStudy',
    tagline: 'Focus in flow',
    icon: BookOpen
  }
];

// Normalized Z-trajectory vertices in viewport coordinates (0..1)
// Mirrors the energetic angular Z slash from the reference image
const Z_VERTICES = [
  { x: 0.13, y: 0.30 }, // V0: Upper-left start
  { x: 0.81, y: 0.20 }, // V1: Upper-right turn vertex
  { x: 0.17, y: 0.77 }, // V2: Lower-left turn vertex
  { x: 0.91, y: 0.65 }  // V3: Lower-right endpoint streak
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInCubic(t) {
  return t * t * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Computes position (x, y in 0..1) and tangent angle (degrees) along the 3-segment Z path
 * for normalized progress u in [0, 1].
 */
function sampleZTrajectory(u) {
  const clamped = clamp01(u);
  // Segment weights roughly proportional to visual path length
  // Seg 1: [0, 0.31], Seg 2 (long diagonal): [0.31, 0.71], Seg 3: [0.71, 1.0]
  let segIndex = 0;
  let localT = 0;
  if (clamped < 0.31) {
    segIndex = 0;
    localT = easeInOutCubic(clamped / 0.31);
  } else if (clamped < 0.71) {
    segIndex = 1;
    localT = easeInOutCubic((clamped - 0.31) / 0.40);
  } else {
    segIndex = 2;
    localT = easeOutCubic((clamped - 0.71) / 0.29);
  }

  const p0 = Z_VERTICES[segIndex];
  const p1 = Z_VERTICES[segIndex + 1];
  const x = lerp(p0.x, p1.x, localT);
  const y = lerp(p0.y, p1.y, localT);
  const angleRad = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  const angleDeg = (angleRad * 180) / Math.PI;

  return { x, y, angleRad, angleDeg, segIndex, localT };
}

export default function CogetherMemberCard({
  user,
  profile,
  avatarConfig,
  mode = 'cinematic', // 'cinematic' (Step 7 full-black Z transformation + 4 services) | 'profile' (ProfileModal inspection)
  onSelectService,
  onEnterCogether,
  onEditProfile
}) {
  const cardRef = useRef(null);
  const avatarSvgRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const [downloading, setDownloading] = useState(false);

  // Scene state for cinematic mode:
  // 'reveal' (Scene A) -> 'accelerate' (Scene B) -> 'z-slash' (Scene C) -> 'endpoint' (Scene D) -> 'dissolve' (Scene E) -> 'services' (Part 7)
  const [scene, setScene] = useState(mode === 'cinematic' ? 'reveal' : 'inspect');
  const [showCardOverlayInServices, setShowCardOverlayInServices] = useState(false);
  const [cardTransformStyle, setCardTransformStyle] = useState({});
  const [edgeHeatIntensity, setEdgeHeatIntensity] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Interactive 3D tilt in profile / inspect mode
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, sweepX: 50 });

  const displayName =
    profile?.displayName ||
    profile?.display_name ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() ||
    profile?.username ||
    'CoGether Member';

  const username = (profile?.username || 'member').replace(/^@+/, '');
  const email = user?.email || user?.primaryEmail || '';
  const isEmailVerified = Boolean(user?.emailVerified);
  const memberId = user?.id
    ? `CG-${String(user.id).replace(/-/g, '').slice(0, 8).toUpperCase()}`
    : null;

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Draw a multi-layered fiery glowing stroke between two points on canvas
  const drawFierySegment = useCallback((ctx, x0, y0, x1, y1, alpha = 1, widthScale = 1) => {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Layer 1: Deep crimson outer bloom
    ctx.strokeStyle = `rgba(220, 20, 45, ${0.42 * alpha})`;
    ctx.shadowColor = `rgba(239, 35, 60, ${0.85 * alpha})`;
    ctx.shadowBlur = 42 * widthScale;
    ctx.lineWidth = 26 * widthScale;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // Layer 2: Fiery scarlet-orange mid-glow
    ctx.strokeStyle = `rgba(255, 78, 22, ${0.78 * alpha})`;
    ctx.shadowColor = `rgba(255, 95, 31, ${0.95 * alpha})`;
    ctx.shadowBlur = 22 * widthScale;
    ctx.lineWidth = 12 * widthScale;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // Layer 3: Molten golden-amber inner core
    ctx.strokeStyle = `rgba(255, 195, 75, ${0.92 * alpha})`;
    ctx.shadowColor = `rgba(255, 210, 90, ${0.9 * alpha})`;
    ctx.shadowBlur = 10 * widthScale;
    ctx.lineWidth = 5.5 * widthScale;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // Layer 4: White-hot razor center filament
    ctx.strokeStyle = `rgba(255, 250, 240, ${0.98 * alpha})`;
    ctx.shadowBlur = 4 * widthScale;
    ctx.lineWidth = 2.2 * widthScale;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    ctx.restore();
  }, []);

  // Draw an energetic directional flare burst at a sharp turning vertex
  const drawVertexFlare = useCallback((ctx, x, y, intensity = 1) => {
    if (intensity <= 0.02) return;
    ctx.save();
    const radius = 68 * intensity;
    const grad = ctx.createRadialGradient(x, y, 1, x, y, radius);
    grad.addColorStop(0, `rgba(255, 255, 245, ${0.98 * intensity})`);
    grad.addColorStop(0.18, `rgba(255, 200, 80, ${0.88 * intensity})`);
    grad.addColorStop(0.45, `rgba(255, 65, 25, ${0.52 * intensity})`);
    grad.addColorStop(1, 'rgba(220, 20, 45, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Cross-streak anamorphic spike at vertex
    ctx.strokeStyle = `rgba(255, 235, 195, ${0.85 * intensity})`;
    ctx.lineWidth = 2.2 * intensity;
    ctx.beginPath();
    ctx.moveTo(x - 46 * intensity, y - 8 * intensity);
    ctx.lineTo(x + 46 * intensity, y + 8 * intensity);
    ctx.moveTo(x - 22 * intensity, y + 26 * intensity);
    ctx.lineTo(x + 22 * intensity, y - 26 * intensity);
    ctx.stroke();
    ctx.restore();
  }, []);

  // Orchestrate Scenes A -> B -> C -> D -> E -> Part 7 Services
  const runCinematicSequence = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    setShowCardOverlayInServices(false);

    // Respect prefers-reduced-motion: show card calmly then transition to services
    if (reducedMotion) {
      setScene('reveal');
      setCardTransformStyle({
        transform: 'translate3d(0px, 0px, 0px) rotateX(0deg) rotateY(0deg) scale(1)',
        opacity: 1
      });
      setEdgeHeatIntensity(0);
      const timer = setTimeout(() => {
        setScene('services');
      }, 2000);
      return () => clearTimeout(timer);
    }

    const startTime = performance.now();

    // Timeline boundaries (ms)
    const T_REVEAL_END = 2200;     // Scene A: 0 -> 2200ms (Card Reveal & 3D poise at center)
    const T_ACCEL_END = 2750;      // Scene B: 2200 -> 2750ms (Card accelerates to upper-left V0)
    const T_ZSLASH_END = 4350;     // Scene C: 2750 -> 4350ms (Card carves 3-segment Z trajectory)
    const T_ENDPOINT_END = 4720;   // Scene D: 4350 -> 4720ms (Card compresses edge-on into bright streak at V3)
    const T_DISSOLVE_END = 5380;   // Scene E: 4720 -> 5380ms (Z trail fragments into tiny embers & dims to pure black)
    const T_BLACK_HOLD_END = 5620; // Pure #000000 rest beat before Part 7 services emerge

    // Particle systems for tangent sparks and Scene E fragmentation
    const sparks = [];
    let dissolveParticles = null;

    const spawnSpark = (x, y, angleRad, speedMult = 1) => {
      const spread = (Math.random() - 0.5) * 1.15;
      const dir = angleRad + Math.PI + spread;
      const speed = (2.2 + Math.random() * 6.5) * speedMult;
      sparks.push({
        x,
        y,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed + (Math.random() - 0.5) * 1.6,
        radius: 1.1 + Math.random() * 2.4,
        life: 1.0,
        decay: 0.024 + Math.random() * 0.032,
        warmth: Math.random() // 0: crimson-orange, 1: white-gold
      });
    };

    const buildDissolveParticles = (w, h) => {
      const pts = [];
      const totalSamples = 155;
      for (let i = 0; i < totalSamples; i++) {
        const u = i / (totalSamples - 1);
        const pos = sampleZTrajectory(u);
        const jitterX = (Math.random() - 0.5) * 14;
        const jitterY = (Math.random() - 0.5) * 14;
        pts.push({
          x: pos.x * w + jitterX,
          y: pos.y * h + jitterY,
          vx: (Math.random() - 0.5) * 1.8,
          vy: (Math.random() - 0.5) * 1.8 - 0.4,
          radius: 1.0 + Math.random() * 2.3,
          alpha: 0.65 + Math.random() * 0.35,
          decay: 0.022 + Math.random() * 0.028,
          gold: Math.random() > 0.35
        });
      }
      return pts;
    };

    const tick = (now) => {
      const elapsed = now - startTime;
      const canvas = canvasRef.current;
      const w = window.innerWidth || 1280;
      const h = window.innerHeight || 720;

      if (canvas) {
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
      }
      const ctx = canvas ? canvas.getContext('2d') : null;
      if (ctx) {
        ctx.clearRect(0, 0, w, h);
      }

      // ──────────────────────────────────────────────────────────────
      // SCENE A: CARD REVEAL AT CENTER (0 -> 2200ms)
      // ──────────────────────────────────────────────────────────────
      if (elapsed < T_REVEAL_END) {
        setScene('reveal');
        const p = clamp01(elapsed / T_REVEAL_END);
        const entryEase = easeOutCubic(clamp01(elapsed / 900));
        // Subtle 3D entrance rotation + poised breathing tilt
        const rotY = lerp(-28, 0, entryEase) + Math.sin(p * Math.PI * 2) * 4.5;
        const rotX = lerp(18, 0, entryEase) + Math.cos(p * Math.PI * 2) * 3.0;
        const scale = lerp(0.84, 1.0, entryEase);

        setEdgeHeatIntensity(0);
        setCardTransformStyle({
          transform: `translate3d(0px, 0px, 0px) perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
          opacity: clamp01(elapsed / 380),
          filter: 'blur(0px)'
        });
      }

      // ──────────────────────────────────────────────────────────────
      // SCENE B: CARD ACCELERATES TO UPPER-LEFT V0 (2200 -> 2750ms)
      // ──────────────────────────────────────────────────────────────
      else if (elapsed < T_ACCEL_END) {
        setScene('accelerate');
        const p = clamp01((elapsed - T_REVEAL_END) / (T_ACCEL_END - T_REVEAL_END));
        const ease = easeInCubic(p);

        const targetX = (Z_VERTICES[0].x - 0.5) * w;
        const targetY = (Z_VERTICES[0].y - 0.5) * h;
        const curX = lerp(0, targetX, ease);
        const curY = lerp(0, targetY, ease);

        // Card banks sharply in 3D and compresses into an aerodynamic blade profile
        const rotX = lerp(0, 62, ease);
        const rotY = lerp(0, -34, ease);
        const rotZ = lerp(0, -14, ease);
        const scaleX = lerp(1.0, 0.52, ease);
        const scaleY = lerp(1.0, 0.24, ease);

        setEdgeHeatIntensity(ease * 0.85);
        setCardTransformStyle({
          transform: `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0px) perspective(1200px) rotateZ(${rotZ.toFixed(1)}deg) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) scale3d(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}, 1)`,
          opacity: 1,
          filter: `blur(${(ease * 1.6).toFixed(2)}px)`
        });

        // Initial ignition sparks as the card reaches V0
        if (ctx && p > 0.35) {
          const sparkX = w * 0.5 + curX;
          const sparkY = h * 0.5 + curY;
          for (let i = 0; i < 3; i++) {
            spawnSpark(sparkX, sparkY, -2.5, 0.9);
          }
          drawVertexFlare(ctx, sparkX, sparkY, (p - 0.35) * 1.1);
        }
      }

      // ──────────────────────────────────────────────────────────────
      // SCENE C: GLOWING Z TRAJECTORY (2750 -> 4350ms)
      // ──────────────────────────────────────────────────────────────
      else if (elapsed < T_ZSLASH_END) {
        setScene('z-slash');
        const u = clamp01((elapsed - T_ACCEL_END) / (T_ZSLASH_END - T_ACCEL_END));
        const sample = sampleZTrajectory(u);

        const cardCenterX = sample.x * w;
        const cardCenterY = sample.y * h;
        const offsetX = cardCenterX - w * 0.5;
        const offsetY = cardCenterY - h * 0.5;

        // Card is banked edge-on along the current Z segment angle
        const edgeTiltX = 76; // Steep edge-on pitch so the metallic rim slices through space
        const scaleX = 0.44;
        const scaleY = 0.11;

        setEdgeHeatIntensity(1);
        setCardTransformStyle({
          transform: `translate3d(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px, 0px) perspective(1200px) rotateZ(${sample.angleDeg.toFixed(1)}deg) rotateX(${edgeTiltX}deg) scale3d(${scaleX}, ${scaleY}, 1)`,
          opacity: 1,
          filter: 'blur(0.8px)'
        });

        if (ctx) {
          const v0x = Z_VERTICES[0].x * w;
          const v0y = Z_VERTICES[0].y * h;
          const v1x = Z_VERTICES[1].x * w;
          const v1y = Z_VERTICES[1].y * h;
          const v2x = Z_VERTICES[2].x * w;
          const v2y = Z_VERTICES[2].y * h;

          // Draw completed and active segments of the Z path
          if (sample.segIndex === 0) {
            drawFierySegment(ctx, v0x, v0y, cardCenterX, cardCenterY, 1, 1);
          } else if (sample.segIndex === 1) {
            drawFierySegment(ctx, v0x, v0y, v1x, v1y, 1, 1);
            drawFierySegment(ctx, v1x, v1y, cardCenterX, cardCenterY, 1, 1.08);
            // Intense turning flare at V1
            const v1Flare = Math.max(0.35, 1 - sample.localT * 0.65);
            drawVertexFlare(ctx, v1x, v1y, v1Flare);
          } else {
            drawFierySegment(ctx, v0x, v0y, v1x, v1y, 1, 0.96);
            drawFierySegment(ctx, v1x, v1y, v2x, v2y, 1, 1.05);
            drawFierySegment(ctx, v2x, v2y, cardCenterX, cardCenterY, 1, 1.12);
            drawVertexFlare(ctx, v1x, v1y, 0.42);
            // Intense turning flare at V2
            const v2Flare = Math.max(0.45, 1 - sample.localT * 0.55);
            drawVertexFlare(ctx, v2x, v2y, v2Flare);
          }

          // Leading white-hot plasma head around the slicing metallic card
          drawVertexFlare(ctx, cardCenterX, cardCenterY, 0.85);

          // Emit tangent sparks from the card's wake
          for (let s = 0; s < 5; s++) {
            spawnSpark(cardCenterX, cardCenterY, sample.angleRad, 1.15);
          }
        }
      }

      // ──────────────────────────────────────────────────────────────
      // SCENE D: CARD BECOMES THE FINAL TRAJECTORY STREAK (4350 -> 4720ms)
      // ──────────────────────────────────────────────────────────────
      else if (elapsed < T_ENDPOINT_END) {
        setScene('endpoint');
        const p = clamp01((elapsed - T_ZSLASH_END) / (T_ENDPOINT_END - T_ZSLASH_END));
        const ease = easeOutCubic(p);

        const endVertex = Z_VERTICES[3];
        const prevVertex = Z_VERTICES[2];
        const angleRad = Math.atan2(endVertex.y - prevVertex.y, endVertex.x - prevVertex.x);
        const angleDeg = (angleRad * 180) / Math.PI;

        // Card aligns edge-on and stretches/compresses into a razor-thin luminous streak at V3
        const streakForward = lerp(0, 48, ease);
        const cardCenterX = endVertex.x * w + Math.cos(angleRad) * streakForward;
        const cardCenterY = endVertex.y * h + Math.sin(angleRad) * streakForward;
        const offsetX = cardCenterX - w * 0.5;
        const offsetY = cardCenterY - h * 0.5;

        const scaleX = lerp(0.44, 0.92, ease);
        const scaleY = lerp(0.11, 0.008, ease);

        setEdgeHeatIntensity(1);
        setCardTransformStyle({
          transform: `translate3d(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px, 0px) perspective(1200px) rotateZ(${angleDeg.toFixed(1)}deg) rotateX(87deg) scale3d(${scaleX.toFixed(3)}, ${scaleY.toFixed(4)}, 1)`,
          opacity: lerp(1, 0, easeInCubic(p)),
          filter: 'brightness(2.8) blur(1.5px)'
        });

        if (ctx) {
          const v0x = Z_VERTICES[0].x * w;
          const v0y = Z_VERTICES[0].y * h;
          const v1x = Z_VERTICES[1].x * w;
          const v1y = Z_VERTICES[1].y * h;
          const v2x = Z_VERTICES[2].x * w;
          const v2y = Z_VERTICES[2].y * h;
          const v3x = Z_VERTICES[3].x * w;
          const v3y = Z_VERTICES[3].y * h;

          const trailPulse = 1 - p * 0.15;
          drawFierySegment(ctx, v0x, v0y, v1x, v1y, trailPulse, 0.95);
          drawFierySegment(ctx, v1x, v1y, v2x, v2y, trailPulse, 1.05);
          drawFierySegment(ctx, v2x, v2y, v3x, v3y, 1, 1.12);

          drawVertexFlare(ctx, v1x, v1y, 0.45 * trailPulse);
          drawVertexFlare(ctx, v2x, v2y, 0.55 * trailPulse);
          // Endpoint compression streak flare
          drawVertexFlare(ctx, cardCenterX, cardCenterY, 1.15 * (1 - p * 0.6));
        }
      }

      // ──────────────────────────────────────────────────────────────
      // SCENE E: TRAIL DISSOLVES INTO PURE BLACK (4720 -> 5380ms)
      // ──────────────────────────────────────────────────────────────
      else if (elapsed < T_DISSOLVE_END) {
        setScene('dissolve');
        const p = clamp01((elapsed - T_ENDPOINT_END) / (T_DISSOLVE_END - T_ENDPOINT_END));

        setCardTransformStyle({
          transform: 'translate3d(0px, 0px, 0px) scale(0)',
          opacity: 0,
          pointerEvents: 'none'
        });

        if (ctx) {
          if (!dissolveParticles) {
            dissolveParticles = buildDissolveParticles(w, h);
          }

          // First 22% of Scene E: continuous trail rapidly thins as it breaks into ember points
          if (p < 0.28) {
            const lineFade = 1 - p / 0.28;
            const v0x = Z_VERTICES[0].x * w;
            const v0y = Z_VERTICES[0].y * h;
            const v1x = Z_VERTICES[1].x * w;
            const v1y = Z_VERTICES[1].y * h;
            const v2x = Z_VERTICES[2].x * w;
            const v2y = Z_VERTICES[2].y * h;
            const v3x = Z_VERTICES[3].x * w;
            const v3y = Z_VERTICES[3].y * h;

            drawFierySegment(ctx, v0x, v0y, v1x, v1y, lineFade * 0.65, lineFade * 0.7);
            drawFierySegment(ctx, v1x, v1y, v2x, v2y, lineFade * 0.75, lineFade * 0.75);
            drawFierySegment(ctx, v2x, v2y, v3x, v3y, lineFade * 0.75, lineFade * 0.75);
          }

          // Render & decay tiny luminous points until 100% pure black
          const globalFade = 1 - easeInCubic(p);
          for (let i = 0; i < dissolveParticles.length; i++) {
            const pt = dissolveParticles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.alpha = Math.max(0, pt.alpha - pt.decay);
            const a = pt.alpha * globalFade;
            if (a <= 0.01) continue;

            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = pt.gold
              ? `rgba(255, 215, 130, ${a})`
              : `rgba(255, 75, 35, ${a})`;
            ctx.shadowColor = pt.gold
              ? `rgba(255, 190, 80, ${a})`
              : `rgba(235, 30, 50, ${a})`;
            ctx.shadowBlur = 6;
            ctx.arc(pt.x, pt.y, pt.radius * globalFade, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // ──────────────────────────────────────────────────────────────
      // PURE BLACK BEAT BEFORE PART 7 SERVICES (5380 -> 5620ms)
      // ──────────────────────────────────────────────────────────────
      else if (elapsed < T_BLACK_HOLD_END) {
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
        }
      }

      // ──────────────────────────────────────────────────────────────
      // PART 7: REVEAL FOUR-SERVICE CHOICE AT CENTER OF PURE #000000
      // ──────────────────────────────────────────────────────────────
      else {
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
        }
        setScene('services');
        return; // End animation loop cleanly
      }

      // Update & render active tangent sparks during Scenes B, C, D, E
      if (ctx && sparks.length > 0 && elapsed < T_DISSOLVE_END) {
        for (let i = sparks.length - 1; i >= 0; i--) {
          const sp = sparks[i];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.06; // subtle gravity
          sp.life -= sp.decay;
          if (sp.life <= 0) {
            sparks.splice(i, 1);
            continue;
          }
          ctx.save();
          ctx.beginPath();
          ctx.fillStyle =
            sp.warmth > 0.45
              ? `rgba(255, 235, 175, ${sp.life})`
              : `rgba(255, 82, 32, ${sp.life})`;
          ctx.shadowColor = `rgba(255, 65, 25, ${sp.life * 0.9})`;
          ctx.shadowBlur = 6;
          ctx.arc(sp.x, sp.y, sp.radius * sp.life, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [reducedMotion, drawFierySegment, drawVertexFlare]);

  // Trigger sequence automatically in cinematic mode
  useEffect(() => {
    if (mode !== 'cinematic') {
      setScene('inspect');
      return;
    }
    const cleanup = runCinematicSequence();
    return () => {
      if (cleanup) cleanup();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mode, runCinematicSequence]);

  const handleCardPointerMove = (e) => {
    if (mode === 'cinematic' && scene !== 'reveal' && !showCardOverlayInServices) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / Math.max(1, rect.width);
    const ny = (e.clientY - rect.top) / Math.max(1, rect.height);
    const ry = (nx - 0.5) * 14;
    const rx = (0.5 - ny) * 10;
    setTilt({ rx, ry, sweepX: nx * 100 });
  };

  const handleCardPointerLeave = () => {
    setTilt({ rx: 0, ry: 0, sweepX: 50 });
  };

  const handlePrintCard = () => {
    window.print();
  };

  const handleDownloadCard = async () => {
    if (!avatarSvgRef.current || downloading) return;
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 560;
      const ctx = canvas.getContext('2d');

      // 1. Machined Brushed-Silver Metallic Background
      const bgGrad = ctx.createLinearGradient(0, 0, 960, 560);
      bgGrad.addColorStop(0, '#E4E7EC');
      bgGrad.addColorStop(0.28, '#F5F7FA');
      bgGrad.addColorStop(0.52, '#C8CDD6');
      bgGrad.addColorStop(0.78, '#E6E9EF');
      bgGrad.addColorStop(1, '#AEB5C2');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(0, 0, 960, 560, 36);
      ctx.fill();

      // Fine horizontal brushed-metal micro-grain lines
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(0, 0, 960, 560, 36);
      ctx.clip();
      for (let y = 0; y < 560; y += 2) {
        ctx.fillStyle = y % 4 === 0 ? 'rgba(255, 255, 255, 0.18)' : 'rgba(15, 23, 42, 0.035)';
        ctx.fillRect(0, y, 960, 1);
      }
      ctx.restore();

      // Polished silver outer bevel border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // 2. Render SVG avatar onto canvas inside machined silver frame
      const svgXml = new XMLSerializer().serializeToString(avatarSvgRef.current);
      const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(56, 104, 268, 268, 28);
          ctx.fillStyle = '#D5DAE2';
          ctx.fill();
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.clip();
          ctx.drawImage(img, 56, 104, 268, 268);
          ctx.restore();
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        img.src = url;
      });

      // 3. Draw engraved metallic typography
      ctx.fillStyle = '#D91B42';
      ctx.font = '800 17px Inter, Segoe UI, sans-serif';
      ctx.fillText('COGETHER DIGITAL MEMBER CARD', 364, 142);

      ctx.fillStyle = '#141821';
      ctx.font = '800 44px Inter, Segoe UI, sans-serif';
      ctx.fillText(displayName.slice(0, 24), 364, 208);

      ctx.fillStyle = '#3E4656';
      ctx.font = '700 24px Inter, Segoe UI, sans-serif';
      ctx.fillText(`@${username}`, 364, 250);

      if (isEmailVerified && email) {
        ctx.fillStyle = '#0F5132';
        ctx.font = '600 17px Inter, Segoe UI, sans-serif';
        ctx.fillText(`Verified · ${email}`, 364, 308);
      }

      if (memberId) {
        ctx.fillStyle = '#475062';
        ctx.font = '700 16px monospace';
        ctx.fillText(`ID ${memberId}`, 364, 356);
      }

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `cogether-card-${username}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Card export fallback error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleServiceClick = (serviceId) => {
    if (onSelectService) {
      onSelectService(serviceId);
    } else if (onEnterCogether) {
      onEnterCogether(serviceId);
    }
  };

  // Render the Brushed-Silver Metallic Card element
  const renderMetallicSilverCard = (extraStyle = {}, isInteractiveTilt = false) => {
    const combinedTransform = isInteractiveTilt
      ? {
          transform: `perspective(1200px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
          '--silver-sweep-x': `${tilt.sweepX.toFixed(1)}%`
        }
      : extraStyle;

    return (
      <div
        ref={cardRef}
        className={`cogether-titanium-card cogether-brushed-silver-card printable-member-card ${
          edgeHeatIntensity > 0.05 ? 'is-z-heated' : ''
        }`}
        style={{
          ...combinedTransform,
          '--edge-heat': edgeHeatIntensity
        }}
        onPointerMove={handleCardPointerMove}
        onPointerLeave={handleCardPointerLeave}
        data-testid="cogether-member-card"
      >
        {/* Fine horizontal brushed-metal texture + anisotropic silver reflections */}
        <div className="silver-brushed-grain" aria-hidden="true" />
        <div className="silver-anisotropic-cone" aria-hidden="true" />
        <div className="silver-light-sweep" aria-hidden="true" />
        <div className="silver-bevel-border" aria-hidden="true" />
        <div className="silver-z-rim-heat" aria-hidden="true" />

        {/* Card Top Row: Red CoGether Logo & Engraved Member ID */}
        <div className="titanium-card-top">
          <div className="titanium-brand-group">
            <img
              src="/cogether-transparent-hd.png"
              alt="CoGether"
              className="titanium-brand-logo"
            />
            <span className="titanium-card-tag">COGETHER MEMBER</span>
          </div>
          {memberId && (
            <span className="titanium-member-id" title={`Member UUID: ${user?.id}`}>
              {memberId}
            </span>
          )}
        </div>

        {/* Card Main Body: Custom SVG Avatar + Engraved Identity Metadata */}
        <div className="titanium-card-body">
          <div className="titanium-avatar-frame silver-avatar-recess">
            <CogetherAvatarRenderer
              config={avatarConfig || profile?.avatarConfig || profile?.avatar_config}
              size={112}
              animated={true}
              showBackdrop={true}
              svgRef={avatarSvgRef}
              ariaLabel={`${displayName}'s CoGether Avatar`}
            />
          </div>

          <div className="titanium-identity-details">
            <h3 className="titanium-display-name" data-testid="member-card-display-name">
              {displayName}
            </h3>
            <div className="titanium-username" data-testid="member-card-username">
              @{username}
            </div>

            {isEmailVerified && (
              <div className="titanium-email-status" data-testid="member-card-email-verified">
                <CheckCircle2 size={13} className="verified-icon" />
                <span>Verified{email ? ` · ${email}` : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Bottom Metallic Micro-Bar (No rainbow circular indicator) */}
        <div className="titanium-card-footer">
          <span className="titanium-footer-label">PRECISION BRUSHED TITANIUM · COGETHER PASS</span>
          <span className="titanium-etched-serial">
            {memberId ? `SER // ${memberId}` : 'VERIFIED IDENTITY'}
          </span>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // MODE 1: PROFILE MODAL / STATIC INSPECTION VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (mode === 'profile') {
    return (
      <div className="flow-member-card-stage is-profile-card-view" data-testid="member-card-stage">
        {renderMetallicSilverCard({}, true)}

        <div className="flow-member-actions-group">
          <div className="flow-member-secondary-actions">
            {onEditProfile && (
              <button
                type="button"
                className="flow-secondary-chip-btn"
                onClick={onEditProfile}
                data-testid="member-card-edit-btn"
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </button>
            )}
            <button
              type="button"
              className="flow-secondary-chip-btn"
              onClick={handlePrintCard}
              data-testid="member-card-print-btn"
            >
              <Printer size={14} />
              <span>Print Card</span>
            </button>
            <button
              type="button"
              className="flow-secondary-chip-btn"
              onClick={handleDownloadCard}
              disabled={downloading}
              data-testid="member-card-download-btn"
            >
              <Download size={14} />
              <span>{downloading ? 'Saving...' : 'Save Image'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODE 2: CINEMATIC PITCH-BLACK REVEAL, Z-SLASH & FOUR-SERVICE CHOOSER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="flow-cinematic-black-stage"
      data-testid="member-card-stage"
      data-scene={scene}
    >
      {/* Full-viewport Canvas for the Fiery Z-Shaped Trajectory & Ember Particles */}
      <canvas
        ref={canvasRef}
        className="flow-z-trajectory-canvas"
        data-testid="z-trajectory-canvas"
        aria-hidden="true"
      />

      {/* SCENES A, B, C, D: 3D Metallic Brushed-Silver Card in Flight */}
      {(scene !== 'services' || showCardOverlayInServices) && (
        <div
          className={`flow-cinematic-card-anchor ${
            showCardOverlayInServices ? 'is-inspecting-card' : `scene-${scene}`
          }`}
        >
          {renderMetallicSilverCard(
            showCardOverlayInServices ? {} : cardTransformStyle,
            showCardOverlayInServices
          )}

          {/* Subtle utility actions when inspecting card */}
          {showCardOverlayInServices && (
            <div className="flow-cinematic-card-utilities">
              {onEditProfile && (
                <button
                  type="button"
                  className="cinematic-util-pill"
                  onClick={onEditProfile}
                  data-testid="member-card-edit-btn"
                >
                  <Edit3 size={13} />
                  <span>Edit Profile</span>
                </button>
              )}
              <button
                type="button"
                className="cinematic-util-pill"
                onClick={handlePrintCard}
                data-testid="member-card-print-btn"
              >
                <Printer size={13} />
                <span>Print Card</span>
              </button>
              <button
                type="button"
                className="cinematic-util-pill"
                onClick={handleDownloadCard}
                disabled={downloading}
                data-testid="member-card-download-btn"
              >
                <Download size={13} />
                <span>{downloading ? 'Saving...' : 'Save Image'}</span>
              </button>
              <button
                type="button"
                className="cinematic-util-pill is-primary-pill"
                onClick={() => setShowCardOverlayInServices(false)}
                data-testid="back-to-services-btn"
              >
                <Sparkles size={13} />
                <span>Choose Service</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* PART 7: THE FOUR-SERVICE CHOICE AT CENTER OF PURE #000000 VIEWPORT */}
      {scene === 'services' && !showCardOverlayInServices && (
        <div
          className="flow-service-chooser-center"
          data-testid="cogether-service-chooser"
          role="region"
          aria-label="Choose your CoGether experience"
        >
          <div className="flow-service-pills-row">
            {COGETHER_SERVICES.map((srv, idx) => {
              const IconComponent = srv.icon;
              return (
                <button
                  key={srv.id}
                  type="button"
                  className="flow-service-oval-pill"
                  style={{ '--stagger-index': idx }}
                  onClick={() => handleServiceClick(srv.id)}
                  data-testid={`service-choice-${srv.id}`}
                >
                  <span className="service-oval-icon">
                    <IconComponent size={16} />
                  </span>
                  <span className="service-oval-text">
                    <span className="service-oval-name">{srv.name}</span>
                    <span className="service-oval-tagline">{srv.tagline}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Subtle secondary controls to inspect/save the Member Card or replay the Z-flight */}
          <div className="flow-service-footer-controls">
            <button
              type="button"
              className="flow-service-micro-btn"
              onClick={() => setShowCardOverlayInServices(true)}
              data-testid="inspect-member-card-btn"
            >
              <CreditCard size={13} />
              <span>Member Card</span>
            </button>
            <button
              type="button"
              className="flow-service-micro-btn"
              onClick={() => runCinematicSequence()}
              data-testid="replay-z-animation-btn"
            >
              <RotateCcw size={13} />
              <span>Replay</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
