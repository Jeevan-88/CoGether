import React, { useState } from 'react';
import { ArrowLeft, AlertTriangle, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import './GameHeader.css';

/**
 * GameHeader
 * Top navigation bar for the CoGether universal gameplay environment.
 * Matches exact reference design:
 * Left: < Back to Overview | Game Title
 * Right: Cam & Mic Quick Toggles | Solo (yellow pill) | Race 2 | Race 3 | Invite friend (yellow button)
 */
export default function GameHeader({
  game,
  mode = 'SINGLE_PLAYER',
  roomId = null,
  onClose,
  onOpenChallenge,
  hasActiveSession = false,
  isCamActive = true,
  isMicActive = true,
  onToggleCamera,
  onToggleMic
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

  const displayTitle = game?.title?.replace(/\(Official Open-Source\)/i, '').replace(/— Open Source/i, '').trim() || game?.n || 'Afterhours';

  return (
    <>
      <header className="game-header-bar">
        {/* ── Left Navigation & Title ── */}
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

        {/* ── Right Action Controls ── */}
        <div className="header-right-cluster">
          {/* Quick Mic and Camera Toggles */}
          <div className="header-av-controls-row">
            {onToggleMic && (
              <button
                type="button"
                className={`header-av-pill ${isMicActive ? 'is-active-yellow' : 'is-muted'}`}
                onClick={onToggleMic}
                title={isMicActive ? 'Microphone is ON (Click to Mute)' : 'Microphone is OFF (Click to Unmute)'}
              >
                {isMicActive ? <Mic size={13} /> : <MicOff size={13} />}
                <span>{isMicActive ? 'Mic on' : 'Mic off'}</span>
              </button>
            )}

            {onToggleCamera && (
              <button
                type="button"
                className={`header-av-pill ${isCamActive ? 'is-active-yellow' : 'is-off'}`}
                onClick={onToggleCamera}
                title={isCamActive ? 'Camera is ON (Click to Hide)' : 'Camera is OFF (Click to Show)'}
              >
                {isCamActive ? <Video size={13} /> : <VideoOff size={13} />}
                <span>{isCamActive ? 'Cam' : 'Cam off'}</span>
              </button>
            )}
          </div>

          <div className="header-mode-pills-row">
            <button type="button" className={`header-mode-pill ${mode === 'SINGLE_PLAYER' ? 'active' : ''}`}>Solo</button>
            <button type="button" className="header-mode-pill" onClick={onOpenChallenge}>Race 2</button>
            <button type="button" className="header-mode-pill" onClick={onOpenChallenge}>Race 3</button>
          </div>

          {/* Invite Friend Action (Yellow Rounded Button) */}
          <button
            type="button"
            className="btn-header-invite-yellow"
            onClick={onOpenChallenge}
            title="Invite friend to game"
          >
            <span>Invite friend</span>
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
              You are currently connected to an active room. Leaving will end your session with other squad members.
            </p>
            <div className="exit-confirm-actions">
              <button
                type="button"
                className="btn-exit-cancel"
                onClick={() => setShowExitConfirm(false)}
              >
                STAY IN GAME
              </button>
              <button
                type="button"
                className="btn-exit-confirm"
                onClick={confirmExit}
              >
                LEAVE ROOM
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
