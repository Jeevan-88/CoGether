import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Search, Play, Users, Trophy, ArrowLeft, X, Copy, Check, Heart, User, 
  Sparkles, Zap, Flame, Swords, Mic, MicOff, Camera, Video, MessageSquare, 
  Send, CornerDownRight, LogIn, ChevronRight, RefreshCw, Volume2, Maximize, Minimize
} from 'lucide-react';
import { useAuth } from '../../core/AuthContext.jsx';
import { useSocial } from '../../core/SocialContext.jsx';
import { API_URL } from '../../config/api.js';
import AuthModal from '../auth/AuthModal.jsx';
import ProfileModal from '../auth/ProfileModal.jsx';
import LeaderboardModal from './components/LeaderboardModal.jsx';
import AppleGameDetail from './components/AppleGameDetail.jsx';
import GamePlayer from './components/GamePlayer.jsx';
import './CoPlayGamesHub.css';

// Palette Tokens for SVG Geometric Art
const PAL = ['#FFE500', '#FFD60A', '#E3262E', '#1D1D1F'];

const SH = {
  sq: (c) => (
    <>
      <rect x="8" y="8" width="40" height="40" rx="9" fill={c[0]} />
      <rect x="52" y="8" width="40" height="40" rx="9" fill={c[1]} opacity="0.9" />
      <rect x="8" y="52" width="40" height="40" rx="9" fill={c[2]} />
      <rect x="52" y="52" width="40" height="40" rx="9" fill={c[3]} />
    </>
  ),
  ci: (c) => (
    <>
      <circle cx="38" cy="40" r="28" fill={c[0]} />
      <circle cx="64" cy="58" r="24" fill={c[1]} opacity="0.85" />
      <circle cx="40" cy="70" r="14" fill={c[2]} />
    </>
  ),
  hex: (c) => (
    <>
      <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill={c[1]} />
      <polygon points="50,24 72,37 72,63 50,76 28,63 28,37" fill={c[0]} />
    </>
  ),
  x: (c) => (
    <>
      <path d="M14 14L52 52M52 14L14 52" stroke={c[0]} strokeWidth="11" strokeLinecap="round" />
      <circle cx="68" cy="68" r="22" fill="none" stroke={c[1]} strokeWidth="11" />
    </>
  )
};

const RenderGameSvg = ({ game, className = 'card-art', colors = PAL }) => {
  if (game?.thumb) {
    return (
      <img 
        src={game.thumb} 
        alt={game.n} 
        className={`${className} coplay-card-thumbnail`} 
        loading="lazy" 
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    );
  }
  const shape = SH[game.sh] || SH.sq;
  return (
    <svg className={className} viewBox="0 0 100 100">
      {shape(colors)}
    </svg>
  );
};

