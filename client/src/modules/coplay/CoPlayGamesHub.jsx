import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Gamepad2, Search, Play, Users, Flame, Star, Trophy, ArrowLeft, 
  X, Maximize, Minimize, Share2, Copy, Check, Heart, User, 
  LogIn, Sparkles, Zap, Car, Crosshair, Brain, Swords, Bell, ShoppingBag, ShieldCheck
} from 'lucide-react';
import { AUTHORIZED_GAMES_DATABASE, GAME_CATEGORIES } from './authorizedGamesCatalog.js';
import { GameMode, LicenseStatus, DistributionStatus } from './gameSchema.js';
import GameCard from './components/GameCard.jsx';
import GameDetailsModal from './components/GameDetailsModal.jsx';
import GamePlayer from './components/GamePlayer.jsx';
import LeaderboardModal from './components/LeaderboardModal.jsx';
import AuthModal from '../auth/AuthModal.jsx';
import ProfileModal from '../auth/ProfileModal.jsx';
import { useAuth } from '../../core/AuthContext.jsx';
import { API_URL } from '../../config/api.js';
import { useSocial } from '../../core/SocialContext.jsx';
import CogetherAvatarRenderer from '../auth/CogetherAvatarRenderer.jsx';
import PlayWithFriendModal from './components/PlayWithFriendModal.jsx';
import FriendsModal from '../social/FriendsModal.jsx';
import AppNavShell from '../../components/common/AppNavShell.jsx';
import './CoPlayGamesHub.css';

const API_BASE = API_URL;

