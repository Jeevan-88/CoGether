# Security Model & Defense-in-Depth Specification: CoGether

## 1. Authentication & Identity Management

CoGether implements a zero-trust, stateless authentication model:

```
[ Client ]
    |
    | 1. POST /api/v1/auth/guest { displayName: "Player1" }
    v
[ Identity Service ]
    |
    | 2. Cryptographically signs JWT with HMAC-SHA256 (or RS256)
    v
[ Signed JWT Issued ]
    | claims: { sub, displayName, isGuest: true, tier: 'free', exp: 15m }
    |
    +---> Stored in memory or httpOnly secure cookie
    |
    v 3. Subsequent Requests send `Authorization: Bearer <jwt>`
[ Gateway / Services ]
    | Validates signature & claims locally without DB lookup
```

### Token Lifecycle & Expiration
- **Access Tokens**: 15-minute strict TTL. Signed with HMAC-SHA256 in local development and RSA/Ed25519 in production.
- **Refresh Tokens**: 7-day sliding expiration stored in Redis / DB with automated rotation.
- **Guest Sessions**: Signed with `isGuest: true` and `tier: 'free'`, automatically granted ephemeral room access without requiring immediate email verification.

---

## 2. Authorization & Entitlement Engine (RBAC)

Access to premium capabilities is controlled by the central Entitlement Model:

| Feature / Limit | Free Tier | Pro Tier | Teams Tier |
| :--- | :--- | :--- | :--- |
| **Max Peers per Room** | 4 peers | 12 peers | 50 peers (SFU) |
| **Max Room Duration** | 45 minutes | Unlimited | Unlimited |
| **Game Catalog** | 2,000+ HTML5 Catalog | Full + Early Access | Full + Private Tournaments |
| **Cinema Video Quality** | 720p stream sync | 1080p / 4K sync | Dedicated high-bitrate sync |
| **AI Shopping Advisor** | 20 queries/day | Unlimited | Unlimited team recommendations |

---

## 3. Rate Limiting & Abuse Prevention

1. **Distributed Rate Limiting via Redis**:
   - Algorithms: Sliding-Window Counter & Token Bucket.
   - Public API Endpoints: 120 requests/minute per IP.
   - Authentication Endpoints (`/api/v1/auth/*`): 10 requests/minute per IP (prevents credential stuffing).
   - Realtime Signaling Events: 30 events/second per WebSocket connection.

2. **Web Application Firewall & Headers (OWASP)**:
   - Strict Content Security Policy (CSP): Prevents XSS, restricts iframe sources to verified HTML5 game domains and video providers.
   - `Cross-Origin-Opener-Policy: same-origin` & `Cross-Origin-Embedder-Policy: require-corp`.
   - Sanitization: All room chat text sanitized server-side and client-side before rendering.

3. **Secrets Management**:
   - Zero hardcoded credentials in source control.
   - Strongly validated at boot via `packages/config/`.
   - Production target: External secret injection via AWS Secrets Manager or HashiCorp Vault.
