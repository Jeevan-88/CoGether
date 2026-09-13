const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// Foundational Platform Packages
const { getConfig, getSanitizedConfig } = require('../packages/config');
const { logger, correlationMiddleware, metrics } = require('../packages/observability');
const { authenticateToken, requireEntitlement, createGuestSession, verifyToken } = require('../packages/auth');
const { db } = require('../packages/database');
const { redis } = require('../packages/redis');
const { validateGuestSessionInput } = require('../packages/contracts');
const { gameRepository } = require('../services/coplay/gameRepository');
const { gameSessionManager, SessionState } = require('../services/coplay/gameSessionManager');
const { getIceConfiguration } = require('../packages/webrtc');

const app = express();
app.use(cors());
app.use(express.json());
app.use(correlationMiddleware);


// CoPlay Game Catalog Synchronizer (Seeds PostgreSQL coplay.games table)
gameRepository.syncCatalogFromFeed().catch((err) => {
  logger.warn('Background game catalog sync notification:', { error: err.message });
});

// Games API Endpoint (Backed by PostgreSQL coplay.games with Redis cache)
app.get('/api/games', async (req, res) => {
  try {
    const result = await gameRepository.getGames(req.query);
    res.json(result);
  } catch (err) {
    logger.error('Failed to query games repository', { error: err });
    res.status(500).json({ error: 'Failed to retrieve games catalog' });
  }
});

// CoShop Massive Product Discovery & Social Shopping Engine
const SearchIndex = require('./coshop/engine/searchIndex');
const AIShoppingAssistant = require('./coshop/engine/aiShoppingAssistant');

const coshopIndex = new SearchIndex();
const coshopAI = new AIShoppingAssistant(coshopIndex);

// CoShop: Search & Filter Catalog
app.get('/api/coshop/products', (req, res) => {
  try {
    const results = coshopIndex.search(req.query);
    res.json(results);
  } catch (err) {
    console.error('CoShop search error:', err);
    res.status(500).json({ error: 'Search index query failure' });
  }
});

// CoShop: Get Product Detail with Multi-Store Offers
app.get('/api/coshop/products/:id', (req, res) => {
  const product = coshopIndex.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found in CoShop catalog' });
  }
  res.json(product);
});

// CoShop: Dynamic Facets / Filters
app.get('/api/coshop/filters', (req, res) => {
  const allResults = coshopIndex.search({ limit: 1000 });
  res.json(allResults.facets);
});

// CoShop: AI Shopping Assistant Advisor
app.post('/api/coshop/ai-assistant', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    const advice = await coshopAI.advise(prompt, context);
    res.json(advice);
  } catch (err) {
    console.error('CoShop AI error:', err);
    res.status(500).json({ error: 'AI Assistant processing error' });
  }
});

// CoShop: Curated Feeds (Trending, Best Value, Deals)
app.get('/api/coshop/recommendations', (req, res) => {
  const trending = coshopIndex.search({ sort: 'relevance', limit: 4 });
  const bestValue = coshopIndex.search({ sort: 'best_value', limit: 4 });
  const deals = coshopIndex.search({ minPrice: 500, maxPrice: 5000, sort: 'price_asc', limit: 4 });

  res.json({
    trending: trending.products,
    bestValue: bestValue.products,
    deals: deals.products
  });
});

// CoShop: Affiliate Click Tracker & Redirect Helper
app.post('/api/coshop/click', (req, res) => {
  const { productId, retailerId, targetUrl } = req.body;
  console.log(`[CoShop Analytics] Affiliate Click: product=${productId}, retailer=${retailerId}, time=${new Date().toISOString()}`);
  res.json({ status: 'ok', destinationUrl: targetUrl });
});

// ── System Health & Kubernetes Probes ────────────────────────────────────────

// Legacy telemetry health check (backward compatible)
app.get('/health', async (_req, res) => {
  const dbHealth = await db.checkHealth();
  const redisHealth = await redis.checkHealth();
  res.json({
    status: 'ok',
    cachedGames: gameRepository._fallbackCache.length,
    coshopIndexed: coshopIndex.indexedProducts.length,
    database: dbHealth.mode,
    redis: redisHealth.mode,
    timestamp: new Date().toISOString()
  });
});