// Master Games Database (Local Verified + Claude CoPlay Catalog)
const MASTER_GAMES = [
  {
    id: 'skydash',
    n: 'SkyDash',
    s: 'custom',
    c: ['action', 'popular'],
    p: 1,
    h: ['#00F2FE', '#4FACFE'],
    sh: 'ci',
    d: 'High-speed 3D cyber endless runner. Jump hurdles, slide under laser arches, and collect energy credits across 3 lanes.',
    ok: 1,
    launchUrl: '/games/skydash/index.html',
    thumb: '/games/thumbnails/skydash.webp'
  },
  {
    id: 'mythlings',
    n: 'Mythlings',
    s: 'custom',
    c: ['puzzle', 'popular'],
    p: 1,
    h: ['#38BDF8', '#F97316'],
    sh: 'sq',
    d: 'Original pixel-art creature-collecting RPG. Explore Oakhaven and Sunstone Grove, battle wild Mythlings, and train your squad.',
    ok: 1,
    launchUrl: '/games/mythlings/index.html',
    thumb: '/games/thumbnails/mythlings.webp'
  },
  {
    id: '2048',
    n: '2048',
    s: 'custom',
    c: ['puzzle', 'popular'],
    p: 1,
    h: ['#FFE500', '#E3262E'],
    sh: 'sq',
    d: 'Slide numbered tiles around a 4x4 grid and merge matching pairs until you reach 2048.',
    ok: 1,
    launchUrl: '/games/2048/index.html',
    thumb: '/games/thumbnails/2048.webp'
  },
  {
    id: 'ttt',
    n: 'Tic Tac Duel',
    s: 'custom',
    c: ['puzzle', '2p'],
    p: 2,
    h: ['#E3262E', '#1D1D1F'],
    sh: 'x',
    d: 'Three in a row, played live against a friend or smart AI. Short rounds, long rivalries.',
    ok: 1,
    thumb: '/games/thumbnails/ttt.webp'
  },
  {
    id: 'block',
    n: 'Block Puzzle',
    s: 'custom',
    c: ['puzzle'],
    p: 1,
    h: ['#1D1D1F', '#FFE500'],
    sh: 'sq',
    d: 'Fit falling shapes into clean rows before the board fills up.',
    ok: 1,
    launchUrl: '/games/block-puzzle/index.html',
    thumb: '/games/thumbnails/block.webp'
  },
  {
    id: 'bird',
    n: 'Clumsy Bird',
    s: 'custom',
    c: ['action', 'popular'],
    p: 1,
    h: ['#FFE500', '#E3262E'],
    sh: 'ci',
    d: 'Tap to flap through the pipes. Everyone races the exact same retro arcade course.',
    ok: 1,
    launchUrl: '/games/clumsy-bird/index.html',
    thumb: '/games/thumbnails/bird.webp'
  },
  {
    id: 'afterhours',
    n: 'Afterhours',
    subtitle: 'Realistic 3D Endless Runner & Escape',
    s: 'custom',
    c: ['action', 'popular', 'racing'],
    p: 1,
    h: ['#1D1D1F', '#FFE500'],
    sh: 'sq',
    d: 'Sprint through metropolitan avenues, dodge rushing traffic, leap across railway tracks, and navigate subway mazes in an escape run.',
    ok: 1,
    launchUrl: '/games/afterhours/index.html?autoplay=true',
    thumb: '/games/thumbnails/afterhours.webp'
  },
  {
    id: 'hex',
    n: 'Hextris',
    s: 'custom',
    c: ['puzzle', 'action'],
    p: 1,
    h: ['#E3262E', '#FFD60A'],
    sh: 'hex',
    d: 'Spin the hexagon and stack matching colors as they fall in from 6 directions.',
    ok: 1,
    launchUrl: '/games/hextris/index.html',
    thumb: '/games/thumbnails/hex.webp'
  },
  {
    id: 'drift',
    n: 'Neon Drift',
    s: 'commercial',
    c: ['racing', 'popular'],
    p: 3,
    h: ['#1D1D1F', '#E3262E'],
    sh: 'ci',
    d: 'Slide through night city streets with up to two friends on the same track.',
    thumb: '/games/thumbnails/drift.webp'
  },
  {
    id: 'kick',
    n: 'Pocket Striker',
    s: 'commercial',
    c: ['racing', '2p'],
    p: 2,
    h: ['#FFE500', '#1D1D1F'],
    sh: 'ci',
    d: 'Quick head-to-head football duel in the palm of your hand.',
    thumb: '/games/thumbnails/kick.webp'
  },
  {
    id: 'orbit',
    n: 'Orbit Rush',
    s: 'commercial',
    c: ['action', 'squad'],
    p: 'any',
    h: ['#E3262E', '#FFE500'],
    sh: 'hex',
    d: 'A big open multiplayer arena where anyone can drop in, grow, and dominate.',
    thumb: '/games/thumbnails/orbit.webp'
  },
  {
    id: 'tower',
    n: 'Tower Squad',
    s: 'partner',
    c: ['squad'],
    p: 3,
    h: ['#1D1D1F', '#FFE500'],
    sh: 'sq',
    d: 'Build and defend a fortress together as a synchronized squad of three.',
    thumb: '/games/thumbnails/tower.webp'
  },
  {
    id: 'sky',
    n: 'Skyline Strike',
    s: 'partner',
    c: ['action', 'squad'],
    p: 'any',
    h: ['#E3262E', '#FFD60A'],
    sh: 'hex',
    d: 'Fast aerial skirmishes for a whole squad across towering rooftops.',
    thumb: '/games/thumbnails/sky.webp'
  },
  {
    id: 'quiz',
    n: 'Brainstorm Live',
    s: 'partner',
    c: ['puzzle', '2p'],
    p: 2,
    h: ['#FFE500', '#E3262E'],
    sh: 'x',
    d: 'Trivia face-off against your friends. Fastest right answer takes the round.',
    thumb: '/games/thumbnails/quiz.webp'
  },
  {
    id: 'pad',
    n: 'Paddle Kings',
    s: 'partner',
    c: ['racing', '2p'],
    p: 2,
    h: ['#1D1D1F', '#FFE500'],
    sh: 'ci',
    d: 'Table tennis with a twist. First player to eleven points wins the crown.',
    thumb: '/games/thumbnails/pad.webp'
  }
];

const CATS = [
  ['all', 'All games'],
  ['popular', 'Popular'],
  ['2p', '2 players'],
  ['puzzle', 'Puzzles'],
  ['action', 'Action & runners'],
  ['squad', 'Squad & IO'],
  ['racing', 'Sports & racing']
];

const SECTIONS = [
  ['custom', 'Our custom games', 'Built in house'],
  ['commercial', 'Commercial games', 'Licensed titles'],
  ['partner', 'Partnered games', 'From studios we work with']
];

const TOP_SLIDE_IDS = ['skydash', 'mythlings', '2048', 'ttt', 'drift', 'orbit', 'hex'];

const getModeLabel = (g) => (g.p === 1 ? 'Single-Player' : g.p === 2 ? '2-Player' : g.p === 3 ? '3-Player' : 'Multiplayer');

const getCategoryLabel = (g) => {
  if (!g.c || g.c.length === 0) return 'Arcade';
  const primary = g.c.find(c => c !== 'popular') || g.c[0];
  const catObj = CATS.find(([k]) => k === primary);
  return catObj ? catObj[1] : primary;
};

// 2048 Color Scheme Matching Apple/CoGether Palette
const TILE_COLORS = {
  0: ['rgba(0,0,0,0.04)', 'transparent'],
  2: ['#FFF3B0', '#1D1D1F'],
  4: ['#FFE57A', '#1D1D1F'],
  8: ['#FFD60A', '#1D1D1F'],
  16: ['#F0A30A', '#1D1D1F'],
  32: ['#E3262E', '#FFFFFF'],
  64: ['#C11E25', '#FFFFFF'],
  128: ['#9B171C', '#FFFFFF'],
  256: ['#1D1D1F', '#FFE500'],
  512: ['#000000', '#FFE500'],
  1024: ['#E3262E', '#FFE500'],
  2048: ['#FFE500', '#000000']
};

