import React, { useState, useEffect } from 'react';
import Navbar from './Navbar.jsx';
import LandingPage from './LandingPage.jsx';
import VideoRoom from './VideoRoom.jsx';
import WatchPartyRoom from './WatchPartyRoom.jsx';
import CoPlayGamesHub from './CoPlayGamesHub.jsx';
import MergedCameraView from './MergedCameraView.jsx';
import AuthModal from './AuthModal.jsx';
import PricingModal from './PricingModal.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'gamesHub' | ...
  const [user, setUser] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
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
    const roomParam = params.get('room');
    const modeParam = params.get('mode') || 'video';

    if (roomParam) {
      const storedName = localStorage.getItem('sp_username') || 'Guest_' + Math.floor(100 + Math.random() * 900);
      setActiveRoom({
        roomId: roomParam,
        username: storedName,
        mode: modeParam
      });
    }
  }, []);

  const handleStartRoom = (roomId, username, mode) => {
    const newUrl = `${window.location.pathname}?room=${roomId}&mode=${mode}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setActiveRoom({ roomId, username, mode });
  };

  const handleLeaveRoom = () => {
    window.history.pushState({ path: window.location.pathname }, '', window.location.pathname);
    setActiveRoom(null);
    setActiveTab('home');
  };

  if (activeRoom) {
    if (activeRoom.mode === 'watch') {
      return (
        <WatchPartyRoom
          roomId={activeRoom.roomId}
          username={activeRoom.username}
          onLeave={handleLeaveRoom}
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

    if (activeRoom.mode === 'merged') {
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

  // ── CO-PLAY YELLOW CANVAS 100+ GAMES ARCADE HUB ──
  if (activeTab === 'gamesHub') {
    return (
      <CoPlayGamesHub
        onBackToHome={() => setActiveTab('home')}
        onLaunchSquadRoom={(roomId, username) => handleStartRoom(roomId, username, 'games')}
        initialUser={user}
      />
    );
  }

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'watch') handleStartRoom('room-' + Math.floor(1000 + Math.random() * 9000), user?.name || 'User', 'watch');
          else if (tab === 'games' || tab === 'coplay') setActiveTab('gamesHub');
          else if (tab === 'telepresence') handleStartRoom('room-' + Math.floor(1000 + Math.random() * 9000), user?.name || 'User', 'merged');
          else setActiveTab(tab);
        }}
        user={user}
        onOpenAuth={() => setShowAuth(true)}
        onOpenPricing={() => setShowPricing(true)}
        isScrolled={scrollProgress > 0.3}
        scrollProgress={scrollProgress}
        hideNavbar={isCoshopActive}
      />

      <LandingPage
        onStartWatchParty={(r, u) => handleStartRoom(r, u, 'watch')}
        onStartGames={(r, u) => setActiveTab('gamesHub')}
        onStartMergedCam={(r, u) => handleStartRoom(r, u, 'merged')}
        onOpenPricing={() => setShowPricing(true)}
        onOpenGamesHub={() => setActiveTab('gamesHub')}
      />

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onLoginSuccess={(u) => setUser(u)}
        />
      )}

      {showPricing && (
        <PricingModal
          onClose={() => setShowPricing(false)}
          onSuccess={() => {
            if (user) setUser({ ...user, plan: 'premium' });
          }}
        />
      )}
    </div>
  );
}
