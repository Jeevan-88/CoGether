import React, { useState, useEffect, useMemo } from 'react';
import { useWebRTC } from './useWebRTC.js';
import VideoTile from './VideoTile.jsx';
import ChatPanel from './ChatPanel.jsx';
import ControlBar from './ControlBar.jsx';
import { POKI_TOP_TRENDING, POKI_WEB_EXCLUSIVES, POKI_CATEGORY_HUBS } from './pokiCatalog.js';
import { Gamepad2, Search, Play, Users, Flame, Star, Crown, ArrowLeft, X, Grid, LayoutList, RefreshCw, Info, HelpCircle, ThumbsUp, ThumbsDown, Maximize, Minimize, Share2, Copy, Check, MessageSquare, User, Sparkles } from 'lucide-react';
import './GamePortal.css';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';

export default function GamePortal({ roomId, username, onLeave }) {
  const {
    localStream,
    remoteStreams,
    micEnabled,
    cameraEnabled,
    isScreenSharing,
    chatMessages,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendChatMessage
  } = useWebRTC(roomId, username, SIGNALING_URL);

  const [apiGames, setApiGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalApiGames, setTotalApiGames] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('poki-grid'); // 'poki-grid' or 'netflix'
  const [playingGame, setPlayingGame] = useState(null); // Game object currently open
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [likes, setLikes] = useState(18000000);
  const [dislikes, setDislikes] = useState(3200000);
  const [userVote, setUserVote] = useState(null); // 'like' | 'dislike' | null

  const remoteEntries = Object.entries(remoteStreams);
  const totalParticipants = remoteEntries.length + 1;

  // Fetch Live 2,000+ Games Catalog from Server API
  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          category: activeCategory,
          search: searchQuery,
          limit: 120
        });
        const res = await fetch(`${SIGNALING_URL}/api/games?${queryParams}`);
        if (res.ok) {
          const data = await res.json();
          setApiGames(data.games || []);
          setTotalApiGames(data.total || 0);
        }
      } catch (err) {
        console.error('Failed to load games catalog:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, [activeCategory, searchQuery]);

  const categoryPills = [
    { id: 'all', label: 'All Games (1,500+)' },
    { id: 'two-player', label: '2 Player Games' },
    { id: 'multiplayer', label: 'Multiplayer' },
    { id: 'car', label: 'Car Games' },
    { id: 'shooting', label: 'Shooting' },
    { id: 'sports', label: 'Sports' },
    { id: 'puzzle', label: 'Puzzle' },
    { id: 'dress-up', label: 'Dress Up' },
    { id: 'cooking', label: 'Cooking' }
  ];

  const handleVote = (type) => {
    if (userVote === type) {
      setUserVote(null);
      if (type === 'like') setLikes((prev) => prev - 1);
      else setDislikes((prev) => prev - 1);
    } else {
      if (userVote === 'like') setLikes((prev) => prev - 1);
      if (userVote === 'dislike') setDislikes((prev) => prev - 1);
      setUserVote(type);
      if (type === 'like') setLikes((prev) => prev + 1);
      else setDislikes((prev) => prev + 1);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}?room=${roomId}&mode=games`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const recommendedSidebarGames = useMemo(() => {
    return POKI_TOP_TRENDING.concat(POKI_WEB_EXCLUSIVES).slice(0, 10);
  }, []);

  return (
    <div className="poki-flix-layout fade-in">
      {/* Top Header */}
      <header className="poki-nav">
        <div className="nav-left">
          <button className="back-btn" onClick={onLeave}>
            <ArrowLeft size={16} /> Exit Room
          </button>

          <div className="brand-badge-logo" onClick={() => setPlayingGame(null)}>
            <Gamepad2 size={24} className="poki-icon" />
            <span className="brand-text">Poki<span className="red-glow">FLIX</span></span>
          </div>

          {!playingGame && (
            <div className="cat-scroll-pills">
              {categoryPills.map((c) => (
                <button
                  key={c.id}
                  className={`cat-pill ${activeCategory === c.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="nav-right">
          <div className="search-bar-wrapper">
            <Search size={15} className="search-ic" />
            <input
              type="text"
              placeholder="Search Level Devil, Subway Surfers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button className="invite-btn-top" onClick={copyInviteLink}>
            {copied ? <Check size={14} /> : <Share2 size={14} />}
            <span>{copied ? 'Copied Invite Link!' : 'Invite Friend'}</span>
          </button>

          <div className="call-connected-badge">
            <Users size={14} /> {totalParticipants} Connected
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="poki-main-stage">
        {/* EXACT POKI GAME PLAYER SCREEN WITH SIDEBAR & WEBRTC CALL & CHAT */}
        {playingGame ? (
          <div className={`poki-game-player-container ${isFullScreen ? 'is-fullscreen' : ''}`}>
            {/* Left Vertical Poki Game Icons Sidebar */}
            <aside className="poki-left-sidebar">
              <div className="sidebar-top-icons">
                <button className="sidebar-icon-btn" onClick={() => setPlayingGame(null)} title="Back to Home">
                  <Gamepad2 size={20} className="poki-brand-ic" />
                </button>
              </div>

              {/* Vertical Column of Recommended Game Icons */}
              <div className="sidebar-game-icons-list">
                {recommendedSidebarGames.map((g) => (
                  <div
                    key={g.id}
                    className={`sidebar-game-tile ${playingGame.id === g.id ? 'active' : ''}`}
                    onClick={() => setPlayingGame(g)}
                    title={g.title}
                  >
                    <img src={g.thumb} alt={g.title} />
                  </div>
                ))}
              </div>
            </aside>

            {/* Center Main Stage: Playable Game + Poki Bottom Bar */}
            <div className="poki-center-stage">
              <div className="game-iframe-wrapper">
                <iframe
                  src={playingGame.url}
                  title={playingGame.title}
                  className="poki-game-iframe"
                  allow="autoplay; gamepad; fullscreen; keyboard"
                />

                {/* Floating WebRTC Camera Overlay Dock */}
                <div className="live-call-overlay-dock">
                  <div className="dock-header">
                    <span className="pulse-green" /> WebRTC Live Feed ({totalParticipants})
                  </div>
                  <div className="dock-tiles-list">
                    <div className="dock-tile local">
                      <VideoTile
                        stream={localStream}
                        label={username}
                        isLocal
                        micEnabled={micEnabled}
                        cameraEnabled={cameraEnabled}
                      />
                    </div>
                    {remoteEntries.map(([id, peer]) => (
                      <div key={id} className="dock-tile">
                        <VideoTile
                          stream={peer.stream}
                          label={peer.username || 'Guest'}
                          micEnabled={peer.micEnabled}
                          cameraEnabled={peer.cameraEnabled}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* EXACT POKI GAME BOTTOM BAR (Matching Screenshot) */}
              <div className="poki-game-bottom-bar">
                <div className="game-meta-left">
                  <img src={playingGame.thumb} alt={playingGame.title} className="game-mini-thumb" />
                  <div className="game-title-block">
                    <h2>{playingGame.title}</h2>
                    <span className="game-developer">by Poki Originals</span>
                  </div>
                </div>

                <div className="game-meta-actions">
                  {/* Upvote / Downvote Buttons */}
                  <div className="vote-actions">
                    <button
                      className={`vote-btn ${userVote === 'like' ? 'voted-like' : ''}`}
                      onClick={() => handleVote('like')}
                    >
                      <ThumbsUp size={16} />
                      <span>{(likes / 1000000).toFixed(1)}M</span>
                    </button>
                    <button
                      className={`vote-btn ${userVote === 'dislike' ? 'voted-dislike' : ''}`}
                      onClick={() => handleVote('dislike')}
                    >
                      <ThumbsDown size={16} />
                      <span>{(dislikes / 1000000).toFixed(1)}M</span>
                    </button>
                  </div>

                  {/* Invite Friend to Play Button */}
                  <button className="play-with-friend-btn" onClick={copyInviteLink}>
                    <Share2 size={16} />
                    <span>{copied ? 'Link Copied!' : 'Play with Friend'}</span>
                  </button>

                  {/* Fullscreen Toggle Button */}
                  <button
                    className="fullscreen-toggle-btn"
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
                  >
                    {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                  </button>
                </div>
              </div>

              {/* Bottom In-Call Chat Drawer Bar */}
              <div className="bottom-chat-drawer-strip">
                <ChatPanel
                  messages={chatMessages}
                  onSendMessage={sendChatMessage}
                  onClose={() => setIsChatOpen(false)}
                  currentUsername={username}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Poki Intro Header */}
            <section className="poki-intro-header">
              <h1>Free online games on Poki</h1>
              <p className="intro-subtitle">
                Play 1,500+ free games instantly on Poki! All games are available to play on mobile, tablet and desktop with zero installs.
              </p>
            </section>

            {/* TOP FREE TRENDING GAMES */}
            <section className="poki-section">
              <div className="section-title-bar">
                <h2><Flame size={22} className="flame-ic" /> Top free games</h2>
                <span className="section-sub">5 top trending games according to live stats right now</span>
              </div>
              <div className="trending-grid">
                {POKI_TOP_TRENDING.map((g) => (
                  <div key={g.id} className="trending-card" onClick={() => setPlayingGame(g)}>
                    <div className="card-image-wrapper">
                      <img src={g.thumb} alt={g.title} />
                      <span className="card-rank">{g.tag}</span>
                    </div>
                    <div className="card-info">
                      <div className="card-header-row">
                        <h3>{g.title}</h3>
                        <span className="star-rating"><Star size={13} fill="#f59e0b" color="#f59e0b" /> {g.rating}</span>
                      </div>
                      <p>{g.description}</p>
                      <button className="play-pill-btn"><Play size={14} fill="#fff" /> Play Instantly</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* POKI WEB EXCLUSIVES */}
            <section className="poki-section">
              <div className="section-title-bar">
                <h2><Crown size={22} className="crown-ic" /> Poki web exclusive & licensed games</h2>
                <span className="section-sub">Official home for hundreds of web browser games</span>
              </div>
              <div className="exclusives-row">
                {POKI_WEB_EXCLUSIVES.map((g) => (
                  <div key={g.id} className="exclusive-card" onClick={() => setPlayingGame(g)}>
                    <img src={g.thumb} alt={g.title} className="ex-img" />
                    <div className="ex-overlay">
                      <span className="ex-badge">{g.badge}</span>
                      <h3>{g.title}</h3>
                      <p>{g.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* POKI CATEGORY CLUSTERS */}
            {POKI_CATEGORY_HUBS.map((group, gIdx) => (
              <section key={gIdx} className="poki-section">
                <div className="section-title-bar">
                  <h2>{group.group}</h2>
                </div>
                <div className="hubs-grid">
                  {group.categories.map((c) => (
                    <div
                      key={c.id}
                      className="hub-card"
                      onClick={() => setActiveCategory(c.id)}
                    >
                      <div className="hub-icon">{c.icon}</div>
                      <div className="hub-details">
                        <div className="hub-title-row">
                          <h3>{c.title}</h3>
                          <span className="hub-count">{c.count}</span>
                        </div>
                        <p>{c.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* DYNAMIC 2,000+ API GAMES CATALOG GRID */}
            <section className="poki-section">
              <div className="section-title-bar">
                <h2><Gamepad2 size={22} className="games-ic" /> Explore 2,000+ Live Games Library</h2>
                <span className="section-sub">({totalApiGames} games loaded from live catalog)</span>
              </div>

              {loading ? (
                <div className="loading-state">
                  <RefreshCw size={32} className="spin-icon" />
                  <p>Loading Poki games catalog...</p>
                </div>
              ) : (
                <div className="poki-bento-grid">
                  {apiGames.map((g, idx) => (
                    <div
                      key={g.id || idx}
                      className={`poki-card-tile card-size-${(idx % 6) + 1}`}
                      onClick={() => setPlayingGame(g)}
                    >
                      <img src={g.thumb} alt={g.title} className="poki-card-thumb" loading="lazy" />
                      <div className="card-hover-overlay">
                        <Play size={28} className="play-hover-ic" />
                        <span className="poki-game-name">{g.title}</span>
                        <span className="poki-game-cat">{g.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
