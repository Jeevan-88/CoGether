# ADR-009: Stateless JWT Entitlements and Guest Access

## Status
Accepted

## Context
CoGether requires frictionless onboarding for instant room joins ("Guest Mode") while supporting authenticated subscriptions ("Pro", "Teams"). Hitting the database on every micro-request or WebSocket event to check user subscriptions degrades throughput and increases database load.

## Decision
Adopt **Cryptographically Signed Stateless JWT Claims**:
- Access tokens contain standard claims: `{ sub, displayName, isGuest, tier, permissions, exp }`.
- Services and WebSocket gateways verify the token's cryptographic signature locally without issuing database read queries.
- Token refresh rotates subscription tier updates within 15 minutes. Immediate revocations are tracked via a Redis revocation bloom filter/set.

## Consequences
- **Positive**: Sub-millisecond authorization evaluation at scale; zero database bottlenecks on signaling and API calls.
- **Negative**: Subscription tier changes take up to 15 minutes to reflect unless token refresh is explicitly triggered.
