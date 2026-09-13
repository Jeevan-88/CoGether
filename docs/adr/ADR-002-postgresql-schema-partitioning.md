# ADR-002: PostgreSQL Schema Partitioning for Domain Isolation

## Status
Accepted

## Context
Running independent physical database clusters for each microservice during early platform stages adds prohibitive operational overhead and hosting costs. Conversely, a shared single schema creates tight database coupling.

## Decision
We use a **Single PostgreSQL 16 Database Partitioned into Logical Schemas**:
- `identity`: User accounts, credentials, sessions, entitlements.
- `coplay`: Game catalog, match history, verified scores, challenges.
- `cowatch`: Watch party rooms, playlists, reactions.
- `coshop`: Aggregated products, retailer offers, click attribution.
- `costudy`: Study rooms, notes, timers.
- `platform`: Transactional outbox events, feature flags.
- Foreign keys across schemas are strictly prohibited. Each service is assigned a database user restricted to its own schema.

## Consequences
- **Positive**: Low operational cost; simplified connection pooling; easy migration path to independent physical databases when scale warrants.
- **Negative**: Requires discipline and linting to prevent cross-schema joins.
