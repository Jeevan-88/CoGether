import React, { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { AuthProvider, useAuth } from './core/AuthContext.jsx';
import Navbar from './components/common/Navbar.jsx';
import LandingPage from './modules/landing/LandingPage.jsx';
import VideoRoom from './modules/videoroom/VideoRoom.jsx';
import WatchPartyRoom from './modules/cowatch/WatchPartyRoom.jsx';
import CoWatchCinemaHub from './modules/cowatch/CoWatchCinemaHub.jsx';
import CoPlayGamesHub from './modules/coplay/CoPlayGamesHub.jsx';
import CoShopHub from './modules/coshop/CoShopHub.jsx';
import CoStudyWorld from './modules/costudy/CoStudyWorld.jsx';
import MergedCameraView from './modules/costudy/MergedCameraView.jsx';
import AuthModal from './modules/auth/AuthModal.jsx';
import ProfileModal from './modules/auth/ProfileModal.jsx';
import CogetherAvatarRenderer from './modules/auth/CogetherAvatarRenderer.jsx';
import InviteLandingView from './modules/invites/InviteLandingView.jsx';
import PricingModal from './modules/pricing/PricingModal.jsx';
import SignupPage from './pages/SignupPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import AdminPublisherPage from './pages/AdminPublisherPage.jsx';
import ErrorBoundary from './core/errorTracker.jsx';
import analytics from './core/analytics.js';

import { SocialProvider, useSocial } from './core/SocialContext.jsx';
import FriendsModal from './modules/social/FriendsModal.jsx';
import IncomingGameInviteBanner from './modules/social/IncomingGameInviteBanner.jsx';
import {
  parseCurrentRoute,
  pushRoute,
  replaceRoute,
  navigateBackSafe,
  subscribeToRoute
} from './core/navigationHistory.js';

function MainApp() {
  const { user, profile, preferences, isAuthenticated, restoreSession, logout, isGuestExpired } = useAuth();
  const { isSocialModalOpen, setIsSocialModalOpen, unreadSummary } = useSocial();

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const r = parseCurrentRoute();
      return r.tab || 'home';
    } catch (e) {
      return 'home';
    }
  }); // 'home' | 'cinemaHub' | 'gamesHub' | 'coshop' | 'studyHub'
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeInviteToken, setActiveInviteToken] = useState(null);
  const [showAuth, setShowAuth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/login' || window.location.pathname === '/signup';
    }
    return false;
  });
  const [authModalMode, setAuthModalMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/signup' ? 'signup' : 'signin';
    }
    return 'signin';
  });
  const [showProfile, setShowProfile] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [isCoshopActive, setIsCoshopActive] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentPath, setCurrentPath] = useState(() => (typeof window !== 'undefined' ? window.location.pathname : '/'));

  
  useEffect(() => {
    if (currentPath === '/login') {
      setAuthModalMode('signin');
      setShowAuth(true);
    } else if (currentPath === '/signup') {
      setAuthModalMode('signup');
      setShowAuth(true);
    } else if (currentPath === '/coshop' || currentPath === '/shop') {
      setActiveTab('coshop');
    } else if (currentPath === '/coplay' || currentPath === '/games' || currentPath === '/play') {
      setActiveTab('gamesHub');
    } else if (currentPath === '/cowatch' || currentPath === '/watch' || currentPath === '/cinema') {
      setActiveTab('cinemaHub');
    } else if (currentPath === '/costudy' || currentPath === '/study') {
      setActiveTab('studyHub');
    }
    analytics.trackPageView(currentPath);
  }, [currentPath]);

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path.split('?')[0]);
    try {
      const r = parseCurrentRoute();
      setActiveTab(r.tab || 'home');
    } catch (e) {}
  };

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight * 1.2;
      const progress = Math.min(window.scrollY / heroHeight, 1);
      setScrollProgress(progress);

      const coshopWrapper = document.querySelector('.sticky-pinned-coshop-stage-wrapper');
      if (coshopWrapper) {
        const rect = coshopWrapper.getBoundingClientRect();
        const isActive = rect.top <= 10 && rect.bottom >= window.innerHeight - 10;
        setIsCoshopActive(isActive);
      } else {
        setIsCoshopActive(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Check for Google OAuth callback token
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      localStorage.setItem('cogether_access_token', tokenParam);
      restoreSession();
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    const handleRouteChange = (route) => {
      setActiveTab(route.tab || 'home');
      if (route.inviteToken) {
        setActiveInviteToken(route.inviteToken);
      } else {
        setActiveInviteToken(null);
      }

      if (route.room) {
        const canonicalName = profile?.displayName || profile?.username || 'Member';
        setActiveRoom({
          roomId: route.room,
          username: canonicalName,
          mode: route.roomMode || 'video'
        });
      } else {
        setActiveRoom(null);
      }

      if (route.auth === 'login' || route.auth === 'signup') {
        setShowAuth(true);
      } else if (route.auth === 'profile') {
        setShowProfile(true);
      }

      if (route.pricing) {
        setShowPricing(true);
      }
    };

    const initialRoute = parseCurrentRoute();
    handleRouteChange(initialRoute);

    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    const unsubscribe = subscribeToRoute(handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      unsubscribe();
    };
  }, [profile, restoreSession]);

  const handleStartRoom = (roomId, username, mode) => {
    const canonicalName = username || profile?.displayName || profile?.username || 'Member';
    pushRoute({ tab: activeTab, room: roomId, roomMode: mode });
    setActiveRoom({ roomId, username: canonicalName, mode });
  };

  const handleLeaveRoom = () => {
    setActiveRoom(null);
    navigateBackSafe({ tab: activeTab || 'home' });
  };

  // PART 7: Route directly from the Four-Service Choice into the selected CoGether experience
  const handleSelectCogetherService = (serviceId) => {
    const normalized = String(serviceId || '').toLowerCase();
    setActiveRoom(null);
    let targetTab = 'home';
    if (normalized === 'coplay' || normalized === 'games') {
      targetTab = 'gamesHub';
    } else if (normalized === 'coshop' || normalized === 'shop') {
      targetTab = 'coshop';
    } else if (normalized === 'cowatch' || normalized === 'watch') {
      targetTab = 'cinemaHub';
    } else if (normalized === 'costudy' || normalized === 'study') {
      targetTab = 'studyHub';
    } else {
      targetTab = 'home';
    }
    setActiveTab(targetTab);
    pushRoute({ tab: targetTab });
  };

  // PART 8: Persistent Member Pass & Custom Avatar Pill across CoPlay, CoShop, CoWatch & CoStudy
  const renderGlobalServiceMemberPill = () => {
    if (activeTab === 'home' || (!profile && !user)) return null;
    const displayName =
      profile?.displayName ||
      profile?.display_name ||
      [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
      profile?.username ||
      user?.email?.split('@')[0] ||
      'Member';
    const handle = profile?.username ? `@${profile.username.replace(/^@+/, '')}` : '';
    const avatarCfg = profile?.avatarConfig || profile?.avatar_config;

    return (
      <button
        type="button"
        onClick={() => setShowProfile(true)}
        data-testid="global-member-pass-pill"
        title="Open CoGether Member Card & Profile"
        style={{
          position: 'fixed',
          bottom: '18px',
          left: '18px',
          zIndex: 940,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 14px 6px 8px',
          borderRadius: '999px',
          background: 'linear-gradient(135deg, rgba(226, 232, 240, 0.94) 0%, rgba(184, 194, 208, 0.94) 100%)',
          border: '1.5px solid rgba(255, 255, 255, 0.9)',
          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          color: '#0F172A',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left'
        }}
      >
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            border: '1.5px solid rgba(15, 23, 42, 0.25)',
            background: '#0F172A'
          }}
        >
          <CogetherAvatarRenderer config={avatarCfg} size={30} animated={false} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>{displayName}</span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#334155' }}>
            {handle || 'Member Card'}
          </span>
        </div>
        <CreditCard size={14} style={{ color: '#C8102E', marginLeft: '2px' }} />
      </button>
    );
  };

  // Render active view content while keeping global modals (AuthModal, ProfileModal, PricingModal) mounted
  const renderMainContent = () => {
    // ── DEDICATED AUTH, LEGAL, & DASHBOARD PAGES ──
    if (currentPath === '/admin' || currentPath === '/admin/coshop') {
      return <AdminPublisherPage onNavigate={handleNavigate} />;
    }
    if (currentPath === '/privacy') {
      return <PrivacyPolicyPage onNavigate={handleNavigate} />;
    }
    if (currentPath === '/terms') {
      return <TermsPage onNavigate={handleNavigate} />;
    }
    if (currentPath === '/forgot-password') {
      return <ForgotPasswordPage onNavigate={handleNavigate} />;
    }
    if (currentPath === '/reset-password') {
      return <ResetPasswordPage onNavigate={handleNavigate} />;
    }
    if (currentPath === '/dashboard') {
      return (
        <DashboardPage
          onNavigate={handleNavigate}
          onSelectService={(service) => {
            handleNavigate('/');
            handleSelectCogetherService(service);
          }}
        />
      );
    }
    if (currentPath === '/404') {
      return <NotFoundPage onNavigate={handleNavigate} onSelectService={handleSelectCogetherService} />;
    }

    // Unrecognized route fallback
    const knownPaths = [
      '/', '/coshop', '/shop', '/coplay', '/games', '/play', '/cowatch', '/watch', '/cinema', '/costudy', '/study',
      '/login', '/signup', '/dashboard', '/forgot-password', '/reset-password', '/privacy', '/terms', '/admin', '/admin/coshop', '/404'
    ];
    if (!knownPaths.includes(currentPath) && !currentPath.startsWith('/room/')) {
      return <NotFoundPage onNavigate={handleNavigate} onSelectService={handleSelectCogetherService} />;
    }
    // ── INVITE LANDING SCREEN ──
    if (activeInviteToken) {
      return (
        <InviteLandingView
          token={activeInviteToken}
          onJoinRoom={({ roomId, resourceType }) => {
            setActiveInviteToken(null);
            const mode = resourceType === 'watch' ? 'watch' : 'games';
            handleStartRoom(roomId, profile?.displayName || profile?.username || 'Guest', mode);
          }}
          onCancel={() => {
            setActiveInviteToken(null);
            window.history.pushState({}, document.title, '/');
          }}
        />
      );
    }

    // ── ACTIVE ROOMS ──
    if (activeRoom) {
      if (activeRoom.mode === 'shop' || activeRoom.mode === 'coshop') {
        return (
          <CoShopHub
            onBackToHome={handleLeaveRoom}
            initialUser={user}
            initialRoomId={activeRoom.roomId}
            initialUsername={activeRoom.username}
          />
        );
      }

      if (activeRoom.mode === 'watch' || activeRoom.mode === 'cinema') {
        return (
          <CoWatchCinemaHub
            onBackToHome={handleLeaveRoom}
            initialUser={user}
            initialRoomId={activeRoom.roomId}
            initialUsername={activeRoom.username}
          />
        );
      }

      if (activeRoom.mode === 'games' || activeRoom.mode === 'coplay') {
        return (
          <CoPlayGamesHub
            onBackToHome={handleLeaveRoom}
            initialUser={user}
          />
        );
      }

      if (activeRoom.mode === 'merged' || activeRoom.mode === 'duo' || activeRoom.mode === 'camera') {
        return (
          <MergedCameraView
            roomId={activeRoom.roomId}
            username={activeRoom.username}
            onLeave={handleLeaveRoom}
          />
        );
      }

      return (
        <VideoRoom
          roomId={activeRoom.roomId}
          username={activeRoom.username}
          onLeave={handleLeaveRoom}
        />
      );
    }

    // ── CO-SHOP MASSIVE SOCIAL SHOPPING HUB ──
    if (currentPath === '/coshop' || currentPath === '/shop' || activeTab === 'coshop' || activeTab === 'shop') {
      return (
        <CoShopHub
          onBackToHome={() => {
            handleNavigate('/');
            setActiveTab('home');
          }}
          onSelectService={handleSelectCogetherService}
          initialUser={user}
        />
      );
    }

    // ── CO-WATCH OTT & CINEMA STREAMING HUB ──
    if (currentPath === '/cowatch' || currentPath === '/watch' || currentPath === '/cinema' || activeTab === 'cinemaHub') {
      return (
        <CoWatchCinemaHub
          onBackToHome={() => {
            handleNavigate('/');
            setActiveTab('home');
          }}
          onSelectService={handleSelectCogetherService}
          initialUser={user}
        />
      );
    }

    // ── CO-PLAY MULTIPLAYER GAMES ARCADE HUB ──
    if (currentPath === '/coplay' || currentPath === '/games' || currentPath === '/play' || activeTab === 'gamesHub') {
      return (
        <CoPlayGamesHub
          onBackToHome={() => {
            handleNavigate('/');
            setActiveTab('home');
          }}
          onSelectService={handleSelectCogetherService}
          initialUser={user}
        />
      );
    }

    // ── CO-STUDY 2D LEARNING CITY & GAMIFIED CSE WORLD ──
    if (currentPath === '/costudy' || currentPath === '/study' || activeTab === 'studyHub' || activeTab === 'costudy' || activeTab === 'study') {
      return (
        <CoStudyWorld
          onBackToHome={() => {
            handleNavigate('/');
            setActiveTab('home');
          }}
          onSelectService={handleSelectCogetherService}
        />
      );
    }

    return (
      <div className="app-container">
        <Navbar
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'watch' || tab === 'cowatch') handleSelectCogetherService('cowatch');
            else if (tab === 'games' || tab === 'coplay') handleSelectCogetherService('coplay');
            else if (tab === 'shop' || tab === 'coshop') handleSelectCogetherService('coshop');
            else if (tab === 'study' || tab === 'costudy') handleSelectCogetherService('costudy');
            else if (tab === 'telepresence')
              handleStartRoom(
                'room-' + Math.floor(1000 + Math.random() * 9000),
                profile?.displayName || profile?.username || 'User',
                'merged'
              );
            else handleSelectCogetherService(tab);
          }}
          user={user}
          profile={profile}
          onOpenAuth={() => {
            setAuthModalMode('signin');
            setShowAuth(true);
            handleNavigate('/login');
          }}
          onOpenSignup={() => {
            setAuthModalMode('signup');
            setShowAuth(true);
            handleNavigate('/signup');
          }}
          onOpenProfile={() => setShowProfile(true)}
          onOpenSocial={() => setIsSocialModalOpen(true)}
          unreadCount={unreadSummary?.totalUnread || 0}
          isScrolled={scrollProgress > 0.3}
          scrollProgress={scrollProgress}
          hideNavbar={isCoshopActive}
        />

        <LandingPage
          onStartWatchParty={() => handleSelectCogetherService('cowatch')}
          onStartGames={() => handleSelectCogetherService('coplay')}
          onStartMergedCam={(r, u) => handleStartRoom(r, u, 'merged')}
          onOpenPricing={() => {
            setShowPricing(true);
            pushRoute({ tab: activeTab, pricing: true });
          }}
          onOpenSocial={() => setIsSocialModalOpen(true)}
          unreadCount={unreadSummary?.totalUnread || 0}
          onOpenGamesHub={() => handleSelectCogetherService('coplay')}
          onOpenCinemaHub={() => handleSelectCogetherService('cowatch')}
        />
      </div>
    );
  };

  return (
    <>
      {renderMainContent()}
      <IncomingGameInviteBanner onAcceptInvite={() => setActiveTab('gamesHub')} />

      {showAuth && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => {
            if (!isGuestExpired) setShowAuth(false);
            if (currentPath === '/login' || currentPath === '/signup') {
              handleNavigate('/');
            }
          }}
          onLoginSuccess={() => {
            setShowAuth(false);
            restoreSession();
            if (currentPath === '/login' || currentPath === '/signup') {
              handleNavigate('/dashboard');
            } else if (activeTab === 'home' && !activeRoom && !activeInviteToken) {
              setActiveTab('gamesHub');
            }
          }}
          onSelectService={handleSelectCogetherService}
        />
      )}

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {showPricing && (
        <PricingModal
          onClose={() => setShowPricing(false)}
          onSuccess={() => {}}
        />
      )}

      {isSocialModalOpen && (
        <FriendsModal
          onClose={() => setIsSocialModalOpen(false)}
          onLaunchGameDuel={() => {
            setActiveTab('gamesHub');
            setIsSocialModalOpen(false);
          }}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocialProvider>
          <MainApp />
        </SocialProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
