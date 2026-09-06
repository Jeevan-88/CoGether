import React from 'react';
import { RotateCw, ArrowLeft, AlertOctagon, ShieldCheck, Keyboard } from 'lucide-react';
import CoGetherButton from './CoGetherButton.jsx';
import './GameViewport.css';

/**
 * GameViewport
 * The central physical arcade stage for CoGether gameplay.
 * 3-Layer Physical Neomorphic Architecture:
 * - Layer 1: Dark Page Backdrop
 * - Layer 2: Raised Arcade Yellow Neomorphic Stage (--cog-neo-stage-raised)
 * - Layer 3: Recessed Dark Inset Game Frame (--cog-neo-frame-inset)
 * - Layer 4: Live Sandboxed Game Canvas
 * 
 * Fits strictly within viewport height (zero page scrolling).
 */
export default function GameViewport({
  game,
  viewportRef,
  loading,
  launchError,
  onRetry,
  onBack,
  countdown = null, // e.g. 3, 2, 1, 'GO!'
  resultOverlay = null,
  isFullscreen = false
}) {
  const isPortrait = game?.orientation === 'portrait';
  const frameAspectClass = isPortrait ? 'frame-aspect-portrait' : 'frame-aspect-standard';

  return (
    <div className={`game-viewport-stage ${isFullscreen ? 'stage-fullscreen' : ''}`}>
      {/* ── LAYER 2: Large Yellow Neomorphic Stage ── */}
      <div className="yellow-neomorphic-stage">
        {/* Physical Cabinet Header Accent */}
        <div className="stage-cabinet-header">
          <div className="cabinet-louver-strip" aria-hidden="true" />
          <span className="cabinet-model-text">COGETHER ARCADE • STAGE 1</span>
          <div className="cabinet-louver-strip" aria-hidden="true" />
        </div>

        {/* ── LAYER 3: Dark Recessed Inset Game Frame ── */}
        <div className={`inset-game-frame ${frameAspectClass}`}>
          {/* ── LAYER 4: Actual Sandboxed Game Iframe Mount Slot ── */}
          <div
            ref={viewportRef}
            className={`game-iframe-mount-point ${launchError ? 'has-error' : ''}`}
          />

          {/* ── Poki-Level Clean Arcade Loading Progress ── */}
          {loading && !launchError && (
            <div className="game-loading-scrim fade-in">
              <div className="loading-card-arcade">
                {game?.thumbnail && (
                  <div className="loading-thumbnail-wrap">
                    <img
                      src={game.thumbnail}
                      alt={game.title}
                      className="loading-thumbnail-img"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="loading-meta-info">
                  <span className="loading-title">{game?.title || 'Loading Game'}</span>
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

          {/* ── Synchronized Challenge Countdown (3-2-1-GO) ── */}
          {countdown !== null && (
            <div className="game-countdown-scrim fade-in">
              <div className="countdown-number-bounce" key={countdown}>
                {countdown}
              </div>
              <span className="countdown-subtext">GET READY!</span>
            </div>
          )}

          {/* ── Game Result / Game Over Overlay ── */}
          {resultOverlay}

          {/* ── Launch Error Recovery Deck ── */}
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
        </div>

        {/* Physical Cabinet Footer Accent */}
        <div className="stage-cabinet-footer">
          <div className="cabinet-controls-pill">
            <Keyboard size={13} className="cabinet-ctrl-icon" />
            <span className="cabinet-ctrl-text">
              {game?.controls?.p1 || 'Arrow Keys / Touch to Play'}
            </span>
          </div>
          {game?.sourceLicense && (
            <span className="cabinet-license-tag">
              {game.sourceLicense} VERIFIED
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
