# Event Map & Kafka Topic Specification: CoGether

## 1. Event Streaming Architecture

CoGether utilizes Apache Kafka as the durable, append-only domain event backbone. Domain events represent immutable historical facts published via the Transactional Outbox pattern.

```
[ Application Service ]
         |
         | (Local ACID Transaction)
         v
[ PostgreSQL (outbox_events) ]
         |
         | (CDC / Outbox Tailer Worker)
         v
+-------------------------------------------------------------+
|                     Kafka Message Broker                    |
+-------------------------------------------------------------+
   |                  |                  |                 |
   v                  v                  v                 v
[ Audit Worker ] [ Analytics ]    [ Push Notifs ]   [ Search Ingestion ]
```

---

## 2. Topic Naming Convention & Partitioning

Format: `cogether.<domain>.<entity>.<event_type>`

| Topic Name | Partition Key | Retention | Compaction | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cogether.identity.user.lifecycle` | `userId` | 365 days | Enabled | Account creation, profile updates, status changes |
| `cogether.identity.entitlement.updated` | `userId` | 365 days | Enabled | Subscription upgrades, tier cancellations, renewals |
| `cogether.coplay.game_session.lifecycle` | `sessionId` | 30 days | Disabled | Game sessions started, paused, ended |
| `cogether.coplay.score.recorded` | `gameId` | 90 days | Disabled | Authoritative verified game scores for leaderboards |
| `cogether.cowatch.room.lifecycle` | `roomId` | 14 days | Disabled | Watch party room start, media switches, terminations |
| `cogether.coshop.click.recorded` | `productId` | 180 days | Disabled | Affiliate link conversions and click attribution |
| `cogether.platform.audit.log` | `userId` | 730 days | Disabled | Compliance audit events, admin interventions |

---

## 3. Standard Event Envelope

All events emitted to Kafka conform to the shared CloudEvents-aligned envelope:

```json
{
  "eventId": "e9b53112-9c10-4cf0-8b17-062e21b71234",
  "eventType": "cogether.coplay.score.recorded",
  "aggregateId": "sess_89f029",
  "aggregateType": "game_session",
  "schemaVersion": "1.0.0",
  "timestamp": "2026-09-13T16:05:00.000Z",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "producer": "coplay-service",
  "data": {
    "sessionId": "sess_89f029",
    "roomId": "ROOM-7821",
    "userId": "user_2048x",
    "gameId": "2048",
    "score": 16384,
    "verified": true,
    "durationSeconds": 482
  }
}
```

---

## 4. Consumer Invariants & Idempotency
- **Idempotent Consumers**: Every consumer must track processed `eventId` values within a transactional deduplication store (or Redis bloom filter/PostgreSQL table) before mutating local state.
- **Dead Letter Queue (DLQ)**: Events failing processing after 3 exponential backoff retries are shunted to `cogether.<domain>.dlq` with failure headers for operator inspection.
- **Zero Realtime Leaks**: High-frequency controller/joystick ticks and WebRTC signaling are **strictly prohibited** from entering Kafka.
