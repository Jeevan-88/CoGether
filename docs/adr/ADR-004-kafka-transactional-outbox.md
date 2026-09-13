# ADR-004: Kafka and Transactional Outbox Pattern

## Status
Accepted

## Context
Publishing business events (e.g. user registrations, verified game scores, affiliate click tracking) directly to message brokers during HTTP request processing introduces dual-write hazards and distributed failure modes.

## Decision
We adopt **Apache Kafka** for asynchronous domain event streaming, integrated via the **Transactional Outbox Pattern**:
- State mutations and outbox records are inserted within the same local PostgreSQL ACID transaction (`platform.outbox_events`).
- An independent background worker tails pending outbox events and publishes them to Kafka with retry and dead-letter queue (DLQ) support.
- Kafka is never used for high-frequency game ticks or WebRTC media.

## Consequences
- **Positive**: Guaranteed at-least-once delivery; zero data inconsistency from failed broker writes; zero latency penalty on client requests.
- **Negative**: Slight asynchronous delay in downstream event consumption; requires outbox worker monitoring.
