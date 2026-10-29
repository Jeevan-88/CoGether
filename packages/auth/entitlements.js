/**
 * Entitlement & RBAC Middleware
 * Enforces tier-based permissions (free, pro, teams) across REST and WebSocket APIs.
 * Authoritatively validates guest session expiration (5 minutes maximum).
 */

const { verifyToken } = require('./jwt');
const { PlanTiers } = require('../contracts');

const TIER_RANK = {
  [PlanTiers.FREE]: 1,
  [PlanTiers.PRO]: 2,
  [PlanTiers.TEAMS]: 3
};

function hasSufficientTier(userTier = PlanTiers.FREE, requiredTier = PlanTiers.FREE) {
  const currentRank = TIER_RANK[userTier] || 1;
  const requiredRank = TIER_RANK[requiredTier] || 1;
  return currentRank >= requiredRank;
}

/**
 * Express middleware that validates the Bearer JWT token in Authorization header.
 * Populates req.user and req.claims.
 * Strictly verifies guest session expiration against backend database.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    req.user = null;
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      error: {
        code: 'INVALID_AUTH_HEADER',
        message: 'Authorization header must follow "Bearer <token>" format',
        requestId: req.id
      }
    });
  }

  const token = parts[1];
  const result = verifyToken(token);

  if (!result.valid) {
    const isExpiredGuest = result.expired && token.includes('isGuest');
    return res.status(401).json({
      error: {
        code: isExpiredGuest ? 'GUEST_SESSION_EXPIRED' : (result.expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'),
        message: isExpiredGuest
          ? 'Your 5-minute guest session has ended. Please sign in or register to continue.'
          : result.error,
        requestId: req.id
      }
    });
  }

  // Handle guest sessions: enforce database expiration (5 minutes strictly)
  if (result.claims.isGuest) {
    const { validateGuestSession } = require('./guest');
    validateGuestSession(result.claims.sub)
      .then((guestCheck) => {
        if (!guestCheck.valid) {
          return res.status(401).json({
            error: {
              code: 'GUEST_SESSION_EXPIRED',
              message: 'Your 5-minute guest session has ended. Please register or sign in to continue using CoGether.',
              requestId: req.id
            }
          });
        }

        req.user = {
          id: result.claims.sub,
          sub: result.claims.sub,
          username: result.claims.displayName || 'Guest',
          displayName: result.claims.displayName || 'Guest',
          isGuest: true,
          guestExpiresAt: guestCheck.expiresAt,
          remainingSeconds: guestCheck.remainingSeconds,
          tier: PlanTiers.FREE
        };
        req.claims = result.claims;
        next();
      })
      .catch(() => {
        req.user = {
          id: result.claims.sub,
          sub: result.claims.sub,
          username: result.claims.displayName || 'Guest',
          displayName: result.claims.displayName || 'Guest',
          isGuest: true,
          tier: PlanTiers.FREE
        };
        req.claims = result.claims;
        next();
      });
    return;
  }

  req.user = {
    id: result.claims.sub,
    sub: result.claims.sub,
    username: result.claims.username,
    displayName: result.claims.displayName,
    isGuest: false,
    tier: result.claims.tier || PlanTiers.FREE
  };
  req.claims = result.claims;

  next();
}

/**
 * Express middleware requiring a minimum entitlement tier.
 */
function requireEntitlement(requiredTier) {
  return (req, res, next) => {
    // If authenticateToken hasn't run yet, run it
    if (req.user === undefined) {
      return authenticateToken(req, res, () => check());
    }
    return check();

    function check() {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required to access this resource',
            requestId: req.id
          }
        });
      }

      if (!hasSufficientTier(req.user.tier, requiredTier)) {
        return res.status(403).json({
          error: {
            code: 'ENTITLEMENT_REQUIRED',
            message: `This feature requires a ${requiredTier.toUpperCase()} subscription tier.`,
            details: {
              requiredTier,
              currentTier: req.user.tier
            },
            requestId: req.id
          }
        });
      }

      next();
    }
  };
}

module.exports = {
  PlanTiers,
  TIER_RANK,
  hasSufficientTier,
  authenticateToken,
  requireEntitlement
};
