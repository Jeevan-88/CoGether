# CoGether

Real-time synchronized Co-Watch, Co-Play, and Co-Study web platform with multi-peer WebRTC video, shared canvas interaction, and instant web applications.

Submitted for the **Acdyon Technologies Frontend Challenge — Part 2: The Premium Home Page**.

For detailed architectural rationale, technical trade-offs, and engineering decisions, refer to [DECISIONS.md](./DECISIONS.md).

---

## Technical Overview

CoGether is built as an interactive product canvas that demonstrates real functionality directly on the landing surface. Instead of relying on static mockups or fabricated claims, every section on the page links directly to working sub-systems:

- **Co-Watch Cinema Hub**: Synchronized media viewing with integrated low-latency WebRTC floating camera and microphone overlay.
- **Co-Play Arcade**: Curated catalog of 100+ unblocked HTML5/WebGL games with real-time multiplayer room creation, score tracking, and local progress persistence.
- **Co-Study Virtual Desk**: Split-screen video study space with synchronized audio and manifesto deck navigation.
- **Master Keypass Architecture**: Monochromatic editorial checkout interface with high-contrast accessibility and zero third-party tracking overhead.

---

## Architectural Highlights

### 1. Mathematical Sticky Scroll & Viewport Lerping
- Handcrafted requestAnimationFrame rendering loop with velocity clamping.
- Paced scroll progress domains with dedicated 2-second hold buffers to ensure content readability across arbitrary trackpad/wheel input speeds.

### 2. Peer-to-Peer WebRTC Engine
- Direct mesh peer connectivity for ultra-low latency audio/video streams.
- Client-side signaling abstraction via Socket.io with automatic room code generation and clipboard synchronization.

### 3. Anti-Theft & Code Protection Layer (`securityGuard.js`)
- Context menu and keyboard shortcut interception (`F12`, `Ctrl+Shift+I`, `Ctrl+U`, `Ctrl+S`, `Ctrl+P`).
- Asset drag prevention across all image, canvas, and video elements.
- Hardened production build configuration with disabled sourcemaps and identifier mangling.

### 4. Zero Fabricated Social Proof
- No fake review cards, generated five-star ratings, or invented user testimonials.
- Platform brand identifiers communicate technical compatibility for screen-share overlay functionality, with no partnership or endorsement implied.

---

## Project Structure

```
video-call-app/
├── DECISIONS.md              # Engineering decisions and design document
├── vercel.json               # Vercel deployment configuration
├── package.json              # Root project configuration
├── server/                   # WebRTC signaling and backend services
│   ├── server.js
│   └── package.json
└── client/                   # React frontend client
    ├── index.html
    ├── vite.config.js
    ├── vercel.json
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── LandingPage.jsx
    │   ├── LandingPage.css
    │   ├── CoWatchCinemaHub.jsx
    │   ├── CoWatchCinemaHub.css
    │   ├── CoPlayGamesHub.jsx
    │   ├── CoPlayGamesHub.css
    │   ├── VideoRoom.jsx
    │   ├── WatchPartyRoom.jsx
    │   ├── MergedCameraView.jsx
    │   ├── useWebRTC.js
    │   ├── securityGuard.js
    │   ├── fullGamesCatalog.js
    │   └── cinemaCatalog.js
    └── public/
```

---

## Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Jeevan-88/CoGether.git
   cd CoGether
   ```

2. Install dependencies for client and server:
   ```bash
   npm install --prefix client
   npm install --prefix server
   ```

3. Start the Vite client development server:
   ```bash
   npm --prefix client run dev
   ```

4. Open `http://localhost:5173` in your browser.

### Production Build

To generate an optimized production bundle:

```bash
npm --prefix client run build
```

---

## Deployment

The project is pre-configured for single-command deployment on Vercel:

1. Import the repository into Vercel.
2. The root `vercel.json` automatically executes the client build (`npm --prefix client run build`) and maps the output directory (`client/dist`) with single-page application routing rules.

---

## License

Copyright (c) 2026 CoGether Inc. Architecture and implementation by Jeevan Yadav. All rights reserved.
