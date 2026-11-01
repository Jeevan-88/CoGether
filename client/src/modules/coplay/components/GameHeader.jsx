import React, { useState } from 'react';
import { ArrowLeft, Maximize, Minimize, Users, AlertTriangle } from 'lucide-react';
import CoGetherButton from './CoGetherButton.jsx';
import './GameHeader.css';

/**
 * GameHeader
 * Compact fixed top header bar for the CoGether gameplay environment.
 * Matches exact reference design:
 * Left: < BACK TO ARCADE | 2048
 * Right: [icon] CHALLENGE FRIEND | Fullscreen toggle
 */
export default function GameHeader({
  game,
  mode = 'SINGLE_PLAYER', // 'SINGLE_PLAYER' | 'CHALLENGE' | 'LOCAL_COOP'
  roomId = null,
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

  const displayTitle = game?.title?.replace(/\(Official Open-Source\)/i, '').replace(/— Open Source/i, '').trim() || '2048';

  return (
    <>
      <header className="game-header-bar">
        {/* ── Left Navigation & Title (Matches Reference Design) ── */}
        <div className="header-left-cluster">
          <button
            type="button"
            className="btn-header-back"
            onClick={handleExitClick}
            title="Back to Overview"
            aria-label="Back to Overview"
          >
            <ArrowLeft size={14} />
            <span className="back-text">Back to Overview</span>
          </button>

          <h1 className="header-game-title">{displayTitle}</h1>
        </div>

        {/* ── Right Action Controls (Matches Reference Image) ── */}
        <div className="header-right-cluster">
          <div className="header-mode-pills-row">
            <button type="button" className="header-mode-pill active">Solo</button>
            <button type="button" className="header-mode-pill">Race 2</button>
            <button type="button" className="header-mode-pill">Race 3</button>
          </div>

          {/* Invite Friend Action */}
          {onOpenChallenge && (
            <button
              type="button"
              className="btn-header-invite-yellow"
              onClick={onOpenChallenge}
              title="Invite friend to game"
            >
              <span>Invite friend</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            className="btn-header-fullscreen"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </header>

      {/* ── Active Session Exit Confirmation Modal ── */}
      {showExitConfirm && (
        <div className="exit-confirm-overlay fade-in">
          <div className="exit-confirm-card">
            <div className="exit-confirm-icon-wrap">
              <AlertTriangle size={30} />
            </div>
            <h3 className="exit-confirm-title">LEAVE GAME?</h3>
            <p className="exit-confirm-text">
              You are currently in an active multiplayer room. Leaving will disconnect you from the session.
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
