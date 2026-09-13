# Migration Plan (Strangler Pattern): CoGether

## 1. Migration Strategy Overview

CoGether adopts the **Strangler Fig Application Pattern** to progressively migrate existing monolithic and in-memory components into isolated domain services and persistent data layers without disrupting active production traffic or deleting working features.

```
Monolithic Prototype (Current) ───────────┐
                                          ├───> Facade / Gateway ───> New Modular Packages
Target Distributed Architecture (Future) ─┘
```

---

## 2. Phase-by-Phase Roadmap

### PHASE 0: Audit & Architecture Specification (COMPLETED)
- Inventory codebase, in-memory state, and external dependencies.
- Formulate the 10 architecture specifications and architectural decision records.
- Zero source code changes; preserve all functioning features.

### PHASE 1: Platform Foundation (CURRENT IMPLEMENTATION)
- Create shared contracts (`packages/contracts`), configuration validation (`packages/config`), structured observability (`packages/observability`), auth/entitlements (`packages/auth`), and Redis data access abstractions (`packages/redis`).
- Establish PostgreSQL schemas (`identity`, `coplay`, `cowatch`, `coshop`, `costudy`, `platform`) with versioned migrations.
- Mount standard Kubernetes health probes (`/health/live`, `/health/ready`, `/health/startup`).
- Configure local multi-container development environment (`infra/docker/docker-compose.yml`).
- Verify zero regression across existing UI and legacy routes.

### PHASE 2: CoPlay Production Engine
- Implement `services/coplay/` with PostgreSQL game catalog persistence and Redis room caches.
- Provide authoritative multiplayer game session management and anti-cheat score submission.
- Preserve existing client iframe game players and WebRTC peer camera tiles.

### PHASE 3: CoWatch Cinema Synchronization
- Implement `services/cowatch/` with persistent playlist state and clock-drift consensus algorithms.
- Support YouTube, Vimeo, direct HLS, and WebTorrent media synchronization.

### PHASE 4: CoShop Scalable Commerce Engine
- Migrate in-memory product index into PostgreSQL with full-text search indexing (pgvector / trigram).
- Retain official multi-retailer affiliate adapters (Amazon, Myntra, Flipkart, AJIO).

### PHASE 5: CoStudy Collaborative Learning
- Implement virtual focus rooms, Pomodoro timer state synchronization, and collaborative note-taking.

### PHASE 6 & 7: Enterprise SRE & Global Scale
- Deploy Selective Forwarding Units (SFU) for rooms > 4 participants.
- Provision Kubernetes deployments via Terraform with horizontal autoscaling and multi-region disaster recovery.
