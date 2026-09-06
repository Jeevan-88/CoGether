/**
 * BackgroundLibrary.js
 * High-performance, offline-capable background library for CoGether Live Camera Merge.
 * Uses high-resolution procedural SVGs for crisp, zero-latency rendering with no external CORS dependencies.
 */

// Procedural SVG Background Definitions
const SVG_COGETHER_STAGE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <radialGradient id="stageGlow" cx="50%" cy="65%" r="60%">
      <stop offset="0%" stop-color="#1f1f2e" stop-opacity="1"/>
      <stop offset="60%" stop-color="#0e0e14" stop-opacity="1"/>
      <stop offset="100%" stop-color="#070709" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="neonFloor" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFE500" stop-opacity="0.35"/>
      <stop offset="30%" stop-color="#FFE500" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#FFE500" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="yellowBeam" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE500" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#FFE500" stop-opacity="0"/>
    </linearGradient>
    <pattern id="hexGrid" width="40" height="69.282" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
      <path d="M 40 0 L 20 11.547 L 0 0 L 0 23.094 L 20 34.641 L 40 23.094 Z M 0 34.641 L 20 46.188 L 0 57.735 L 0 69.282 L 20 80.829 L 40 69.282 L 40 46.188 L 20 34.641 Z" fill="none" stroke="#FFE500" stroke-width="0.75" stroke-opacity="0.06"/>
    </pattern>
  </defs>
  <!-- Background Base -->
  <rect width="1280" height="720" fill="url(#stageGlow)"/>
  <!-- Hexagonal Matrix Grid -->
  <rect width="1280" height="720" fill="url(#hexGrid)"/>
  <!-- Ambient Stage Spotlights -->
  <circle cx="640" cy="480" r="380" fill="url(#neonFloor)" filter="blur(30px)"/>
  <ellipse cx="280" cy="500" rx="200" ry="60" fill="url(#neonFloor)" filter="blur(20px)"/>
  <ellipse cx="1000" cy="500" rx="200" ry="60" fill="url(#neonFloor)" filter="blur(20px)"/>
  <!-- Floor Horizon Line with Glow -->
  <line x1="0" y1="520" x2="1280" y2="520" stroke="#FFE500" stroke-width="1.5" stroke-opacity="0.4"/>
  <line x1="100" y1="520" x2="1180" y2="520" stroke="#FFE500" stroke-width="3" stroke-opacity="0.6" filter="blur(2px)"/>
  <!-- Perspective Floor Grid Lines -->
  <line x1="640" y1="520" x2="640" y2="720" stroke="#FFE500" stroke-width="1" stroke-opacity="0.12"/>
  <line x1="500" y1="520" x2="320" y2="720" stroke="#FFE500" stroke-width="1" stroke-opacity="0.12"/>
  <line x1="780" y1="520" x2="960" y2="720" stroke="#FFE500" stroke-width="1" stroke-opacity="0.12"/>
  <line x1="360" y1="520" x2="0" y2="720" stroke="#FFE500" stroke-width="1" stroke-opacity="0.1"/>
  <line x1="920" y1="520" x2="1280" y2="720" stroke="#FFE500" stroke-width="1" stroke-opacity="0.1"/>
  <!-- CoGether Gaming Stage Badge Text -->
  <text x="640" y="110" font-family="'Barlow', sans-serif" font-size="28" font-weight="200" letter-spacing="12" fill="#FFE500" fill-opacity="0.3" text-anchor="middle">COGETHER GAMING STAGE</text>
  <rect x="520" y="130" width="240" height="1" fill="#FFE500" fill-opacity="0.2"/>
</svg>
`;

const SVG_CYBER_ARCADE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <radialGradient id="cyberGlow" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#180b2a" stop-opacity="1"/>
      <stop offset="60%" stop-color="#0c0716" stop-opacity="1"/>
      <stop offset="100%" stop-color="#040208" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="cyanNeon" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#ff007f" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#cyberGlow)"/>
  <!-- Arcade Cabinet Silhouettes in distance -->
  <rect x="80" y="300" width="140" height="240" rx="10" fill="#130b20" stroke="#00f0ff" stroke-width="2" stroke-opacity="0.3"/>
  <rect x="95" y="330" width="110" height="80" rx="4" fill="#00f0ff" fill-opacity="0.15"/>
  <rect x="1060" y="300" width="140" height="240" rx="10" fill="#130b20" stroke="#ff007f" stroke-width="2" stroke-opacity="0.3"/>
  <rect x="1075" y="330" width="110" height="80" rx="4" fill="#ff007f" fill-opacity="0.15"/>
  <!-- Neon Floor Perspective Grid -->
  <line x1="0" y1="530" x2="1280" y2="530" stroke="#ff007f" stroke-width="2" stroke-opacity="0.5"/>
  <line x1="640" y1="530" x2="640" y2="720" stroke="#00f0ff" stroke-width="1.5" stroke-opacity="0.3"/>
  <line x1="480" y1="530" x2="280" y2="720" stroke="#00f0ff" stroke-width="1.5" stroke-opacity="0.25"/>
  <line x1="800" y1="530" x2="1000" y2="720" stroke="#00f0ff" stroke-width="1.5" stroke-opacity="0.25"/>
  <text x="640" y="100" font-family="'Barlow', sans-serif" font-size="32" font-weight="200" letter-spacing="10" fill="#00f0ff" fill-opacity="0.35" text-anchor="middle">CYBER ARCADE</text>
</svg>
`;

