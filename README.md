# CoGether

> Real-time shared social spaces across **Co-Watch**, **Co-Play**, **Co-Shop**, and **Co-Study**, backed by WebRTC, Socket.IO, Express, PostgreSQL, and Redis.

Live web app: `https://www.cogether.tech` · API & Signaling gateway: `https://api.cogether.tech`

---

## Architecture Overview

- **Frontend (`client/`)**: Vite + React 18 SPA featuring custom 3D hardware stages (Three.js), MediaPipe body-segmentation camera compositor (`Small` / `Medium` / `Large` & merged stage), WebRTC mesh peers, shared social sidebar, and responsive mobile support.
- **API & Realtime Server (`server/`)**: Express + Socket.IO server providing unified Argon2id + JWT/HttpOnly-cookie authentication (`server/routes/auth.js`), billing entitlement routes (`server/routes/billing.js`), privacy-safe telemetry (`server/routes/telemetry.js`), social friends/DMs (`server/server.js`), Co-Watch/Co-Play/Co-Shop/Co-Study engines, and WebRTC signaling.
- **Shared Core (`packages/`, `services/`)**:
  - `packages/database/`: PostgreSQL connection pool, sequential SQL migrations (`001`–`018` with RLS in `017`), and local dev simulation fallback.
  - `packages/auth/`: JWT signing/verification, Argon2id hashing, MFA/TOTP utilities, session token rotation with reuse detection, and Google OAuth helpers.
  - `services/identity/`: User lifecycle, profile auto-provisioning, and transactional email delivery (`Resend` / `SMTP`).

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ and Redis 7+ (local dev falls back cleanly to in-memory simulation when PostgreSQL/Redis are offline)

### Setup
1. Install dependencies:
   ```bash
   npm install
   cd server && npm install && cd ..
   ```
2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
   Fill in `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and email delivery credentials (`RESEND_API_KEY` + `FROM_EMAIL` or `SMTP_*`).
3. Run database migrations:
   ```bash
   node packages/database/migrator.js
   ```
4. Start both frontend & backend:
   ```bash
   # Terminal 1 (API & Socket.IO on port 3001)
   cd server && npm start

   # Terminal 2 (Vite dev server on port 5173)
   npm run dev
   ```

---

## Testing & Verification

```bash
# Build production frontend bundle
npm run build

# Run core verification suites
node test/auth_end_to_end.test.js
node test/frontend_api_configuration.test.js
node test/coshop_admin.test.js

# Run full automated regression suite
npm test
```

---

## Deployment & Operations

- **Frontend (`Vercel`)**: Builds the Vite SPA from `client/` (`vercel.json` rewrites `/api/(.*)` to `https://api.cogether.tech/api/$1` and SPA routes to `/index.html`). Set `VITE_API_URL=https://api.cogether.tech` and `VITE_SIGNALING_URL=https://api.cogether.tech` in Vercel Environment Variables.
- **Backend (`AWS ECS`, `.github/workflows/deploy-production.yml`)**: Docker image built from `server/` and deployed on release tags (`v*.*.*`) or manual `workflow_dispatch`.
- **Database Backups (`.github/workflows/db-backup.yml`)**: Runs `node scripts/backup-database.js` daily at 02:00 UTC using `DATABASE_URL` and optional S3/R2 bucket secrets.
- **Legal & Support Routes**: `/privacy`, `/terms`, `/verify-email`, `/forgot-password`, `/reset-password`, `/dashboard`, and custom `/404` catch-all.
