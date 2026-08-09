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

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', cachedGames: gamesCache.length, timestamp: new Date().toISOString() }));

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
