const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory Game Catalog Cache
let gamesCache = [];
let lastFetchTime = 0;

async function fetchGameCatalog() {
  // Cache for 1 hour
  if (gamesCache.length > 0 && (Date.now() - lastFetchTime < 3600000)) {
    return gamesCache;
  }

  try {
    console.log('Fetching live 2,000+ games catalog from official feed...');
    const res = await fetch('https://gamemonetize.com/feed.php?format=0');
    if (res.ok) {
      const rawGames = await res.json();
      gamesCache = rawGames.map((g) => ({
        id: g.id || String(Math.random()),
        title: g.title,
        description: g.description,
        instructions: g.instructions,
        category: g.category || 'Arcade',
        thumb: g.thumb,
        url: g.url,
        tags: g.tags,
        isMultiplayer: g.category === '2 Player' || g.category === 'Multiplayer' || (g.tags && g.tags.toLowerCase().includes('multiplayer'))
      }));
      lastFetchTime = Date.now();
      console.log(`Successfully cached ${gamesCache.length} real HTML5 games!`);
    }
  } catch (err) {
    console.error('Failed to fetch live game catalog:', err);
  }

  return gamesCache;
}

// Initial fetch on server start
fetchGameCatalog();

// Games API Endpoint
app.get('/api/games', async (req, res) => {
  const games = await fetchGameCatalog();
  const { category, search, limit = 100, offset = 0 } = req.query;

  let filtered = games;

  if (category && category !== 'all') {
    if (category === 'multiplayer' || category === '2-player') {
      filtered = filtered.filter((g) => g.isMultiplayer || g.category === '2 Player' || g.category === 'Multiplayer');
    } else if (category === 'solo') {
      filtered = filtered.filter((g) => !g.isMultiplayer);
    } else {
      filtered = filtered.filter((g) => g.category.toLowerCase().includes(category.toLowerCase()));
    }
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((g) => g.title.toLowerCase().includes(q) || (g.tags && g.tags.toLowerCase().includes(q)));
  }

  const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    total: filtered.length,
    limit: Number(limit),
    offset: Number(offset),
    games: paginated
  });
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

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', cachedGames: gamesCache.length, coshopIndexed: coshopIndex.indexedProducts.length, timestamp: new Date().toISOString() }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const rooms = new Map();

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, username, micEnabled = true, cameraEnabled = true }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username || 'Guest';

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { members: new Map() });
    }

    const room = rooms.get(roomId);
    const existingUsers = Array.from(room.members.entries()).map(([id, info]) => ({
      id,
      username: info.username,
      micEnabled: info.micEnabled,
      cameraEnabled: info.cameraEnabled
    }));

    room.members.set(socket.id, {
      username: socket.username,
      micEnabled,
      cameraEnabled
    });

    socket.emit('existing-users', existingUsers);
    socket.to(roomId).emit('user-joined', {
      id: socket.id,
      username: socket.username,
      micEnabled,
      cameraEnabled
    });
  });

  // WebRTC Signaling
  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer, username: socket.username });
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
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

  // CoGether Challenge Mode Synchronization
  socket.on('challenge-ready', ({ ready }) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('challenge-peer-ready', {
      peerId: socket.id,
      username: socket.username,
      ready
    });
  });

  socket.on('challenge-start', ({ countdownSeconds = 3 }) => {
    if (!socket.roomId) return;
    io.to(socket.roomId).emit('challenge-countdown-start', {
      countdownSeconds,
      timestamp: Date.now()
    });
  });

  socket.on('challenge-score', ({ score, finalResult = false }) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('challenge-peer-score', {
      peerId: socket.id,
      username: socket.username,
      score,
      finalResult
    });
  });

  socket.on('challenge-board-sync', (payload) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('challenge-peer-board-sync', {
      peerId: socket.id,
      username: socket.username,
      ...payload
    });
  });

  socket.on('challenge-player-eliminated', ({ score }) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('challenge-peer-eliminated', {
      peerId: socket.id,
      username: socket.username,
      score
    });
  });

  socket.on('challenge-player-won', ({ score }) => {
    if (!socket.roomId) return;
    socket.to(socket.roomId).emit('challenge-peer-won', {
      peerId: socket.id,
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
    if (socket.roomId && rooms.has(socket.roomId)) {
      const room = rooms.get(socket.roomId);
      room.members.delete(socket.id);
      socket.to(socket.roomId).emit('user-left', socket.id);
      if (room.members.size === 0) rooms.delete(socket.roomId);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`⚡ WebRTC Signaling & Games Server listening on http://localhost:${PORT}`);
});