export default function CoPlayGamesHub({ onBackToHome, onSelectService }) {
  const { user, profile, isAuthenticated, accessToken } = useAuth();
  const { isSocialModalOpen, setIsSocialModalOpen, unreadSummary } = useSocial();

  // Navigation State
  const [activeView, setActiveView] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('game')) return 'play';
    }
    return 'home';
  });
  const [selectedGameId, setSelectedGameId] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const g = p.get('game');
      if (g) return g;
    }
    return '2048';
  });
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  // Global Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [leaderboardGame, setLeaderboardGame] = useState(null);

  // PostgreSQL Favorites Synchronization
  const [favorites, setFavorites] = useState([]);
  useEffect(() => {
    if (!accessToken) {
      setFavorites([]);
      return;
    }
    let isMounted = true;
    fetch(`${API_URL}/api/v1/coplay/favorites`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then((res) => (res.ok ? res.json() : { favorites: [] }))
      .then((data) => {
        if (isMounted && Array.isArray(data.favorites)) {
          setFavorites(data.favorites.map((f) => f.game_id || f));
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const toggleFavorite = useCallback(async (gameId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!accessToken) {
      setShowAuthModal(true);
      return;
    }
    const isFav = favorites.includes(gameId);
    try {
      if (isFav) {
        setFavorites((prev) => prev.filter((id) => id !== gameId));
        await fetch(`${API_URL}/api/v1/coplay/favorites/${gameId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        showToast('Removed from favorites');
      } else {
        setFavorites((prev) => [...prev, gameId]);
        await fetch(`${API_URL}/api/v1/coplay/favorites/${gameId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        showToast('Added to favorites');
      }
    } catch (err) {
      console.warn('Failed to update favorite', err);
    }
  }, [accessToken, favorites]);

  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 2400);
  }, []);

  // Player Stats & State
  const [playerState, setPlayerState] = useState(() => {
    const fallbackName = profile?.displayName || profile?.username || (user?.email ? user.email.split('@')[0] : 'Jeevan');
    try {
      const saved = JSON.parse(localStorage.getItem('cogether_coplay_player') || '{}');
      return {
        name: saved.name || fallbackName,
        xp: saved.xp || 140,
        games: saved.games || 12,
        wins: saved.wins || 7,
        best: saved.best || 2048,
        hist: saved.hist || [
          ['2048', 2048, 'Solo'],
          ['Tic Tac Duel', 1, 'Won'],
          ['Clumsy Bird', 34, 'Solo']
        ]
      };
    } catch (e) {
      return { name: fallbackName, xp: 140, games: 12, wins: 7, best: 2048, hist: [] };
    }
  });

  const savePlayerState = (updater) => {
    setPlayerState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      try {
        localStorage.setItem('cogether_coplay_player', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Friends List
  const [friends, setFriends] = useState([
    { n: 'Aarav', st: 'online' },
    { n: 'Meera', st: 'in a game' },
    { n: 'Ishaan', st: 'online' },
    { n: 'Priya', st: 'offline' },
    { n: 'Rohan', st: 'offline' }
  ]);
  const [friendRequests, setFriendRequests] = useState(['Kabir', 'Sana']);
  const [newFriendInput, setNewFriendInput] = useState('');

  // ── 1. 2048 IN-SLIDE PLAYABLE ENGINE ──
  const [slide2048Board, setSlide2048Board] = useState(Array(16).fill(0));
  const [slide2048Score, setSlide2048Score] = useState(0);
  const [slide2048Over, setSlide2048Over] = useState(false);

  const init2048 = useCallback(() => {
    let b = Array(16).fill(0);
    const addTile = (arr) => {
      const emptyIndices = arr.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      if (emptyIndices.length) {
        const idx = emptyIndices[(Math.random() * emptyIndices.length) | 0];
        arr[idx] = Math.random() < 0.9 ? 2 : 4;
      }
    };
    addTile(b);
    addTile(b);
    setSlide2048Board(b);
    setSlide2048Score(0);
    setSlide2048Over(false);
  }, []);

  const move2048 = useCallback((direction) => {
    setSlide2048Board((prevBoard) => {
      let b = [...prevBoard];
      let gained = 0;
      let moved = false;

      const mergeLine = (line) => {
        let filtered = line.filter((x) => x);
        let pts = 0;
        for (let i = 0; i < filtered.length - 1; i++) {
          if (filtered[i] === filtered[i + 1]) {
            filtered[i] *= 2;
            pts += filtered[i];
            filtered.splice(i + 1, 1);
          }
        }
        while (filtered.length < 4) filtered.push(0);
        return [filtered, pts];
      };

      const getIdx = (d, r, c) => {
        if (d === 0) return r * 4 + c; // left
        if (d === 1) return r * 4 + 3 - c; // right
        if (d === 2) return c * 4 + r; // up
        return (3 - c) * 4 + r; // down
      };

      for (let r = 0; r < 4; r++) {
        let line = [0, 1, 2, 3].map((c) => b[getIdx(direction, r, c)]);
        let [merged, pts] = mergeLine(line);
        gained += pts;
        merged.forEach((val, c) => {
          if (b[getIdx(direction, r, c)] !== val) moved = true;
          b[getIdx(direction, r, c)] = val;
        });
      }

      if (!moved) return prevBoard;

      // Add new tile
      const emptyIndices = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      if (emptyIndices.length) {
        b[emptyIndices[(Math.random() * emptyIndices.length) | 0]] = Math.random() < 0.9 ? 2 : 4;
      }

      // Check if board can move
      const canMove = () => {
        if (b.some((v) => v === 0)) return true;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            const v = b[r * 4 + c];
            if (c < 3 && v === b[r * 4 + c + 1]) return true;
            if (r < 3 && v === b[(r + 1) * 4 + c]) return true;
          }
        }
        return false;
      };

      setSlide2048Score((s) => {
        const nextScore = s + gained;
        if (!canMove()) {
          setSlide2048Over(true);
          savePlayerState((p) => ({
            games: p.games + 1,
            best: Math.max(p.best, nextScore),
            xp: p.xp + Math.round(nextScore / 8)
          }));
        }
        return nextScore;
      });

      return b;
    });
  }, []);

  // ── 2. TIC TAC DUEL IN-SLIDE PLAYABLE ENGINE ──
  const [slideTTTBoard, setSlideTTTBoard] = useState(Array(9).fill(''));
  const [slideTTTWinner, setSlideTTTWinner] = useState(null); // null | 'X' | 'O' | 'draw'

  const checkTTTWinner = (b) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let [a, bIdx, c] of lines) {
      if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) return b[a];
    }
    if (b.every((cell) => cell !== '')) return 'draw';
    return null;
  };

  const handleTTTClick = (index) => {
    if (slideTTTBoard[index] || slideTTTWinner) return;
    const next = [...slideTTTBoard];
    next[index] = 'X';
    const win = checkTTTWinner(next);
    if (win) {
      setSlideTTTBoard(next);
      setSlideTTTWinner(win);
      if (win === 'X') {
        savePlayerState((p) => ({ wins: p.wins + 1, games: p.games + 1, xp: p.xp + 40 }));
      }
      return;
    }

    setSlideTTTBoard(next);

    // AI Bot Aarav response
    setTimeout(() => {
      const empty = next.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      if (!empty.length) return;
      const botPick = empty[(Math.random() * empty.length) | 0];
      next[botPick] = 'O';
      const botWin = checkTTTWinner(next);
      setSlideTTTBoard([...next]);
      if (botWin) {
        setSlideTTTWinner(botWin);
        savePlayerState((p) => ({ games: p.games + 1 }));
      }
    }, 450);
  };

  const resetTTT = () => {
    setSlideTTTBoard(Array(9).fill(''));
    setSlideTTTWinner(null);
  };

  // ── 3. HORIZONTAL 3D DECK SCROLLING & TILT ──
  const trkRef = useRef(null);
  const dkRef = useRef(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const updateDeck3DEffect = useCallback(() => {
    const trk = trkRef.current;
    if (!trk) return;
    const center = trk.scrollLeft + trk.clientWidth / 2;
    const slides = Array.from(trk.children);
    let closestIndex = 0;
    let minDistance = 1e9;

    slides.forEach((slide, idx) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const dist = (slideCenter - center) / slide.offsetWidth;
      const absDist = Math.min(1.6, Math.abs(dist));

      slide.style.transform = `rotateY(${-dist * 26}deg) translateZ(${-absDist * 80}px) scale(${1 - absDist * 0.08})`;
      slide.style.opacity = Math.max(0.3, 1 - absDist * 0.45);

      if (Math.abs(dist) < minDistance) {
        minDistance = Math.abs(dist);
        closestIndex = idx;
      }
    });

    setActiveSlideIndex(closestIndex);
  }, []);

  const scrollToSlide = (idx) => {
    const trk = trkRef.current;
    if (!trk) return;
    const slides = Array.from(trk.children);
    if (!slides[idx]) return;
    const target = slides[idx].offsetLeft + slides[idx].offsetWidth / 2 - trk.clientWidth / 2;
    trk.scrollTo({ left: target, behavior: 'smooth' });
  };

  // Keyboard navigation for active slide
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeView !== 'home') return;
      if (activeSlideIndex === 0) {
        // In 2048 slide
        const map = { ArrowLeft: 0, a: 0, ArrowRight: 1, d: 1, ArrowUp: 2, w: 2, ArrowDown: 3, s: 3 };
        if (map[e.key] !== undefined) {
          e.preventDefault();
          move2048(map[e.key]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, activeSlideIndex, move2048]);

  // Initial setup for 2048
  useEffect(() => {
    init2048();
  }, [init2048]);

  // ── 4. TRENDING NOW 3D CAROUSEL STAGE ──
  const [trendingIndex, setTrendingIndex] = useState(0);
  const trendingList = useMemo(() => MASTER_GAMES.slice(0, 7), []);

  const nextTrending = () => setTrendingIndex((prev) => (prev + 1) % trendingList.length);
  const prevTrending = () => setTrendingIndex((prev) => (prev - 1 + trendingList.length) % trendingList.length);

  // Auto-cycle trending carousel
  useEffect(() => {
    if (activeView !== 'home') return;
    const timer = setInterval(() => {
      nextTrending();
    }, 3800);
    return () => clearInterval(timer);
  }, [activeView, trendingList.length]);

  // ── 5. ARENA PLAY STATE (FOR ACTIVE PLAY VIEW) ──
  const [arenaMode, setArenaMode] = useState(1); // 1 = Solo, 2 = Duo, 3 = Trio
  const [arenaMicOn, setArenaMicOn] = useState(true);
  const [arenaCamOpen, setArenaCamOpen] = useState(false);
  const [arenaCamMode, setArenaCamMode] = useState('group'); // 'group' | 'separate' | 'merge'
  const [arenaCamSize, setArenaCamSize] = useState(1); // 0 = S, 1 = M, 2 = L
  const [chatMessages, setChatMessages] = useState([
    { in: true, who: 'Aarav', text: 'Ready? Let\'s go!', time: '12:01' },
    { in: true, who: 'Meera', text: 'Press start on 3 🙌', time: '12:02' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const arenaRoomCode = useMemo(() => 'duel-' + Math.floor(1000 + Math.random() * 8999), []);

  const sendChatMessage = () => {
    const txt = chatInput.trim();
    if (!txt) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [...prev, { in: false, text: txt, time }]);
    setChatInput('');

    // Simulated reply
    setTimeout(() => {
      const replies = ['gg 🙌', 'one more round?', 'that was close!', 'your turn!', 'nice move!'];
      const who = Math.random() < 0.5 ? 'Aarav' : 'Meera';
      setChatMessages((prev) => [
        ...prev,
        { in: true, who, text: replies[(Math.random() * replies.length) | 0], time }
      ]);
    }, 1400);
  };

  // Filtered games for showcase rows
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return MASTER_GAMES.filter((g) => {
      const matchCat = activeCategory === 'all' || g.c.includes(activeCategory);
      const matchQ = !q || g.n.toLowerCase().includes(q) || g.d.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeCategory, searchQuery]);

  const activeGame = useMemo(() => {
    return MASTER_GAMES.find((g) => g.id === selectedGameId) || MASTER_GAMES[0];
  }, [selectedGameId]);

  // Sidebar toggle collapsed
  const toggleGroup = (grp) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(grp)) next.delete(grp);
      else next.add(grp);
      return next;
    });
  };

  // Transition coordination state
  const [isTransitioningToGame, setIsTransitioningToGame] = useState(false);

  // Launch a game with coordinated 700ms transition
  const openGameDetail = (gameId) => {
    setSelectedGameId(gameId);
    setIsTransitioningToGame(true);
    setTimeout(() => {
      setActiveView('game');
      setIsTransitioningToGame(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 700);
  };

  const handleBackToCatalog = () => {
    setActiveView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const launchGamePlay = (gameId, mode = 1) => {
    setSelectedGameId(gameId);
    setArenaMode(mode);
    setActiveView('play');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showSidebar = activeView === 'home';
  const showTopNav = activeView === 'home';

  return (
    <div className="coplay-gallery-root">
      {/* ──────────────────────────────────────────────────────────────────
          1. FIXED APPLE GALLERY SIDEBAR
          ────────────────────────────────────────────────────────────────── */}
      {showSidebar && (
        <aside className={`coplay-sidebar ${mobileMenuOpen ? 'open' : ''} ${isTransitioningToGame ? 'sliding-out' : ''}`}>
        <div 
          className="coplay-sidebar-logo-area" 
          onClick={() => { setActiveView('home'); setMobileMenuOpen(false); }}
        >
          <div className="coplay-logo-text">
            CO<span>PLAY</span>
          </div>
          <span className="coplay-logo-sub">GAMES</span>
        </div>

        {/* Categories Group */}
        <div className={`coplay-sg ${collapsedGroups.has('cat') ? 'collapsed' : ''}`}>
          <div className="coplay-sec-hdr" onClick={() => toggleGroup('cat')}>
            <span>CATEGORIES</span>
            <i></i>
          </div>
          <div className="coplay-sgi">
            {CATS.map(([cId, label]) => {
              const count = cId === 'all' ? MASTER_GAMES.length : MASTER_GAMES.filter((g) => g.c.includes(cId)).length;
              const isActive = activeView === 'home' && activeCategory === cId;
              return (
                <button
                  key={cId}
                  className={`coplay-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCategory(cId);
                    setActiveView('home');
                    setMobileMenuOpen(false);
                  }}
                >
                  <span>{label}</span>
                  <em>{count}</em>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sections Group */}
        <div className={`coplay-sg ${collapsedGroups.has('sec') ? 'collapsed' : ''}`}>
          <div className="coplay-sec-hdr" onClick={() => toggleGroup('sec')}>
            <span>SECTIONS</span>
            <i></i>
          </div>
          <div className="coplay-sgi">
            {SECTIONS.map(([sId, title]) => (
              <button
                key={sId}
                className="coplay-nav-link"
                onClick={() => {
                  setActiveView('home');
                  setMobileMenuOpen(false);
                  const el = document.getElementById(`section-${sId}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>{title.replace('Our ', '')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* You Group */}
        <div className="coplay-sg">
          <div className="coplay-sec-hdr">
            <span>YOU</span>
          </div>
          <div className="coplay-sgi">
            <button
              className={`coplay-nav-link ${activeView === 'friends' ? 'active' : ''}`}
              onClick={() => { setActiveView('friends'); setMobileMenuOpen(false); }}
            >
              <span>Friends</span>
              <em>{friends.length}</em>
            </button>
            <button
              className={`coplay-nav-link ${activeView === 'profile' ? 'active' : ''}`}
              onClick={() => { setActiveView('profile'); setMobileMenuOpen(false); }}
            >
              <span>Profile</span>
            </button>
          </div>
        </div>

        {/* Bottom User Card */}
        <div 
          className="coplay-sidebar-user" 
          onClick={() => {
            if (isAuthenticated) setActiveView('profile');
            else setShowAuthModal(true);
          }}
        >
          <div className="coplay-user-av">
            {playerState.name ? playerState.name[0].toUpperCase() : 'J'}
          </div>
          <div className="coplay-user-info">
            <span className="coplay-user-name">{playerState.name}</span>
            <span className="coplay-user-sub">
              {isAuthenticated ? `Level ${1 + Math.floor(playerState.xp / 200)} Member` : 'Tap to Sign In'}
            </span>
          </div>
        </div>
      </aside>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          2. MAIN VIEWPORT & TOP NAVIGATION BAR
          ────────────────────────────────────────────────────────────────── */}
      <div className={`coplay-main-viewport ${!showSidebar ? 'full-width' : ''} ${isTransitioningToGame ? 'expanding' : ''}`}>
        {showTopNav && (
          <header className={`coplay-top-nav ${isTransitioningToGame ? 'sliding-out' : ''}`}>
          <button 
            className="coplay-mobile-toggle" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            ≡
          </button>

          <nav className="coplay-service-tabs">
            <button 
              type="button" 
              className="coplay-service-tab" 
              onClick={() => onSelectService ? onSelectService('cowatch') : onBackToHome('watch')}
            >
              CO-WATCH
            </button>
            <button 
              type="button" 
              className="coplay-service-tab active"
              onClick={() => setActiveView('home')}
            >
              CO-PLAY
            </button>
            <button 
              type="button" 
              className="coplay-service-tab" 
              onClick={() => onSelectService ? onSelectService('coshop') : onBackToHome('shop')}
            >
              CO-SHOP
            </button>
            <button 
              type="button" 
              className="coplay-service-tab" 
              onClick={() => onSelectService ? onSelectService('costudy') : onBackToHome('study')}
            >
              CO-STUDY
            </button>
          </nav>

          <div className="coplay-search-pill">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Find a game..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn-coplay-yellow"
            onClick={() => launchGamePlay('ttt', 2)}
          >
            <Swords size={15} />
            <span>Play with a friend</span>
          </button>

          {!isAuthenticated && (
            <button
              type="button"
              className="btn-coplay-ghost"
              onClick={() => setShowAuthModal(true)}
            >
              <LogIn size={15} />
              <span>Log In</span>
            </button>
          )}
        </header>
        )}

        {/* ──────────────────────────────────────────────────────────────────
            VIEW A: HOME VIEW (HERO + 3D DECK + TRENDING + SHOWCASE ROWS)
            ────────────────────────────────────────────────────────────────── */}
        {activeView === 'home' && (
          <main className={`coplay-home-main ${isTransitioningToGame ? 'fading-out' : ''}`}>
            {/* 1. Hero Title Banner with Rising Staggered Letters & Yellow Underline */}
            <section className="coplay-hero-banner">
              <span className="coplay-hero-kicker">
                <Flame size={14} /> VERIFIED GAMING ARCADE
              </span>
              <h1 className="coplay-hero-title">
                {Array.from('COPLAY').map((char, idx) => (
                  <span 
                    key={idx} 
                    className="coplay-hero-letter" 
                    style={{ '--i': idx }}
                  >
                    {char}
                  </span>
                ))}
              </h1>
              <div className="coplay-hero-underline"></div>
              <p className="coplay-hero-sub">
                Play together, from anywhere · Solo · Duo · Trio · Squad
              </p>
            </section>

            {/* 2. Horizontal 3D Interactive Carousel / Deck */}
            <section className="coplay-deck-section">
              <div className="coplay-deck-header">
                <div className="coplay-deck-heading-group">
                  <h2 className="coplay-deck-title">Play top games here</h2>
                  <span className="coplay-deck-subtitle">Scroll sideways · Play inside the slide</span>
                </div>
                <div className="coplay-deck-nav-buttons">
                  <button 
                    className="coplay-circle-btn" 
                    onClick={() => scrollToSlide(Math.max(0, activeSlideIndex - 1))}
                    aria-label="Previous slide"
                  >
                    ←
                  </button>
                  <button 
                    className="coplay-circle-btn" 
                    onClick={() => scrollToSlide(Math.min(TOP_SLIDE_IDS.length - 1, activeSlideIndex + 1))}
                    aria-label="Next slide"
                  >
                    →
                  </button>
                </div>
              </div>

              <div 
                className="coplay-deck-frame" 
                ref={dkRef}
                onMouseMove={(e) => {
                  const dk = dkRef.current;
                  if (!dk) return;
                  const rect = dk.getBoundingClientRect();
                  const x = (e.clientX - rect.left) / rect.width - 0.5;
                  const y = (e.clientY - rect.top) / rect.height - 0.5;
                  dk.style.transform = `perspective(1800px) rotateX(${2.5 - y * 5}deg) rotateY(${x * 6}deg)`;
                }}
                onMouseLeave={() => {
                  if (dkRef.current) dkRef.current.style.transform = '';
                }}
              >
                <div 
                  className="coplay-deck-track" 
                  ref={trkRef} 
                  onScroll={updateDeck3DEffect}
                >
                  {TOP_SLIDE_IDS.map((gId, sIdx) => {
                    const g = MASTER_GAMES.find((m) => m.id === gId) || MASTER_GAMES[0];
                    return (
                      <article key={gId} className="coplay-slide-card">
                        <div className="coplay-slide-info">
                          <span className="coplay-badge-pill">
                            {g.ok ? 'Play right here' : 'Top game'} · {getModeLabel(g)}
                          </span>
                          <h2 className="coplay-slide-title">{g.n}</h2>
                          <p className="coplay-slide-desc">{g.d}</p>
                          <div className="coplay-slide-actions">
                            <button 
                              type="button" 
                              className="btn-coplay-yellow"
                              onClick={() => launchGamePlay(g.id, g.p === 'any' ? 3 : g.p)}
                            >
                              Open room
                            </button>
                            <button 
                              type="button" 
                              className="btn-coplay-ghost"
                              onClick={() => openGameDetail(g.id)}
                            >
                              Game details
                            </button>
                          </div>
                        </div>

                        {/* Interactive In-Slide Canvas for 2048 & Tic Tac Duel */}
                        <div className="coplay-slide-play-panel">
                          {gId === '2048' ? (
                            <>
                              <div className="coplay-slide-play-header">
                                <span>SCORE</span>
                                <b>{slide2048Score}</b>
                              </div>
                              <div className="coplay-2048-board">
                                {slide2048Board.map((val, cellIdx) => {
                                  const c = TILE_COLORS[Math.min(val, 2048)] || TILE_COLORS[0];
                                  return (
                                    <div 
                                      key={cellIdx} 
                                      className="coplay-2048-tile"
                                      style={{ background: c[0], color: c[1] }}
                                    >
                                      {val || ''}
                                    </div>
                                  );
                                })}
                              </div>
                              <button 
                                type="button" 
                                className="btn-coplay-ghost btn-coplay-sm"
                                onClick={init2048}
                              >
                                New game
                              </button>
                              {slide2048Over && (
                                <div className="coplay-slide-overlay">
                                  <b>Game over</b>
                                  <span>Final Score: {slide2048Score}</span>
                                  <button type="button" className="btn-coplay-yellow btn-coplay-sm" onClick={init2048}>
                                    Play again
                                  </button>
                                </div>
                              )}
                            </>
                          ) : gId === 'ttt' ? (
                            <>
                              <div className="coplay-slide-play-header">
                                <span>YOU ✕ &nbsp;vs&nbsp; AARAV ○</span>
                              </div>
                              <div className="coplay-ttt-board">
                                {slideTTTBoard.map((cell, cellIdx) => (
                                  <button
                                    key={cellIdx}
                                    className={`coplay-ttt-cell ${cell ? cell.toLowerCase() : ''}`}
                                    disabled={!!cell || !!slideTTTWinner}
                                    onClick={() => handleTTTClick(cellIdx)}
                                  >
                                    {cell}
                                  </button>
                                ))}
                              </div>
                              <button 
                                type="button" 
                                className="btn-coplay-ghost btn-coplay-sm"
                                onClick={resetTTT}
                              >
                                Reset board
                              </button>
                              {slideTTTWinner && (
                                <div className="coplay-slide-overlay">
                                  <b>
                                    {slideTTTWinner === 'X' ? 'You win! 🎉' : slideTTTWinner === 'O' ? 'Aarav wins!' : 'Draw!'}
                                  </b>
                                  <span>{slideTTTWinner === 'draw' ? 'Nobody blinked' : 'Three in a row'}</span>
                                  <button type="button" className="btn-coplay-yellow btn-coplay-sm" onClick={resetTTT}>
                                    Rematch
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <RenderGameSvg game={g} className="coplay-slide-artwork" />
                              <span className="coplay-badge-pill">Opens in verified room</span>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* Dots indicator */}
              <div className="coplay-deck-dots">
                {TOP_SLIDE_IDS.map((_, i) => (
                  <button
                    key={i}
                    className={`coplay-deck-dot ${i === activeSlideIndex ? 'active' : ''}`}
                    onClick={() => scrollToSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </section>

            {/* 3. Trending Now 3D Carousel Stage */}
            <section className="coplay-trending-section">
              <div className="coplay-row-header" style={{ padding: 0 }}>
                <h2 className="coplay-row-title">Trending now</h2>
                <span className="coplay-row-desc">Click center card to inspect</span>
              </div>
              <div className="coplay-stage-3d">
                {trendingList.map((g, idx) => {
                  const n = trendingList.length;
                  const diff = ((idx - trendingIndex + n + n / 2) % n) - n / 2;
                  const absDiff = Math.abs(diff);
                  const isCenter = diff === 0;
                  const spacing = 190;

                  return (
                    <div
                      key={g.id}
                      className="coplay-card-3d"
                      style={{
                        transform: `translateX(${diff * spacing}px) scale(${isCenter ? 1.18 : 0.86 - absDiff * 0.04})`,
                        opacity: absDiff > 2.5 ? 0 : isCenter ? 1 : Math.max(0.2, 0.75 - absDiff * 0.22),
                        filter: isCenter ? 'none' : `blur(${absDiff * 1.5}px)`,
                        zIndex: 10 - Math.round(absDiff),
                        pointerEvents: absDiff > 2.5 ? 'none' : 'auto'
                      }}
                      onClick={() => {
                        if (isCenter) openGameDetail(g.id);
                        else setTrendingIndex(idx);
                      }}
                    >
                      <RenderGameSvg game={g} />
                      <span className="card-mode">{getModeLabel(g)}</span>
                      <span className="card-category">{getCategoryLabel(g)}</span>
                      <b>{g.n}</b>
                    </div>
                  );
                })}
              </div>
              <div className="coplay-trending-controls">
                <button className="coplay-circle-btn" onClick={prevTrending} aria-label="Previous">
                  ←
                </button>
                <button className="coplay-circle-btn" onClick={nextTrending} aria-label="Next">
                  →
                </button>
              </div>
            </section>

            {/* 4. Categorized Game Showcase Rows */}
            <section className="coplay-showcase-section">
              {SECTIONS.map(([sId, title, desc]) => {
                const list = filteredCatalog.filter((g) => g.s === sId);
                if (!list.length) return null;
                return (
                  <div key={sId} id={`section-${sId}`} className="coplay-row-group">
                    <div className="coplay-row-header">
                      <h3 className="coplay-row-title">{title}</h3>
                      <span className="coplay-row-desc">{desc}</span>
                    </div>
                    <div className="coplay-row-scroll">
                      {list.map((game) => (
                        <div 
                          key={game.id} 
                          className="coplay-game-card"
                          onClick={() => openGameDetail(game.id)}
                        >
                          <RenderGameSvg game={game} />
                          <span className="card-mode">{getModeLabel(game)}</span>
                          {game.ok && <span className="card-verified-tag">VERIFIED</span>}
                          <span className="card-category">{getCategoryLabel(game)}</span>
                          <b>{game.n}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          </main>
        )}

        {/* ──────────────────────────────────────────────────────────────────
            VIEW B: APPLE FULL-SCREEN CINEMATIC GAME EXPERIENCE
            ────────────────────────────────────────────────────────────────── */}
        {activeView === 'game' && (
          <AppleGameDetail
            game={activeGame}
            onBackToCatalog={handleBackToCatalog}
            onLaunchPlay={(g) => launchGamePlay(g ? g.id : activeGame.id)}
            onOpenInviteModal={() => setShowInviteModal(true)}
          />
        )}

        {/* ──────────────────────────────────────────────────────────────────
            VIEW C: UNIVERSAL GAME MONITOR PLAYER (SHARED FOR EVERY GAME)
            ────────────────────────────────────────────────────────────────── */}
        {activeView === 'play' && activeGame && (
          <GamePlayer
            game={activeGame}
            onClose={() => setActiveView('home')}
            initialMode={arenaMode > 1 ? 'CHALLENGE' : 'SINGLE_PLAYER'}
            initialRoomId={arenaRoomCode}
            currentUsername={playerState.name}
            onSelectService={onSelectService}
            onBackToHome={onBackToHome}
          />
        )}

        {/* ──────────────────────────────────────────────────────────────────
            VIEW D: FRIENDS PAGE
            ────────────────────────────────────────────────────────────────── */}
        {activeView === 'friends' && (
          <div className="coplay-page-container">
            <h1 className="coplay-page-title">Friends</h1>
            <p className="coplay-page-sub">Add, invite and play together</p>

            <div className="coplay-add-friend-bar">
              <input
                type="text"
                placeholder="Add friend by username..."
                value={newFriendInput}
                onChange={(e) => setNewFriendInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFriendInput.trim()) {
                    setFriends([...friends, { n: newFriendInput.trim(), st: 'request sent' }]);
                    showToast(`Request sent to ${newFriendInput.trim()}`);
                    setNewFriendInput('');
                  }
                }}
              />
              <button 
                type="button" 
                className="btn-coplay-yellow"
                onClick={() => {
                  if (!newFriendInput.trim()) return;
                  setFriends([...friends, { n: newFriendInput.trim(), st: 'request sent' }]);
                  showToast(`Request sent to ${newFriendInput.trim()}`);
                  setNewFriendInput('');
                }}
              >
                Add friend
              </button>
            </div>

            {friendRequests.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 className="coplay-sec-hdr" style={{ padding: '0 0 12px' }}>PENDING REQUESTS</h3>
                <div className="coplay-friends-grid">
                  {friendRequests.map((req, i) => (
                    <div key={i} className="coplay-friend-card">
                      <div className="coplay-user-av">{req[0]}</div>
                      <div>
                        <b>{req}</b>
                        <small className="status-dot">wants to connect</small>
                      </div>
                      <button 
                        type="button" 
                        className="btn-coplay-yellow btn-coplay-sm"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => {
                          setFriends([...friends, { n: req, st: 'online' }]);
                          setFriendRequests(friendRequests.filter((r) => r !== req));
                          showToast(`${req} is now a friend`);
                        }}
                      >
                        Accept
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="coplay-sec-hdr" style={{ padding: '0 0 12px' }}>ALL FRIENDS · {friends.length}</h3>
            <div className="coplay-friends-grid">
              {friends.map((f, i) => (
                <div key={i} className="coplay-friend-card">
                  <div className="coplay-user-av">{f.n[0]}</div>
                  <div>
                    <b>{f.n}</b>
                    <small className={`status-dot ${f.st === 'online' ? 'online' : ''}`}>
                      ● {f.st}
                    </small>
                  </div>
                  <button 
                    type="button" 
                    className="btn-coplay-ghost btn-coplay-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => {
                      launchGamePlay('ttt', 2);
                      showToast(`Invited ${f.n} to duel`);
                    }}
                  >
                    Duel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────
            VIEW E: PROFILE PAGE (3D TILT CARD & STATS)
            ────────────────────────────────────────────────────────────────── */}
        {activeView === 'profile' && (
          <div className="coplay-page-container">
            <h1 className="coplay-page-title">Profile</h1>
            <p className="coplay-page-sub">Your player card & history</p>

            <div className="coplay-profile-stage">
              <div 
                className="coplay-profile-3d-card"
                onMouseMove={(e) => {
                  const card = e.currentTarget;
                  const rect = card.getBoundingClientRect();
                  const x = (e.clientX - rect.left) / rect.width - 0.5;
                  const y = (e.clientY - rect.top) / rect.height - 0.5;
                  card.style.transform = `rotateY(${x * 12}deg) rotateX(${-y * 9}deg)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                }}
              >
                <div className="coplay-profile-big-av">
                  {playerState.name ? playerState.name[0].toUpperCase() : 'J'}
                </div>
                <div className="coplay-profile-details">
                  <h2 
                    className="coplay-profile-name"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const txt = e.currentTarget.textContent.trim() || 'Player';
                      savePlayerState({ name: txt });
                      showToast('Name updated');
                    }}
                  >
                    {playerState.name}
                  </h2>
                  <span className="coplay-badge-pill" style={{ marginTop: '6px' }}>
                    LEVEL {1 + Math.floor(playerState.xp / 200)} PLAYER
                  </span>
                  <div className="coplay-xp-track">
                    <div 
                      className="coplay-xp-fill" 
                      style={{ width: `${(playerState.xp % 200) / 2}%` }}
                    />
                  </div>
                  <small style={{ color: '#707070' }}>{playerState.xp % 200} / 200 XP to Level {2 + Math.floor(playerState.xp / 200)}</small>

                  <div className="coplay-stats-quad">
                    <div className="coplay-stat-cell">
                      <b>{playerState.games}</b>
                      <span>Games</span>
                    </div>
                    <div className="coplay-stat-cell">
                      <b>{playerState.wins}</b>
                      <span>Wins</span>
                    </div>
                    <div className="coplay-stat-cell">
                      <b>{playerState.best}</b>
                      <span>Best 2048</span>
                    </div>
                    <div className="coplay-stat-cell">
                      <b>{friends.length}</b>
                      <span>Friends</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Toast Notification */}
      <div className={`coplay-toast-pill ${toastVisible ? 'visible' : ''}`}>
        {toastMessage}
      </div>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onLoginSuccess={() => setShowAuthModal(false)} 
        />
      )}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
      {leaderboardGame && (
        <LeaderboardModal 
          game={leaderboardGame} 
          onClose={() => setLeaderboardGame(null)} 
        />
      )}
    </div>
  );
}
