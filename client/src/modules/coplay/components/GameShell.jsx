import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGameProviderAdapter, GameLaunchError } from '../services/GameProviderAdapter.js';
import { GameMode } from '../gameSchema.js';
import { useWebRTC } from '../../../core/useWebRTC.js';
import GameHeader from './GameHeader.jsx';
import GameViewport from './GameViewport.jsx';
import GameInfo from './GameInfo.jsx';
import GameSocialRail from './GameSocialRail.jsx';
import ChallengeModal from './ChallengeModal.jsx';
import GameResultOverlay from './GameResultOverlay.jsx';
import './GameShell.css';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';

/**
 * GameSocialRailContainer
 * Isolated wrapper that executes useWebRTC ONLY when challenge/social mode is active.
 * Guarantees zero camera prompts and zero socket overhead during default single-player sessions.
 */
function GameSocialRailContainer({
  roomId,
  username,
  isChallengeMode,
  isLocalReady,
  onToggleReady,
  onLeaveSession,
  onPeerReadyChange,
  onCountdownTrigger,
  onPeerScoreChange
}) {
  const webrtc = useWebRTC(roomId, username, SIGNALING_URL);

  useEffect(() => {
    if (onPeerReadyChange) {
      onPeerReadyChange(webrtc.peerReady);
    }
  }, [webrtc.peerReady, onPeerReadyChange]);

  useEffect(() => {
    if (webrtc.challengeCountdown && onCountdownTrigger) {
      onCountdownTrigger(webrtc.challengeCountdown);
    }
  }, [webrtc.challengeCountdown, onCountdownTrigger]);

  useEffect(() => {
    if (webrtc.peerScore && onPeerScoreChange) {
      onPeerScoreChange(webrtc.peerScore);
    }
  }, [webrtc.peerScore, onPeerScoreChange]);

  const handleToggleReady = () => {
    const nextState = !isLocalReady;
    onToggleReady(nextState);
    webrtc.sendChallengeReady(nextState);
  };

  return (
    <GameSocialRail
      roomId={roomId}
      currentUsername={username}
      localStream={webrtc.localStream}
      remoteStreams={webrtc.remoteStreams}
      micEnabled={webrtc.micEnabled}
      cameraEnabled={webrtc.cameraEnabled}
      isScreenSharing={webrtc.isScreenSharing}
      connected={webrtc.connected}
      chatMessages={webrtc.chatMessages}
      onToggleMic={webrtc.toggleMic}
      onToggleCamera={webrtc.toggleCamera}
      onToggleScreenShare={webrtc.toggleScreenShare}
      onSendMessage={webrtc.sendChatMessage}
      onLeaveSession={onLeaveSession}
      isChallengeMode={isChallengeMode}
      isLocalReady={isLocalReady}
      isPeerReady={webrtc.peerReady}
      onToggleReady={handleToggleReady}
    />
  );
}

/**
 * GameShell
 * The core production gameplay environment for CoGether.
 * Architectural hierarchy:
 * 1. ACTUAL GAME (centered hero container, 65-80% viewport)
 * 2. Top Header (compact, verified metadata, native fullscreen, exit confirmation)
 * 3. Social Layer (dedicated non-overlapping rail, 100% hidden in default single-player)
 * 4. Game Info (minimal, clean metadata below the game)
 */
