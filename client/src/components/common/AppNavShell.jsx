import React from 'react';
import {
  ArrowLeft, Users, Swords, LogIn, Search, Film, Gamepad2, ShoppingBag, BookOpen
} from 'lucide-react';
import CogetherAvatarRenderer from '../../modules/auth/CogetherAvatarRenderer.jsx';
import './AppNavShell.css';

export default function AppNavShell({
  activeService = 'coplay', // 'coplay' | 'cowatch' | 'coshop' | 'costudy'
  onSelectService,
  onBackToHome,
  user,
  profile,
  onOpenProfile,
  onOpenSocial,
  onOpenAuth,
  unreadCount = 0,
  pendingCount = 0,
  centerContent = null,
  rightActions = null
}) {
  const displayName =
    profile?.displayName ||
    profile?.display_name ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
    profile?.username ||
    user?.email?.split('@')[0] ||
    'Member';

  const avatar = profile?.avatarUrl || profile?.avatar_url || user?.avatarUrl || '';
  const avatarConfig = profile?.avatarConfig || profile?.avatar_config;
  const isAuthenticated = Boolean(user || profile);

  const services = [
    { id: 'coplay', label: 'Co-Play', tabId: 'gamesHub', icon: Gamepad2 },
    { id: 'cowatch', label: 'Co-Watch', tabId: 'cinemaHub', icon: Film },
    { id: 'coshop', label: 'Co-Shop', tabId: 'coshop', icon: ShoppingBag },
    { id: 'costudy', label: 'Co-Study', tabId: 'studyHub', icon: BookOpen }
  ];

  const isCurrentService = (item) => {
    return (
      activeService === item.id ||
      activeService === item.tabId ||
      (activeService === 'games' && item.id === 'coplay') ||
      (activeService === 'watch' && item.id === 'cowatch') ||
      (activeService === 'shop' && item.id === 'coshop') ||
      (activeService === 'study' && item.id === 'costudy')
    );
  };

  return (
    <header className="cogether-app-nav-shell">
      {/* ── LEFT: BRAND & TOP-LEFT PROFILE CONTROLS ── */}
      <div className="app-nav-left">
        {onBackToHome && (
          <button
            type="button"
            className="app-nav-btn-home"
            onClick={onBackToHome}
            title="Back to Landing Page"
            aria-label="Back to home"
          >
            <ArrowLeft size={16} />
          </button>
        )}

        <div
          className="app-nav-brand"
          onClick={onBackToHome}
          title="CoGether Platform"
        >
          <span className="app-nav-brand-prefix">CO</span>
          <span className="app-nav-brand-accent">GETHER</span>
        </div>

        {/* TOP-LEFT AUTHENTICATED PROFILE BUTTON */}
        {isAuthenticated && (
          <button
            type="button"
            className="app-nav-profile-btn hub-upper-left-profile-btn"
            onClick={onOpenProfile}
            title={`${displayName} — Open Profile & Avatar Studio`}
          >
            {avatarConfig ? (
              <div className="app-nav-avatar-wrap hub-btn-avatar-wrap">
                <CogetherAvatarRenderer config={avatarConfig} size={24} animated={false} />
              </div>
            ) : avatar && (avatar.startsWith('http') || avatar.startsWith('data:')) ? (
              <img src={avatar} alt="" className="app-nav-avatar-img hub-btn-avatar-img" />
            ) : (
              <span className="app-nav-avatar-initial hub-btn-avatar-initial">
                {(displayName || 'U')[0].toUpperCase()}
              </span>
            )}
            <span className="app-nav-username hub-btn-username">{displayName}</span>
          </button>
        )}
      </div>

      {/* ── CENTER: SHARED PRODUCT MODULE SWITCHER ── */}
      <div className="app-nav-center">
        <nav className="app-nav-services-bar" aria-label="Product modules">
          {services.map((item) => {
            const active = isCurrentService(item);
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`app-nav-service-pill ${active ? 'active' : ''}`}
                onClick={() => onSelectService && onSelectService(item.id)}
              >
                <IconComponent size={14} className="service-pill-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {centerContent && (
          <div className="app-nav-custom-center">{centerContent}</div>
        )}
      </div>

      {/* ── RIGHT: SOCIAL, FRIENDS & CUSTOM MODULE ACTIONS ── */}
      <div className="app-nav-right">
        {/* Module-specific actions (e.g. Play with Friend, New Party) */}
        {rightActions}

        {/* Global Friends & Messages Button */}
        {isAuthenticated ? (
          <button
            type="button"
            className="app-nav-friends-btn btn-hub-friends-trigger"
            onClick={onOpenSocial}
            title="Friends & Messages"
          >
            <Users size={15} />
            <span className="friends-btn-label">Friends</span>
            {unreadCount > 0 && (
              <span className="app-nav-badge-count hub-badge-count">{unreadCount}</span>
            )}
            {pendingCount > 0 && (
              <span className="app-nav-badge-dot hub-badge-dot" />
            )}
          </button>
        ) : (
          <button
            type="button"
            className="app-nav-signin-btn"
            onClick={onOpenAuth}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
