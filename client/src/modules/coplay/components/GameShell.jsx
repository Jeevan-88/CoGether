import React, { useState, useEffect, useRef, useCallback } from 'react';
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
 * GameShell
 * The core production gameplay environment for CoGether.
 * Matches CoGether reference design:
 * 1. Global AppNavShell (CO-WATCH, CO-PLAY, CO-SHOP, CO-STUDY, Search, Bell, Profile)
 * 2. GameHeader (< BACK TO ARCADE | 2048 | CHALLENGE FRIEND | Fullscreen)
 * 3. Elevated Game Canvas with floating bottom-left info dock (2048, Puzzle, Heart, Leaderboard)
 * 4. Dedicated Right Social Rail (Party Room with Room Code, Invite Friend, Participant List with Host Crown, and Live Chat)
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

  // WebRTC Connection for real-time duel, cameras, and data sync
  const isChallenge = activeMode === 'CHALLENGE';
  const webrtc = useWebRTC(roomId, currentUsername, SIGNALING_URL, { autoStartMedia: isChallenge });

  // Launch game session via sandboxed provider adapter
  const launchGame = useCallback(async () => {
    setLoading(true);
    setLaunchError(null);

    if (adapterRef.current) {
      adapterRef.current.destroy();
      adapterRef.current = null;
    }

    if (!game) {
      setLaunchError(new GameLaunchError('No game metadata provided', 'ERR_NULL_GAME'));
      setLoading(false);
      return;
    }

    try {
      const adapter = getGameProviderAdapter(game);
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
  }, [game]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

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

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn('Native Fullscreen failed:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit Fullscreen failed:', err);
      });
      setIsFullscreen(false);
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
      {/* ── Top Unified App Navigation Shell (Matches Reference Design) ── */}
      {!isFullscreen && (
        <AppNavShell
          activeService="coplay"
          onSelectService={onSelectService}
          onBackToHome={onBackToHome || onClose}
          user={user}
          profile={profile}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenSocial={() => setIsSocialModalOpen(true)}
          unreadCount={unreadSummary?.totalUnread || 0}
        />
      )}

      {/* ── Top Game Header Bar (Matches Reference Design) ── */}
      <GameHeader
        game={game}
        mode={activeMode}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onClose={onClose}
        roomId={roomId}
        onOpenChallenge={() => setShowPlayWithFriendModal(true)}
        hasActiveSession={activeMode === 'CHALLENGE'}
      />

      {/* ── Main Gameplay Body (Game Stage + Right Social Rail) ── */}
      <div className="game-shell-body">
        <div className="game-stage-column">
          <GameViewport
            game={game}
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

        {/* ── Right-Side Social Rail (Matches Reference Image) ── */}
        {!isFullscreen && (
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
          />
        )}
      </div>

      {/* ── Floating Camera Overlay ── */}
      {webrtc.cameraEnabled && (
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
          game={game}
          roomId={roomId}
          onClose={() => setShowChallengeModal(false)}
          onStartDuel={handleEnterDuelArena}
          connectedPeerCount={connectedPeerCount}
        />
      )}

      {/* ── Play With Friend / Invite Modal ── */}
      {showPlayWithFriendModal && (
        <PlayWithFriendModal
          game={game}
          onClose={() => setShowPlayWithFriendModal(false)}
          onJoinRoom={(newRoomCode) => {
            setShowPlayWithFriendModal(false);
            setRoomId(newRoomCode);
            setActiveMode('CHALLENGE');
          }}
        />
      )}

      {/* ── Leaderboard & Stats Modal ── */}
      {showLeaderboardModal && (
        <LeaderboardModal
          game={game}
          onClose={() => setShowLeaderboardModal(false)}
        />
      )}

      {/* ── Friends & Messaging Modal ── */}
      {isSocialModalOpen && (
        <FriendsModal
          onClose={() => setIsSocialModalOpen(false)}
          onLaunchGameDuel={() => {
            setIsSocialModalOpen(false);
            setShowPlayWithFriendModal(true);
          }}
        />
      )}

      {/* ── Profile & Member Card Modal ── */}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
}
