# Target Architecture Document: CoGether Distributed Platform

## 1. System Vision & Purpose
CoGether is a distributed, multi-tenant, real-time collaboration canvas uniting interactive gaming (CoPlay), synchronized cinema/media watching (CoWatch), social commerce (CoShop), and focused collaborative learning (CoStudy).

The target architecture evolves CoGether into an enterprise-grade platform capable of serving millions of concurrent real-time rooms with sub-100ms interaction latency, 99.99% availability, zero-trust security boundaries, and clear operational cost models.

## 2. High-Level Architectural Topology

```
                                [ Cloudflare Edge / DDoS / CDN ]
                                                |
                               +----------------+----------------+
                               |                                 |
                        (HTTPS REST)                       (WSS WebSockets)
                               v                                 v
                 [ Ingress / API Gateway ]          [ Realtime Signaling Gateway ]
                               |                         (Socket.IO Cluster)
               +---------------+---------------+                 |
               |               |               |                 |
               v               v               v                 v
        [ Identity ]       [ CoPlay ]      [ CoShop ]     [ Redis 7 Cluster ]
        [ Service  ]       [ Service]      [ Service]    (State, Locks, PubSub)
               \               |               /                 |
                \              |              /                  v
            +-------------------------------------+      [ Kafka Event Bus ]
            |      PostgreSQL 16 Multi-Schema     |    (Durable Domain Events)
            | (identity, coplay, cowatch, coshop) |              |
            +-------------------------------------+              v
                                                         [ Async Workers ]
                                                       (Outbox, Analytics, Feeds)
```

## 3. Tiered Transport Separation

To guarantee extreme fault isolation and scalability, communication protocols are strictly segregated by technical domain:

1. **WebRTC Peer-to-Peer Mesh (Media Plane)**:
   - Encapsulates audio, video, and screen-sharing streams.
   - 2 to 4 peers connect directly via encrypted SRTP/DTLS.
   - **Zero media frames** cross backend servers or databases.
   - Evolution path: Dedicated Selective Forwarding Unit (SFU) clusters (LiveKit/Mediasoup) for rooms > 4 participants.

2. **WebSocket / Socket.IO (Realtime Signaling & Coordination Plane)**:
   - Low-latency (<25ms) signaling for SDP offer/answer/ICE exchange.
   - Ephemeral room interactions: chat messages, floating reactions, challenge countdowns, video playback sync (`play`/`pause`/`seek`).
   - Backed by horizontal Redis pub/sub adapter to allow cross-pod message fanout.

3. **Redis 7 Cluster (Ephemeral State & Cache Plane)**:
   - Ephemeral session caches, active room membership sets, sliding-window rate limiters, distributed mutual exclusion locks (Redlock).
   - Never treated as the permanent source of truth; state is rebuildable from PostgreSQL.

4. **Kafka Event Bus (Durable Domain Event Plane)**:
   - Asynchronous, durable, ordered stream of business facts (`user_created`, `game_completed`, `affiliate_click_tracked`, `subscription_updated`).
   - Decoupled from user-facing request latency.
   - Integrated via the Transactional Outbox pattern to prevent dual-write inconsistencies.

5. **PostgreSQL 16 (ACID Source of Truth)**:
   - Master relational store, logically partitioned into isolated schemas with strict role-based access control.
   - Zero foreign keys across service domain schemas.

## 4. Key Non-Negotiable Operational Principles
- **Stateless Application Servers**: Pods can crash or scale horizontally at any time with zero session loss.
- **Graceful Degradation**: If Redis or Kafka encounters transient network partitions, core REST APIs and active WebRTC peer rooms remain operational.
- **Least Privilege**: Services access only their designated database schema and specific Redis keyspaces.
