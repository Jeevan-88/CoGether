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
import { SocialProvider, useSocial } from './core/SocialContext.jsx';
import FriendsModal from './modules/social/FriendsModal.jsx';
import IncomingGameInviteBanner from './modules/social/IncomingGameInviteBanner.jsx';

function MainApp() {
  const { user, profile, preferences, isAuthenticated, restoreSession, isGuestExpired } = useAuth();
  const { isSocialModalOpen, setIsSocialModalOpen, unreadSummary } = useSocial();

  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'cinemaHub' | 'gamesHub' | 'coshop' | 'studyHub'
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeInviteToken, setActiveInviteToken] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [isCoshopActive, setIsCoshopActive] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

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
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;

    // Handle Google OAuth callback token
    const tokenParam = params.get('token');
    if (tokenParam) {
      localStorage.setItem('cogether_access_token', tokenParam);
      restoreSession();
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // Handle invite token in pathname (/invite/<token>) or query (?invite=<token>)
    if (pathname.includes('/invite/')) {
      const token = pathname.split('/invite/')[1]?.split('/')[0]?.split('?')[0];
      if (token) setActiveInviteToken(token);
    } else if (params.get('invite')) {
      setActiveInviteToken(params.get('invite'));
    }

    const roomParam = params.get('room');
    const modeParam = params.get('mode');
    const gameParam = params.get('game');
    const challengeParam = params.get('challenge');

    if (roomParam) {
      const canonicalName = profile?.displayName || profile?.username || 'Member';
      setActiveRoom({
        roomId: roomParam,
        username: canonicalName,
        mode: modeParam || 'video'
      });
    } else if (modeParam === 'coplay' || modeParam === 'games' || gameParam || challengeParam) {
      setActiveTab('gamesHub');
    } else if (modeParam === 'watch' || modeParam === 'cowatch' || modeParam === 'cinema') {
      setActiveTab('cinemaHub');
    } else if (modeParam === 'shop' || modeParam === 'coshop') {
      setActiveTab('coshop');
    } else if (modeParam === 'study' || modeParam === 'costudy') {
      setActiveTab('studyHub');
    }
  }, [profile, restoreSession]);

  const handleStartRoom = (roomId, username, mode) => {
    const canonicalName = username || profile?.displayName || profile?.username || 'Member';
    const newUrl = `${window.location.pathname}?room=${roomId}&mode=${mode}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setActiveRoom({ roomId, username: canonicalName, mode });
  };

  const handleLeaveRoom = () => {
    window.history.pushState({ path: window.location.pathname }, '', window.location.pathname);
    setActiveRoom(null);
    setActiveTab('home');
  };

  // PART 7: Route directly from the Four-Service Choice into the selected CoGether experience
  const handleSelectCogetherService = (serviceId) => {
    const normalized = String(serviceId || '').toLowerCase();
    setActiveRoom(null);
    if (normalized === 'coplay' || normalized === 'games') {
      setActiveTab('gamesHub');
    } else if (normalized === 'coshop' || normalized === 'shop') {
      setActiveTab('coshop');
    } else if (normalized === 'cowatch' || normalized === 'watch') {
      setActiveTab('cinemaHub');
    } else if (normalized === 'costudy' || normalized === 'study') {
      setActiveTab('studyHub');
    } else {
      setActiveTab('home');
    }
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
    if (activeTab === 'coshop' || activeTab === 'shop') {
      return (
        <CoShopHub
          onBackToHome={() => setActiveTab('home')}
          onSelectService={handleSelectCogetherService}
          initialUser={user}
        />
      );
    }

    // ── CO-WATCH OTT & CINEMA STREAMING HUB ──
    if (activeTab === 'cinemaHub') {
      return (
        <CoWatchCinemaHub
          onBackToHome={() => setActiveTab('home')}
          onSelectService={handleSelectCogetherService}
          initialUser={user}
        />
      );
    }

    // ── CO-PLAY VERIFIED GAMES ARCADE HUB ──
    if (activeTab === 'gamesHub') {
      return (
        <CoPlayGamesHub
          onBackToHome={() => setActiveTab('home')}
          onSelectService={handleSelectCogetherService}
          initialUser={user}
        />
      );
    }

    // ── CO-STUDY 2D LEARNING CITY & GAMIFIED CSE WORLD ──
    if (activeTab === 'studyHub' || activeTab === 'costudy' || activeTab === 'study') {
      return <CoStudyWorld
          onBackToHome={() => setActiveTab('home')}
          onSelectService={handleSelectCogetherService}
        />;
    }

    return (
      <div className="app-container">
        <Navbar
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'watch' || tab === 'cowatch') setActiveTab('cinemaHub');
            else if (tab === 'games' || tab === 'coplay') setActiveTab('gamesHub');
            else if (tab === 'shop' || tab === 'coshop') setActiveTab('coshop');
            else if (tab === 'study' || tab === 'costudy') setActiveTab('studyHub');
            else if (tab === 'telepresence')
              handleStartRoom(
                'room-' + Math.floor(1000 + Math.random() * 9000),
                profile?.displayName || profile?.username || 'User',
                'merged'
              );
            else setActiveTab(tab);
          }}
          user={user}
          profile={profile}
          onOpenAuth={() => setShowAuth(true)}
          onOpenProfile={() => setShowProfile(true)}
          onOpenSocial={() => setIsSocialModalOpen(true)}
          unreadCount={unreadSummary?.totalUnread || 0}
          isScrolled={scrollProgress > 0.3}
          scrollProgress={scrollProgress}
          hideNavbar={isCoshopActive}
        />

        <LandingPage
          onStartWatchParty={() => setActiveTab('cinemaHub')}
          onStartGames={() => setActiveTab('gamesHub')}
          onStartMergedCam={(r, u) => handleStartRoom(r, u, 'merged')}
          onOpenPricing={() => setShowPricing(true)}
          onOpenSocial={() => setIsSocialModalOpen(true)}
          unreadCount={unreadSummary?.totalUnread || 0}
          onOpenGamesHub={() => setActiveTab('gamesHub')}
          onOpenCinemaHub={() => setActiveTab('cinemaHub')}
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
          onClose={() => { if (!isGuestExpired) setShowAuth(false); }}
          onLoginSuccess={() => {
            setShowAuth(false);
            if (activeTab === 'home' && !activeRoom && !activeInviteToken) {
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
    <AuthProvider>
      <SocialProvider>
        <MainApp />
      </SocialProvider>
    </AuthProvider>
  );
}