export default function GameShell({
  game,
  onClose,
  initialMode = 'SINGLE_PLAYER', // 'SINGLE_PLAYER' | 'CHALLENGE'
  initialRoomId = null,
  currentUsername = 'Player'
}) {
  const [activeMode, setActiveMode] = useState(initialMode);
  const [roomId, setRoomId] = useState(() => initialRoomId || 'duel-' + Math.floor(1000 + Math.random() * 9000));
  const [loading, setLoading] = useState(true);
  const [launchError, setLaunchError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  // Challenge Sync State
  const [isLocalReady, setIsLocalReady] = useState(false);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [resultData, setResultData] = useState(null);

  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const adapterRef = useRef(null);
  const countdownTimerRef = useRef(null);

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

  // Fullscreen Management via native browser API
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

  // Challenge Synchronized Countdown: 3, 2, 1, GO!
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
        // Restart/re-focus game instance cleanly for both players
        launchGame();
      } else {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
      }
    }, 1000);
  }, [launchGame]);

  // When both players are ready, trigger countdown
  useEffect(() => {
    if (activeMode === 'CHALLENGE' && isLocalReady && isPeerReady && countdown === null) {
      startCountdownSequence();
    }
  }, [activeMode, isLocalReady, isPeerReady, countdown, startCountdownSequence]);

  const handleOpenChallenge = () => {
    setShowChallengeModal(true);
  };

  const handleEnterDuelArena = () => {
    setShowChallengeModal(false);
    setActiveMode('CHALLENGE');
  };

  const handleLeaveSession = () => {
    setActiveMode('SINGLE_PLAYER');
    setIsLocalReady(false);
    setIsPeerReady(false);
    setResultData(null);
  };

  const handlePlayAgain = () => {
    setResultData(null);
    setIsLocalReady(false);
    setIsPeerReady(false);
    launchGame();
  };

  return (
    <div className={`game-shell-root fade-in ${isFullscreen ? 'is-fullscreen' : ''}`} ref={containerRef}>
      {/* ── Top Game Header (Compact 52px) ── */}
      <GameHeader
        game={game}
        mode={activeMode}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onClose={onClose}
        onOpenChallenge={handleOpenChallenge}
        hasActiveSession={activeMode === 'CHALLENGE'}
      />

      {/* ── Main Gameplay Body (Game Hero + Optional Social Rail) ── */}
      <div className="game-shell-body">
        <div className="game-stage-column">
          {/* Centered Game Viewport (Dominant 65-80% area) */}
          <GameViewport
            game={game}
            viewportRef={viewportRef}
            loading={loading}
            launchError={launchError}
            onRetry={launchGame}
            onBack={onClose}
            countdown={countdown}
            isFullscreen={isFullscreen}
            resultOverlay={
              resultData ? (
                <GameResultOverlay
                  isChallenge={activeMode === 'CHALLENGE'}
                  playerName={currentUsername}
                  peerName="Opponent"
                  playerScore={resultData.playerScore}
                  peerScore={resultData.peerScore}
                  winner={resultData.winner}
                  onPlayAgain={handlePlayAgain}
                  onBackToArcade={onClose}
                />
              ) : null
            }
          />

          {/* Minimal Info Tray (Below game, hidden in fullscreen) */}
          {!isFullscreen && <GameInfo game={game} />}
        </div>

        {/* ── Non-Overlapping Social Rail (Mounted ONLY in Challenge Mode) ── */}
        {activeMode === 'CHALLENGE' && (
          <GameSocialRailContainer
            roomId={roomId}
            username={currentUsername}
            isChallengeMode={true}
            isLocalReady={isLocalReady}
            onToggleReady={setIsLocalReady}
            onLeaveSession={handleLeaveSession}
            onPeerReadyChange={setIsPeerReady}
            onCountdownTrigger={startCountdownSequence}
            onPeerScoreChange={(scoreData) => {
              setResultData((prev) => ({
                ...prev,
                peerScore: scoreData.score,
                winner: scoreData.score > (prev?.playerScore || 0) ? 'Opponent' : currentUsername
              }));
            }}
          />
        )}
      </div>

      {/* ── Challenge Room Invitation Modal ── */}
      {showChallengeModal && (
        <ChallengeModal
          game={game}
          roomId={roomId}
          onClose={() => setShowChallengeModal(false)}
          onStartDuel={handleEnterDuelArena}
          connectedPeerCount={isPeerReady ? 1 : 0}
        />
      )}
    </div>
  );
}
