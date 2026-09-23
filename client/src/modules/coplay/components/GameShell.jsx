import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGameProviderAdapter, GameLaunchError } from '../services/GameProviderAdapter.js';
import { GameMode } from '../gameSchema.js';
import { useWebRTC } from '../../../core/useWebRTC.js';
import GameHeader from './GameHeader.jsx';
import GameViewport from './GameViewport.jsx';
import GameSocialRail from './GameSocialRail.jsx';
import ChallengeModal from './ChallengeModal.jsx';
import DraggableCameraOverlay from './DraggableCameraOverlay.jsx';
import { getSignalingUrl } from '../../../core/signalingConfig.js';
import './GameShell.css';

const SIGNALING_URL = getSignalingUrl();

/**
 * GameShell
 * The core production gameplay environment for CoGether.
 * Features:
 * 1. Sandboxed Game runtime
 * 2. Seamless transition to Split-Screen Arena on challenge start (up to 3 players)
 * 3. Real-time board sync & automated win/loss resolution
 * 4. Advanced Camera Overlay (Grouped, Separate, Merged with virtual background) visible in both normal & fullscreen mode
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

      const { score = 0, over = false, won = false, grid = [] } = event.data;
      setLocalScore(score);
      if (over) setLocalOver(true);
      if (won) setLocalWon(true);

      if (activeMode === 'CHALLENGE') {
        webrtc.sendChallengeBoardSync({ score, over, won, grid });
        webrtc.sendChallengeScore(score, Boolean(over || won));
        if (over) webrtc.sendPlayerEliminated(score);
        if (won) webrtc.sendPlayerWon(score);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeMode, webrtc]);

  const [isPractice, setIsPractice] = useState(false);
  const [practiceOpponent, setPracticeOpponent] = useState(null);

  const handleStartPracticeDuel = () => {
    setIsPractice(true);
    setPracticeOpponent({
      id: 'ghost_arcade',
      username: 'ArcadeBot_99',
      score: 128,
      grid: [
        [null, null, null, { value: 2 }],
        [null, { value: 4 }, null, null],
        [{ value: 8 }, null, { value: 16 }, null],
        [null, null, { value: 32 }, { value: 64 }]
      ],
      over: false,
      won: false
    });
    startCountdownSequence();
  };

  useEffect(() => {
    if (!isPractice || !challengeStarted) return;
    const botTimer = setInterval(() => {
      setPracticeOpponent((prev) => {
        if (!prev || prev.over || prev.won) return prev;
        const newScore = prev.score + Math.floor(Math.random() * 8 + 4) * 4;
        return {
          ...prev,
          score: newScore,
          grid: [
            [null, null, { value: 2 }, { value: 4 }],
            [null, { value: 4 }, null, { value: 8 }],
            [{ value: 16 }, null, { value: 32 }, null],
            [null, { value: 64 }, { value: 128 }, { value: 256 }]
          ]
        };
      });
    }, 2800);
    return () => clearInterval(botTimer);
  }, [isPractice, challengeStarted]);

  // Construct opponents array for Split Screen
  const opponents = Object.entries(webrtc.remoteStreams).map(([id, peer]) => {
    const board = webrtc.peerBoards[id] || {};
    const eliminated = webrtc.peerEliminated[id];
    const won = webrtc.peerWon?.peerId === id;
    return {
      id,
      username: peer.username || board.username || 'Opponent',
      score: eliminated ? eliminated.score : (board.score || 0),
      grid: board.grid || [],
      over: Boolean(eliminated || board.over),
      won: Boolean(won || board.won)
    };
  });

  if (opponents.length === 0 && isPractice && practiceOpponent) {
    opponents.push(practiceOpponent);
  }

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
    setChallengeStarted(false);
    setIsPractice(false);
    setPracticeOpponent(null);
    setLocalOver(false);
    setLocalWon(false);
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

      {/* ── Main Gameplay Body (Game Hero / Split Screen + Right Social Rail) ── */}
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
            onOpenChallenge={handleOpenChallenge}
            isSplitArena={activeMode === 'CHALLENGE' && challengeStarted}
            currentUsername={currentUsername}
            localScore={localScore}
            localOver={localOver}
            localWon={localWon}
            opponents={opponents}
            onPlayAgain={handlePlayAgain}
          />
        </div>

        {/* ── Right-Side Social Rail (Always active in Challenge Mode) ── */}
        {!isFullscreen && activeMode === 'CHALLENGE' && (
          <GameSocialRail
            roomId={roomId}
            currentUsername={currentUsername}
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
            isChallengeMode={true}
            isLocalReady={isLocalReady}
            isPeerReady={webrtc.peerReady}
            onToggleReady={handleToggleReady}
            onStartPracticeDuel={handleStartPracticeDuel}
          />
        )}
      </div>

      {/* ── Advanced Floating Camera Overlay (Visible in BOTH normal & fullscreen modes) ── */}
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

      {/* ── Challenge Room Invitation Modal (up to 3 players) ── */}
      {showChallengeModal && (
        <ChallengeModal
          game={game}
          roomId={roomId}
          onClose={() => setShowChallengeModal(false)}
          onStartDuel={handleEnterDuelArena}
          connectedPeerCount={connectedPeerCount}
        />
      )}
    </div>
  );
}
