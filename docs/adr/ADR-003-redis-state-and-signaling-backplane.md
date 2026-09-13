# ADR-003: Redis State and Signaling Backplane

## Status
Accepted

## Context
Multi-instance WebSocket signaling servers need to broadcast messages across pods when peers are connected to different physical nodes. Additionally, presence, rate limits, and room locks require sub-millisecond latencies.

## Decision
We adopt **Redis 7** as the ephemeral state store and pub/sub backplane:
- Use `@socket.io/redis-adapter` for transparent cross-pod room event routing.
- Store active room membership in Redis sets (`room:{id}:members`) with TTL expiration.
- Implement distributed mutual exclusion locks via Redlock pattern.
- Implement sliding-window rate limiters.
- Redis is strictly an ephemeral layer; all permanent state is persisted in PostgreSQL.

## Consequences
- **Positive**: Sub-2ms latency for signaling; automatic horizontal scaling of WebSocket gateway pods.
- **Negative**: Adds Redis as a critical runtime dependency for real-time interactions (mitigated with local in-memory fallback for offline dev).