// Liveness probe (process is up and event loop is responsive)
app.get('/health/live', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Readiness probe (checks database and redis dependencies)
app.get('/health/ready', async (_req, res) => {
  const dbHealth = await db.checkHealth();
  const redisHealth = await redis.checkHealth();
  const isReady = dbHealth.connected && redisHealth.connected;
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'degraded',
    checks: {
      database: dbHealth,
      redis: redisHealth
    },
    timestamp: new Date().toISOString()
  });
});

// Startup probe (verifies initialization completion)
app.get('/health/startup', (_req, res) => {
  res.status(200).json({
    status: 'started',
    initialized: true,
    timestamp: new Date().toISOString()
  });
});

// Prometheus metrics exposition endpoint
app.get('/metrics', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(metrics.toPrometheusFormat());
});

// ── Identity & Authentication Endpoints (/api/v1/auth) ───────────────────────

// Mint a guest session token
app.post('/api/v1/auth/guest', (req, res) => {
  const validation = validateGuestSessionInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: validation.error, requestId: req.id } });
  }
  const session = createGuestSession({ displayName: validation.data.displayName });
  res.status(201).json(session);
});

// Validate an existing session token
app.post('/api/v1/auth/session', (req, res) => {
  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ error: { code: 'MISSING_TOKEN', message: 'Token is required', requestId: req.id } });
  }
  const result = verifyToken(token);
  if (!result.valid) {
    return res.status(401).json({ valid: false, error: result.error });
  }
  res.json({ valid: true, claims: result.claims });
});

// Get current user profile and entitlements
app.get('/api/v1/auth/me', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated', requestId: req.id } });
  }
  res.json({
    user: req.user,
    claims: req.claims
  });
});

// Dynamic WebRTC ICE/TURN Configuration Endpoint
app.get('/api/v1/webrtc/ice-servers', (req, res) => {
  try {
    const config = getIceConfiguration();
    res.json(config);
  } catch (err) {
    logger.error('Failed to resolve ICE configuration', { error: err });
    res.status(500).json({ error: 'Failed to resolve ICE configuration' });
  }
});

// Centralized WebRTC & Media Lifecycle Telemetry
app.post('/api/v1/telemetry/webrtc', (req, res) => {
  const eventType = req.body?.eventType || req.body?.event;
  const { roomId, peerId, details, metrics: clientMetrics } = req.body || {};
  const allowedEvents = [
    'webrtc_peer_connection_created',
    'webrtc_connected',
    'webrtc_failed',
    'ice_gathering_failed',
    'ice_connection_failed',
    'camera_permission_denied',
    'mic_permission_denied'
  ];

  if (!eventType || !allowedEvents.includes(eventType)) {
    return res.status(400).json({ error: 'Invalid or missing WebRTC eventType' });
  }

  metrics.incrementCounter(`cogether_${eventType}_total`, 1, {
    roomId: roomId || 'unknown'
  });

  logger.info(`WebRTC Telemetry [${eventType}]`, {
    eventType,
    roomId,
    peerId,
    details: details ? String(details).substring(0, 200) : undefined,
    metrics: clientMetrics,
    service: 'cogether-webrtc',
    timestamp: new Date().toISOString()
  });

  res.status(200).json({ received: true, status: 'recorded', event: eventType });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Socket.IO Handshake Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token ||
                (socket.handshake.headers?.authorization && socket.handshake.headers.authorization.replace(/^Bearer\s+/i, ''));

  if (!token) {
    logger.warn('Socket connection rejected: Missing authentication token', { socketId: socket.id });
    return next(new Error('AUTHENTICATION_REQUIRED: Missing session token'));
  }

  const result = verifyToken(token);
  if (!result.valid) {
    logger.warn('Socket connection rejected: Invalid authentication token', { socketId: socket.id, error: result.error });
    return next(new Error(`AUTHENTICATION_FAILED: ${result.error}`));
  }

  socket.user = result.claims;
  socket.userId = result.claims.sub;
  socket.username = result.claims.displayName || result.claims.username || 'Guest';
  next();
});

