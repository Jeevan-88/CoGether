import React, { useState, useEffect } from 'react';
import { 
  Maximize2, Minimize2, RotateCw, 
  Heart, AlertOctagon, ArrowLeft, ShieldCheck, BarChart2, Eye, Video
} from 'lucide-react';
import CoGetherButton from './CoGetherButton.jsx';
import GameSplitArena from './GameSplitArena.jsx';
import './GameViewport.css';

/**
 * Universal Game Monitor Player (GameViewport)
 * Reuses the CoGether 3D PC monitor design from the homepage landing page.
 * Keeps the physical monitor appearance, proportions, frame, bezel, and stand.
 * In fullscreen mode, the screen display expands to fill the entire laptop display,
 * removing the monitor stand and webpage margins edge-to-edge.
 */
export default function GameViewport({
  game,
  viewportRef,
  loading = false,
  launchError = null,
  onRetry,
  onBack,
  countdown = null,
  isFullscreen = false,
  onToggleFullscreen,
  onOpenChallenge,
  onOpenLeaderboard,
  resultOverlay = null,
  isSplitArena = false,
  currentUsername = 'You',
  localScore = 0,
  localOver = false,
  localWon = false,
  opponents = [],
  onPlayAgain
}) {
  const [isLiked, setIsLiked] = useState(false);
  const [inGameCameraMode, setInGameCameraMode] = useState('THIRD'); // 'THIRD' | 'FIRST'

  const displayTitle = game?.title?.replace(/\(Official Open-Source\)/i, '').replace(/— Open Source/i, '').trim() || game?.n || 'Arcade Game';
  const displayCategory = game?.category 
    ? (game.category.charAt(0).toUpperCase() + game.category.slice(1).toLowerCase()) 
    : (game?.cat || 'Action & 3D Escapes');

  // Only games that support 3D camera modes (like Afterhours) show the in-game camera toggle
  const supportsCameraMode = game?.id === 'afterhours' || game?.has3DCamera || game?.features?.includes?.('camera');

  // Listen to camera mode change messages from game iframe
  useEffect(() => {
    const handleMsg = (e) => {
      if (e.data && e.data.type === 'COPLAY_CAMERA_MODE_CHANGED') {
        if (e.data.mode) setInGameCameraMode(e.data.mode);
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, []);

  const handleToggleCameraMode = () => {
    const iframe = viewportRef?.current?.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'COPLAY_TOGGLE_CAMERA_MODE' }, '*');
    }
    setInGameCameraMode(prev => prev === 'THIRD' ? 'FIRST' : 'THIRD');
  };

  return (
    <div className={`game-viewport-stage ${isFullscreen ? 'stage-fullscreen' : ''}`}>
      {isSplitArena ? (
        <GameSplitArena
          game={game}
          localViewportRef={viewportRef}
          currentUsername={currentUsername}
          localScore={localScore}
          localOver={localOver}
          localWon={localWon}
          opponents={opponents}
          onPlayAgain={onPlayAgain}
          onBackToArcade={onBack}
        />
      ) : (
        <div className="universal-monitor-stage">
          {/* ── CoGether Universal 3D PC Monitor Frame ── */}
          <div className={`cogether-universal-monitor ${isFullscreen ? 'is-fullscreen' : ''}`}>
            
            {/* Physical Monitor Chassis Assembly (Artwork with Frame & Stand) */}
            <div className="cogether-monitor-chassis">
              {!isFullscreen && (
                <img
                  src="/pc_monitor_straight_transparent.png"
                  alt="CoGether Physical Straight 3D Monitor"
                  className="cogether-monitor-chassis-art"
                  draggable={false}
                />
              )}

              {/* The Active Display Screen (Nested precisely within the monitor bezel) */}
              <div className="cogether-monitor-screen-bezel">
                {/* Actual Sandboxed Game Iframe Mount Slot */}
                <div
                  ref={viewportRef}
                  className={`game-iframe-mount-point ${launchError ? 'has-error' : ''}`}
                />

                {/* Arcade Loading Scrim */}
                {loading && !launchError && (
                  <div className="game-loading-scrim fade-in">
                    <div className="loading-card-arcade">
                      {(game?.thumbnail || game?.thumb) && (
                        <div className="loading-thumbnail-wrap">
                          <img
                            src={game.thumbnail || game.thumb}
                            alt={displayTitle}
                            className="loading-thumbnail-img"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div className="loading-meta-info">
                        <span className="loading-title">{displayTitle}</span>
                        <span className="loading-sub">INITIALIZING SECURE SANDBOX...</span>
                      </div>
                      <div className="loading-bar-track">
                        <div className="loading-bar-fill" />
                      </div>
                      <div className="loading-badge-row">
                        <ShieldCheck size={13} className="shield-icon" />
                        <span>ISOLATED COGETHER RUNTIME</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Synchronized Challenge Countdown (3-2-1-GO) */}
                {countdown !== null && (
                  <div className="game-countdown-scrim fade-in">
                    <div className="countdown-number-bounce" key={countdown}>
                      {countdown}
                    </div>
                    <span className="countdown-subtext">GET READY!</span>
                  </div>
                )}

                {/* Game Result / Game Over Overlay */}
                {resultOverlay}

                {/* Launch Error Recovery Deck */}
                {launchError && (
                  <div className="game-unavailable-error-card fade-in">
                    <div className="error-icon-shield">
                      <AlertOctagon size={42} />
                    </div>
                    <h2 className="error-headline">GAME UNAVAILABLE</h2>
                    <p className="error-subtext">We couldn't launch this game right now.</p>

                    <div className="error-reason-box">
                      <span className="error-code-badge">{launchError.code || 'ERR_LAUNCH_FAILED'}</span>
                      <p className="error-message">{launchError.message}</p>
                    </div>

                    <div className="error-actions-deck">
                      <CoGetherButton
                        variant="primary"
                        onClick={onRetry}
                        icon={RotateCw}
                      >
                        RETRY LAUNCH
                      </CoGetherButton>
                      <CoGetherButton
                        variant="secondary"
                        onClick={onBack}
                        icon={ArrowLeft}
                      >
                        BACK TO ARCADE
                      </CoGetherButton>
                    </div>
                  </div>
                )}
                {/* Floating Translucent Fullscreen Icon Button (Opaque on screen, icon only, no text) */}
                <button
                  type="button"
                  className="btn-screen-fullscreen-pill"
                  onClick={onToggleFullscreen}
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                {/* Floating Camera Mode Toggle Pill (3D Games like Afterhours only) */}
                {supportsCameraMode && (
                  <button
                    type="button"
                    className="btn-screen-camera-pill"
                    onClick={handleToggleCameraMode}
                    title={inGameCameraMode === 'FIRST' ? "Switch to 3rd-Person Chase Cam" : "Switch to 1st-Person Eye Cam"}
                    aria-label="Switch Camera Mode"
                  >
                    {inGameCameraMode === 'FIRST' ? <Eye size={17} /> : <Video size={17} />}
                  </button>
                )}
              </div>
            </div>

            {/* ── Floating Exit Fullscreen Control (Fullscreen Mode Only) ── */}
            {isFullscreen && (
              <button
                type="button"
                className="btn-floating-exit-fullscreen fade-in"
                onClick={onToggleFullscreen}
                title="Exit Fullscreen (Esc)"
                aria-label="Exit Fullscreen (Esc)"
              >
                <Minimize2 size={16} />
                <span>EXIT FULLSCREEN</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
