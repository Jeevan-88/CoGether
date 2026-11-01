import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { getGameProviderAdapter, GameLaunchError } from '../services/GameProviderAdapter.js';
import { GameMode } from '../gameSchema.js';
import { useWebRTC } from '../../../core/useWebRTC.js';
import AppNavShell from '../../../components/common/AppNavShell.jsx';
import GameHeader from './GameHeader.jsx';
import GameViewport from './GameViewport.jsx';
import GameSocialRail from './GameSocialRail.jsx';
import ChallengeModal from './ChallengeModal.jsx';
import LeaderboardModal from './LeaderboardModal.jsx';
import DraggableCameraOverlay from './DraggableCameraOverlay.jsx';
import PlayWithFriendModal from './PlayWithFriendModal.jsx';
import FriendsModal from '../../social/FriendsModal.jsx';
import ProfileModal from '../../auth/ProfileModal.jsx';
import { useSocial } from '../../../core/SocialContext.jsx';
import { useAuth } from '../../../core/AuthContext.jsx';
import { getSignalingUrl } from '../../../core/signalingConfig.js';
import './GameShell.css';

const SIGNALING_URL = getSignalingUrl();

/**
 * Universal GameShell
 * The shared production gameplay shell for EVERY game in CoGether.
 * Features:
 * 1. Physical 3D PC Monitor matching the CoGether landing page.
 * 2. Strictly no-scroll layout (fits available viewport with 0 vertical scrolling).
 * 3. Working edge-to-edge Fullscreen mode (hides stand, top nav, margins).
 * 4. Collapsible right-side party & live chat sidebar with arrow control.
 * 5. Combined & Separate modes for live video calling and chat.
 * 6. Real WebRTC video, microphone, and Socket.IO party messaging.
 */
