import React from 'react';
import { 
  Tv, Compass, Film, Clapperboard, Flame, Trophy, 
  PlaySquare, Unlock, Heart, Users, Settings, LogOut 
} from 'lucide-react';
import { useAuth } from '../../../core/AuthContext.jsx';

export default function CoWatchSidebar({ 
  activeNav = 'HOME', 
  onSelectNav, 
  onBackToHome,
  onOpenProfile
}) {
  const { profile, user } = useAuth();
  const displayName = profile?.displayName || profile?.username || user?.email?.split('@')[0] || 'Member';

  const NAV_ITEMS = [
    { id: 'HOME', label: 'Home', icon: Tv },
    { id: 'EXPLORE', label: 'Explore', icon: Compass },
    { id: 'MOVIES', label: 'Movies', icon: Film, section: 'CATALOG' },
    { id: 'SERIES', label: 'Series', icon: Clapperboard },
    { id: 'ANIME', label: 'Anime', icon: Flame },
    { id: 'SPORTS', label: 'Sports', icon: Trophy },
    { id: 'YOUTUBE', label: 'YouTube', icon: PlaySquare },
    { id: 'FREE', label: 'Free to Watch', icon: Unlock },
    { id: 'WATCH_ROOMS', label: 'Watch Rooms', icon: Users, section: 'SOCIAL' },
    { id: 'FAVORITES', label: 'Favorites', icon: Heart }
  ];

  return (
    <aside className="cowatch-sidebar-root">
      {/* Brand Header */}
      <div>
        <div className="cowatch-sidebar-brand">
          <div className="cowatch-brand-logo">
            <Tv size={18} />
          </div>
          <div className="cowatch-brand-text">
            <h1>COWATCH</h1>
            <span className="cowatch-brand-tagline">CINEMA SOCIAL</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="cowatch-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <React.Fragment key={item.id}>
              {item.section && (
                <div className="cowatch-nav-section-label">{item.section}</div>
              )}
              <button
                type="button"
                className={`cowatch-nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => onSelectNav(item.id)}
              >
                <item.icon size={15} />
                <span>{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Footer / Profile */}
      <div className="cowatch-sidebar-footer">
        <button
          type="button"
          className="cowatch-user-profile-btn"
          onClick={onOpenProfile}
          title="Profile settings"
        >
          <div className="cowatch-user-avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="cowatch-user-info">
            <span className="cowatch-username-text">{displayName}</span>
            <span className="cowatch-user-status">Online</span>
          </div>
          <Settings size={13} style={{ color: 'var(--cw-text-muted)' }} />
        </button>

        <button
          type="button"
          className="btn-cowatch-nav-exit"
          onClick={onBackToHome}
          title="Exit CoWatch"
        >
          <LogOut size={13} />
          <span>Exit to CoGether</span>
        </button>
      </div>
    </aside>
  );
}
