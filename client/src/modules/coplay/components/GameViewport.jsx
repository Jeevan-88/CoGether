import React, { useState } from 'react';
import { 
  Maximize2, Minimize2, RotateCw, 
  Heart, AlertOctagon, ArrowLeft, ShieldCheck, Swords, BarChart2 
} from 'lucide-react';
import CoGetherButton from './CoGetherButton.jsx';
import GameSplitArena from './GameSplitArena.jsx';
import './GameViewport.css';

/**
 * GameViewport
 * The Stage Container for the Active Game.
 * Displays the elevated game canvas and the floating bottom-left game metadata pill.
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

  const isPortrait = game?.orientation === 'portrait';
  const frameAspectClass = isPortrait ? 'frame-aspect-portrait' : 'frame-aspect-standard';

  const displayTitle = game?.title?.replace(/\(Official Open-Source\)/i, '').replace(/— Open Source/i, '').trim() || '2048';
  const displayCategory = game?.category ? (game.category.charAt(0).toUpperCase() + game.category.slice(1).toLowerCase()) : 'Puzzle';

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

            {/* ── Docked Bottom-Left Floating Metadata Pill (Matches Reference) ── */}
            {!isFullscreen && (
              <div className="game-floating-meta-dock">
                <div className="dock-left-group">
                  <div className="dock-thumbnail">
                    {game?.thumbnail ? (
                      <img
                        src={game.thumbnail}
                        alt={game.title}
                        className="dock-thumb-img"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="dock-thumb-text">2048</span>
                    )}
                  </div>
                  <div className="dock-titles">
                    <span className="dock-title">{displayTitle}</span>
                    <span className="dock-category">{displayCategory}</span>
                  </div>
                </div>

                <div className="dock-divider" />

                <div className="dock-actions">
                  <button
                    type="button"
                    className={`btn-dock-action ${isLiked ? 'is-liked' : ''}`}
                    onClick={() => setIsLiked(!isLiked)}
                    title="Add to Favorites"
                    aria-label="Add to Favorites"
                  >
                    <Heart size={15} fill={isLiked ? '#e11d48' : 'none'} color={isLiked ? '#e11d48' : '#8E95A5'} />
                  </button>

                  <button
                    type="button"
                    className="btn-dock-action"
                    onClick={onOpenLeaderboard}
                    title="Leaderboard & Stats"
                    aria-label="Leaderboard & Stats"
                  >
                    <BarChart2 size={15} color="#8E95A5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