export default function GameShell({
  game,
  onClose,
  initialMode = 'SINGLE_PLAYER', // 'SINGLE_PLAYER' | 'CHALLENGE'
  initialRoomId = null,
  currentUsername = 'Player',
  onSelectService,
  onBackToHome
}) {
  const [activeMode, setActiveMode] = useState(initialMode);
  const [roomId, setRoomId] = useState(() => initialRoomId || 'duel-' + Math.floor(1000 + Math.random() * 9000));
  const [loading, setLoading] = useState(true);
  const [launchError, setLaunchError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [videoLayoutMode, setVideoLayoutMode] = useState('COMBINED'); // 'COMBINED' | 'SEPARATE'
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showPlayWithFriendModal, setShowPlayWithFriendModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { user, profile } = useAuth();
  const { isSocialModalOpen, setIsSocialModalOpen, unreadSummary } = useSocial();

  // Challenge Sync & Arena State
  const [isLocalReady, setIsLocalReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [challengeStarted, setChallengeStarted] = useState(false);
  const [localScore, setLocalScore] = useState(0);
  const [localOver, setLocalOver] = useState(false);
  const [localWon, setLocalWon] = useState(false);

  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const adapterRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // Normalize game object properties (n -> title, thumb -> thumbnail) - Memoized to prevent infinite re-launch
  const normalizedGame = React.useMemo(() => {
    if (!game) return null;
    let url = game.launchUrl || game.url || `/games/${game.id}/index.html`;
    if (game.id === 'afterhours' && !url.includes('autoplay=true')) {
      url += (url.includes('?') ? '&' : '?') + 'autoplay=true';
    }
    return {
      ...game,
      title: game.title || game.n || 'Arcade Game',
      thumbnail: game.thumbnail || game.thumb || '',
      category: game.category || game.cat || 'Arcade',
      launchUrl: url,
      distributionStatus: game.distributionStatus || 'AVAILABLE',
      licenseStatus: game.licenseStatus || 'VERIFIED_OPEN_SOURCE'
    };
  }, [game?.id, game?.launchUrl, game?.title, game?.thumb, game?.thumbnail]);

  // WebRTC Connection for real-time duel, cameras, and data sync
  const isChallenge = activeMode === 'CHALLENGE';
  const webrtc = useWebRTC(roomId, currentUsername, SIGNALING_URL, { autoStartMedia: isChallenge });

  // STRICT REQUIREMENT: Prevent game controls (Arrows, Space, WASD) from scrolling the webpage
  useEffect(() => {
    const handlePreventPageScroll = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        if (e.target && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handlePreventPageScroll, { passive: false });
    return () => window.removeEventListener('keydown', handlePreventPageScroll);
  }, []);

  // Lock body overflow strictly while GameShell is mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Launch game session via sandboxed provider adapter
  const launchGame = useCallback(async () => {
    setLoading(true);
    setLaunchError(null);

    if (adapterRef.current) {
      adapterRef.current.destroy();
      adapterRef.current = null;
    }

    if (!normalizedGame) {
      setLaunchError(new GameLaunchError('No game metadata provided', 'ERR_NULL_GAME'));
      setLoading(false);
      return;
    }

    try {
      const adapter = getGameProviderAdapter(normalizedGame);
      adapterRef.current = adapter;

      if (!viewportRef.current) {
        throw new GameLaunchError('Game viewport container not ready', 'ERR_NO_VIEWPORT');
      }

      viewportRef.current.innerHTML = '';

      await adapter.launch(viewportRef.current, {
        onLoaded: () => setLoading(false),
        onError: (err) => {
          setLoading(false);
          setLaunchError(err);
        }
      });
    } catch (err) {
      setLoading(false);
      setLaunchError(err instanceof GameLaunchError ? err : new GameLaunchError(err.message, 'ERR_UNEXPECTED'));
    }
  }, [normalizedGame]);

  useEffect(() => {
    launchGame();

    return () => {
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [launchGame]);

  // Fullscreen Management via native browser API on the top-level game shell root
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      setIsFullscreen(true);
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch((err) => {
          console.warn('Native requestFullscreen API skipped/blocked, utilizing CSS arcade fullscreen fallback.');
        });
      }
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('Exit Fullscreen caught:', err);
        });
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Synchronized Countdown: 3, 2, 1, GO! -> Split Screen Opens
  const startCountdownSequence = useCallback(() => {
    let currentStep = 3;
    setCountdown(currentStep);

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      currentStep -= 1;
      if (currentStep > 0) {
        setCountdown(currentStep);
      } else if (currentStep === 0) {
        setCountdown('GO!');
        setChallengeStarted(true);
        setLocalOver(false);
        setLocalWon(false);
        setLocalScore(0);
      } else {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
      }
    }, 1000);
  }, []);

  // When challenge starts, launch game into the newly mounted split viewport
  useEffect(() => {
    if (challengeStarted) {
      const timer = setTimeout(() => {
        launchGame();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [challengeStarted, launchGame]);

  // When readiness aligns or socket trigger received
  useEffect(() => {
    if (activeMode === 'CHALLENGE' && isLocalReady && webrtc.peerReady && countdown === null && !challengeStarted) {
      startCountdownSequence();
    }
  }, [activeMode, isLocalReady, webrtc.peerReady, countdown, challengeStarted, startCountdownSequence]);

  useEffect(() => {
    if (webrtc.challengeCountdown && countdown === null && !challengeStarted) {
      startCountdownSequence();
    }
  }, [webrtc.challengeCountdown, countdown, challengeStarted, startCountdownSequence]);

  // Listen for iframe game state postMessages (scores, tile grids, game over, game won)
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data || event.data.type !== 'COPLAY_GAME_SYNC') return;

      const { payload } = event.data;
      if (!payload) return;

      if (typeof payload.score === 'number') {
        setLocalScore(payload.score);
        webrtc.sendScore(payload.score);
      }

      if (payload.board) {
        webrtc.sendBoardUpdate(payload.board);
      }

      if (payload.over) {
        setLocalOver(true);
        webrtc.sendEliminated();
      }

      if (payload.won) {
        setLocalWon(true);
        webrtc.sendVictory();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [webrtc]);

  // Construct structured opponents array for Split-Screen Arena
  const opponents = Object.entries(webrtc.remoteStreams).map(([peerId, streamData]) => {
    const peerScore = webrtc.peerScores?.[peerId] ?? 0;
    const peerBoard = webrtc.peerBoards?.[peerId] ?? null;
    const isEliminated = Boolean(webrtc.peerEliminated?.[peerId]);
    const isWinner = webrtc.peerWon === peerId;

    return {
      id: peerId,
      username: streamData.username || 'Opponent',
      stream: streamData.stream,
      score: peerScore,
      board: peerBoard,
      isEliminated,
      isWinner,
      micEnabled: streamData.micEnabled,
      cameraEnabled: streamData.cameraEnabled
    };
  });

  const handleEnterDuelArena = () => {
    setShowChallengeModal(false);
    setActiveMode('CHALLENGE');
    setIsLocalReady(false);
  };

  const handleLeaveSession = () => {
    if (activeMode === 'CHALLENGE') {
      setActiveMode('SINGLE_PLAYER');
      setChallengeStarted(false);
      setIsLocalReady(false);
      setCountdown(null);
      launchGame();
    } else {
      onClose();
    }
  };

  const handleToggleReady = () => {
    const nextState = !isLocalReady;
    setIsLocalReady(nextState);
    webrtc.sendChallengeReady(nextState);
  };

  const handlePlayAgain = () => {
    setIsLocalReady(false);
    setChallengeStarted(false);
    setLocalOver(false);
    setLocalWon(false);
    setLocalScore(0);
    launchGame();
  };

  const connectedPeerCount = Object.keys(webrtc.remoteStreams).length;

  return (
    <div className={`game-shell-root fade-in ${isFullscreen ? 'is-fullscreen' : ''}`} ref={containerRef}>
      {/* ── Top Game Header Bar (Matches Reference Design: Back to Overview | Afterhours | Solo | Invite friend) ── */}
      <GameHeader
        game={normalizedGame}
        mode={activeMode}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onClose={onClose}
        roomId={roomId}
        onOpenChallenge={() => setShowPlayWithFriendModal(true)}
        hasActiveSession={activeMode === 'CHALLENGE'}
      />

      {/* ── Main Gameplay Body (Universal Monitor Stage + Collapsible Right Social Rail) ── */}
      <div className={`game-shell-body ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
        <div className="game-stage-column">
          <GameViewport
            game={normalizedGame}
            viewportRef={viewportRef}
            loading={loading}
            launchError={launchError}
            onRetry={launchGame}
            onBack={onClose}
            countdown={countdown}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onOpenChallenge={() => setShowPlayWithFriendModal(true)}
            onOpenLeaderboard={() => setShowLeaderboardModal(true)}
            isSplitArena={activeMode === 'CHALLENGE' && challengeStarted}
            currentUsername={currentUsername}
            localScore={localScore}
            localOver={localOver}
            localWon={localWon}
            opponents={opponents}
            onPlayAgain={handlePlayAgain}
          />
        </div>

        {/* ── Clean Arrow Collapse Control on the Right Edge of Gameplay Area ── */}
        {!isFullscreen && (
          <button
            type="button"
            className={`btn-sidebar-collapse-tab ${isSidebarOpen ? 'is-open' : 'is-closed'}`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? "Collapse Party & Chat Sidebar" : "Open Party & Chat Sidebar"}
            aria-label={isSidebarOpen ? "Collapse Party & Chat Sidebar" : "Open Party & Chat Sidebar"}
          >
            <ChevronRight size={18} className={`collapse-chevron-icon ${!isSidebarOpen ? 'is-reversed' : ''}`} />
          </button>
        )}

        {/* ── Right-Side Social Rail (Collapsible, Preserving Connection State) ── */}
        {!isFullscreen && (
          <div className={`game-social-rail-container ${!isSidebarOpen ? 'is-collapsed' : ''}`}>
            <GameSocialRail
              roomId={roomId}
              currentUsername={currentUsername}
              userProfile={profile}
              localStream={webrtc.localStream}
              remoteStreams={webrtc.remoteStreams}
              micEnabled={webrtc.micEnabled}
              cameraEnabled={webrtc.cameraEnabled}
              isScreenSharing={webrtc.isScreenSharing}
              connected={webrtc.connected}
              connectionState={webrtc.connectionState}
              peerConnectionStates={webrtc.peerConnectionStates}
              chatMessages={webrtc.chatMessages}
              onToggleMic={webrtc.toggleMic}
              onToggleCamera={webrtc.toggleCamera}
              onToggleScreenShare={webrtc.toggleScreenShare}
              onSendMessage={webrtc.sendChatMessage}
              onLeaveSession={handleLeaveSession}
              onOpenInviteFriend={() => setShowPlayWithFriendModal(true)}
              onOpenDirectMessages={() => setIsSocialModalOpen(true)}
              videoLayoutMode={videoLayoutMode}
              onToggleVideoLayout={() => setVideoLayoutMode(prev => prev === 'COMBINED' ? 'SEPARATE' : 'COMBINED')}
            />
          </div>
        )}
      </div>

      {/* ── Floating Camera Overlay (Used in Separate Mode or when Sidebar is Collapsed) ── */}
      {webrtc.cameraEnabled && (videoLayoutMode === 'SEPARATE' || !isSidebarOpen) && (
        <DraggableCameraOverlay
          localStream={webrtc.localStream}
          remoteStreams={webrtc.remoteStreams}
          currentUsername={currentUsername}
          micEnabled={webrtc.micEnabled}
          cameraEnabled={webrtc.cameraEnabled}
          onToggleMic={webrtc.toggleMic}
          onToggleCamera={webrtc.toggleCamera}
          onClose={webrtc.toggleCamera}
        />
      )}

      {/* ── Challenge Room Invitation Modal ── */}
      {showChallengeModal && (
        <ChallengeModal
          game={normalizedGame}
          roomId={roomId}
          onClose={() => setShowChallengeModal(false)}
          onStartDuel={handleEnterDuelArena}
          connectedPeerCount={connectedPeerCount}
        />
      )}

      {/* ── Play With Friend / Invite Modal ── */}
      {showPlayWithFriendModal && (
        <PlayWithFriendModal
          game={normalizedGame}
          onClose={() => setShowPlayWithFriendModal(false)}
          onJoinRoom={(newRoomCode) => {
            setShowPlayWithFriendModal(false);
            setRoomId(newRoomCode);
            setActiveMode('CHALLENGE');
            setIsLocalReady(false);
          }}
          currentRoomId={roomId}
          connectedPeers={opponents}
        />
      )}

      {/* ── Leaderboard Modal ── */}
      {showLeaderboardModal && (
        <LeaderboardModal
          game={normalizedGame}
          onClose={() => setShowLeaderboardModal(false)}
          currentScore={localScore}
        />
      )}

      {/* ── Profile & Social Overlays ── */}
      {showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {isSocialModalOpen && (
        <FriendsModal
          isOpen={isSocialModalOpen}
          onClose={() => setIsSocialModalOpen(false)}
        />
      )}
    </div>
  );
}