const SVG_NEON_ARENA = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <radialGradient id="arenaBg" cx="50%" cy="40%" r="80%">
      <stop offset="0%" stop-color="#14192b" stop-opacity="1"/>
      <stop offset="65%" stop-color="#0a0c16" stop-opacity="1"/>
      <stop offset="100%" stop-color="#05060b" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="stadiumBeam" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#arenaBg)"/>
  <polygon points="200,0 280,0 450,540 100,540" fill="url(#stadiumBeam)"/>
  <polygon points="1080,0 1000,0 830,540 1180,540" fill="url(#stadiumBeam)"/>
  <ellipse cx="640" cy="540" rx="550" ry="120" fill="#0e1322" stroke="#38bdf8" stroke-width="2" stroke-opacity="0.4"/>
  <ellipse cx="640" cy="540" rx="360" ry="70" fill="#141d33" stroke="#FFE500" stroke-width="1.5" stroke-opacity="0.45"/>
  <text x="640" y="120" font-family="'Barlow', sans-serif" font-size="30" font-weight="200" letter-spacing="12" fill="#38bdf8" fill-opacity="0.4" text-anchor="middle">NEON ARENA</text>
</svg>
`;

const SVG_DARK_ROOM = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <radialGradient id="darkRoomBg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1c1c24" stop-opacity="1"/>
      <stop offset="60%" stop-color="#121217" stop-opacity="1"/>
      <stop offset="100%" stop-color="#09090b" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="ambientLight" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff7b00" stop-opacity="0.2"/>
      <stop offset="50%" stop-color="#ffe600" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#9d4edd" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#darkRoomBg)"/>
  <line x1="320" y1="0" x2="320" y2="520" stroke="#262630" stroke-width="2"/>
  <line x1="960" y1="0" x2="960" y2="520" stroke="#262630" stroke-width="2"/>
  <rect x="0" y="520" width="1280" height="200" fill="#0d0d12"/>
  <line x1="0" y1="520" x2="1280" y2="520" stroke="#333342" stroke-width="2"/>
  <rect x="0" y="515" width="1280" height="8" fill="url(#ambientLight)" filter="blur(6px)"/>
  <text x="640" y="100" font-family="'Barlow', sans-serif" font-size="26" font-weight="200" letter-spacing="8" fill="#e2e8f0" fill-opacity="0.25" text-anchor="middle">DARK GAMING ROOM</text>
</svg>
`;

const SVG_YELLOW_STAGE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <radialGradient id="yellowStageBg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#242211" stop-opacity="1"/>
      <stop offset="65%" stop-color="#14130a" stop-opacity="1"/>
      <stop offset="100%" stop-color="#090804" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#yellowStageBg)"/>
  <ellipse cx="640" cy="540" rx="480" ry="110" fill="#1c1a0c" stroke="#FFE500" stroke-width="3" stroke-opacity="0.75"/>
  <ellipse cx="640" cy="540" rx="280" ry="60" fill="#2b2812" stroke="#FFE500" stroke-width="2" stroke-opacity="0.9"/>
  <line x1="160" y1="100" x2="160" y2="520" stroke="#FFE500" stroke-width="1.5" stroke-opacity="0.3"/>
  <line x1="1120" y1="100" x2="1120" y2="520" stroke="#FFE500" stroke-width="1.5" stroke-opacity="0.3"/>
  <text x="640" y="110" font-family="'Barlow', sans-serif" font-size="30" font-weight="200" letter-spacing="14" fill="#FFE500" fill-opacity="0.5" text-anchor="middle">YELLOW PODIUM</text>
</svg>
`;

const SVG_MINIMAL_GREY = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <radialGradient id="greyBg" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#333338" stop-opacity="1"/>
      <stop offset="60%" stop-color="#1f1f22" stop-opacity="1"/>
      <stop offset="100%" stop-color="#141416" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#greyBg)"/>
  <line x1="0" y1="540" x2="1280" y2="540" stroke="#4b4b52" stroke-width="1.5" stroke-opacity="0.4"/>
  <text x="640" y="100" font-family="'Barlow', sans-serif" font-size="26" font-weight="200" letter-spacing="8" fill="#ffffff" fill-opacity="0.2" text-anchor="middle">MINIMAL STUDIO</text>
</svg>
`;

function svgToDataUrl(svgString) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString.trim());
}

export const BUILTIN_BACKGROUNDS = [
  {
    id: 'cogether-stage',
    name: 'CoGether Stage',
    isDefault: true,
    dataUrl: svgToDataUrl(SVG_COGETHER_STAGE),
    accentColor: '#FFE500'
  },
  {
    id: 'cyber-arcade',
    name: 'Cyber Arcade',
    dataUrl: svgToDataUrl(SVG_CYBER_ARCADE),
    accentColor: '#00f0ff'
  },
  {
    id: 'neon-arena',
    name: 'Neon Arena',
    dataUrl: svgToDataUrl(SVG_NEON_ARENA),
    accentColor: '#38bdf8'
  },
  {
    id: 'dark-room',
    name: 'Dark Gaming Room',
    dataUrl: svgToDataUrl(SVG_DARK_ROOM),
    accentColor: '#f59e0b'
  },
  {
    id: 'yellow-stage',
    name: 'Yellow Stage',
    dataUrl: svgToDataUrl(SVG_YELLOW_STAGE),
    accentColor: '#FFE500'
  },
  {
    id: 'minimal-grey',
    name: 'Minimal Studio',
    dataUrl: svgToDataUrl(SVG_MINIMAL_GREY),
    accentColor: '#94a3b8'
  }
];

export function getBackgroundById(id, customUrl = null) {
  if (id === 'custom' && customUrl) {
    return {
      id: 'custom',
      name: 'Custom Image',
      dataUrl: customUrl,
      accentColor: '#FFE500'
    };
  }
  return BUILTIN_BACKGROUNDS.find((b) => b.id === id) || BUILTIN_BACKGROUNDS[0];
}
