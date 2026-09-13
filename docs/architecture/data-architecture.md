# Data Architecture & Database Ownership Map: CoGether

## 1. Storage Stratification & Data Roles

CoGether applies strict data storage tiering to match durability, consistency, and latency requirements:

| Storage Tier | Technology | Consistency | Latency | Primary Responsibilities | Anti-Patterns (NEVER DO) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Relational Store** | PostgreSQL 16 | Strong (ACID) | 5–20ms | User accounts, entitlements, game catalog, match history, orders, outbox | Never store media frames, high-frequency game ticks, or ephemeral socket connections |
| **In-Memory Store** | Redis 7 Cluster | Eventual / In-Memory | <2ms | Room presence, distributed locks, rate-limit counters, pub/sub signaling | Never treat as sole source of truth for financial/account data; no unbounded keys |
| **Event Stream** | Apache Kafka | Ordered / At-least-once | 10–50ms | Asynchronous domain events, analytics pipelines, outbox event ingestion | Never use as client-facing game transport or peer signaling channel |
| **Object Store** | S3 / MinIO | Eventual | 50–200ms | Game icons, user avatars, product image caches, PDF notes | Never store database backups in public buckets; no unauthenticated writes |

---

## 2. PostgreSQL Schema Ownership Map

To preserve service boundaries while optimizing operational simplicity, CoGether uses a single PostgreSQL cluster partitioned into distinct schemas with dedicated database roles.

```
PostgreSQL Database: cogether
├── schema: identity   (Owner: identity_svc_role)
├── schema: coplay     (Owner: coplay_svc_role)
├── schema: cowatch    (Owner: cowatch_svc_role)
├── schema: coshop     (Owner: coshop_svc_role)
├── schema: costudy    (Owner: costudy_svc_role)
└── schema: platform   (Owner: platform_svc_role)
```

### Schema: `identity`
- `users`: `id (UUID PK)`, `email`, `password_hash`, `display_name`, `avatar_url`, `created_at`, `updated_at`
- `guest_sessions`: `id (UUID PK)`, `guest_id (VARCHAR)`, `display_name`, `expires_at`, `created_at`
- `entitlements`: `id (UUID PK)`, `user_id (UUID)`, `tier (VARCHAR: 'free'|'pro'|'teams')`, `status (VARCHAR)`, `valid_until (TIMESTAMPTZ)`
- `audit_logs`: `id (BIGSERIAL PK)`, `user_id (UUID)`, `action (VARCHAR)`, `ip_address`, `user_agent`, `created_at`

### Schema: `coplay`
- `games`: `id (VARCHAR PK)`, `title`, `description`, `instructions`, `category`, `thumb_url`, `game_url`, `is_multiplayer (BOOLEAN)`, `tags (TEXT[])`, `active (BOOLEAN)`
- `game_sessions`: `id (UUID PK)`, `room_id (VARCHAR)`, `game_id (VARCHAR)`, `host_user_id (VARCHAR)`, `status (VARCHAR)`, `started_at`, `ended_at`
- `scores`: `id (UUID PK)`, `session_id (UUID)`, `user_id (VARCHAR)`, `score (BIGINT)`, `verified (BOOLEAN)`, `created_at`
- `challenges`: `id (UUID PK)`, `room_id (VARCHAR)`, `challenger_id (VARCHAR)`, `opponent_id (VARCHAR)`, `game_id (VARCHAR)`, `winner_id (VARCHAR)`, `status (VARCHAR)`

### Schema: `cowatch`
- `watch_rooms`: `id (UUID PK)`, `room_id (VARCHAR)`, `video_source (VARCHAR)`, `video_id (VARCHAR)`, `current_time (DOUBLE)`, `is_playing (BOOLEAN)`, `created_at`
- `playback_history`: `id (UUID PK)`, `user_id (VARCHAR)`, `video_id (VARCHAR)`, `duration_watched (INTEGER)`, `created_at`

### Schema: `coshop`
- `products`: `id (VARCHAR PK)`, `title`, `brand`, `category`, `thumbnail_url`, `normalized_price (NUMERIC)`, `currency (VARCHAR)`, `rating (NUMERIC)`, `review_count (INTEGER)`
- `retailer_offers`: `id (UUID PK)`, `product_id (VARCHAR)`, `retailer_id (VARCHAR: 'amazon'|'myntra'|'flipkart'|'ajio')`, `price (NUMERIC)`, `url (TEXT)`, `affiliate_url (TEXT)`, `stock_status (VARCHAR)`
- `affiliate_clicks`: `id (UUID PK)`, `user_id (VARCHAR)`, `product_id (VARCHAR)`, `retailer_id (VARCHAR)`, `destination_url (TEXT)`, `created_at`

### Schema: `platform`
- `outbox_events`: `id (UUID PK)`, `aggregate_type (VARCHAR)`, `aggregate_id (VARCHAR)`, `event_type (VARCHAR)`, `payload (JSONB)`, `status (VARCHAR: 'pending'|'published'|'failed')`, `created_at`, `published_at`
- `feature_flags`: `id (VARCHAR PK)`, `description`, `enabled (BOOLEAN)`, `rollout_percentage (INTEGER)`, `updated_at`

---

## 3. Transactional Outbox Pattern

To eliminate dual-write hazards between PostgreSQL and Kafka:
1. Every state mutation transaction writes both the entity update and an event row to `platform.outbox_events` in the same database transaction.
2. A lightweight background worker polls/tails `platform.outbox_events` where `status = 'pending'`.
3. The worker publishes the event to the designated Kafka topic and updates `status = 'published'` with `published_at = NOW()`.
4. Guarantees **At-Least-Once Delivery** to Kafka with zero split-brain inconsistencies.
