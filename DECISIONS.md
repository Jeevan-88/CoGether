# Engineering & Architecture Decisions (DECISIONS.md)

**Candidate**: Jeevan Yadav  
**Track Selected**: Part 2 - The Premium Home Page  
**Project**: CoGether (Real-time Co-Watch, Co-Play & Co-Study Web Canvas)  
**Repository**: [https://github.com/Jeevan-88/CoGether.git](https://github.com/Jeevan-88/CoGether.git)  

---

### 1. Why this Design & Architecture Strategy over the Obvious Alternative?

**The Obvious Alternative Rejected:**  
The standard SaaS landing page playbook: a purple-gradient Hero banner, 3 generic feature cards with stock Lucide icons, fake testimonials from "Sarah M. - Product Designer", and a dummy "Sign Up" button that goes to a 404. It looks clean for 2 seconds, but it proves zero engineering capability and has no soul.

**The Strategy Implemented:**  
I designed CoGether as an interactive, high-conviction product canvas inspired by brutalist editorial design (*No Art Music, Lacoste Ace Breaker, Studio Ghibli Lo-Fi aesthetics*). Instead of claiming the product works, the homepage proves the architecture:
- **Interactive Sticky Scroll Stages**: Mathematical scroll-driven viewport lerping that walks the user step-by-step through Co-Watch (synchronous stream syncing), Co-Play (live WebGL arcade canvas), and Co-Study (split 2-way video desk).
- **No Fabricated Social Proof**: No fake ratings, review cards, or invented user counts anywhere on the homepage. The streaming/sports/anime logos in the marquee sections aren't testimonials or partnership claims. CoGether works as a screen-share overlay on top of whatever the user is already watching (Netflix, Hotstar, ESPN+, etc.), so those logos communicate compatibility, the same way a screen-recorder or browser extension would list the apps it works with. No platform listed has endorsed or partnered with CoGether, and none of the copy implies otherwise.
- **Immediate Utility**: Clicking any section does not trigger a fake waitlist; it drops the user directly into working 100+ game WebGL engines, cinema stream overlays, or a WebRTC peer room.

---

### 2. Trade-offs Made Under Time Limit & What I'd Ship with a Full Week

| Decision Made Under Time Limit | Why It Was Made | What I'd Ship With a Full Week |
| :--- | :--- | :--- |
| **Mesh WebRTC via Socket.io Signaling** | Lightweight, zero external cloud dependencies, instant zero-latency peer connection for 2-4 users. | Migrate to an **SFU (Selective Forwarding Unit)** like Mediasoup or LiveKit to support 50+ concurrent synced streams with adaptive bitrate scaling. |
| **Iframe WebGL Game Sandboxing** | Allowed bundling 100+ verified unblocked HTML5 games with zero build-time bundle bloat. | Implement a **custom WebWorker / IndexedDB cache engine** to enable 100% offline gameplay and local multiplayer input synchronization. |
| **Custom Mathematical Sticky Scroll (Lerp)** | Handcrafted JavaScript RAF loop with velocity clamping to ensure smooth 60 FPS transitions across all monitor refresh rates. | Refactor into an isolated GSAP ScrollTrigger timeline plugin for complex reverse-scrub branch histories. |

---

### 3. Tooling Usage, Personal Engineering & Verification

**Tooling & Scaffold Usage:**  
I used LLM assistance as an engineering scratchpad for initial CSS boilerplate exploration and testing regex patterns for iframe embed sanitization.

**What I Personally Engineered, Debugged & Verified Line-by-Line:**
1. **Scroll Pacing & Hold Buffers**: Handcrafted sticky scroll domain ranges, added 2-second hold reading buffers (0.75 to 1.00), and clamped scroll speed so users can comfortably read content.
2. **Strict Mobile (390px) & Desktop (1440px) Layout**: Debugged text clipping on mobile viewports, tuned split-screen grid layouts, eliminated horizontal overflow, and verified full touch response.
3. **Anti-Scraping & Code Hardening (`securityGuard.js`)**: Implemented low-level DOM event interception to disable unauthorized asset theft (blocking F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, dragging image elements, and disabling source maps in Vite production builds).
4. **State Machine & Navigation Flow**: Architected the seamless route switching between Landing Page, Co-Play 100+ Games Hub, and Co-Watch Cinema Room without unnecessary page reloads.

---

### 4. Optional Bonus Easter Egg
- **Interactive 3D Rubik's Cube & Deck Engine**: Located in the Co-Play and Co-Study sections. Users can interact with 3D canvas objects and flip through real manifesto slides.
