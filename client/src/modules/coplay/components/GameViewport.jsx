import React, { useState } from 'react';
import { 
  Maximize2, Minimize2, RotateCw, 
  AlertOctagon, ArrowLeft, ShieldCheck
} from 'lucide-react';
import CoGetherButton from './CoGetherButton.jsx';
import GameSplitArena from './GameSplitArena.jsx';
import './GameViewport.css';

/**
 * Universal Game Monitor Player (GameViewport)
 * Hardware-accelerated, high-fidelity straight-facing PC/TV monitor.
 * Matches exact reference design (Image 1 + Image 2):
 * - Widescreen (16:10 / 16:9) aspect ratio, wide and tall, fills available stage space
 * - Sleek curved outer chassis corners (border-radius: 24px)
 * - Display screen with smoothly curved bottom-left and bottom-right corners (border-radius: 16px)
 * - Micro-millimeter perfect edge-to-edge game iframe fitting with zero black bars or sharp lines
 * - Centered stand neck and pedestal base with soft drop shadow
 * - Translucent cyan fullscreen icon button at bottom right (no text)
 * - Seamless edge-to-edge full window expansion in fullscreen mode
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
  const displayTitle = game?.title?.replace(/\(Official Open-Source\)/i, '').replace(/— Open Source/i, '').trim() || game?.n || 'Arcade Game';

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
          {/* ── CoGether Universal PC Monitor Assembly ── */}
          <div className={`cogether-universal-monitor ${isFullscreen ? 'is-fullscreen' : ''}`}>
            
            {/* Physical Monitor Assembly (Frame, Display Screen, Stand Neck & Base) */}
            <div className="pc-monitor-assembly">
              {/* Outer Monitor Chassis Bezel Frame (Curved corners on all sides) */}
              <div className="pc-monitor-bezel-frame">
                
                {/* The Active Display Screen (Nested precisely with curved corners matching bezel) */}
                <div className={`pc-monitor-screen-display ${isFullscreen ? 'is-fullscreen-mount' : ''}`}>
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

                  {/* Floating Translucent Fullscreen Icon Button (Image 2 style: rounded cyan square with arrows) */}
                  <button
                    type="button"
                    className="btn-screen-fullscreen-pill"
                    onClick={onToggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
              </div>

              {/* Monitor Stand Neck */}
              {!isFullscreen && <div className="pc-monitor-stand-neck" />}

              {/* Monitor Stand Base (Curved corners, bevel highlight, drop shadow) */}
              {!isFullscreen && <div className="pc-monitor-stand-base" />}
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
