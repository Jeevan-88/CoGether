import React, { useState } from 'react';
import { 
  Maximize2, Minimize2, RotateCw, Volume2, VolumeX, 
  Heart, AlertOctagon, ArrowLeft, ShieldCheck, Swords 
} from 'lucide-react';
import CoGetherButton from './CoGetherButton.jsx';
import GameSplitArena from './GameSplitArena.jsx';
import './GameViewport.css';

/**
 * GameViewport
 * The Stage Container for the Active Game.
 * Switches smoothly between Single-Player Stage and Multiplayer Split Arena.
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
  const [isMuted, setIsMuted] = useState(false);

  const isPortrait = game?.orientation === 'portrait';
  const frameAspectClass = isPortrait ? 'frame-aspect-portrait' : 'frame-aspect-standard';

  const displayTitle = game?.title?.replace(/\(Official Open-Source\)/i, '— Open Source') || 'Game';

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
        <div className="dark-theater-stage">
          {/* ── Center Stage Game Canvas Frame ── */}
          <div className={`dark-game-frame ${frameAspectClass}`}>
            {/* Actual Sandboxed Game Iframe Mount Slot */}
            <div
              ref={viewportRef}
              className={`game-iframe-mount-point ${launchError ? 'has-error' : ''}`}
            />

            {/* Clean Arcade Loading Progress */}
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
          </div>

          {/* ── Bottom Metadata & Control Bar ── */}
          <div className="dark-stage-bottom-bar">
            <div className="bottom-bar-left">
              {game?.thumbnail && (
                <div className="bottom-bar-thumb">
                  <img
                    src={game.thumbnail}
                    alt={game.title}
                    className="bottom-thumb-img"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="bottom-bar-titles">
                <h2 className="bottom-game-title">{displayTitle}</h2>
                <span className="bottom-game-category">{game?.category || 'Arcade'}</span>
              </div>
            </div>

            <div className="bottom-bar-right">
              <button
                type="button"
                className={`btn-stage-action ${isLiked ? 'is-liked' : ''}`}
                onClick={() => setIsLiked(!isLiked)}
                title="Add to Favorites"
                aria-label="Add to Favorites"
              >
                <Heart size={15} fill={isLiked ? '#e11d48' : 'none'} color={isLiked ? '#e11d48' : 'currentColor'} />
              </button>

              {game?.challengeSupported && onOpenChallenge && (
                <button
                  type="button"
                  className="btn-stage-action btn-challenge-action"
                  onClick={onOpenChallenge}
                  title="Challenge Friend"
                >
                  <Swords size={14} />
                  <span>CHALLENGE</span>
                </button>
              )}

              <button
                type="button"
                className="btn-stage-action"
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
