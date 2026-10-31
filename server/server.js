const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// Foundational Platform Packages
const { getConfig, getSanitizedConfig } = require('../packages/config');
const { logger, correlationMiddleware, metrics } = require('../packages/observability');
const { 
  authenticateToken, requireEntitlement, createGuestSession, verifyToken, signToken,
  validateAndRotateSession, revokeSession, revokeAllUserSessions, getGoogleAuthUrl, exchangeCodeForTokens
} = require('../packages/auth');
const { db } = require('../packages/database');
const { redis } = require('../packages/redis');
const { validateGuestSessionInput } = require('../packages/contracts');
const { gameRepository } = require('../services/coplay/gameRepository');
const { gameSessionManager, SessionState } = require('../services/coplay/gameSessionManager');
const { favoriteService } = require('../services/coplay/favoriteService');
const { leaderboardService } = require('../services/coplay/leaderboardService');
const { getIceConfiguration } = require('../packages/webrtc');
const { userService, profileService, inviteService } = require('../services/identity');
const cowatchContentRepo = require('../services/cowatch/contentRepository');
const cowatchRoomService = require('../services/cowatch/roomService');
const { cityRepository } = require('../services/costudy/cityRepository');
const { learningRepository } = require('../services/costudy/learningRepository');
const { submissionService } = require('../services/costudy/submissionService');
const { interviewService } = require('../services/costudy/interviewService');
const { friendService, messagingService } = require('../services/social');
const { privateRoomService } = require('../services/coplay/privateRoomService');

const path = require('path');

const app = express();

// Dynamic CORS configuration allowing localhost, Vercel deployments, and production domains
const allowedOriginRegexes = [
  /^http:\/\/localhost:(?:3000|3001|5173|5174)$/,
  /^http:\/\/127\.0\.0\.1:(?:3000|3001|5173|5174)$/,
  /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/,
  /^https:\/\/(?:[a-zA-Z0-9_-]+\.)?cogether\.tech$/
];