const rooms = new Map();

io.on('connection', (socket) => {
  metrics.incrementCounter('cogether_socket_connect_total', 1);

  function isPeerInRoom(targetSocketId) {
    if (!socket.roomId || !rooms.has(socket.roomId)) return false;
    return rooms.get(socket.roomId).members.has(targetSocketId);
  }

  socket.on('join-room', async (rawPayload, callback) => {
    const payload = typeof rawPayload === 'string' ? { roomId: rawPayload } : (rawPayload || {});
    const { roomId, username, micEnabled = true, cameraEnabled = true } = payload;

    if (!roomId || typeof roomId !== 'string' || roomId.trim().length < 2 || roomId.trim().length > 100) {
      if (typeof callback === 'function') callback({ success: false, error: 'INVALID_ROOM_ID' });
      return socket.emit('error', { code: 'INVALID_ROOM_ID', message: 'Room ID must be between 2 and 100 characters' });
    }

    const cleanRoomId = roomId.trim();
    socket.join(cleanRoomId);
    socket.roomId = cleanRoomId;
    if (socket.user && (socket.user.displayName || socket.user.username)) {
      socket.username = socket.user.displayName || socket.user.username;
    } else if (username) {
      socket.username = username;
    }

    if (!rooms.has(cleanRoomId)) {
      rooms.set(cleanRoomId, { members: new Map(), hostUserId: socket.userId || socket.id });
    }

    const room = rooms.get(cleanRoomId);

    // Purge any stale socket entry for this exact user (e.g. mobile reconnect)
    for (const [existingSocketId, memberInfo] of room.members.entries()) {
      if (memberInfo.userId === (socket.userId || socket.id) && existingSocketId !== socket.id) {
        logger.info('Purging stale socket for reconnecting user', { userId: socket.userId, oldSocketId: existingSocketId });
        room.members.delete(existingSocketId);
        redis.removeRoomMember(cleanRoomId, existingSocketId).catch(() => {});
        socket.to(cleanRoomId).emit('user-left', existingSocketId);
      }
    }

    const existingUsers = Array.from(room.members.entries()).map(([id, info]) => ({
      id,
      userId: info.userId,
      username: info.username,
      micEnabled: info.micEnabled,
      cameraEnabled: info.cameraEnabled
    }));

    room.members.set(socket.id, {
      userId: socket.userId || socket.id,
      username: socket.username,
      micEnabled,
      cameraEnabled
    });

    await redis.addRoomMember(cleanRoomId, socket.id, {
      socketId: socket.id,
      userId: socket.userId || socket.id,
      username: socket.username,
      micEnabled,
      cameraEnabled
    }).catch(() => {});

    metrics.incrementCounter('cogether_room_join_total', 1, { roomId: cleanRoomId });

    socket.emit('existing-users', existingUsers);
    socket.emit('all-users', existingUsers);
    socket.to(cleanRoomId).emit('user-joined', {
      id: socket.id,
      userId: socket.userId || socket.id,
      username: socket.username,
      micEnabled,
      cameraEnabled
    });

    if (typeof callback === 'function') {
      callback({ success: true, existingUsers, roomId: cleanRoomId });
    }
  });

  // Room-Authorized WebRTC Signaling Relays
  socket.on('offer', ({ to, offer }) => {
    if (!isPeerInRoom(to)) {
      logger.warn('Blocked unauthorized offer relay: Target not in same room', { from: socket.id, to, roomId: socket.roomId });
      return;
    }
    io.to(to).emit('offer', { from: socket.id, offer, username: socket.username });
  });

  socket.on('answer', ({ to, answer }) => {
    if (!isPeerInRoom(to)) {
      logger.warn('Blocked unauthorized answer relay: Target not in same room', { from: socket.id, to, roomId: socket.roomId });
      return;
    }
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    if (!isPeerInRoom(to)) {
      logger.warn('Blocked unauthorized ICE relay: Target not in same room', { from: socket.id, to, roomId: socket.roomId });
      return;
    }
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('toggle-media', ({ micEnabled, cameraEnabled }) => {
    if (socket.roomId && rooms.has(socket.roomId)) {
      const room = rooms.get(socket.roomId);
      if (room.members.has(socket.id)) {
        const info = room.members.get(socket.id);
        info.micEnabled = micEnabled;
        info.cameraEnabled = cameraEnabled;
      }
      socket.to(socket.roomId).emit('user-media-changed', {
        id: socket.id,
        micEnabled,
        cameraEnabled
      });
    }
  });

  socket.on('send-chat-message', ({ text }) => {
    if (!socket.roomId || !text || !text.trim()) return;
    const messagePayload = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: socket.id,
      senderName: socket.username || 'Guest',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    io.to(socket.roomId).emit('chat-message', messagePayload);
  });

  // Co-Watch Synchronized Video Stream Control
  socket.on('video-sync', (payload) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('video-sync', {
      ...payload,
      senderId: socket.id,
      senderName: socket.username || 'Guest',
      timestamp: Date.now()
    });
  });

  // Co-Watch Real-Time Floating Reactions
  socket.on('video-reaction', (payload) => {
    if (!socket.roomId) return;
    io.to(socket.roomId).emit('video-reaction', {
      ...payload,
      id: Math.random().toString(36).substring(2, 9),
      senderId: socket.id,
      senderName: socket.username || 'Guest',
      timestamp: Date.now()
    });
  });

  // CoGether Challenge Mode Synchronization & Session Lifecycle
  socket.on('challenge-ready', async ({ ready, gameId = '2048' }) => {
    if (!socket.roomId) return;
    try {
      let session = await gameSessionManager.getSessionByRoom(socket.roomId);
      if (!session && ready) {
        session = await gameSessionManager.createSession({
          roomId: socket.roomId,
          gameId,
          hostUserId: socket.userId || socket.id,
          participants: [{ id: socket.userId || socket.id, username: socket.username }]
        });
      }
      if (session) {
        session = await gameSessionManager.setParticipantReady(session.sessionId, socket.userId || socket.id, ready);
        io.to(socket.roomId).emit('challenge-session-sync', session);
      }
    } catch (err) {
      logger.warn('Error in challenge-ready session update', { error: err.message });
    }

    socket.to(socket.roomId).emit('challenge-peer-ready', {
      peerId: socket.id,
      userId: socket.userId || socket.id,
      username: socket.username,
      ready
    });
  });

  socket.on('challenge-start', async ({ countdownSeconds = 3, gameId = '2048' }) => {
    if (!socket.roomId) return;
    try {
      let session = await gameSessionManager.getSessionByRoom(socket.roomId);
      if (!session) {
        session = await gameSessionManager.createSession({
          roomId: socket.roomId,
          gameId,
          hostUserId: socket.userId || socket.id,
          participants: [{ id: socket.userId || socket.id, username: socket.username }]
        });
      }
      if (session && (session.state === SessionState.WAITING || session.state === SessionState.READY)) {
        session = await gameSessionManager.transitionState(session.sessionId, SessionState.STARTING);
        io.to(socket.roomId).emit('challenge-session-sync', session);

        setTimeout(async () => {
          try {
            const current = await gameSessionManager.getSession(session.sessionId);
            if (current && current.state === SessionState.STARTING) {
              const running = await gameSessionManager.transitionState(current.sessionId, SessionState.RUNNING);
              io.to(socket.roomId).emit('challenge-session-sync', running);
            }
          } catch (e) {}
        }, countdownSeconds * 1000);
      }
    } catch (err) {
      logger.warn('Error in challenge-start transition', { error: err.message });
    }

    io.to(socket.roomId).emit('challenge-countdown-start', {
      countdownSeconds,
      timestamp: Date.now()
    });
  });

  socket.on('challenge-score', async ({ score, finalResult = false, metadata = {} }) => {
    if (!socket.roomId) return;
    try {
      const session = await gameSessionManager.getSessionByRoom(socket.roomId);
      if (session && (session.state === SessionState.RUNNING || session.state === SessionState.STARTING)) {
        const updated = await gameSessionManager.recordScore(
          session.sessionId,
          socket.userId || socket.id,
          score,
          finalResult,
          metadata
        );
        io.to(socket.roomId).emit('challenge-session-sync', updated);
      }
    } catch (err) {
      logger.warn('Error in challenge-score', { error: err.message });
    }

    socket.to(socket.roomId).emit('challenge-peer-score', {
      peerId: socket.id,
      userId: socket.userId || socket.id,
      username: socket.username,
      score,
      finalResult
    });
  });

  socket.on('challenge-board-sync', (payload) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('challenge-peer-board-sync', {
      peerId: socket.id,
      userId: socket.userId || socket.id,
      username: socket.username,
      ...payload
    });
  });

  socket.on('challenge-player-eliminated', async ({ score }) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('challenge-peer-eliminated', {
      peerId: socket.id,
      userId: socket.userId || socket.id,
      username: socket.username,
      score
    });
  });

  socket.on('challenge-player-won', async ({ score }) => {
    if (!socket.roomId) return;
    try {
      const session = await gameSessionManager.getSessionByRoom(socket.roomId);
      if (session && session.state !== SessionState.FINISHED && session.state !== SessionState.CLOSED) {
        await gameSessionManager.recordScore(session.sessionId, socket.userId || socket.id, score, true);
        const finished = await gameSessionManager.getSession(session.sessionId);
        io.to(socket.roomId).emit('challenge-session-sync', finished);
      }
    } catch (err) {
      logger.warn('Error in challenge-player-won', { error: err.message });
    }

    socket.to(socket.roomId).emit('challenge-peer-won', {
      peerId: socket.id,
      userId: socket.userId || socket.id,
      username: socket.username,
      score
    });
  });

  // ── CoShop Real-Time Shared Shopping Room Events ──
  socket.on('coshop-share-product', ({ product }) => {
    if (!socket.roomId || !product) return;
    socket.to(socket.roomId).emit('coshop-product-shared', {
      product,
      senderName: socket.username || 'Friend',
      senderId: socket.id,
      timestamp: Date.now()
    });
  });

  socket.on('coshop-reaction', ({ productId, emoji }) => {
    if (!socket.roomId) return;
    io.to(socket.roomId).emit('coshop-reaction-received', {
      id: Math.random().toString(36).substr(2, 9),
      productId,
      emoji,
      senderName: socket.username || 'Friend',
      senderId: socket.id,
      timestamp: Date.now()
    });
  });

  socket.on('coshop-wishlist-sync', ({ wishlist }) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('coshop-wishlist-updated', {
      wishlist,
      senderName: socket.username || 'Friend'
    });
  });

  socket.on('coshop-cart-sync', ({ cart }) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('coshop-cart-updated', {
      cart,
      senderName: socket.username || 'Friend'
    });
  });

  socket.on('coshop-budget-sync', ({ budget }) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('coshop-budget-updated', {
      budget,
      senderName: socket.username || 'Friend'
    });
  });

  socket.on('disconnect', () => {
    metrics.incrementCounter('cogether_socket_disconnect_total', 1);
    if (socket.roomId) {
      metrics.incrementCounter('cogether_room_leave_total', 1, { roomId: socket.roomId });
    }

    if (socket.roomId && rooms.has(socket.roomId)) {
      const room = rooms.get(socket.roomId);
      room.members.delete(socket.id);
      redis.removeRoomMember(socket.roomId, socket.id).catch(() => {});
      socket.to(socket.roomId).emit('user-left', socket.id);
      if (room.members.size === 0) rooms.delete(socket.roomId);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`⚡ WebRTC Signaling & Games Server listening on http://localhost:${PORT}`);
});
