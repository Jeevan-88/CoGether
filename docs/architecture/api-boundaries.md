# API Boundary Map & Contract Specification: CoGether

## 1. Global API Standards

- **Protocol**: HTTPS / TLS 1.3 for REST; WSS for WebSockets.
- **URI Prefix**: `/api/v1/` for all public and internal REST services.
- **Payload Format**: Strict JSON (`application/json; charset=utf-8`).

### Standard Headers
| Header Name | Type | Direction | Description |
| :--- | :--- | :--- | :--- |
| `X-Request-Id` | UUIDv4 | Request / Response | Unique identifier for request tracking across hops |
| `X-Trace-Id` | Hex string | Request / Response | OpenTelemetry W3C distributed trace identifier |
| `Authorization` | String | Request | Bearer JWT token (`Bearer <token>`) |
| `X-RateLimit-Limit` | Integer | Response | Maximum requests permitted in time window |
| `X-RateLimit-Remaining` | Integer | Response | Requests remaining in current window |
| `X-RateLimit-Reset` | Integer | Response | Unix epoch timestamp of window reset |

### Standard Error Response Envelope
```json
{
  "error": {
    "code": "ENTITLEMENT_REQUIRED",
    "message": "The requested feature requires a Pro or Teams subscription.",
    "details": {
      "requiredTier": "pro",
      "currentTier": "free"
    },
    "requestId": "c71a39fd-2e77-4950-b0ff-90a8a76d1e4c",
    "timestamp": "2026-09-13T16:00:00.000Z"
  }
}
```

---

## 2. Endpoint Inventory

### System & Health Endpoints
- `GET /health/live` -> HTTP 200 `{ status: "ok", timestamp: ISO }` (Process liveness).
- `GET /health/ready` -> HTTP 200/503 `{ status: "ready"|"not_ready", checks: { postgres: true, redis: true } }` (Readiness).
- `GET /health/startup` -> HTTP 200 `{ status: "started", migrationsCompleted: true }` (Kube startup probe).
- `GET /health` -> HTTP 200 (Legacy telemetry endpoint preserved for backward compatibility).

### Identity & Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/guest`
  - Body: `{ displayName?: string }`
  - Returns: `{ user: { id, displayName, isGuest: true }, token: string, expiresAt: ISO }`
- `POST /api/v1/auth/session`
  - Body: `{ token: string }`
  - Returns: `{ valid: boolean, claims: TokenClaims }`
- `GET /api/v1/auth/me`
  - Returns: Current user profile and plan entitlements.

### CoPlay Service (`/api/v1/coplay`)
- `GET /api/v1/coplay/games`
  - Query: `category`, `search`, `limit`, `offset`
  - Returns: `{ total, limit, offset, games: [...] }`
- `POST /api/v1/coplay/sessions`
  - Body: `{ roomId, gameId }`
  - Returns: `{ sessionId, roomId, gameId, startedAt }`
- `POST /api/v1/coplay/scores`
  - Body: `{ sessionId, score, gameMetadata }`
  - Returns: `{ recorded: boolean, rank: number, verified: boolean }`

### CoShop Service (`/api/v1/coshop`)
- `GET /api/v1/coshop/products`
  - Query: `q`, `category`, `minPrice`, `maxPrice`, `brand`, `retailer`, `sort`, `limit`, `offset`
  - Returns: `{ total, products: [...], facets: {...} }`
- `GET /api/v1/coshop/products/:id`
  - Returns: Unified product detail with cross-retailer comparison offers.
- `GET /api/v1/coshop/filters`
  - Returns: Dynamic categories, brand aggregations, retailer availability.
- `POST /api/v1/coshop/ai-assistant`
  - Body: `{ prompt, context }`
  - Returns: `{ recommendations: [...], rationale: string, matchedFilters: {...} }`
- `POST /api/v1/coshop/click`
  - Body: `{ productId, retailerId, targetUrl }`
  - Returns: `{ status: "ok", destinationUrl: string }`
