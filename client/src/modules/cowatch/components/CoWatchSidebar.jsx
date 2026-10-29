import React from 'react';
import { 
  ArrowLeft, Home, Film, PlaySquare, Tv, Video, Star, Flame, 
  MonitorPlay, Laptop, Link2, Trophy, Radio, Clock, Bookmark, 
  Plus, KeyRound, Settings 
} from 'lucide-react';
import { useAuth } from '../../../core/AuthContext.jsx';
import CogetherAvatarRenderer from '../../auth/CogetherAvatarRenderer.jsx';
import './CoWatchSidebar.css';

export default function CoWatchSidebar({ 
  activeNav = 'HOME', 
  onSelectNav, 
  onBackToHome,
  onOpenProfile,
  onCreateRoom,
  onJoinRoom
}) {
  const { profile, user } = useAuth();
  const displayName = profile?.displayName || profile?.display_name || profile?.username || 'Jeevan';
  const avatarConfig = profile?.avatarConfig || profile?.avatar_config;

  const TOP_NAV = [
    { id: 'HOME', label: 'Home', icon: Home }
  ];

  const PLATFORM_NAV = [
    { id: 'FREE_MOVIES', label: 'Free Movies', icon: Film, badge: 'Free', badgeClass: 'badge-free' },
    { id: 'YOUTUBE', label: 'YouTube', icon: PlaySquare, badge: 'Embed', badgeClass: 'badge-yt' },
    { id: 'NETFLIX', label: 'Netflix', icon: Tv, badge: 'DRM', badgeClass: 'badge-drm' },
    { id: 'PRIME_VIDEO', label: 'Prime Video', icon: Video, badge: 'DRM', badgeClass: 'badge-drm' },
    { id: 'DISNEY_HOTSTAR', label: 'Disney+ Hotstar', icon: Star, badge: 'DRM', badgeClass: 'badge-drm' },
    { id: 'CRUNCHYROLL', label: 'Crunchyroll', icon: Flame, badge: 'DRM', badgeClass: 'badge-drm' },
    { id: 'JIOCINEMA', label: 'JioCinema', icon: MonitorPlay, badge: 'DRM', badgeClass: 'badge-drm' },
    { id: 'APPLE_TV', label: 'Apple TV+', icon: Laptop, badge: 'DRM', badgeClass: 'badge-drm' },
    { id: 'CUSTOM_LINKS', label: 'Custom Links', icon: Link2, badge: 'Stream', badgeClass: 'badge-stream' }
  ];

  const CHANNEL_NAV = [
    { id: 'SPORTS', label: 'Sports', icon: Trophy, badge: 'Live', badgeClass: 'badge-live' },
    { id: 'LIVE_TV', label: 'Live TV', icon: Radio, badge: '24/7', badgeClass: 'badge-live' }
  ];

  const LIBRARY_NAV = [
    { id: 'RECENTLY_WATCHED', label: 'Recently Watched', icon: Clock },
    { id: 'MY_WATCHLIST', label: 'My Watchlist', icon: Bookmark }
  ];

  const ROOMS_NAV = [
    { id: 'CREATE_ROOM', label: 'Create Room', icon: Plus, action: onCreateRoom },
    { id: 'JOIN_ROOM', label: 'Join with Code', icon: KeyRound, action: onJoinRoom }
  ];

  const handleItemClick = (item) => {
    if (item.action) {
      item.action();
    } else {
      onSelectNav(item.id);
    }
  };

  return (
    <aside className="cowatch-sidebar-target cowatch-sidebar-root" aria-label="CoWatch Navigation">
      <div className="cowatch-sidebar-top-group">
        {/* ── 1. Top Exit to CoGether Back Button ── */}
        <button
          type="button"
          className="cowatch-exit-to-cogether-btn"
          onClick={onBackToHome}
          title="Return to main CoGether application"
          aria-label="Exit to CoGether"
        >
          <ArrowLeft size={14} className="cowatch-exit-arrow-icon" />
          <span>Exit to CoGether</span>
        </button>

        {/* ── 2. Brand Logo & Title ── */}
        <div className="cowatch-sidebar-brand" onClick={() => onSelectNav('HOME')} title="CoWatch Cinema Social">
          <div className="cowatch-logo-icon-box">
            <img 
              src="/assets/cinema/cowatch_logo_icon.png" 
              alt="CoWatch" 
              className="cowatch-logo-img"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div className="cowatch-brand-text-col">
            <h1 className="cowatch-brand-name">CoWatch</h1>
            <span className="cowatch-brand-sub">CINEMA SOCIAL</span>
          </div>
        </div>

        {/* ── 3. Navigation Categories ── */}
        <nav className="cowatch-sidebar-scroll">
          {/* Top Home Item */}
          {TOP_NAV.map((item) => {
            const isActive = activeNav === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`cowatch-nav-item-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                {isActive && <span className="cowatch-active-left-pill" />}
                <Icon size={16} className="cowatch-nav-icon" />
                <span className="cowatch-nav-label">{item.label}</span>
              </button>
            );
          })}

          {/* Platforms Section */}
          <div className="cowatch-nav-section-title">PLATFORMS</div>
          {PLATFORM_NAV.map((item) => {
            const isActive = activeNav === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`cowatch-nav-item-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                {isActive && <span className="cowatch-active-left-pill" />}
                <Icon size={16} className="cowatch-nav-icon" />
                <span className="cowatch-nav-label">{item.label}</span>
                {item.badge && (
                  <span className={`cowatch-nav-item-badge ${item.badgeClass || ''}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Channels & Sports Section */}
          <div className="cowatch-nav-section-title">CHANNELS & SPORTS</div>
          {CHANNEL_NAV.map((item) => {
            const isActive = activeNav === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`cowatch-nav-item-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                {isActive && <span className="cowatch-active-left-pill" />}
                <Icon size={16} className="cowatch-nav-icon" />
                <span className="cowatch-nav-label">{item.label}</span>
                {item.badge && (
                  <span className={`cowatch-nav-item-badge ${item.badgeClass || ''}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Library Section */}
          <div className="cowatch-nav-section-title">MY LIBRARY</div>
          {LIBRARY_NAV.map((item) => {
            const isActive = activeNav === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`cowatch-nav-item-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                {isActive && <span className="cowatch-active-left-pill" />}
                <Icon size={16} className="cowatch-nav-icon" />
                <span className="cowatch-nav-label">{item.label}</span>
              </button>
            );
          })}

          {/* Watch Party Rooms Section */}
          <div className="cowatch-nav-section-title">WATCH ROOMS</div>
          {ROOMS_NAV.map((item) => {
            const isActive = activeNav === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`cowatch-nav-item-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                {isActive && <span className="cowatch-active-left-pill" />}
                <Icon size={16} className="cowatch-nav-icon" />
                <span className="cowatch-nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── 4. Bottom Profile Bar (Jeevan • Online + Settings) ── */}
      <div 
        className="cowatch-sidebar-profile-card cowatch-sidebar-profile"
        onClick={onOpenProfile}
        title={`${displayName} — Profile & Settings`}
      >
        <div className="cowatch-profile-left">
          <div className="cowatch-profile-avatar-box">
            {avatarConfig ? (
              <CogetherAvatarRenderer config={avatarConfig} size={30} animated={false} />
            ) : (
              <img 
                src="/assets/cinema/cowatch_user_avatar.png" 
                alt={displayName} 
                className="cowatch-profile-avatar-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>
          <div className="cowatch-profile-meta">
            <span className="cowatch-profile-name">{displayName}</span>
            <span className="cowatch-profile-status">
              <span className="status-dot-green" />
              Online
            </span>
          </div>
        </div>
        <button 
          type="button" 
          className="cowatch-profile-settings-btn"
          aria-label="Settings"
          onClick={(e) => {
            e.stopPropagation();
            onOpenProfile && onOpenProfile();
          }}
        >
          <Settings size={15} />
        </button>
      </div>
    </aside>
  );
}
