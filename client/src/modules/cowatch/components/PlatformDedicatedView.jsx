import React, { useState, useMemo } from 'react';
import { 
  Play, Users, ExternalLink, Shield, AlertCircle, 
  Search, Link2, Sparkles, CheckCircle2, Tv, Film, 
  PlaySquare, Video, Star, Flame, MonitorPlay, Laptop, 
  Radio, Trophy, Info
} from 'lucide-react';
import ContentCard from './ContentCard.jsx';
import { PLATFORM_CONFIGS, PLATFORM_CATALOGS } from '../cowatchPlatformData.js';
import './PlatformDedicatedView.css';

const ICON_MAP = {
  Film,
  PlaySquare,
  Tv,
  Video,
  Star,
  Flame,
  MonitorPlay,
  Laptop,
  Link2,
  Trophy,
  Radio
};

export default function PlatformDedicatedView({
  platformId,
  favoritesList,
  onToggleFavorite,
  onWatchSolo,
  onWatchParty,
  onImportCustomStream
}) {
  const config = PLATFORM_CONFIGS[platformId] || {
    id: platformId,
    name: platformId,
    brandName: platformId,
    tagline: 'Streaming Content',
    badge: 'PLATFORM',
    badgeColor: '#C9293A',
    modeType: 'GENERAL',
    iconName: 'Tv',
    description: 'Explore titles available for watch parties and companion playback.'
  };

  const initialItems = PLATFORM_CATALOGS[platformId] || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customError, setCustomError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const IconComponent = ICON_MAP[config.iconName] || Tv;

  // Filter items by local search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return initialItems;
    const q = searchQuery.toLowerCase();
    return initialItems.filter((item) => 
      item.title.toLowerCase().includes(q) ||
      (item.genre && item.genre.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  }, [initialItems, searchQuery]);

  // Handle Custom Stream Import
  const handleCustomImportSubmit = (e) => {
    e.preventDefault();
    setCustomError('');
    const raw = customUrl.trim();
    if (!raw) return;

    // 1. YouTube Validation
    const ytMatch = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      const ytId = ytMatch[1];
      const streamItem = {
        id: `custom-yt-${ytId}`,
        title: customTitle.trim() || `YouTube Stream (${ytId})`,
        description: 'Synchronized YouTube player stream.',
        poster: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
        backdrop: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
        contentType: 'YOUTUBE_VIDEO',
        genre: 'Online Video',
        year: new Date().getFullYear(),
        providerId: 'youtube',
        providerName: 'YouTube',
        sourceType: 'YOUTUBE',
        playbackMode: 'YOUTUBE_PLAYER',
        licenseStatus: 'LICENSE_VERIFIED',
        videoStreamUrl: ytId,
        externalUrl: `https://www.youtube.com/watch?v=${ytId}`
      };
      if (onImportCustomStream) {
        onImportCustomStream(streamItem);
      } else {
        onWatchParty(streamItem);
      }
      setCustomUrl('');
      setCustomTitle('');
      return;
    }

    // 2. Direct Video File Validation (.mp4, .webm, .m3u8)
    if (raw.match(/\.(mp4|webm|m3u8)(\?.*)?$/i)) {
      const streamItem = {
        id: `custom-direct-${Date.now()}`,
        title: customTitle.trim() || 'Custom Video Stream',
        description: 'Direct in-app synchronized media stream.',
        poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
        backdrop: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80',
        contentType: 'MOVIE',
        genre: 'Direct Media',
        year: new Date().getFullYear(),
        providerId: 'cogether_hosted',
        providerName: 'Direct Media Stream',
        sourceType: 'OPEN_LICENSE',
        playbackMode: 'NATIVE_PLAYER',
        licenseStatus: 'OPEN_LICENSE_VERIFIED',
        videoStreamUrl: raw,
        externalUrl: raw
      };
      if (onImportCustomStream) {
        onImportCustomStream(streamItem);
      } else {
        onWatchParty(streamItem);
      }
      setCustomUrl('');
      setCustomTitle('');
      return;
    }

    setCustomError('Please provide a valid YouTube link (e.g. https://youtu.be/...) or direct media URL (.mp4, .webm, .m3u8).');
  };

  const isDRM = config.modeType === 'DRM_COMPANION';
  const isFree = config.modeType === 'NATIVE_FREE';
  const isYouTube = config.modeType === 'YOUTUBE_EMBED';
  const isCustom = config.modeType === 'CUSTOM_IMPORTER';

  return (
    <div className="platform-dedicated-container">
      {/* ── 1. PLATFORM HERO BANNER ── */}
      <section 
        className="platform-hero-banner"
        style={{ '--platform-accent': config.badgeColor || '#C9293A' }}
      >
        <div className="platform-hero-content">
          <div className="platform-hero-badges-row">
            <span 
              className="platform-capability-badge"
              style={{ 
                color: config.badgeColor || '#C9293A',
                background: `${config.badgeColor || '#C9293A'}18`,
                borderColor: `${config.badgeColor || '#C9293A'}40`
              }}
            >
              {config.badge}
            </span>
            {isDRM && (
              <span className="platform-drm-warning-pill">
                <Shield size={12} />
                Requires Subscriber Account
              </span>
            )}
            {isFree && (
              <span className="platform-free-pill">
                <Sparkles size={12} />
                100% Free · No Login
              </span>
            )}
          </div>

          <div className="platform-title-row">
            <div 
              className="platform-title-icon-box"
              style={{ background: `${config.badgeColor || '#C9293A'}25`, borderColor: `${config.badgeColor || '#C9293A'}45` }}
            >
              <IconComponent size={28} style={{ color: config.badgeColor || '#C9293A' }} />
            </div>
            <div>
              <h1 className="platform-brand-heading">{config.brandName || config.name}</h1>
              <p className="platform-tagline-text">{config.tagline}</p>
            </div>
          </div>

          <p className="platform-description-paragraph">
            {config.description}
          </p>

          {/* Capabilities List */}
          {Array.isArray(config.capabilities) && (
            <div className="platform-capabilities-list">
              {config.capabilities.map((cap, idx) => (
                <div key={idx} className="platform-capability-item">
                  <CheckCircle2 size={13} style={{ color: config.badgeColor || '#22c55e', flexShrink: 0 }} />
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          )}

          {/* Header Actions */}
          <div className="platform-hero-actions-row">
            {config.officialUrl && (
              <button
                type="button"
                className="btn-platform-official"
                onClick={() => window.open(config.officialUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink size={14} />
                <span>Open {config.name}</span>
              </button>
            )}

            {initialItems.length > 0 && (
              <button
                type="button"
                className="btn-platform-start-party"
                onClick={() => onWatchParty(initialItems[0])}
              >
                <Users size={15} />
                <span>{isDRM ? 'Create Sync Watch Room' : 'Start Watch Party'}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── 2. SPECIAL IMPORTER SECTION (FOR CUSTOM LINKS & YOUTUBE) ── */}
      {(isCustom || isYouTube) && (
        <section className="platform-importer-section">
          <div className="importer-card-box">
            <div className="importer-header">
              <Link2 size={18} className="importer-header-icon" />
              <div>
                <h3 className="importer-title">
                  {isYouTube ? 'Stream Any YouTube Video' : 'Stream Direct Media Link'}
                </h3>
                <p className="importer-sub">
                  {isYouTube 
                    ? 'Paste any YouTube URL or video ID to start a synchronized watch room.' 
                    : 'Paste an MP4, WebM, HLS (.m3u8), or YouTube URL with zero latency WebRTC calling.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleCustomImportSubmit} className="importer-form">
              <div className="importer-inputs-row">
                <input
                  type="text"
                  className="importer-text-input"
                  placeholder={isYouTube ? "https://www.youtube.com/watch?v=... or Video ID" : "https://example.com/video.mp4 or YouTube link"}
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                />
                <input
                  type="text"
                  className="importer-title-input"
                  placeholder="Optional Title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
                <button type="submit" className="importer-submit-btn">
                  <Play size={15} fill="currentColor" />
                  <span>Launch Watch Room</span>
                </button>
              </div>
              {customError && (
                <div className="importer-error-notice">
                  <AlertCircle size={14} />
                  <span>{customError}</span>
                </div>
              )}
            </form>
          </div>
        </section>
      )}

      {/* ── 3. CATALOG & SEARCH BAR ── */}
      <section className="platform-catalog-section">
        <div className="platform-catalog-header">
          <div>
            <h2 className="platform-catalog-title">
              {isFree ? 'Popular Free Movies' : isYouTube ? 'Trending YouTube Streams' : `${config.name} Featured Titles`}
            </h2>
            <span className="platform-catalog-count">{filteredItems.length} Available Titles</span>
          </div>

          <div className="platform-catalog-search-pill">
            <Search size={14} color="#817A7C" />
            <input
              type="text"
              placeholder={`Search ${config.name} titles...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content Grid */}
        {filteredItems.length === 0 ? (
          <div className="platform-empty-notice">
            <Info size={32} color="#817A7C" />
            <span className="empty-heading">No titles found for "{searchQuery}"</span>
            <p className="empty-sub">Try searching with another keyword or clear the search field.</p>
          </div>
        ) : (
          <div className="platform-content-grid">
            {filteredItems.map((item) => (
              <ContentCard
                key={item.id}
                content={item}
                isFavorited={favoritesList && favoritesList.has(item.id)}
                onToggleFavorite={onToggleFavorite}
                onWatchSolo={onWatchSolo}
                onWatchParty={onWatchParty}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