export default function CoPlayGamesHub({ onBackToHome, onSelectService, onLaunchSquadRoom, initialUser }) {
  const { user, profile, isAuthenticated, accessToken } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarHovered, setSidebarHovered] = useState(false);
  
  // Game Modals & Player State
  const [detailsGame, setDetailsGame] = useState(null);
  const [activePlayGame, setActivePlayGame] = useState(null);
  const [activePlayMode, setActivePlayMode] = useState('SINGLE_PLAYER');
  const [activePlayRoomId, setActivePlayRoomId] = useState(null);
  const [leaderboardGame, setLeaderboardGame] = useState(null);

  // Authentication & Profile Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPlayWithFriendModal, setShowPlayWithFriendModal] = useState(false);
  const { isSocialModalOpen, setIsSocialModalOpen, unreadSummary, pendingRequests } = useSocial();
  const [copiedCode, setCopiedCode] = useState(false);

  // Authoritative games catalog from PostgreSQL backend
  const [gamesCatalog, setGamesCatalog] = useState(AUTHORIZED_GAMES_DATABASE);
  const [loadingGames, setLoadingGames] = useState(true);

  // PostgreSQL-backed user favorites
  const [favorites, setFavorites] = useState([]);

  // Fetch games from PostgreSQL backend
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE}/api/games?verifiedOnly=true&limit=100`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted && data?.games && Array.isArray(data.games) && data.games.length > 0) {
          const mapped = data.games.map((g) => ({
            id: g.id,
            title: g.title,
            description: g.description,
            category: g.category,
            thumbnail: g.thumbnail || g.thumb || `/games/thumbnails/${g.id}.svg`,
            provider: g.provider || 'CoGether Open Source',
            gameMode: g.gameMode || 'SINGLE_PLAYER',
            launchType: g.launchType || 'LOCAL_SOURCE',
            launchUrl: g.launchUrl || g.url || `/games/${g.id}/index.html`,
            embedUrl: g.launchUrl || g.url || `/games/${g.id}/index.html`,
            sourceRepository: g.sourceRepository || '',
            sourceLicense: g.licenseType || 'MIT',
            licenseStatus: g.licenseStatus || 'LICENSE_VERIFIED',
            distributionStatus: g.distributionStatus || 'AVAILABLE',
            controls: typeof g.controls === 'string' ? JSON.parse(g.controls) : (g.controls || {}),
            orientation: g.orientation || 'any',
            maxPlayers: g.maxPlayers || 1,
            challengeSupported: g.challengeSupported ?? g.supportsChallenge ?? true,
            cameraSupported: true,
            fullscreenSupported: true
          }));
          setGamesCatalog(mapped);
        }
      })
      .catch((err) => {
        console.warn('Using authorized local games fallback:', err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingGames(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch PostgreSQL favorites when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setFavorites([]);
      return;
    }

    let isMounted = true;
    fetch(`${API_BASE}/api/v1/coplay/favorites`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.favorites && Array.isArray(data.favorites)) {
          setFavorites(data.favorites.map((f) => f.game_id));
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch player favorites:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, accessToken]);

  // Read URL query parameters for direct game or challenge link sharing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeId = params.get('challenge');
    const gameId = params.get('game');
    const roomId = params.get('room');

    if (challengeId) {
      const match = gamesCatalog.find((g) => g.id === challengeId);
      if (match) {
        setActivePlayGame(match);
        setActivePlayMode('CHALLENGE');
        setActivePlayRoomId(roomId || ('duel-' + Math.floor(1000 + Math.random() * 9000)));
      }
    } else if (gameId) {
      const match = gamesCatalog.find((g) => g.id === gameId);
      if (match) {
        setActivePlayGame(match);
        setActivePlayMode('SINGLE_PLAYER');
        setActivePlayRoomId(null);
      }
    }
  }, [gamesCatalog]);

  // Filter Games by Category & Search Query
  const filteredGames = useMemo(() => {
    return gamesCatalog.filter((game) => {
      let matchesCat = true;
      if (activeCategory === 'all') {
        matchesCat = true;
      } else if (activeCategory === 'favorites') {
        matchesCat = favorites.includes(game.id);
      } else if (activeCategory === 'popular') {
        matchesCat = ['2048', 'hextris', 'block-puzzle', 'clumsy-bird'].includes(game.id);
      } else if (activeCategory === 'local_coop') {
        matchesCat = game.gameMode === GameMode.LOCAL_COOP;
      } else if (activeCategory === 'multiplayer') {
        matchesCat = game.gameMode === GameMode.ONLINE_MULTIPLAYER;
      } else {
        matchesCat = game.category === activeCategory;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        game.title.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q) ||
        (game.category && game.category.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });
  }, [gamesCatalog, activeCategory, searchQuery, favorites]);

  const renderCatIcon = (iconName, size = 18) => {
    switch (iconName) {
      case 'Flame': return <Flame size={size} />;
      case 'Sparkles': return <Sparkles size={size} />;
      case 'Gamepad2': return <Gamepad2 size={size} />;
      case 'Brain': return <Brain size={size} />;
      case 'Zap': return <Zap size={size} />;
      case 'Users': return <Users size={size} />;
      case 'Trophy': return <Trophy size={size} />;
      case 'Heart': return <Heart size={size} />;
      default: return <Gamepad2 size={size} />;
    }
  };

  // Real user display values
  const displayName = profile?.displayName || profile?.username || (user?.email ? user.email.split('@')[0] : 'Arcade Player');
  const avatar = profile?.avatarUrl || '🎮';

  // Toggle favorite with real PostgreSQL endpoint
  const toggleFavorite = async (gameId, e) => {
    if (e) e.stopPropagation();

    if (!isAuthenticated || !accessToken) {
      setShowAuthModal(true);
      return;
    }

    const isFav = favorites.includes(gameId);
    // Optimistic UI update
    setFavorites((prev) => (isFav ? prev.filter((id) => id !== gameId) : [...prev, gameId]));

    try {
      const method = isFav ? 'DELETE' : 'POST';
      const res = await fetch(`${API_BASE}/api/v1/coplay/favorites/${encodeURIComponent(gameId)}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        // Rollback on server error
        setFavorites((prev) => (isFav ? [...prev, gameId] : prev.filter((id) => id !== gameId)));
      }
    } catch (err) {
      // Rollback on network error
      setFavorites((prev) => (isFav ? [...prev, gameId] : prev.filter((id) => id !== gameId)));
    }
  };

  // Launch handlers
  const handlePlayGame = (game) => {
    if (game.licenseStatus === LicenseStatus.PENDING_REVIEW) {
      setDetailsGame(game);
      return;
    }
    setActivePlayMode('SINGLE_PLAYER');
    setActivePlayRoomId(null);
    setActivePlayGame(game);
  };

  const copyToClipboardSafely = (text) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch (e) {}
  };

  const handleChallengeGame = (game) => {
    if (game.licenseStatus === LicenseStatus.PENDING_REVIEW) {
      setDetailsGame(game);
      return;
    }
    const challengeRoomId = 'duel-' + Math.floor(1000 + Math.random() * 9000);
    const link = `${window.location.origin}?room=${challengeRoomId}&mode=coplay&challenge=${game.id}`;
    copyToClipboardSafely(link);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    setActivePlayMode('CHALLENGE');
    setActivePlayRoomId(challengeRoomId);
    setActivePlayGame(game);
  };

  const handleSquadGame = (game) => {
    if (game.licenseStatus === LicenseStatus.PENDING_REVIEW) {
      setDetailsGame(game);
      return;
    }
    const squadRoomId = 'squad-' + Math.floor(1000 + Math.random() * 9000);
    const link = `${window.location.origin}?room=${squadRoomId}&mode=coplay&game=${game.id}`;
    copyToClipboardSafely(link);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    setActivePlayGame(game);
  };

  const handleShareSquadRoom = () => {
    const roomCode = 'squad-' + Math.floor(1000 + Math.random() * 9000);
    const link = `${window.location.origin}?room=${roomCode}&mode=coplay`;
    copyToClipboardSafely(link);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Featured Spotlight Game (Playable verified hit)
  const spotlightGame = gamesCatalog.find((g) => g.id === '2048') || gamesCatalog[0];

  // When a game is launched, render the dedicated GamePlayer
  if (activePlayGame) {
    return (
      <GamePlayer
        game={activePlayGame}
        initialMode={activePlayMode}
        initialRoomId={activePlayRoomId}
        currentUsername={displayName}
        onClose={() => {
          setActivePlayGame(null);
          setActivePlayMode('SINGLE_PLAYER');
          setActivePlayRoomId(null);
        }}
        onLaunchSquadRoom={handleSquadGame}
      />
    );
  }

  return (
    <div className="coplay-yellow-canvas-wrapper fade-in">
      {/* ── 1. TOP NAVIGATION HEADER (PLAYHOP STYLE) ── */}
      <AppNavShell
        activeService="coplay"
        onSelectService={(service) => {
          if (onSelectService) onSelectService(service);
          else if (service === 'cowatch') onBackToHome('watch');
          else if (service === 'coshop') onBackToHome('shop');
          else if (service === 'costudy') onBackToHome('study');
        }}
        onBackToHome={onBackToHome}
        user={user}
        profile={profile}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenSocial={() => setIsSocialModalOpen(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        unreadCount={unreadSummary.totalUnread}
        pendingCount={pendingRequests.incoming.length}
        centerContent={
          <div className="coplay-search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Find game or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
        }
        rightActions={
          <>
            <button
              type="button"
              className="btn-hub-play-friend"
              onClick={() => setShowPlayWithFriendModal(true)}
              title="Play with a Friend in a private room"
            >
              <Swords size={15} />
              <span>Play with Friend</span>
            </button>
            <button
              type="button"
              className="btn-squad-party-launch"
              onClick={handleShareSquadRoom}
              title="Create squad room"
            >
              <Users size={15} />
              <span>{copiedCode ? 'COPIED!' : 'SQUAD'}</span>
            </button>
          </>
        }
      />

      {/* ── 2. EXPANDABLE LEFT SIDEBAR DRAWER (PLAYHOP STYLE) ── */}
      <aside 
        className={`coplay-left-sidebar ${sidebarHovered ? 'expanded' : ''}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        aria-label="Game categories drawer"
      >
        <div className="sidebar-track">
          {isAuthenticated && (
            <button
              type="button"
              className="sidebar-cat-btn sidebar-friends-btn"
              onClick={() => setIsSocialModalOpen(true)}
              title="Friends & Messages"
            >
              <div className="cat-icon-wrap" style={{ color: '#FFE500' }}>
                <Users size={18} />
              </div>
              <span className="cat-label-text" style={{ fontWeight: 700, color: '#ffffff' }}>
                Friends
              </span>
              {unreadSummary.totalUnread > 0 && (
                <span className="sidebar-badge-count">{unreadSummary.totalUnread}</span>
              )}
            </button>
          )}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 6px' }} />
          {GAME_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                className={`sidebar-cat-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                title={cat.label}
              >
                <div className="cat-icon-wrap">
                  {renderCatIcon(cat.iconName, 18)}
                </div>
                <span className="cat-label-text">{cat.label}</span>
              </button>
            );
          })}
          {isAuthenticated && (
            <button
              className={`sidebar-cat-btn ${activeCategory === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveCategory('favorites')}
              title="My Favorites"
            >
              <div className="cat-icon-wrap">
                <Heart size={18} />
              </div>
              <span className="cat-label-text">Favorites ({favorites.length})</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── 3. MAIN CONTENT AREA (OFFSET BESIDE SIDEBAR) ── */}
      <div className="coplay-main-body">
        {/* Featured Spotlight Hero Banner */}
        {!searchQuery && activeCategory === 'all' && spotlightGame && (
          <section className="coplay-spotlight-hero">
            <div className="spotlight-banner-left">
              <div className="spotlight-badge-row">
                <span className="spotlight-tag">FEATURED ARCADE HIT</span>
                <span className="spotlight-genre-pill">{spotlightGame.category.toUpperCase()}</span>
              </div>
              <h2 className="spotlight-title">{spotlightGame.title}</h2>
              <p className="spotlight-desc">{spotlightGame.description}</p>
              <div className="spotlight-actions">
                <button 
                  type="button"
                  className="btn-spotlight-play" 
                  onClick={() => handlePlayGame(spotlightGame)}
                >
                  <Play size={18} fill="#000000" /> PLAY INSTANTLY
                </button>
                {spotlightGame.challengeSupported && (
                  <button 
                    type="button" 
                    className="btn-spotlight-squad" 
                    onClick={() => handleChallengeGame(spotlightGame)}
                  >
                    <Swords size={16} /> CHALLENGE FRIEND
                  </button>
                )}
                <button 
                  type="button" 
                  className="btn-spotlight-squad" 
                  onClick={() => setLeaderboardGame(spotlightGame)}
                  title="View Top Scores"
                >
                  <Trophy size={16} /> LEADERBOARD
                </button>
              </div>
            </div>
            <div className="spotlight-banner-right">
              <img 
                src={spotlightGame.thumbnail} 
                alt={spotlightGame.title} 
                className="spotlight-img"
                onClick={() => handlePlayGame(spotlightGame)}
              />
            </div>
          </section>
        )}

        {/* Game Cards Grid */}
        <main className="coplay-games-grid-section">
          <div className="grid-header-row">
            <div>
              <h3 className="section-heading">
                {activeCategory === 'all' 
                  ? 'VERIFIED OPEN-SOURCE GAMES' 
                  : activeCategory === 'popular' 
                  ? 'POPULAR GAMES' 
                  : activeCategory === 'favorites' 
                  ? 'MY FAVORITE GAMES' 
                  : `${activeCategory.replace('_', ' ').toUpperCase()} GAMES`}
              </h3>
              <span className="section-subtext">Verified open-source browser play • Duo camera overlay • Real-time leaderboard</span>
            </div>
            <span className="games-counter-badge">{filteredGames.length} GAMES</span>
          </div>

          {filteredGames.length === 0 ? (
            <div className="coplay-empty-state">
              <Gamepad2 size={36} className="empty-icon" />
              <h4>No games found in this category</h4>
              <p>Try clearing your search query or selecting "All Games".</p>
              <button 
                type="button" 
                className="btn-clear-filters"
                onClick={() => {
                  setActiveCategory('all');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="poki-style-cards-grid">
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onPlay={handlePlayGame}
                  onChallenge={handleChallengeGame}
                  onSquad={handleSquadGame}
                  onViewDetails={(g) => setDetailsGame(g)}
                  isFavorite={favorites.includes(game.id)}
                  onToggleFavorite={toggleFavorite}
                  onViewLeaderboard={(g) => setLeaderboardGame(g)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── 4. GAME DETAILS MODAL ── */}
      {detailsGame && (
        <GameDetailsModal
          game={detailsGame}
          onClose={() => setDetailsGame(null)}
          onPlay={handlePlayGame}
          onChallenge={handleChallengeGame}
          onSquad={handleSquadGame}
          onViewLeaderboard={(g) => {
            setDetailsGame(null);
            setLeaderboardGame(g);
          }}
        />
      )}

      {/* ── 5. LEADERBOARD MODAL ── */}
      {leaderboardGame && (
        <LeaderboardModal
          game={leaderboardGame}
          onClose={() => setLeaderboardGame(null)}
        />
      )}

      {/* ── 6. REAL AUTH MODAL ── */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={() => setShowAuthModal(false)}
        />
      )}

      {/* ── 7. REAL PROFILE MODAL ── */}
      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* ── 8. PLAY WITH FRIEND MODAL ── */}
      {showPlayWithFriendModal && (
        <PlayWithFriendModal
          game={gamesCatalog[0]}
          onClose={() => setShowPlayWithFriendModal(false)}
          onJoinRoom={(newRoomCode) => {
            setShowPlayWithFriendModal(false);
            setActivePlayGame(gamesCatalog[0]);
            setActivePlayMode('CHALLENGE');
            setActivePlayRoomId(newRoomCode);
          }}
        />
      )}



    </div>
  );
}
