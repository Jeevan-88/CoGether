# Service Boundaries & Domain Isolation: CoGether

## 1. Domain-Driven Service Boundaries

CoGether enforces strict logical and physical service boundaries. Services communicate externally via versioned REST APIs or WebSockets, and internally via asynchronous Kafka domain events. Direct database cross-querying is strictly prohibited.

```
+-----------------------------------------------------------------------------------+
|                                 CoGether Gateway                                  |
+-----------------------------------------------------------------------------------+
       |                  |                  |                  |                  |
       v                  v                  v                  v                  v
+--------------+   +--------------+   +--------------+   +--------------+   +--------------+
|   Identity   |   |    CoPlay    |   |   CoWatch    |   |    CoShop    |   |   Realtime   |
|   Service    |   |   Service    |   |   Service    |   |   Service    |   |   Gateway    |
+--------------+   +--------------+   +--------------+   +--------------+   +--------------+
       |                  |                  |                  |                  |
  schema: identity   schema: coplay    schema: cowatch    schema: coshop     state: Redis
```

---

## 2. Service Specifications

### A. Identity & Entitlements Service
- **Domain Responsibilities**:
  - User registration, login, guest session creation, and identity federation.
  - JWT token minting (access tokens: 15-minute expiry; refresh tokens: 7-day sliding).
  - Plan subscription management and entitlement evaluation (`free`, `pro`, `teams`).
  - Cryptographic key rotation and JWKS hosting.
- **Database Ownership**: `identity.*` schema (`users`, `identities`, `sessions`, `entitlements`, `audit_log`).
- **Inbound APIs**:
  - `POST /api/v1/auth/guest` -> Issues short-lived signed guest JWT.
  - `POST /api/v1/auth/login` -> Authenticates credentials, returns session tokens.
  - `GET /api/v1/auth/me` -> Returns active user identity and entitlement claims.
- **Outbound Events**:
  - `cogether.identity.user_created`
  - `cogether.identity.entitlement_updated`

### B. CoPlay Service
- **Domain Responsibilities**:
  - Ingestion, indexing, and categorization of the 2,000+ HTML5 game catalog.
  - Game session lifecycle (room creation, game assignment, player state).
  - Authoritative multiplayer score submission, anti-cheat score validation, and room leaderboards.
  - Challenge mode coordination (ready state, synchronised countdown, winner determination).
- **Database Ownership**: `coplay.*` schema (`games`, `game_sessions`, `scores`, `challenges`, `game_ratings`).
- **Inbound APIs**:
  - `GET /api/v1/coplay/games` (paginated, faceted by category, tags, solo/multiplayer).
  - `POST /api/v1/coplay/sessions` (start a tracked game session).
  - `POST /api/v1/coplay/scores` (submit and verify score).
- **Outbound Events**:
  - `cogether.coplay.session_started`
  - `cogether.coplay.score_submitted`
  - `cogether.coplay.challenge_completed`

### C. CoWatch Service
- **Domain Responsibilities**:
  - Synchronized video room creation and playback orchestration.
  - Provider adapters (YouTube embed, Vimeo, direct HLS streams, screen-share audio/video).
  - Synchronization state machine: master clock, latency drift compensation, consensus seeking.
  - Floating emoji reactions and room chat coordination.
- **Database Ownership**: `cowatch.*` schema (`watch_rooms`, `playlists`, `playback_history`).
- **Inbound APIs**:
  - `POST /api/v1/cowatch/rooms` (initialize watch room).
  - `GET /api/v1/cowatch/rooms/:id/state` (retrieve current video state).
- **Outbound Events**:
  - `cogether.cowatch.room_created`
  - `cogether.cowatch.watch_party_ended`

### D. CoShop Service
- **Domain Responsibilities**:
  - Normalized multi-retailer catalog aggregation (Amazon, Myntra, Flipkart, AJIO).
  - Product deduplication and multi-offer comparison matrix.
  - High-performance indexed search and dynamic facet computation.
  - AI-assisted shopping advisor querying normalized catalog documents.
  - Affiliate compliance, link attribution generation, and click conversion tracking.
  - Shared room shopping list, synchronized wishlist, and multi-retailer cart.
- **Database Ownership**: `coshop.*` schema (`products`, `retailer_offers`, `shared_carts`, `affiliate_clicks`, `wishlists`).
- **Inbound APIs**:
  - `GET /api/v1/coshop/products`
  - `GET /api/v1/coshop/products/:id`
  - `GET /api/v1/coshop/filters`
  - `POST /api/v1/coshop/ai-assistant`
  - `POST /api/v1/coshop/click`
- **Outbound Events**:
  - `cogether.coshop.affiliate_click_recorded`
  - `cogether.coshop.shared_cart_updated`

### E. CoStudy Service
- **Domain Responsibilities**:
  - Focused study rooms with customizable Pomodoro timers.
  - Collaborative synchronized whiteboards and markdown notes.
  - Ambient Lo-Fi / binaural audio streams.
- **Database Ownership**: `costudy.*` schema (`study_rooms`, `focus_sessions`, `notes`).
- **Inbound APIs**:
  - `POST /api/v1/costudy/rooms`
  - `PUT /api/v1/costudy/rooms/:id/timer`
- **Outbound Events**:
  - `cogether.costudy.focus_interval_completed`

### F. Realtime Signaling Gateway
- **Domain Responsibilities**:
  - WebSocket connection termination and heartbeats.
  - WebRTC signaling pass-through (SDP offers, answers, ICE candidates).
  - Real-time room membership management and presence broadcast.
  - Distributed event multiplexing via Redis Pub/Sub adapter.
- **State Store**: Redis 7 ephemeral sets and hash maps (`room:{id}:members`, `user:{id}:presence`).
- **Transport**: Socket.IO / WSS. Zero disk persistence.
