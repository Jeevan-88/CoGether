# CoGether

Real-time synchronized web platform for shared media, gaming, and study spaces.

Submitted for the **Acdyon Technologies Frontend Challenge - Part 2: The Premium Home Page**.

For engineering trade-offs and challenge responses, see [DECISIONS.md](./DECISIONS.md).

---

## Overview

CoGether is a synchronized real-time web application built with React, Vite, and WebRTC. The platform provides shared digital spaces with integrated low-latency communication and canvas interactions:

- **Co-Watch**: Synchronized media viewing with floating video and audio communication.
- **Co-Play**: Web-based multiplayer arcade hub with local progress tracking.
- **Co-Study**: Collaborative study desks with audio and shared deck navigation.
- **Access Management**: High-contrast editorial subscription and keypass interface.

---

## Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Installation and Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Jeevan-88/CoGether.git
   cd CoGether
   ```

2. Install dependencies:
   ```bash
   npm install --prefix client
   npm install --prefix server
   ```

3. Run the development server:
   ```bash
   npm --prefix client run dev
   ```

4. Open `http://localhost:5173` in your browser.

---

## Production Build

To compile the production assets:

```bash
npm --prefix client run build
```

---

## Deployment

Configured for deployment on Vercel via root `vercel.json` configuration.

---

## License

Copyright (c) 2026 CoGether Inc. All rights reserved.
