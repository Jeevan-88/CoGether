# ADR-001: Modular Monorepo Architecture

## Status
Accepted

## Context
CoGether comprises frontend client interfaces, multiple backend services (Identity, CoPlay, CoWatch, CoShop, CoStudy), shared contracts, configuration, and infrastructure definitions. We need a repository structure that avoids premature microservice sprawl while enforcing clear domain boundaries.

## Decision
We adopt a **Modular Monorepo** structure:
- Single repository housing `client/`, `services/`, `packages/`, `infra/`, and `docs/`.
- Shared code resides in versioned packages under `packages/` (`contracts`, `config`, `auth`, `observability`, `database`, `redis`).
- Backend services are physically separated into decoupled directories with zero cross-imports.

## Consequences
- **Positive**: Atomic commits across services and contracts; unified CI/CD pipelines; simplified local development.
- **Negative**: Requires strict linting and boundary validation to prevent unauthorized cross-package imports.
