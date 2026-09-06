import React, { useState } from 'react';
import { ArrowLeft, Maximize, Minimize, X, Swords, AlertTriangle } from 'lucide-react';
import CoGetherButton from './CoGetherButton.jsx';
import { GameMode } from '../gameSchema.js';
import './GameHeader.css';

/**
 * GameHeader
 * Compact fixed top header bar for the CoGether gameplay environment.
 * Contains:
 * - Back to Arcade navigation
 * - Verified game title & mode badge
 * - Challenge Friend quick-action trigger
 * - Native Fullscreen toggle (browser API)
 * - Close button with exit confirmation protection for active challenge rooms
 */
export default function GameHeader({
  game,
  mode = 'SINGLE_PLAYER', // 'SINGLE_PLAYER' | 'CHALLENGE' | 'LOCAL_COOP'
  isFullscreen = false,
  onToggleFullscreen,
  onClose,
  onOpenChallenge,
  hasActiveSession = false
}) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleExitClick = () => {
    if (hasActiveSession || mode === 'CHALLENGE') {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    onClose();
  };

  // Determine mode badge label and color
  let modeLabel = 'SINGLE PLAYER';
  let modeBadgeClass = 'mode-single';

  if (mode === 'CHALLENGE') {
    modeLabel = 'CHALLENGE MODE';
    modeBadgeClass = 'mode-challenge';
  } else if (game?.gameMode === GameMode.LOCAL_COOP) {
    modeLabel = 'LOCAL 2-PLAYER';
    modeBadgeClass = 'mode-coop';
  } else if (game?.gameMode === GameMode.ONLINE_MULTIPLAYER) {
    modeLabel = 'MULTIPLAYER';
    modeBadgeClass = 'mode-multi';
  }

  // Sanitize title so "Official" is not displayed unless legally verified
  const displayTitle = game?.title?.replace(/\(Official Open-Source\)/i, '— Open Source') || 'Game';

  return (
    <>
      <header className="game-header-bar">
        {/* ── Left Navigation & Metadata ── */}
        <div className="header-left-cluster">
          <button
            type="button"
            className="btn-header-back"
            onClick={handleExitClick}
            title="Back to Arcade"
            aria-label="Back to Arcade"
          >
            <ArrowLeft size={16} />
            <span className="back-text">BACK TO ARCADE</span>
          </button>

          <div className="header-title-divider" aria-hidden="true" />

          <div className="header-meta-group">
            <h1 className="header-game-title">{displayTitle}</h1>
            {mode === 'CHALLENGE' && (
              <span className="header-mode-badge mode-challenge">
                CHALLENGE
              </span>
            )}
          </div>
        </div>

        {/* ── Right Action Controls ── */}
        <div className="header-right-cluster">
          {/* Challenge Friend Action (if supported and not already in challenge) */}
          {game?.challengeSupported && mode !== 'CHALLENGE' && onOpenChallenge && (
            <button
              type="button"
              className="btn-header-challenge-trigger"
              onClick={onOpenChallenge}
              title="Challenge a Friend with synchronized countdown"
            >
              <Swords size={15} />
              <span>CHALLENGE FRIEND</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            className="btn-header-icon-action"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>

          {/* Close Game Action */}
          <button
            type="button"
            className="btn-header-close-action"
            onClick={handleExitClick}
            title="Close Game"
            aria-label="Close Game"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* ── Active Session Exit Confirmation Modal ── */}
      {showExitConfirm && (
        <div className="exit-confirm-overlay fade-in">
          <div className="exit-confirm-card">
            <div className="exit-confirm-icon-wrap">
              <AlertTriangle size={32} />
            </div>
            <h3 className="exit-confirm-title">LEAVE CHALLENGE?</h3>
            <p className="exit-confirm-text">
              You are currently in an active challenge session. Leaving will disconnect you from your room and peer.
            </p>
            <div className="exit-confirm-actions">
              <CoGetherButton
                variant="secondary"
                onClick={() => setShowExitConfirm(false)}
              >
                STAY IN GAME
              </CoGetherButton>
              <CoGetherButton
                variant="danger"
                onClick={confirmExit}
              >
                LEAVE ROOM
              </CoGetherButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
