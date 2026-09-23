import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../core/AuthContext.jsx';
import { 
  Play, Users, Film, Search, Plus, Filter, 
  ExternalLink, Sparkles, Shield, AlertCircle, RefreshCw,
  Tv, Compass, LogOut, Check
} from 'lucide-react';
import CoWatchSidebar from './components/CoWatchSidebar.jsx';
import CoWatchHeader from './components/CoWatchHeader.jsx';
import HeroBillboard from './components/HeroBillboard.jsx';
import ContentCard from './components/ContentCard.jsx';
import ProviderCard from './components/ProviderCard.jsx';
import CreateRoomModal from './components/CreateRoomModal.jsx';
import CoWatchPartyRoom from './CoWatchPartyRoom.jsx';
import AuthModal from '../auth/AuthModal.jsx';
import ProfileModal from '../auth/ProfileModal.jsx';
import { API_URL } from '../../config/api.js';
import './CoWatchLayout.css';

const API_BASE = API_URL;

export default function CoWatchCinemaHub({ onBackToHome }) {
  const { user, profile, isAuthenticated, getAccessToken } = useAuth();
  const currentUsername = profile?.displayName || profile?.username || user?.email?.split('@')[0] || 'Guest';

  // 1. Navigation & Search State
  const [activeNav, setActiveNav] = useState('HOME');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');

  // 2. Data State
  const [catalog, setCatalog] = useState([]);
  const [providers, setProviders] = useState([]);
  const [favoritesList, setFavoritesList] = useState(new Set());
  const [watchHistory, setWatchHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // 3. Active Watch Media / Room State
  const [activeMedia, setActiveMedia] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [viewMode, setViewMode] = useState('HUB'); // 'HUB' | 'THEATER_ROOM'

  // 4. Modals
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomModalMode, setRoomModalMode] = useState('CREATE'); // 'CREATE' | 'JOIN' | 'IMPORT'
  const [selectedContentForRoom, setSelectedContentForRoom] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Fetch Catalog from PostgreSQL API
  const fetchCatalog = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/cowatch/content?limit=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.contents)) {
        setCatalog(data.contents);
        if (!activeMedia && data.contents.length > 0) {
          const featured = data.contents.find((c) => c.isFeatured) || data.contents[0];
          setActiveMedia(featured);
        }
      }
    } catch (err) {
      console.error('Failed to load CoWatch catalog', err);
      setFetchError('Unable to load verified cinema catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Providers
  const fetchProviders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/cowatch/providers`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.providers)) {
          setProviders(data.providers);
        }
      }
    } catch (err) {
      console.error('Failed to load providers', err);
    }
  };

  // Fetch Favorites if Authenticated
  const fetchFavorites = async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/cowatch/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.favorites)) {
          setFavoritesList(new Set(data.favorites.map((f) => f.id || f.content_id)));
        }
      }
    } catch (e) {}
  };

  // Fetch Watch History if Authenticated
  const fetchHistory = async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/cowatch/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.history)) {
          setWatchHistory(data.history);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchCatalog();
    fetchProviders();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
      fetchHistory();
    } else {
      setFavoritesList(new Set());
      setWatchHistory([]);
    }
  }, [isAuthenticated]);

  // Toggle Favorite
  const handleToggleFavorite = async (contentId) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    const token = getAccessToken();
    const isFav = favoritesList.has(contentId);

    setFavoritesList((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(contentId);
      else next.add(contentId);
      return next;
    });

    try {
      const method = isFav ? 'DELETE' : 'POST';
      await fetch(`${API_BASE}/api/v1/cowatch/favorites/${contentId}`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  // Launch Watch Party (Create Room)
  const handleLaunchWatchParty = async (content) => {
    try {
      const token = getAccessToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/v1/cowatch/rooms`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: `${content.title} Watch Room`,
          contentId: content.id,
          playbackMode: content.playbackMode,
          controlPolicy: 'HOST_ONLY'
        })
      });

      const data = await res.json();
      if (data.success && data.room) {
        setActiveMedia(content);
        setActiveRoomId(data.room.room_code || data.room.room_id);
        setViewMode('THEATER_ROOM');
      } else {
        const fallbackCode = 'CW-' + Math.floor(100000 + Math.random() * 900000);
        setActiveMedia(content);
        setActiveRoomId(fallbackCode);
        setViewMode('THEATER_ROOM');
      }
    } catch (err) {
      const fallbackCode = 'CW-' + Math.floor(100000 + Math.random() * 900000);
      setActiveMedia(content);
      setActiveRoomId(fallbackCode);
      setViewMode('THEATER_ROOM');
    }
  };

  // Watch Solo Action
  const handleWatchSolo = (content) => {
    if (content.playbackMode === 'EXTERNAL_PROVIDER') {
      window.open(content.externalUrl || 'https://www.netflix.com', '_blank', 'noopener,noreferrer');
    } else {
      handleLaunchWatchParty(content);
    }
  };

  // Launch Provider Watch Party
  const handleProviderWatchParty = (provider) => {
    const matchingContent = catalog.find((c) => c.providerId === provider.id) || {
      id: `provider-${provider.id}`,
      title: `${provider.name} Watch Room`,
      description: `Synchronized individual playback for ${provider.name}.`,
      thumbnail: provider.logoUrl,
      backdrop: provider.logoUrl,
      contentType: 'SERIES',
      genre: 'OTT Service',
      providerId: provider.id,
      providerName: provider.name,
      sourceType: 'EXTERNAL_PROVIDER',
      playbackMode: provider.embedSupported ? 'YOUTUBE_PLAYER' : 'EXTERNAL_PROVIDER',
      licenseStatus: 'PROVIDER_AUTHORIZED',
      externalUrl: provider.officialUrl
    };
    handleLaunchWatchParty(matchingContent);
  };

  // Join Room via Code
  const handleJoinRoom = async (code) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/cowatch/rooms/${code}`);
      const data = await res.json();
      if (data.success && data.room) {
        const matchingContent = catalog.find((c) => c.id === data.room.content_id) || {
          id: data.room.content_id,
          title: data.room.content_title || data.room.title || 'Watch Room Stream',
          playbackMode: data.room.playback_mode || 'NATIVE_PLAYER',
          videoStreamUrl: data.room.video_stream_url
        };
        setActiveMedia(matchingContent);
        setActiveRoomId(code);
        setIsRoomModalOpen(false);
        setViewMode('THEATER_ROOM');
      } else {
        alert('Watch room not found. Please verify the room code.');
      }
    } catch (e) {
      setActiveRoomId(code);
      setIsRoomModalOpen(false);
      setViewMode('THEATER_ROOM');
    }
  };

  // Import Validated Stream
  const handleImportStream = (importedItem) => {
    setCatalog((prev) => [importedItem, ...prev]);
    setActiveMedia(importedItem);
    setIsRoomModalOpen(false);
    handleLaunchWatchParty(importedItem);
  };

  // Categorized Content Filters
  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        const matchesGenre = (item.genre || '').toLowerCase().includes(q);
        const matchesProvider = (item.providerName || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesGenre && !matchesProvider) return false;
      }

      // 2. Sidebar Navigation Filter
      if (activeNav === 'MOVIES' && item.contentType !== 'MOVIE') return false;
      if (activeNav === 'SERIES' && item.contentType !== 'SERIES') return false;
      if (activeNav === 'ANIME' && item.contentType !== 'ANIME') return false;
      if (activeNav === 'SPORTS' && item.contentType !== 'SPORTS_LIVE') return false;
      if (activeNav === 'YOUTUBE' && item.sourceType !== 'YOUTUBE') return false;
      if (activeNav === 'FREE' && (item.playbackMode !== 'NATIVE_PLAYER' || (item.sourceType !== 'PUBLIC_DOMAIN' && item.sourceType !== 'OPEN_LICENSE'))) return false;
      if (activeNav === 'FAVORITES' && !favoritesList.has(item.id)) return false;

      // 3. Category Filter Tabs (when on HOME / EXPLORE)
      if (activeCategoryFilter !== 'ALL') {
        if (activeCategoryFilter === 'MOVIES' && item.contentType !== 'MOVIE') return false;
        if (activeCategoryFilter === 'SERIES' && item.contentType !== 'SERIES') return false;
        if (activeCategoryFilter === 'ANIME' && item.contentType !== 'ANIME') return false;
        if (activeCategoryFilter === 'SPORTS' && item.contentType !== 'SPORTS_LIVE') return false;
        if (activeCategoryFilter === 'YOUTUBE' && item.sourceType !== 'YOUTUBE') return false;
        if (activeCategoryFilter === 'FREE' && (item.playbackMode !== 'NATIVE_PLAYER' || (item.sourceType !== 'PUBLIC_DOMAIN' && item.sourceType !== 'OPEN_LICENSE'))) return false;
      }

      return true;
    });
  }, [catalog, searchQuery, activeNav, activeCategoryFilter, favoritesList]);

  // Section 1: FREE TO WATCH (Strictly Native Player + Public Domain / Open License)
  const freeToWatchItems = useMemo(() => {
    return catalog.filter((c) => 
      c.playbackMode === 'NATIVE_PLAYER' && 
      (c.sourceType === 'PUBLIC_DOMAIN' || c.sourceType === 'OPEN_LICENSE') &&
      c.availabilityStatus === 'AVAILABLE'
    );
  }, [catalog]);

  // Section 2: External OTT Providers (Tiles)
  const ottProviders = useMemo(() => {
    return providers.filter((p) => p.id !== 'cogether_hosted' && p.id !== 'public_domain');
  }, [providers]);

  // Section 3: Official YouTube Streams
  const youtubeStreams = useMemo(() => {
    return catalog.filter((c) => c.sourceType === 'YOUTUBE');
  }, [catalog]);

  // Dedicated Views for specific categories
  const categoryItems = useMemo(() => {
    if (activeNav === 'MOVIES') return catalog.filter((c) => c.contentType === 'MOVIE');
    if (activeNav === 'SERIES') return catalog.filter((c) => c.contentType === 'SERIES');
    if (activeNav === 'ANIME') return catalog.filter((c) => c.contentType === 'ANIME');
    if (activeNav === 'SPORTS') return catalog.filter((c) => c.contentType === 'SPORTS_LIVE');
    if (activeNav === 'YOUTUBE') return catalog.filter((c) => c.sourceType === 'YOUTUBE');
    if (activeNav === 'FREE') return freeToWatchItems;
    if (activeNav === 'FAVORITES') return catalog.filter((c) => favoritesList.has(c.id));
    return [];
  }, [catalog, activeNav, freeToWatchItems, favoritesList]);

  // Inside Watch Room Theater
  if (viewMode === 'THEATER_ROOM' && activeRoomId) {
    return (
      <CoWatchPartyRoom
        content={activeMedia}
        roomId={activeRoomId}
        username={currentUsername}
        onBack={() => setViewMode('HUB')}
        onLeave={() => {
          setViewMode('HUB');
          setActiveRoomId(null);
        }}
      />
    );
  }

  return (
    <div className="cowatch-app-shell">
      {/* ── LEFT NAVIGATION SIDEBAR ── */}
      <CoWatchSidebar
        activeNav={activeNav}
        onSelectNav={(id) => {
          setActiveNav(id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onBackToHome={onBackToHome}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* ── MAIN CONTENT VIEWPORT ── */}
      <main className="cowatch-main-viewport">
        {/* ── TOP SEARCH & ACTIONS HEADER ── */}
        <CoWatchHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateRoom={() => {
            setSelectedContentForRoom(activeMedia || catalog[0]);
            setRoomModalMode('CREATE');
            setIsRoomModalOpen(true);
          }}
          onJoinRoom={() => {
            setRoomModalMode('JOIN');
            setIsRoomModalOpen(true);
          }}
          onOpenImportModal={() => {
            setRoomModalMode('IMPORT');
            setIsRoomModalOpen(true);
          }}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        {/* ── HERO BILLBOARD (ONLY IN HOME MODE) ── */}
        {activeNav === 'HOME' && !searchQuery && activeMedia && (
          <HeroBillboard
            content={activeMedia}
            onWatchNow={handleWatchSolo}
            onWatchTogether={handleLaunchWatchParty}
          />
        )}

        {/* ── CATEGORY FILTER TABS (EDITORIAL UNDERLINE RAIL) ── */}
        {(activeNav === 'HOME' || activeNav === 'EXPLORE') && (
          <div className="cowatch-category-tabs-bar">
            {[
              { id: 'ALL', label: 'ALL' },
              { id: 'FREE', label: 'FREE' },
              { id: 'MOVIES', label: 'MOVIES' },
              { id: 'SERIES', label: 'SERIES' },
              { id: 'ANIME', label: 'ANIME' },
              { id: 'SPORTS', label: 'SPORTS' },
              { id: 'YOUTUBE', label: 'YOUTUBE' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`cowatch-filter-tab ${activeCategoryFilter === tab.id ? 'active' : ''}`}
                onClick={() => setActiveCategoryFilter(tab.id)}
              >
                <span>{tab.label}</span>
                {activeCategoryFilter === tab.id && <span className="cowatch-tab-indicator" />}
              </button>
            ))}
          </div>
        )}

        {/* ── CATALOG ROWS OR DEDICATED CATEGORY VIEW ── */}
        {isLoading ? (
          <div style={{ padding: '60px 36px', textAlign: 'center', color: 'var(--cw-text-secondary)' }}>
            <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ fontWeight: 300 }}>Loading verified cinema catalog...</p>
          </div>
        ) : fetchError ? (
          <div style={{ padding: '40px 36px', textAlign: 'center', color: '#ff8a90' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 12px auto' }} />
            <p>{fetchError}</p>
          </div>
        ) : activeNav !== 'HOME' && activeNav !== 'EXPLORE' ? (
          /* Dedicated Category Screen (Movies, Series, Anime, Sports, Free, Favorites) */
          <section className="cowatch-catalog-section">
            <div className="cowatch-rail-header">
              <div className="cowatch-rail-title-group">
                <div className="cowatch-rail-accent-bar" />
                <h2 className="cowatch-rail-title">
                  {activeNav === 'FREE' ? 'Free to Watch' : activeNav}
                </h2>
              </div>
              <span className="cowatch-rail-count-badge">
                {categoryItems.length} TITLES
              </span>
            </div>

            {categoryItems.length === 0 ? (
              <p style={{ color: 'var(--cw-text-muted)', fontWeight: 300, margin: '20px 0' }}>
                No titles currently available in this collection.
              </p>
            ) : (
              <div className="cowatch-cards-grid">
                {categoryItems.map((item) => (
                  <ContentCard
                    key={item.id}
                    content={item}
                    isFavorited={favoritesList.has(item.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onWatchSolo={handleWatchSolo}
                    onWatchParty={handleLaunchWatchParty}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          /* Homepage / Explore View with Partitioned Sections */
          <>
            {/* SECTION 1: FREE TO WATCH (Strictly Verified Native Player Films) */}
            {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'FREE') && freeToWatchItems.length > 0 && (
              <section className="cowatch-catalog-section">
                <div className="cowatch-rail-header">
                  <div>
                    <div className="cowatch-rail-title-group">
                      <div className="cowatch-rail-accent-bar" />
                      <h2 className="cowatch-rail-title">Free to Watch</h2>
                    </div>
                    <p className="cowatch-rail-subtitle">
                      Verified public-domain and openly licensed films.
                    </p>
                  </div>
                  <span className="cowatch-rail-count-badge">
                    {freeToWatchItems.length} TITLES
                  </span>
                </div>

                <div className="cowatch-cards-carousel">
                  {freeToWatchItems.map((item) => (
                    <ContentCard
                      key={item.id}
                      content={item}
                      isFavorited={favoritesList.has(item.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onWatchSolo={handleWatchSolo}
                      onWatchParty={handleLaunchWatchParty}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 2: WATCH ON YOUR SERVICES (Provider Tiles) */}
            {(activeCategoryFilter === 'ALL') && ottProviders.length > 0 && !searchQuery && (
              <section className="cowatch-catalog-section">
                <div className="cowatch-rail-header">
                  <div>
                    <div className="cowatch-rail-title-group">
                      <div className="cowatch-rail-accent-bar" style={{ background: 'var(--cw-gold-primary)' }} />
                      <h2 className="cowatch-rail-title">Watch on Your Services</h2>
                    </div>
                    <p className="cowatch-rail-subtitle">
                      Connect personal streaming accounts for synchronized group playback.
                    </p>
                  </div>
                  <span className="cowatch-rail-count-badge">
                    {ottProviders.length} SERVICES
                  </span>
                </div>

                <div className="cowatch-providers-carousel">
                  {ottProviders.map((prov) => (
                    <ProviderCard
                      key={prov.id}
                      provider={prov}
                      onOpenProvider={(p) => {
                        if (p.officialUrl) window.open(p.officialUrl, '_blank', 'noopener,noreferrer');
                      }}
                      onWatchTogether={handleProviderWatchParty}
                      onWatchInCoWatch={handleProviderWatchParty}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 3: YOUTUBE (Official Player & Verified Channels) */}
            {(activeCategoryFilter === 'ALL' || activeCategoryFilter === 'YOUTUBE') && youtubeStreams.length > 0 && (
              <section className="cowatch-catalog-section">
                <div className="cowatch-rail-header">
                  <div>
                    <div className="cowatch-rail-title-group">
                      <div className="cowatch-rail-accent-bar" style={{ background: '#ff0000' }} />
                      <h2 className="cowatch-rail-title">YouTube</h2>
                    </div>
                    <p className="cowatch-rail-subtitle">
                      Official YouTube player synchronization and live public streams.
                    </p>
                  </div>
                  <span className="cowatch-rail-count-badge">
                    {youtubeStreams.length} STREAMS
                  </span>
                </div>

                <div className="cowatch-cards-carousel">
                  {youtubeStreams.map((item) => (
                    <ContentCard
                      key={item.id}
                      content={item}
                      isFavorited={favoritesList.has(item.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onWatchSolo={handleWatchSolo}
                      onWatchParty={handleLaunchWatchParty}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ── CREATE / JOIN / IMPORT ROOM MODAL ── */}
      <CreateRoomModal
        isOpen={isRoomModalOpen}
        mode={roomModalMode}
        initialContent={selectedContentForRoom}
        onClose={() => setIsRoomModalOpen(false)}
        onSubmitCreate={(roomData) => {
          setIsRoomModalOpen(false);
          const target = selectedContentForRoom || catalog[0];
          handleLaunchWatchParty(target);
        }}
        onSubmitJoin={handleJoinRoom}
        onSubmitImport={handleImportStream}
      />

      {/* ── REAL AUTHENTICATION MODAL ── */}
      {isAuthModalOpen && (
        <AuthModal
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            setIsAuthModalOpen(false);
            fetchFavorites();
            fetchHistory();
          }}
        />
      )}

      {/* ── USER PROFILE MODAL ── */}
      {isProfileModalOpen && (
        <ProfileModal
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
}
