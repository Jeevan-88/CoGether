import React from 'react';
import {
  ArrowLeft, Users, Swords, LogIn, Search, Bell, ChevronDown, Film, Gamepad2, ShoppingBag, BookOpen, Clock, Sparkles
} from 'lucide-react';
import CogetherAvatarRenderer from '../../modules/auth/CogetherAvatarRenderer.jsx';
import { useAuth } from '../../core/AuthContext.jsx';
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
  const { guestRemainingSeconds, isGuestExpired } = useAuth() || {};

  const isGuest = Boolean(user?.isGuest);
  const isAuthenticated = Boolean((user && !isGuest) || (profile && !isGuest));

  const displayName = isGuest
    ? 'Guest'
    : (profile?.displayName ||
       profile?.display_name ||
       [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
       profile?.username ||
       user?.email?.split('@')[0] ||
       'Member');

  const formatGuestTime = (seconds) => {
    if (seconds == null || isNaN(seconds)) return '5:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const avatar = profile?.avatarUrl || profile?.avatar_url || user?.avatarUrl || '';
  const avatarConfig = profile?.avatarConfig || profile?.avatar_config;
  

  const services = [
    { id: 'cowatch', label: 'CO-WATCH', tabId: 'cinemaHub', icon: Film },
    { id: 'coplay', label: 'CO-PLAY', tabId: 'gamesHub', icon: Gamepad2 },
    { id: 'coshop', label: 'CO-SHOP', tabId: 'coshop', icon: ShoppingBag },
    { id: 'costudy', label: 'CO-STUDY', tabId: 'studyHub', icon: BookOpen }
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
      {/* ── LEFT: BRAND LOGO ── */}
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
          <span className="app-nav-brand-prefix">Co</span>
          <span className="app-nav-brand-accent">Gether</span>
        </div>
      </div>

      {/* ── CENTER: PRODUCT MODULE SWITCHER ── */}
      <div className="app-nav-center">
        <nav className="app-nav-services-bar" aria-label="Product modules">
          {services.map((item) => {
            const active = isCurrentService(item);
            return (
              <button
                key={item.id}
                type="button"
                className={`app-nav-service-pill ${active ? 'active' : ''}`}
                onClick={() => onSelectService && onSelectService(item.id)}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {centerContent && (
          <div className="app-nav-custom-center">{centerContent}</div>
        )}
      </div>

      {/* ── RIGHT: SEARCH, NOTIFICATIONS, PROFILE ── */}
      <div className="app-nav-right">
        {rightActions}

        {/* Global Search Button */}
        <button
          type="button"
          className="app-nav-icon-btn"
          title="Search"
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        {/* Notifications / Friends Trigger */}
        <button
          type="button"
          className="app-nav-icon-btn btn-hub-friends-trigger"
          onClick={onOpenSocial}
          title="Notifications & Friends"
          aria-label="Notifications & Friends"
        >
          <Bell size={18} />
          <span className="app-nav-badge-dot hub-badge-dot" />
        </button>

        {/* User Profile Pill Menu */}
        {isGuest ? (
          <div className="app-nav-guest-pill" title="5-minute guest session is active">
            <Clock size={13} className="guest-clock-icon" />
            <span className="guest-time-text">Guest: {formatGuestTime(guestRemainingSeconds)}</span>
            <button
              type="button"
              className="app-nav-guest-signup-cta"
              onClick={onOpenAuth}
              title="Create account to save preferences and remove 5-minute limit"
            >
              <Sparkles size={11} />
              <span>Sign Up</span>
            </button>
          </div>
        ) : isAuthenticated ? (
          <button
            type="button"
            className="app-nav-profile-btn hub-upper-left-profile-btn"
            onClick={onOpenProfile}
            title={`${displayName} — Profile Settings`}
          >
            <div className="app-nav-avatar-wrap hub-btn-avatar-wrap">
              {avatarConfig ? (
                <CogetherAvatarRenderer config={avatarConfig} size={28} animated={false} />
              ) : avatar && (avatar.startsWith('http') || avatar.startsWith('data:')) ? (
                <img src={avatar} alt="" className="app-nav-avatar-img hub-btn-avatar-img" />
              ) : (
                <span className="app-nav-avatar-initial hub-btn-avatar-initial">
                  {(displayName || 'J')[0].toUpperCase()}
                </span>
              )}
            </div>
            <span className="app-nav-username hub-btn-username">{displayName}</span>
            <ChevronDown size={14} className="app-nav-chevron" />
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
