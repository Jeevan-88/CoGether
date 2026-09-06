import React, { useState, useEffect, useMemo } from 'react';
import { 
  Gamepad2, Search, Play, Users, Flame, Star, Trophy, ArrowLeft, 
  X, Maximize, Minimize, Share2, Copy, Check, Heart, User, 
  LogIn, Sparkles, Zap, Car, Crosshair, Brain, ShieldCheck, Swords
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

  return (
    <div className="coplay-yellow-canvas-wrapper fade-in">
      {/* ── 1. ARCADE TOP NAVIGATION HEADER ── */}
      <header className="coplay-header-bar">
        <div className="coplay-header-left">
          <button className="btn-back-home" onClick={onBackToHome}>
            <ArrowLeft size={16} /> BACK TO HOME
          </button>
          <div className="coplay-logo-brand">
            <span className="arcade-tag-pill">CO-PLAY ARCADE</span>
            <h1 className="arcade-title">PLAY • CONNECT • COMPETE</h1>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="coplay-search-box">
          <Search size={17} className="search-icon" />
          <input
            type="text"
            placeholder="Search titles, modes (Solo, Local 2-Player, Squad)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        {/* USER PROFILE & SQUAD ROOM LAUNCH */}
        <div className="coplay-header-right">
          <button className="btn-squad-party-launch" onClick={handleShareSquadRoom}>
            <Users size={16} /> {copiedCode ? 'SQUAD LINK COPIED!' : 'CREATE SQUAD ROOM'}
          </button>

          {currentUser?.isLoggedIn ? (
            <div className="user-profile-pill" onClick={() => setShowAuthModal(true)}>
              <span className="user-avatar">{currentUser.avatar}</span>
              <div className="user-info-text">
                <span className="user-name">{currentUser.name}</span>
                <span className="user-level">LVL {currentUser.level} • {currentUser.xp} XP</span>
              </div>
            </div>
          ) : (
            <button className="btn-arcade-login" onClick={() => setShowAuthModal(true)}>
              <LogIn size={15} /> LOGIN / PROGRESS
            </button>
          )}
        </div>
      </header>

      {/* ── 2. CATEGORY FILTER TABS ── */}
      <nav className="coplay-category-tabs" aria-label="Game categories">
        <div className="category-scroll-track">
          {GAME_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`cat-pill-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── 3. FEATURED SPOTLIGHT HERO BANNER ── */}
      {!searchQuery && activeCategory === 'all' && spotlightGame && (
        <section className="coplay-spotlight-hero">
          <div className="spotlight-banner-left">
            <div className="spotlight-badge-row">
              <span className="spotlight-tag">FEATURED ARCADE HIT</span>
              <span className="spotlight-license-verified">
                <ShieldCheck size={13} />
                <span>AUTHORIZED PLAYBACK</span>
              </span>
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

      {/* ── 4. PRODUCTION GAME CARDS GRID ── */}
      <main className="coplay-games-grid-section">
        <div className="grid-header-row">
          <div>
            <h3 className="section-heading">
              {activeCategory === 'all' ? 'COGETHER GAME ARCADE' : `${activeCategory.replace('_', ' ').toUpperCase()} GAMES`}
            </h3>
            <span className="section-subtext">Verified HTML5 direct play • Transparent licensing disclosure</span>
          </div>
          <span className="games-counter-badge">{filteredGames.length} GAMES CATALOGED</span>
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

      {/* ── 6. UNIVERSAL GAME PLAYER THEATER ── */}
      {activePlayGame && (
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
      )}

      {/* ── 7. LOGIN & CLOUD PROGRESS MODAL ── */}
      {showAuthModal && (
        <div className="arcade-auth-overlay fade-in">
          <div className="arcade-auth-card">
            <button className="modal-close-btn" onClick={() => setShowAuthModal(false)}>
              <X size={18} />
            </button>
            <div className="auth-header">
              <span className="auth-badge">CO-PLAY CLOUD PROGRESS</span>
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
