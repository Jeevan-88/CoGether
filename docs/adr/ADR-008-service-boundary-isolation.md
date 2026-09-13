# ADR-008: Service Boundary Isolation and Direct Import Prohibition

## Status
Accepted

## Context
Codebases often experience architectural erosion when backend services directly import internal files, classes, or database models from other domains, recreating an unmaintainable distributed monolith.

## Decision
Enforce **Strict Service Boundary Isolation**:
- Services communicate strictly across public interfaces: HTTP REST, Socket.IO, or Kafka events.
- Direct code imports across domain services are prohibited.
- Shared data transfer objects (DTOs), event payloads, and API signatures must be defined in `packages/contracts/`.

## Consequences
- **Positive**: High maintainability; independent team velocity; clear service contracts.
- **Negative**: Requires defining explicit contracts in `packages/contracts` for shared data structures.