function isOriginAllowed(origin) {
  if (!origin) return true; // Non-browser / server-to-server / curl
  if (allowedOriginRegexes.some((re) => re.test(origin))) return true;
  if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return true;
  if (process.env.CORS_ORIGIN) {
    if (process.env.CORS_ORIGIN === '*' || origin === process.env.CORS_ORIGIN) return true;
  }
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, origin || true);
    } else {
      callback(new Error(`Origin ${origin} not permitted by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Correlation-ID']
}));

// Centralized refresh token cookie configuration
function getRefreshCookieOptions() {
  const cfg = getConfig();
  const isProdLike = process.env.NODE_ENV === 'production' || 
                     process.env.NODE_ENV === 'staging' || 
                     process.env.STAGING === 'true' || 
                     cfg.isProd ||
                     (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('rds.amazonaws.com'));
  return {
    httpOnly: true,
    secure: isProdLike,
    sameSite: isProdLike ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../client/public/uploads')));

// Lightweight cookie parsing middleware
app.use((req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach((part) => {
      const [key, val] = part.trim().split('=');
      if (key && val) {
        try {
          req.cookies[key] = decodeURIComponent(val);
        } catch (e) {
          req.cookies[key] = val;
        }
      }
    });
  }
  next();
});

app.use(correlationMiddleware);


// CoPlay Game Catalog Synchronizer (Seeds PostgreSQL coplay.games table)
gameRepository.syncCatalogFromFeed().catch((err) => {
  logger.warn('Background game catalog sync notification:', { error: err.message });
});

// Games API Endpoint (Backed by PostgreSQL coplay.games with Redis cache)
app.get('/api/games', async (req, res) => {
  try {
    const result = await gameRepository.getGames(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('Failed to query games repository', { error: err });
    res.status(500).json({ success: false, error: 'Failed to retrieve games catalog' });
  }
});

// Single Game API Endpoint
app.get('/api/games/:id', async (req, res) => {
  try {
    const game = await gameRepository.getGameById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, error: 'GAME_NOT_FOUND', message: 'Game not found' });
    }
    res.json({ success: true, game });
  } catch (err) {
    logger.error('Failed to get game by id', { error: err });
    res.status(500).json({ success: false, error: 'Failed to retrieve game details' });
  }
});

// CoPlay Leaderboards API (Aggregated from coplay.scores and identity.profiles)
app.get('/api/v1/coplay/leaderboards/:gameId', async (req, res) => {
  const { gameId } = req.params;
  const { period = 'all_time', limit = 50 } = req.query;
  try {
    const result = await leaderboardService.getLeaderboard(gameId, { period, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.message && err.message.includes('GAME_NOT_FOUND')) {
      return res.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: err.message } });
    }
    if (err.message && err.message.includes('INVALID_GAME_ID')) {
      return res.status(400).json({ error: { code: 'INVALID_GAME_ID', message: err.message } });
    }
    logger.error('Failed to get leaderboard', { error: err.message });
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve leaderboard' } });
  }
});

// CoPlay Player Favorites APIs
app.get('/api/v1/coplay/favorites', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }
  try {
    const result = await favoriteService.getFavorites(userId);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('Failed to get favorites', { error: err.message });
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve favorites' } });
  }
});

app.post('/api/v1/coplay/favorites/:gameId', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }
  const { gameId } = req.params;
  try {
    const result = await favoriteService.addFavorite(userId, gameId);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.message && err.message.includes('GAME_NOT_FOUND')) {
      return res.status(404).json({ error: { code: 'GAME_NOT_FOUND', message: err.message } });
    }
    if (err.message && err.message.includes('INVALID_GAME_ID')) {
      return res.status(400).json({ error: { code: 'INVALID_GAME_ID', message: err.message } });
    }
    logger.error('Failed to add favorite', { error: err.message });
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add favorite' } });
  }
});

app.delete('/api/v1/coplay/favorites/:gameId', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }
  const { gameId } = req.params;
  try {
    const result = await favoriteService.removeFavorite(userId, gameId);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.message && err.message.includes('INVALID_GAME_ID')) {
      return res.status(400).json({ error: { code: 'INVALID_GAME_ID', message: err.message } });
    }
    logger.error('Failed to remove favorite', { error: err.message });
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to remove favorite' } });
  }
});

// ══════════════════════════════════════════════════════════════════════
// CO-WATCH REST APIS (PHASE 3.0)
// ══════════════════════════════════════════════════════════════════════

// 1. Content Catalog Query
app.get('/api/v1/cowatch/content', async (req, res) => {
  try {
    const { contentType, providerId, genre, verifiedOnly, search, featured, trending, limit, offset } = req.query;
    const result = await cowatchContentRepo.getAllContent({
      contentType,
      providerId,
      genre,
      verifiedOnly: verifiedOnly === 'true' || verifiedOnly === true,
      search,
      featured: featured !== undefined ? featured === 'true' : undefined,
      trending: trending !== undefined ? trending === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('Failed to retrieve CoWatch content', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve content catalog' });
  }
});

// 2. Single Content Details
app.get('/api/v1/cowatch/content/:id', async (req, res) => {
  try {
    const content = await cowatchContentRepo.getContentById(req.params.id);
    if (!content) {
      return res.status(404).json({ success: false, error: 'CONTENT_NOT_FOUND', message: 'Media content not found' });
    }
    res.json({ success: true, content });
  } catch (err) {
    logger.error('Failed to get CoWatch content by id', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve content details' });
  }
});

// 3. Providers Registry
app.get('/api/v1/cowatch/providers', async (req, res) => {
  try {
    const providers = await cowatchContentRepo.getAllProviders();
    res.json({ success: true, providers });
  } catch (err) {
    logger.error('Failed to get CoWatch providers', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve providers' });
  }
});

app.get('/api/v1/cowatch/providers/:id', async (req, res) => {
  try {
    const provider = await cowatchContentRepo.getProviderById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, error: 'PROVIDER_NOT_FOUND' });
    }
    res.json({ success: true, provider });
  } catch (err) {
    logger.error('Failed to get provider by id', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve provider' });
  }
});

// 4. Watch Rooms APIs
app.post('/api/v1/cowatch/rooms', async (req, res) => {
  try {
    const { contentId, title, controlPolicy, playbackMode } = req.body;
    let hostUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        hostUserId = decoded?.id || decoded?.sub;
      } catch (e) {}
    }

    const room = await cowatchRoomService.createWatchRoom({
      hostUserId,
      contentId,
      title,
      controlPolicy: controlPolicy || 'HOST_ONLY',
      playbackMode: playbackMode || 'NATIVE_PLAYER'
    });

    res.status(201).json({ success: true, room });
  } catch (err) {
    logger.error('Failed to create watch room', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to create watch room' });
  }
});

app.get('/api/v1/cowatch/rooms/:code', async (req, res) => {
  try {
    const room = await cowatchRoomService.getWatchRoomByCode(req.params.code);
    if (!room) {
      return res.status(404).json({ success: false, error: 'ROOM_NOT_FOUND', message: 'Watch room not found' });
    }
    res.json({ success: true, room });
  } catch (err) {
    logger.error('Failed to get watch room', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve watch room' });
  }
});

app.post('/api/v1/cowatch/rooms/:code/join', async (req, res) => {
  try {
    const { username, role } = req.body;
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        userId = decoded?.id || decoded?.sub;
      } catch (e) {}
    }

    const room = await cowatchRoomService.joinWatchRoom({
      roomCode: req.params.code,
      userId,
      username,
      role: role || 'MEMBER'
    });
    res.json({ success: true, room });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/cowatch/rooms/:code/leave', async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        userId = decoded?.id || decoded?.sub;
      } catch (e) {}
    }
    await cowatchRoomService.leaveWatchRoom({ roomCode: req.params.code, userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Watch History APIs
app.get('/api/v1/cowatch/history', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  }
  try {
    const history = await cowatchRoomService.getWatchHistory(userId);
    res.json({ success: true, history });
  } catch (err) {
    logger.error('Failed to get watch history', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve watch history' });
  }
});

app.post('/api/v1/cowatch/history', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  }
  try {
    const { contentId, positionSeconds, durationSeconds, completed } = req.body;
    const entry = await cowatchRoomService.recordWatchHistory({
      userId,
      contentId,
      positionSeconds,
      durationSeconds,
      completed
    });
    res.json({ success: true, entry });
  } catch (err) {
    logger.error('Failed to record watch history', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to record watch history' });
  }
});

// 6. Favorites APIs
app.get('/api/v1/cowatch/favorites', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  }
  try {
    const favorites = await cowatchRoomService.getFavorites(userId);
    res.json({ success: true, favorites });
  } catch (err) {
    logger.error('Failed to get CoWatch favorites', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve favorites' });
  }
});

app.post('/api/v1/cowatch/favorites/:contentId', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  }
  try {
    const favorite = await cowatchRoomService.addFavorite({ userId, contentId: req.params.contentId });
    res.json({ success: true, favorite });
  } catch (err) {
    logger.error('Failed to add favorite', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to add favorite' });
  }
});

app.delete('/api/v1/cowatch/favorites/:contentId', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  }
  try {
    await cowatchRoomService.removeFavorite({ userId, contentId: req.params.contentId });
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to remove favorite', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to remove favorite' });
  }
});
// ── CO-STUDY 2D LEARNING CITY & GAMIFIED CSE KNOWLEDGE WORLD ──

// 1. Get 15 Knowledge Districts
app.get('/api/v1/costudy/districts', async (req, res) => {
  try {
    const districts = await cityRepository.getDistricts();
    res.json({ success: true, districts });
  } catch (err) {
    logger.error('Failed to get districts:', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve districts' });
  }
});

// 2. Get Buildings (all or by district)
app.get('/api/v1/costudy/buildings', async (req, res) => {
  try {
    const buildings = await cityRepository.getBuildings(req.query.districtId);
    res.json({ success: true, buildings });
  } catch (err) {
    logger.error('Failed to get buildings:', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve buildings' });
  }
});

// 3. Get Building by ID / Slug
app.get('/api/v1/costudy/buildings/:id', async (req, res) => {
  try {
    const building = await cityRepository.getBuildingById(req.params.id);
    if (!building) {
      return res.status(404).json({ success: false, error: 'Building not found' });
    }
    res.json({ success: true, building });
  } catch (err) {
    logger.error('Failed to get building:', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve building' });
  }
});

// 4. Get Academic Campus Curriculum (Semesters 1-8)
app.get('/api/v1/costudy/curriculum', async (req, res) => {
  try {
    const degree = req.query.degree || 'B.Tech CSE';
    const curriculum = await cityRepository.getCurriculum(degree);
    res.json({ success: true, ...curriculum });
  } catch (err) {
    logger.error('Failed to get curriculum:', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve curriculum' });
  }
});

// 5. Get Subject Campus Roadmap & Nodes
app.get('/api/v1/costudy/subjects/:slug/roadmap', async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        userId = decoded?.id || decoded?.sub;
      } catch (e) {}
    }
    const roadmap = await learningRepository.getSubjectRoadmap(req.params.slug, userId);
    if (!roadmap) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    res.json({ success: true, ...roadmap });
  } catch (err) {
    logger.error('Failed to get subject roadmap:', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve roadmap' });
  }
});

// 6. Get Node Details, Lesson, and Problems
app.get('/api/v1/costudy/nodes/:id', async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        userId = decoded?.id || decoded?.sub;
      } catch (e) {}
    }
    const details = await learningRepository.getNodeDetails(req.params.id, userId);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Node not found' });
    }
    res.json({ success: true, ...details });
  } catch (err) {
    logger.error('Failed to get node details:', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve node details' });
  }
});

// 7. Submit Code Problem Solution for Evaluation
app.post('/api/v1/costudy/problems/:id/submit', async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        userId = decoded?.id || decoded?.sub;
      } catch (e) {}
    }
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Code submission cannot be empty' });
    }
    const result = await submissionService.evaluateSubmission({
      userId,
      problemId: req.params.id,
      code
    });
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('Problem submission error:', { error: err.message });
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
});

// 8. Get Adaptive Viva Questions for Lesson
app.get('/api/v1/costudy/interview/:lessonId', async (req, res) => {
  try {
    const questions = await interviewService.getQuestionsForLesson(req.params.lessonId);
    res.json({ success: true, questions });
  } catch (err) {
    logger.error('Failed to get interview questions:', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve interview questions' });
  }
});

// 9. Evaluate Student AI Viva Answers
app.post('/api/v1/costudy/interview/evaluate', async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        userId = decoded?.id || decoded?.sub;
      } catch (e) {}
    }
    const { subjectId, lessonId, answers } = req.body;
    if (!lessonId || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, error: 'Invalid interview submission payload' });
    }
    const evaluation = await interviewService.evaluateInterview({
      userId,
      subjectId,
      lessonId,
      answers
    });
    res.json({ success: true, ...evaluation });
  } catch (err) {
    logger.error('Interview evaluation error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to evaluate interview' });
  }
});

// 10. Record Node Progress / Completion
app.post('/api/v1/costudy/nodes/:id/complete', async (req, res) => {
  try {
    let userId = 'anonymous';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        if (decoded?.id || decoded?.sub) userId = decoded?.id || decoded?.sub;
      } catch (e) {}
    }
    const { status = 'COMPLETED', score = 100, masteryPct = 100 } = req.body;
    const record = await learningRepository.recordNodeProgress(userId, req.params.id, {
      status,
      score,
      masteryPct
    });
    res.json({ success: true, progress: record });
  } catch (err) {
    logger.error('Failed to record node completion:', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to record progress' });
  }
});

// 11. Get Total User City Progress & Unlocks
app.get('/api/v1/costudy/progress', async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        userId = decoded?.id || decoded?.sub;
      } catch (e) {}
    }
    if (!userId) {
      return res.json({ success: true, completedNodes: [], unlocks: [], totalScore: 0 });
    }
    const progress = await learningRepository.getUserCityProgress(userId);
    res.json({ success: true, ...progress });
  } catch (err) {
    logger.error('Failed to get user city progress:', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve progress' });
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
app.post('/api/v1/auth/guest', async (req, res) => {
  try {
    const validation = validateGuestSessionInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: validation.error, requestId: req.id } });
    }
    const session = createGuestSession({ displayName: validation.data.displayName });
    if (session.dbPromise) {
      await session.dbPromise;
    }
    res.status(201).json(session);
  } catch (err) {
    logger.error('Failed to create guest session in database', { error: err.message });
    res.status(500).json({ success: false, error: { code: 'GUEST_CREATION_FAILED', message: 'Unable to start guest session. Please try again.' } });
  }
});

// Check guest session status & remaining seconds
app.get('/api/v1/auth/guest/session', authenticateToken, async (req, res) => {
  if (!req.user?.isGuest) {
    return res.status(400).json({ error: { code: 'NOT_A_GUEST', message: 'Current session is not a guest session' } });
  }
  const validation = await validateGuestSession(req.user.id || req.user.sub);
  if (!validation.valid) {
    return res.status(401).json({ error: { code: validation.error || 'GUEST_SESSION_EXPIRED' } });
  }
  res.json({
    valid: true,
    guestId: req.user.id || req.user.sub,
    displayName: validation.session.displayName,
    expiresAt: validation.session.expiresAt,
    remainingSeconds: validation.remainingSeconds
  });
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

// Query configured social authentication providers
app.get('/api/v1/auth/providers', (_req, res) => {
  const googleInfo = getGoogleAuthUrl();
  res.status(200).json({
    success: true,
    providers: {
      google: Boolean(googleInfo?.configured),
      apple: Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN)
    }
  });
});

// Check username availability & validity (with optional suggestions & current-user exclusion)
app.get('/api/v1/auth/check-username', async (req, res) => {
  try {
    const rawUsername = String(req.query.username || '').trim().replace(/^@+/, '');
    if (!rawUsername) {
      return res.status(400).json({ success: false, available: false, error: 'USERNAME_REQUIRED', message: 'Username is required.' });
    }

    let excludeUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        if (decoded?.valid && decoded?.claims) {
          excludeUserId = decoded.claims.sub || decoded.claims.id || null;
        }
      } catch (_e) {}
    }

    const validation = profileService.validateUsername(rawUsername);
    if (!validation.valid) {
      return res.status(200).json({
        success: true,
        available: false,
        username: rawUsername,
        error: validation.error,
        message: validation.message || (
          validation.error === 'USERNAME_TOO_SHORT' ? 'Handle must be at least 3 characters.' :
          validation.error === 'USERNAME_TOO_LONG' ? 'Handle cannot exceed 30 characters.' :
          validation.error === 'USERNAME_INVALID_CHARS' ? 'Letters, numbers and underscores only.' :
          'Invalid handle.'
        ),
        suggestions: []
      });
    }

    const isAvailable = await profileService.isUsernameAvailable(validation.normalized, excludeUserId);
    const wantSuggestions = !isAvailable || req.query.suggest === 'true';
    const suggestions = wantSuggestions
      ? await profileService.generateUsernameSuggestions(validation.normalized, excludeUserId, 3)
      : [];

    return res.status(200).json({
      success: true,
      available: isAvailable,
      username: validation.cleanUsername,
      message: isAvailable ? 'Handle is available.' : 'Handle is already taken.',
      suggestions
    });
  } catch (err) {
    logger.error('Username check failure', { error: err.message });
    res.status(500).json({ success: false, available: false, error: 'CHECK_FAILED', message: 'Unable to check availability.' });
  }
});

// Request email OTP (passwordless signup or login)
app.post('/api/v1/auth/email/request-otp', async (req, res) => {
  try {
    const { email, purpose } = req.body || {};
    const result = await userService.requestEmailOtp(email, purpose);
    if (!result.success) {
      let status = 400;
      if (result.error === 'RESEND_TOO_FREQUENT') {
        status = 429;
      } else if (result.error === 'EMAIL_SERVICE_NOT_CONFIGURED' || result.error === 'EMAIL_DELIVERY_FAILED') {
        status = 503;
      }
      return res.status(status).json(result);
    }
    metrics.incrementCounter('cogether_auth_otp_requested_total', 1);
    res.status(200).json(result);
  } catch (err) {
    logger.error('Failed to process OTP request', { error: err.message });
    res.status(500).json({ success: false, error: 'OTP_REQUEST_FAILED', message: 'Unable to process verification code. Please try again.' });
  }
});

// Verify email OTP and establish authenticated session
app.post('/api/v1/auth/email/verify-otp', async (req, res) => {
  try {
    const { email, otp, password, username, displayName, firstName, lastName, avatarUrl, avatarConfig, preferences, purpose } = req.body || {};
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection?.remoteAddress
    };

    const result = await userService.verifyEmailOtp(
      email,
      otp,
      { password, username, displayName, firstName, lastName, avatarUrl, avatarConfig, preferences, purpose },
      metadata
    );

    if (!result.success) {
      const status = result.error === 'MAX_ATTEMPTS_EXCEEDED' ? 429 : 400;
      return res.status(status).json(result);
    }

    metrics.incrementCounter('cogether_auth_otp_verified_total', 1);

    // Set secure HTTP-only refresh cookie
    res.cookie('cogether_refresh', result.refreshToken, getRefreshCookieOptions());

    res.status(200).json(result);
  } catch (err) {
    logger.error('Failed to verify OTP', { error: err.message });
    res.status(500).json({ success: false, error: 'OTP_VERIFICATION_FAILED', message: 'Unable to verify passcode. Please try again.' });
  }
});

// Direct user registration with Argon2id hashing and database persistence
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const rateLimit = await redis.consumeRateLimit(`auth:register:ip:${req.ip}`, 20, 60);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many registration attempts. Please slow down.'
      });
    }

    const { email, password, username, displayName, firstName, lastName, avatarUrl, avatarConfig, preferences, guestToken } = req.body || {};
    
    // If a guestToken was provided, validate it to associate guest preferences
    let guestPrefs = null;
    if (guestToken) {
      const guestVerification = verifyToken(guestToken);
      if (guestVerification.valid && guestVerification.decoded?.isGuest) {
        guestPrefs = { guestMigrated: true };
      }
    }

    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection?.remoteAddress
    };

    const result = await userService.registerWithPassword({
      email,
      password,
      username,
      displayName,
      firstName,
      lastName,
      avatarUrl,
      avatarConfig,
      preferences: preferences || guestPrefs,
      metadata
    });

    if (!result.success) {
      const status = result.error === 'EMAIL_EXISTS' || result.error === 'EMAIL_ALREADY_EXISTS' || result.error === 'USERNAME_EXISTS' || result.error === 'USERNAME_ALREADY_TAKEN' ? 409 : 400;
      return res.status(status).json(result);
    }

    metrics.incrementCounter('cogether_auth_register_total', 1);

    if (result.refreshToken) {
      res.cookie('cogether_refresh', result.refreshToken, getRefreshCookieOptions());
    }

    res.status(201).json({ ...result, tokens: { accessToken: result.accessToken, refreshToken: result.refreshToken } });
  } catch (err) {
    logger.error('Registration failed', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'REGISTRATION_FAILED', message: 'Internal server error during registration' });
  }
});

// Email & password authentication with OWASP Argon2id & progressive abuse defense
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const rateLimit = await redis.consumeRateLimit(`auth:login:ip:${req.ip}`, 30, 60);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please slow down.'
      });
    }

    const { email, password, otp } = req.body || {};
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection?.remoteAddress
    };

    const result = await userService.authenticateWithPassword({ email, password, otp, metadata, requireOtp: true });

    if (!result.success) {
      const status = (result.error === 'ACCOUNT_TEMPORARILY_LOCKED' || result.error === 'RESEND_TOO_FREQUENT') ? 429 : 401;
      return res.status(status).json(result);
    }

    metrics.incrementCounter('cogether_auth_login_total', 1);

    if (result.mfaRequired) {
      return res.status(200).json(result);
    }

    if (result.otpRequired) {
      return res.status(200).json(result);
    }

    res.cookie('cogether_refresh', result.refreshToken, getRefreshCookieOptions());
    res.status(200).json(result);
  } catch (err) {
    logger.error('Password login failed', { error: err.message });
    res.status(500).json({ success: false, error: 'LOGIN_FAILED', message: 'Internal server error during login' });
  }
});

// Request password reset passcode (enumeration-safe)
app.post('/api/v1/auth/password/forgot', async (req, res) => {
  try {
    const rateLimit = await redis.consumeRateLimit(`auth:forgot:ip:${req.ip}`, 10, 60);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many reset requests. Please wait a moment.'
      });
    }

    const { email } = req.body || {};
    const result = await userService.requestPasswordReset(email);
    res.status(200).json(result);
  } catch (err) {
    logger.error('Forgot password failed', { error: err.message });
    res.status(500).json({ success: false, error: 'FORGOT_PASSWORD_FAILED', message: 'Unable to process reset request.' });
  }
});

// Reset password with verified OTP
app.post('/api/v1/auth/password/reset', async (req, res) => {
  try {
    const rateLimit = await redis.consumeRateLimit(`auth:reset:ip:${req.ip}`, 10, 60);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many reset attempts. Please wait.'
      });
    }

    const { email, otp, newPassword } = req.body || {};
    const result = await userService.resetPasswordWithOtp(email, otp, newPassword);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (err) {
    logger.error('Password reset failed', { error: err.message });
    res.status(500).json({ success: false, error: 'PASSWORD_RESET_FAILED', message: err.message });
  }
});

// Set or update password for authenticated user
app.post('/api/v1/auth/password/set', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    const { newPassword, currentPassword } = req.body || {};
    const result = await userService.setPassword(userId, newPassword, currentPassword);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (err) {
    logger.error('Set password error', { error: err.message });
    res.status(500).json({ success: false, error: 'SET_PASSWORD_FAILED', message: err.message });
  }
});

// Query MFA status for authenticated user
app.get('/api/v1/auth/mfa/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    const status = await userService.getMfaStatus(userId);
    res.status(200).json({ success: true, ...status });
  } catch (err) {
    logger.error('MFA status query failed', { error: err.message });
    res.status(500).json({ success: false, error: 'MFA_STATUS_FAILED', message: err.message });
  }
});

// Enroll MFA for authenticated user (returns secret, QR code data URL, recovery codes)
app.post('/api/v1/auth/mfa/enroll', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    const result = await userService.enrollMfa(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (err) {
    logger.error('MFA enrollment error', { error: err.message });
    res.status(500).json({ success: false, error: 'MFA_ENROLL_FAILED', message: err.message });
  }
});

// Confirm MFA enrollment with TOTP passcode
app.post('/api/v1/auth/mfa/confirm', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    const { code } = req.body || {};
    const result = await userService.confirmMfa(userId, code);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (err) {
    logger.error('MFA confirmation error', { error: err.message });
    res.status(500).json({ success: false, error: 'MFA_CONFIRM_FAILED', message: err.message });
  }
});

// Verify MFA login challenge (via TOTP code or single-use recovery code)
app.post('/api/v1/auth/mfa/verify', async (req, res) => {
  try {
    const { mfaTicket, code, recoveryCode } = req.body || {};
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection?.remoteAddress
    };

    const result = await userService.verifyMfaLogin(mfaTicket, { code, recoveryCode, metadata });

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.cookie('cogether_refresh', result.refreshToken, getRefreshCookieOptions());
    res.status(200).json(result);
  } catch (err) {
    logger.error('MFA challenge verification error', { error: err.message });
    res.status(500).json({ success: false, error: 'MFA_VERIFY_FAILED', message: err.message });
  }
});

// Disable MFA for authenticated user
app.post('/api/v1/auth/mfa/disable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    const { password, code } = req.body || {};
    const result = await userService.disableMfa(userId, password || code);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (err) {
    logger.error('MFA disable error', { error: err.message });
    res.status(500).json({ success: false, error: 'MFA_DISABLE_FAILED', message: err.message });
  }
});

// Refresh access token via session rotation
app.post('/api/v1/auth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.cogether_refresh || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'REFRESH_TOKEN_REQUIRED' });
    }

    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection?.remoteAddress
    };

    const rotation = await validateAndRotateSession(refreshToken, metadata);
    if (!rotation.valid) {
      return res.status(401).json({ success: false, error: rotation.error });
    }

    const me = await userService.getMeContext(rotation.userId);
    if (!me) {
      return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
    }

    const accessToken = signToken({
      sub: me.id,
      email: me.primaryEmail,
      username: me.profile?.username || 'user',
      displayName: me.profile?.displayName || me.profile?.username || 'User',
      tier: me.entitlement?.tier || 'free'
    });

    res.cookie('cogether_refresh', rotation.newRefreshToken, getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken: rotation.newRefreshToken,
      user: { id: me.id, email: me.primaryEmail, emailVerified: me.emailVerified },
      profile: me.profile,
      preferences: me.preferences
    });
  } catch (err) {
    logger.error('Session refresh failure', { error: err.message });
    res.status(500).json({ success: false, error: 'REFRESH_FAILED', message: err.message });
  }
});

// Revoke session and logout
app.post('/api/v1/auth/logout', async (req, res) => {
  const refreshToken = req.cookies?.cogether_refresh || req.body?.refreshToken;
  const authHeader = req.headers['authorization'];
  if (refreshToken) {
    await revokeSession(refreshToken).catch(() => {});
  }
  if (authHeader?.startsWith('Bearer ')) {
    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (decoded?.valid && decoded?.claims?.sub) {
      await revokeAllUserSessions(decoded.claims.sub).catch(() => {});
    }
  }
  const cookieOpts = getRefreshCookieOptions();
  res.clearCookie('cogether_refresh', {
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    path: cookieOpts.path
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// Google OAuth initiation
app.get('/api/v1/auth/google', (req, res) => {
  const authUrlData = getGoogleAuthUrl();
  if (!authUrlData.configured) {
    return res.status(503).json({
      error: 'GOOGLE_OAUTH_NOT_CONFIGURED',
      message: authUrlData.error
    });
  }
  res.redirect(authUrlData.url);
});

// Google OAuth callback
app.get('/api/v1/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) {
    return res.status(400).json({ error: 'GOOGLE_AUTH_FAILED', details: error });
  }
  if (!code) {
    return res.status(400).json({ error: 'CODE_REQUIRED' });
  }

  const exchange = await exchangeCodeForTokens(code);
  if (!exchange.success) {
    return res.status(400).json({ error: 'TOKEN_EXCHANGE_FAILED', details: exchange.error });
  }

  const result = await userService.authenticateGoogle(exchange.tokens.id_token, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.cookie('cogether_refresh', result.refreshToken, getRefreshCookieOptions());

  const config = getConfig();
  const clientUrl = config.auth.clientUrl || 'http://localhost:5173';
  res.redirect(`${clientUrl}?auth=success&token=${encodeURIComponent(result.accessToken)}`);
});

// Verify Google ID token directly (client SPA or test harness)
app.post('/api/v1/auth/google/verify-token', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection?.remoteAddress
    };

    const result = await userService.authenticateGoogle(idToken, metadata);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.cookie('cogether_refresh', result.refreshToken, getRefreshCookieOptions());

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'GOOGLE_AUTH_FAILED', message: err.message });
  }
});

// Authenticated current user context
app.get('/api/v1/me', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated', requestId: req.id } });
  }

  // Handle guest sessions immediately without querying identity.sessions
  if (req.user?.isGuest) {
    return res.json({
      success: true,
      id: req.user.id,
      primaryEmail: null,
      status: 'guest',
      isGuest: true,
      profile: {
        username: req.user.username || 'guest',
        displayName: req.user.displayName || 'Guest',
        avatarConfig: null
      },
      preferences: {
        primaryInterest: 'all',
        interests: [],
        timezone: 'UTC',
        language: 'en'
      },
      entitlement: { tier: 'free' },
      guestExpiresAt: req.user.guestExpiresAt,
      remainingSeconds: req.user.remainingSeconds
    });
  }
const activeSession = await db.query(
    'SELECT id FROM identity.sessions WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1',
    [userId]
  );
  if (activeSession.rows.length === 0) {
    return res.status(401).json({ error: { code: 'SESSION_REVOKED', message: 'Session has been revoked. Please log in again.' } });
  }

  const me = await userService.getMeContext(userId);
  if (!me) {
    return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User profile not found in database', requestId: req.id } });
  }

  res.json({ success: true, ...me });
});

// Platform Foundation compatibility endpoint
app.get('/api/v1/auth/me', authenticateToken, (req, res) => {
  res.json({
    user: req.user,
    claims: req.user
  });
});

// Update profile details (username, display name, avatar, bio)
app.patch('/api/v1/me/profile', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated', requestId: req.id } });
  }

  try {
    const profile = await profileService.updateProfile(userId, req.body || {});
    res.json({ success: true, profile });
  } catch (err) {
    const status = err.message === 'USERNAME_ALREADY_TAKEN' ? 409 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

// Upload and update avatar image
app.post('/api/v1/me/avatar', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated', requestId: req.id } });
  }

  const { image, mimeType } = req.body || {};
  if (!image) {
    return res.status(400).json({ success: false, error: 'IMAGE_REQUIRED', message: 'Image payload is required' });
  }

  try {
    const { storageService } = require('../services/storage/storageService');
    const upload = await storageService.uploadAvatar(userId, image, mimeType);
    if (!upload.success) {
      return res.status(400).json(upload);
    }

    const updated = await profileService.updateProfile(userId, { avatarUrl: upload.url });
    res.status(200).json({ success: true, avatarUrl: upload.url, profile: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'AVATAR_UPLOAD_FAILED', message: err.message });
  }
});

// Update user preferences (interests, timezone, language)
app.patch('/api/v1/me/preferences', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated', requestId: req.id } });
  }

  try {
    const preferences = await profileService.updatePreferences(userId, req.body || {});
    res.json({ success: true, preferences });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Create secure opaque invite token
app.post('/api/v1/invites', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated', requestId: req.id } });
  }

  try {
    const invite = await inviteService.createInvite(userId, req.body || {});
    res.status(201).json({ success: true, invite, ...invite });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Public invite preview (resolves real inviter profile from PostgreSQL)
app.get('/api/v1/invites/:token', async (req, res) => {
  try {
    const preview = await inviteService.getInvitePreview(req.params.token);
    if (!preview.valid) {
      const status = preview.error === 'INVITE_NOT_FOUND' ? 404 : 410;
      return res.status(status).json(preview);
    }
    res.status(200).json({ success: true, invite: preview, ...preview });
  } catch (err) {
    res.status(500).json({ valid: false, error: 'INVITE_QUERY_FAILED', message: err.message });
  }
});

// Redeem invite token and join destination
app.post('/api/v1/invites/:token/redeem', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated', requestId: req.id } });
  }

  try {
    const result = await inviteService.redeemInvite(req.params.token, userId);
    if (!result.success) {
      const status = result.error === 'INVITE_NOT_FOUND' ? 404 : 400;
      return res.status(status).json(result);
    }
    res.status(200).json({ redeemed: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'REDEMPTION_FAILED', message: err.message });
  }
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

// ==========================================
// CoGether Social, Friends & Presence Routes
// ==========================================

// Query friends list with real-time online presence status
app.get('/api/v1/social/friends', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const friends = await friendService.getFriends(userId);
    const enriched = friends.map(f => ({
      ...f,
      online: onlineUsers.has(f.id) && onlineUsers.get(f.id).size > 0
    }));
    res.json({ success: true, friends: enriched });
  } catch (err) {
    logger.error('Failed to get friends', { error: err.message, userId });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Query pending friend requests (both incoming and outgoing)
app.get('/api/v1/social/friends/requests', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const requests = await friendService.getPendingRequests(userId);
    res.json({ success: true, ...requests });
  } catch (err) {
    logger.error('Failed to get friend requests', { error: err.message, userId });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Search users by @username or display name
app.get('/api/v1/social/users/search', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  const q = req.query.q || '';
  try {
    const users = await friendService.searchUsers(q, userId);
    const enriched = users.map(u => ({
      ...u,
      online: onlineUsers.has(u.id) && onlineUsers.get(u.id).size > 0
    }));
    res.json({ success: true, users: enriched });
  } catch (err) {
    logger.error('Failed to search users', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send a friend request
app.post('/api/v1/social/friends/request', authenticateToken, async (req, res) => {
  if (req.user?.isGuest) {
    return res.status(403).json({ error: { code: 'GUEST_RESTRICTED', message: 'Guests cannot send friend requests. Please create an account.' } });
  }
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const target = req.body?.target || req.body?.targetUsername || req.body?.targetUserId;

  try {
    const result = await friendService.sendFriendRequest(userId, target);
    if (!result.success) {
      return res.status(400).json(result);
    }
    // Realtime notification to recipient
    if (result.recipientId) {
      io.to(`user:${result.recipientId}`).emit('social:friend_request_received', {
        requester: {
          id: userId,
          username: req.user?.username || req.user?.displayName,
          displayName: req.user?.displayName || req.user?.username,
          avatarUrl: req.user?.avatarUrl
        },
        friendshipId: result.friendship?.id
      });
    }
    res.status(201).json(result);
  } catch (err) {
    logger.error('Failed to send friend request', { error: err.message, userId });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Respond to a friend request (accept or reject)
app.post('/api/v1/social/friends/respond', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const requesterId = req.body?.requesterId || req.body?.targetUserId || req.body?.friendshipId;
  const action = req.body?.action;

  try {
    const result = await friendService.respondToFriendRequest(userId, requesterId, action);
    if (!result.success) {
      return res.status(400).json(result);
    }
    // Realtime notification on accept
    if (action === 'accept') {
      io.to(`user:${requesterId}`).emit('social:friend_request_accepted', {
        friend: {
          id: userId,
          username: req.user?.username || req.user?.displayName,
          displayName: req.user?.displayName || req.user?.username,
          avatarUrl: req.user?.avatarUrl
        }
      });
    }
    res.json(result);
  } catch (err) {
    logger.error('Failed to respond to friend request', { error: err.message, userId });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel an outgoing friend request
app.post('/api/v1/social/friends/cancel', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const { recipientId } = req.body || {};

  try {
    const result = await friendService.cancelFriendRequest(userId, recipientId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    io.to(`user:${recipientId}`).emit('social:friend_request_cancelled', { requesterId: userId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove a friend
app.delete('/api/v1/social/friends/:friendUserId', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const result = await friendService.removeFriend(userId, req.params.friendUserId);
    if (result.success) {
      io.to(`user:${req.params.friendUserId}`).emit('social:friend_removed', { userId });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Block / unblock user
app.post('/api/v1/social/users/block', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const { targetUserId } = req.body || {};
  try {
    const result = await friendService.blockUser(userId, targetUserId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/social/users/unblock', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const { targetUserId } = req.body || {};
  try {
    const result = await friendService.unblockUser(userId, targetUserId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Batch presence query
app.get('/api/v1/social/presence', authenticateToken, (req, res) => {
  const userIds = req.query.userIds ? req.query.userIds.split(',') : [];
  const presence = {};
  for (const id of userIds) {
    presence[id] = onlineUsers.has(id) && onlineUsers.get(id).size > 0;
  }
  res.json({ success: true, presence });
});

// ==========================================
// CoPlay Private Rooms & Game Invitations
// ==========================================

// Create a private game room with cryptographic code
app.post('/api/v1/coplay/rooms/private', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const { gameId, options } = req.body || {};

  try {
    const room = await privateRoomService.createPrivateRoom(userId, gameId, options);
    res.status(201).json({ success: true, room });
  } catch (err) {
    logger.error('Failed to create private room', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get room by code or UUID
app.get('/api/v1/coplay/rooms/:codeOrId', async (req, res) => {
  try {
    const room = await privateRoomService.getRoomByCodeOrId(req.params.codeOrId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'ROOM_NOT_FOUND', message: 'Room not found or expired.' });
    }
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send a game invitation to a friend
app.post('/api/v1/coplay/rooms/invite', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const { inviteeId, roomId, gameId } = req.body || {};

  try {
    const result = await privateRoomService.createGameInvitation(userId, inviteeId, roomId, gameId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    // Realtime notification to invitee
    io.to(`user:${inviteeId}`).emit('coplay:invite_received', {
      invitation: result.invitation,
      room: result.room,
      inviter: {
        id: userId,
        username: req.user?.username || req.user?.displayName,
        displayName: req.user?.displayName || req.user?.username,
        avatarUrl: req.user?.avatarUrl
      }
    });
    res.status(201).json(result);
  } catch (err) {
    logger.error('Failed to create game invitation', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Preview game invitation details
app.get('/api/v1/coplay/invitations/:token', async (req, res) => {
  try {
    const result = await privateRoomService.getInvitationDetails(req.params.token);
    if (!result.success) {
      const status = result.error === 'INVITATION_NOT_FOUND' ? 404 : 410;
      return res.status(status).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Accept a game invitation
app.post('/api/v1/coplay/invitations/:token/accept', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const result = await privateRoomService.acceptInvitation(req.params.token, userId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    // Realtime notification to inviter that the friend accepted
    if (result.invitation?.inviter_user_id) {
      io.to(`user:${result.invitation.inviter_user_id}`).emit('coplay:invite_accepted', {
        invitation: result.invitation,
        room: result.room,
        acceptedBy: {
          id: userId,
          username: req.user?.username || req.user?.displayName,
          displayName: req.user?.displayName || req.user?.username
        }
      });
    }
    res.json(result);
  } catch (err) {
    logger.error('Failed to accept game invitation', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reject a game invitation
app.post('/api/v1/coplay/invitations/:token/reject', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const result = await privateRoomService.rejectInvitation(req.params.token, userId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    if (result.invitation?.inviter_user_id) {
      io.to(`user:${result.invitation.inviter_user_id}`).emit('coplay:invite_rejected', {
        invitationId: result.invitation.id,
        rejectedBy: userId
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel a game invitation
app.post('/api/v1/coplay/invitations/:id/cancel', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const result = await privateRoomService.cancelInvitation(req.params.id, userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// E2EE Direct Messaging & Key Directory
// ==========================================

// Register client ECDH P-256 public key (JWK)
app.post('/api/v1/social/keys', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const { keyId, publicKeyJwk } = req.body || {};

  try {
    const result = await messagingService.registerUserKey(userId, keyId, publicKeyJwk);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    logger.error('Failed to register user public key', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Retrieve friend's public key (JWK)
app.get('/api/v1/social/keys/:targetUserId', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const result = await messagingService.getUserPublicKey(req.params.targetUserId);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Store & route end-to-end encrypted direct message (ciphertext + IV only)
app.post('/api/v1/social/messages', authenticateToken, async (req, res) => {
  if (req.user?.isGuest) {
    return res.status(403).json({ error: { code: 'GUEST_RESTRICTED', message: 'Guests cannot send direct messages. Please create an account.' } });
  }
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const recipientId = req.body?.recipientId || req.body?.recipientUserId;
  const { ciphertext, iv, senderKeyId, recipientKeyId } = req.body || {};

  try {
    const result = await messagingService.sendDirectMessage(userId, recipientId, {
      ciphertext,
      iv,
      senderKeyId,
      recipientKeyId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Realtime Socket.IO delivery to recipient
    io.to(`user:${recipientId}`).emit('social:dm_received', {
      message: result.message
    });
    // Also notify sender for cross-tab / device synchronization
    io.to(`user:${userId}`).emit('social:dm_sent', {
      message: result.message
    });

    res.status(201).json(result);
  } catch (err) {
    logger.error('Failed to send encrypted message', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch direct message conversation history
app.get('/api/v1/social/messages/:friendUserId', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const result = await messagingService.getConversation(userId, req.params.friendUserId, req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mark direct messages as read
app.post('/api/v1/social/messages/:friendUserId/read', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const result = await messagingService.markMessagesRead(userId, req.params.friendUserId);
    if (result.success && result.markedCount > 0) {
      io.to(`user:${req.params.friendUserId}`).emit('social:dm_read', {
        readerId: userId,
        readAt: new Date().toISOString()
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get unread counts summary across all conversations
app.get('/api/v1/social/messages/unread/summary', authenticateToken, async (req, res) => {
  const userId = req.user?.id || req.user?.sub;
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

  try {
    const result = await messagingService.getUnreadSummary(userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
  socket.username = result.claims.username || result.claims.displayName || 'Guest';
  socket.displayName = result.claims.displayName || result.claims.username || 'Guest';
  next();
});

const rooms = new Map();
const onlineUsers = new Map(); // userId -> Set of socketIds

io.on('connection', (socket) => {
  metrics.incrementCounter('cogether_socket_connect_total', 1);

  // Authenticated user presence and personal room registration
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
    if (!onlineUsers.has(socket.userId)) {
      onlineUsers.set(socket.userId, new Set());
    }
    onlineUsers.get(socket.userId).add(socket.id);

    // Notify connected friends or global listeners of online presence
    io.emit('social:user_presence', {
      userId: socket.userId,
      online: true,
      timestamp: Date.now()
    });
  }

  socket.on('dm:typing', ({ recipientId, isTyping }) => {
    if (!socket.userId || !recipientId) return;
    io.to(`user:${recipientId}`).emit('social:dm_typing', {
      senderId: socket.userId,
      isTyping: !!isTyping
    });
  });

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
    if (socket.user && (socket.user.username || socket.user.displayName)) {
      socket.username = socket.user.username || socket.user.displayName;
      socket.displayName = socket.user.displayName || socket.user.username;
    } else if (username) {
      socket.username = username;
      socket.displayName = username;
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

  // Co-Watch Synchronized Video Stream Control (Legacy Bridge)
  socket.on('video-sync', (payload) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('video-sync', {
      ...payload,
      senderId: socket.id,
      senderName: socket.username || 'Guest',
      timestamp: Date.now()
    });
  });

  // Co-Watch Real-Time Floating Reactions (Legacy Bridge)
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

  // ── CO-WATCH AUTHORITATIVE SYNCHRONIZED STREAMING ENGINE (PHASE 3.0) ──
  socket.on('cowatch:join', async ({ roomCode, username, role }) => {
    if (!roomCode) return;
    socket.cowatchRoom = roomCode;
    socket.join(`cowatch:${roomCode}`);

    try {
      const room = await cowatchRoomService.getWatchRoomByCode(roomCode);
      if (room) {
        socket.emit('cowatch:room-state', {
          roomCode,
          contentId: room.content_id,
          playbackState: room.playback_state,
          currentPosition: room.current_time_seconds,
          playbackRate: room.playback_rate,
          serverTimeMs: Date.now(),
          sequenceNumber: room.sequence_number,
          controlPolicy: room.control_policy,
          isLocked: room.is_locked,
          hostUserId: room.host_user_id
        });
      }
    } catch (err) {
      logger.warn('Failed to load cowatch room state on join', { error: err.message });
    }

    io.to(`cowatch:${roomCode}`).emit('cowatch:peer-joined', {
      peerId: socket.id,
      userId: socket.userId || socket.id,
      username: username || socket.username || 'Viewer',
      role: role || 'MEMBER',
      timestamp: Date.now()
    });
  });

  socket.on('cowatch:leave', ({ roomCode }) => {
    const code = roomCode || socket.cowatchRoom;
    if (!code) return;
    socket.leave(`cowatch:${code}`);
    io.to(`cowatch:${code}`).emit('cowatch:peer-left', {
      peerId: socket.id,
      userId: socket.userId || socket.id,
      timestamp: Date.now()
    });
  });

  socket.on('cowatch:sync-check', ({ roomCode, clientSendTime }) => {
    const code = roomCode || socket.cowatchRoom;
    socket.emit('cowatch:sync-ack', {
      roomCode: code,
      clientSendTime,
      serverTimeMs: Date.now()
    });
  });

  socket.on('cowatch:play', async ({ roomCode, position, sequenceNumber }) => {
    const code = roomCode || socket.cowatchRoom;
    if (!code) return;
    const now = Date.now();
    try {
      await cowatchRoomService.updatePlaybackState({
        roomCode: code,
        userId: socket.userId,
        playbackState: 'PLAYING',
        position,
        sequenceNumber
      });
    } catch (e) {}

    io.to(`cowatch:${code}`).emit('cowatch:playback-update', {
      action: 'PLAY',
      playbackState: 'PLAYING',
      position,
      serverTimeMs: now,
      sequenceNumber: sequenceNumber || Date.now(),
      triggeredBy: socket.username || 'Host'
    });
  });

  socket.on('cowatch:pause', async ({ roomCode, position, sequenceNumber }) => {
    const code = roomCode || socket.cowatchRoom;
    if (!code) return;
    const now = Date.now();
    try {
      await cowatchRoomService.updatePlaybackState({
        roomCode: code,
        userId: socket.userId,
        playbackState: 'PAUSED',
        position,
        sequenceNumber
      });
    } catch (e) {}

    io.to(`cowatch:${code}`).emit('cowatch:playback-update', {
      action: 'PAUSE',
      playbackState: 'PAUSED',
      position,
      serverTimeMs: now,
      sequenceNumber: sequenceNumber || Date.now(),
      triggeredBy: socket.username || 'Host'
    });
  });

  socket.on('cowatch:seek', async ({ roomCode, position, sequenceNumber }) => {
    const code = roomCode || socket.cowatchRoom;
    if (!code) return;
    const now = Date.now();
    try {
      await cowatchRoomService.updatePlaybackState({
        roomCode: code,
        userId: socket.userId,
        position,
        sequenceNumber
      });
    } catch (e) {}

    io.to(`cowatch:${code}`).emit('cowatch:playback-update', {
      action: 'SEEK',
      position,
      serverTimeMs: now,
      sequenceNumber: sequenceNumber || Date.now(),
      triggeredBy: socket.username || 'Host'
    });
  });

  socket.on('cowatch:rate-change', async ({ roomCode, playbackRate }) => {
    const code = roomCode || socket.cowatchRoom;
    if (!code) return;
    io.to(`cowatch:${code}`).emit('cowatch:playback-update', {
      action: 'RATE_CHANGE',
      playbackRate,
      serverTimeMs: Date.now(),
      triggeredBy: socket.username || 'Host'
    });
  });

  socket.on('cowatch:chat', ({ roomCode, text }) => {
    const code = roomCode || socket.cowatchRoom;
    if (!code || !text || !text.trim()) return;
    socket.to(`cowatch:${code}`).emit('cowatch:chat-message', {
      id: Math.random().toString(36).substring(2, 9),
      senderId: socket.userId || socket.id,
      senderName: socket.username || 'Friend',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  socket.on('cowatch:reaction', ({ roomCode, emoji }) => {
    const code = roomCode || socket.cowatchRoom;
    if (!code || !emoji) return;
    io.to(`cowatch:${code}`).emit('cowatch:floating-reaction', {
      id: Math.random().toString(36).substring(2, 9),
      senderId: socket.userId || socket.id,
      senderName: socket.username || 'Friend',
      emoji,
      timestamp: Date.now()
    });
  });

  socket.on('cowatch:screen-share-state', ({ roomCode, isSharing }) => {
    const code = roomCode || socket.cowatchRoom;
    if (!code) return;
    socket.to(`cowatch:${code}`).emit('cowatch:screen-share-change', {
      isSharing,
      sharerId: socket.userId || socket.id,
      sharerName: socket.username || 'Friend'
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

        socket.to(socket.roomId).emit('challenge-peer-score', {
          peerId: socket.id,
          userId: socket.userId || socket.id,
          username: socket.username,
          score: updated.scores[socket.userId || socket.id] ?? score,
          finalResult
        });
      }
    } catch (err) {
      logger.warn('Error in challenge-score rejected invalid submission', { error: err.message });
    }
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

    if (socket.userId && onlineUsers.has(socket.userId)) {
      const userSockets = onlineUsers.get(socket.userId);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(socket.userId);
        io.emit('social:user_presence', {
          userId: socket.userId,
          online: false,
          timestamp: Date.now()
        });
      }
    }
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
