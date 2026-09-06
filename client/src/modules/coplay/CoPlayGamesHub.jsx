import React, { useState, useEffect, useMemo } from 'react';
import { 
  Gamepad2, Search, Play, Users, Flame, Star, Trophy, ArrowLeft, 
  X, Maximize, Minimize, Share2, Copy, Check, Heart, User, 
  LogIn, Sparkles, Zap, Car, Crosshair, Brain, Swords, Bell, ShoppingBag
} from 'lucide-react';
import { AUTHORIZED_GAMES_DATABASE, GAME_CATEGORIES } from './authorizedGamesCatalog.js';
import { GameMode, LicenseStatus, DistributionStatus } from './gameSchema.js';
import GameCard from './components/GameCard.jsx';
import GameDetailsModal from './components/GameDetailsModal.jsx';
import GamePlayer from './components/GamePlayer.jsx';
import './CoPlayGamesHub.css';

export default function CoPlayGamesHub({ onBackToHome, onLaunchSquadRoom, initialUser }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarHovered, setSidebarHovered] = useState(false);
  
  // Game Modals & Player State
  const [detailsGame, setDetailsGame] = useState(null);
  const [activePlayGame, setActivePlayGame] = useState(null);
  const [activePlayMode, setActivePlayMode] = useState('SINGLE_PLAYER');
  const [activePlayRoomId, setActivePlayRoomId] = useState(null);

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cogether_fav_games')) || [];
    } catch {
      return [];
    }
  });

  // User Profile & Progress State (Persisted in localStorage)
  const [currentUser, setCurrentUser] = useState(() => {
    if (initialUser) return initialUser;
    try {
      const stored = localStorage.getItem('cogether_player_profile');
      return stored ? JSON.parse(stored) : {
        name: localStorage.getItem('sp_username') || 'ArcadePlayer_88',
        level: 4,
        xp: 1450,
        avatar: '🎮',
        isLoggedIn: true
      };
    } catch {
      return { name: 'Player_1', level: 1, xp: 100, avatar: '🕹️', isLoggedIn: false };
    }
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', avatar: '⚡' });
  const [copiedCode, setCopiedCode] = useState(false);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('cogether_fav_games', JSON.stringify(favorites));
  }, [favorites]);

  // Save profile progress
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('cogether_player_profile', JSON.stringify(currentUser));
      localStorage.setItem('sp_username', currentUser.name);
    }
  }, [currentUser]);

  // Read URL query parameters for direct game or challenge link sharing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeId = params.get('challenge');
    const gameId = params.get('game');
    const roomId = params.get('room');

    if (challengeId) {
      const match = AUTHORIZED_GAMES_DATABASE.find(g => g.id === challengeId);
      if (match) {
        setActivePlayGame(match);
        setActivePlayMode('CHALLENGE');
        setActivePlayRoomId(roomId || ('duel-' + Math.floor(1000 + Math.random() * 9000)));
      }
    } else if (gameId) {
      const match = AUTHORIZED_GAMES_DATABASE.find(g => g.id === gameId);
      if (match) {
        setActivePlayGame(match);
        setActivePlayMode('SINGLE_PLAYER');
        setActivePlayRoomId(null);
      }
    }
  }, []);

  // Filter Games by Category & Search Query
  const filteredGames = useMemo(() => {
    return AUTHORIZED_GAMES_DATABASE.filter((game) => {
      let matchesCat = true;
      if (activeCategory === 'all') {
        matchesCat = true;
      } else if (activeCategory === 'popular') {
        matchesCat = ['2048', 'hextris', 'block-puzzle', 'retro-pong-2p'].includes(game.id);
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
        game.category.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const renderCatIcon = (iconName, size = 18) => {
    switch (iconName) {
      case 'Flame': return <Flame size={size} />;
      case 'Sparkles': return <Sparkles size={size} />;
      case 'Gamepad2': return <Gamepad2 size={size} />;
      case 'Brain': return <Brain size={size} />;
      case 'Zap': return <Zap size={size} />;
      case 'Users': return <Users size={size} />;
      case 'Trophy': return <Trophy size={size} />;
      default: return <Gamepad2 size={size} />;
    }
  };

  const toggleFavorite = (gameId, e) => {
    e.stopPropagation();
    setFavorites((prev) => 
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]
    );
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
    // Award +50 XP for playing games
    setCurrentUser((prev) => ({
      ...prev,
      xp: (prev.xp || 0) + 50,
      level: Math.floor(((prev.xp || 0) + 50) / 400) + 1
    }));
  };

  const handleChallengeGame = (game) => {
    if (game.licenseStatus === LicenseStatus.PENDING_REVIEW) {
      setDetailsGame(game);
      return;
    }
    const challengeRoomId = 'duel-' + Math.floor(1000 + Math.random() * 9000);
    const link = `${window.location.origin}?room=${challengeRoomId}&mode=coplay&challenge=${game.id}`;
    navigator.clipboard.writeText(link);
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
    navigator.clipboard.writeText(link);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    setActivePlayGame(game);
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const finalUser = {
      name: authForm.username || 'ProGamer_' + Math.floor(100 + Math.random() * 900),
      email: authForm.email,
      level: 1,
      xp: 250,
      avatar: authForm.avatar || '🔥',
      isLoggedIn: true
    };
    setCurrentUser(finalUser);
    setShowAuthModal(false);
  };

  const handleShareSquadRoom = () => {
    const roomCode = 'squad-' + Math.floor(1000 + Math.random() * 9000);
    const link = `${window.location.origin}?room=${roomCode}&mode=coplay`;
    navigator.clipboard.writeText(link);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Featured Spotlight Game (Playable verified hit)
  const spotlightGame = AUTHORIZED_GAMES_DATABASE.find(g => g.id === '2048-classic') || AUTHORIZED_GAMES_DATABASE[0];

  // When a game is launched, render the dedicated GamePlayer exclusively (no yellow catalog background)
  if (activePlayGame) {
    return (
      <GamePlayer
        game={activePlayGame}
        initialMode={activePlayMode}
        initialRoomId={activePlayRoomId}
        currentUsername={currentUser?.name}
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
      <header className="coplay-header-bar">
        <div className="coplay-header-left">
          <button className="btn-back-home" onClick={onBackToHome} title="Back to Home">
            <ArrowLeft size={16} />
          </button>
          <div className="coplay-logo-brand" onClick={onBackToHome}>
            <span className="arcade-title">CO-PLAY</span>
          </div>
        </div>

        {/* CENTER SEARCH PILL */}
        <div className="coplay-search-box">
          <Search size={16} className="search-icon" />
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

        {/* RIGHT ACTIONS: XP, NOTIFICATION, AVATAR, SQUAD LAUNCH */}
        <div className="coplay-header-right">
          <div className="header-xp-pill" title="Arcade XP Level">
            <Zap size={14} className="xp-icon" />
            <span>{currentUser?.xp || 1450} XP</span>
          </div>

          <button className="header-icon-btn" title="Notifications">
            <Bell size={18} />
            <span className="notif-badge-dot" />
          </button>

          <div 
            className="header-avatar-circle" 
            onClick={() => setShowAuthModal(true)} 
            title={`${currentUser?.name} (LVL ${currentUser?.level || 1})`}
          >
            <span>{currentUser?.avatar || '🎮'}</span>
          </div>

          <button className="btn-squad-party-launch" onClick={handleShareSquadRoom}>
            <Users size={15} /> 
            <span>{copiedCode ? 'LINK COPIED!' : 'CREATE SQUAD ROOM'}</span>
          </button>
        </div>
      </header>

      {/* ── 2. EXPANDABLE LEFT SIDEBAR DRAWER (PLAYHOP STYLE) ── */}
      <aside 
        className={`coplay-left-sidebar ${sidebarHovered ? 'expanded' : ''}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        aria-label="Game categories drawer"
      >
        <div className="sidebar-track">
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
                {activeCategory === 'all' ? 'ALL GAMES' : activeCategory === 'popular' ? 'POPULAR GAMES' : `${activeCategory.replace('_', ' ').toUpperCase()} GAMES`}
              </h3>
              <span className="section-subtext">Instant browser play • Duo camera overlay ready • Real-time challenge</span>
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
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── 5. GAME DETAILS MODAL ── */}
      {detailsGame && (
        <GameDetailsModal
          game={detailsGame}
          onClose={() => setDetailsGame(null)}
          onPlay={handlePlayGame}
          onChallenge={handleChallengeGame}
          onSquad={handleSquadGame}
        />
      )}


      {/* ── 7. LOGIN & CLOUD PROGRESS MODAL ── */}
      {showAuthModal && (
        <div className="arcade-auth-overlay fade-in">
          <div className="arcade-auth-card">
            <button className="modal-close-btn" onClick={() => setShowAuthModal(false)}>
              <X size={18} />
            </button>
            <div className="auth-header">
              <span className="auth-badge">CO-PLAY PROFILE</span>
              <h2>{authMode === 'login' ? 'LOGIN TO SAVE PROGRESS' : 'CREATE FREE ARCADE ACCOUNT'}</h2>
              <p>Save your high scores, unlock gamer avatars, and invite friends to private squad lobbies.</p>
            </div>

            <form onSubmit={handleAuthSubmit} className="arcade-auth-form">
              <div className="avatar-selection-row">
                <label>Choose Your Gamer Avatar:</label>
                <div className="avatar-options">
                  {['🎮', '⚡', '🔥', '👑', '🚀', '👾', '🕹️', '🏆'].map((av) => (
                    <button
                      type="button"
                      key={av}
                      className={`av-btn ${authForm.avatar === av ? 'active' : ''}`}
                      onClick={() => setAuthForm({ ...authForm, avatar: av })}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Gamer Tag / Username:</label>
                <input
                  type="text"
                  placeholder="e.g. ShadowRacer_99"
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address:</label>
                <input
                  type="email"
                  placeholder="gamer@gmail.com"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-auth-submit">
                {authMode === 'login' ? 'LOGIN & SYNC CLOUD PROGRESS →' : 'SIGN UP & CLAIM 250 XP →'}
              </button>
            </form>

            <div className="auth-switcher-row">
              {authMode === 'login' ? (
                <p>Don't have an arcade profile? <span onClick={() => setAuthMode('signup')}>Sign up for free</span></p>
              ) : (
                <p>Already have an account? <span onClick={() => setAuthMode('login')}>Log in here</span></p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
