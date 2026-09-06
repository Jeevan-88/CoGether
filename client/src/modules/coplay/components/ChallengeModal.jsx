import React, { useState } from 'react';
import { Copy, Check, Swords, X, Users, Share2, Sparkles } from 'lucide-react';
import CoGetherButton from './CoGetherButton.jsx';
import './ChallengeModal.css';

/**
 * ChallengeModal
 * Creates a synchronized CoGether duel room for 2 players.
 * Displays:
 * - Room code (e.g. DUEL-8492)
 * - Copyable invite link
 * - Waiting status (connected peer count)
 * - Start Challenge trigger
 */
export default function ChallengeModal({
  game,
  roomId,
  onClose,
  onStartDuel,
  connectedPeerCount = 0
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const inviteLink = `${window.location.origin}?room=${roomId}&mode=coplay&challenge=${game?.id || '2048'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  return (
    <div className="challenge-modal-overlay fade-in">
      <div className="challenge-modal-card">
        <button
          type="button"
          className="challenge-close-btn"
          onClick={onClose}
          title="Close Modal"
          aria-label="Close Modal"
        >
          <X size={18} />
        </button>

        <div className="challenge-modal-header">
          <div className="challenge-badge">
            <Swords size={15} />
            <span>COGETHER DUEL</span>
          </div>
          <h2 className="challenge-title">CHALLENGE A FRIEND</h2>
          <p className="challenge-subtitle">
            Play <strong className="game-name-highlight">{game?.title}</strong> simultaneously with synchronized 3-2-1 countdown and live camera video.
          </p>
        </div>

        <div className="challenge-code-deck">
          <div className="code-box-label">DUEL ROOM CODE</div>
          <div className="code-box-display">
            <span className="code-text">{roomId}</span>
            <button
              type="button"
              className="btn-copy-code"
              onClick={handleCopyCode}
              title="Copy Code"
            >
              {copiedCode ? <Check size={16} className="text-green" /> : <Copy size={16} />}
              <span>{copiedCode ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
        </div>

        <div className="challenge-link-deck">
          <input
            type="text"
            readOnly
            value={inviteLink}
            className="challenge-link-input"
            onClick={(e) => e.target.select()}
          />
          <button
            type="button"
            className="btn-copy-link"
            onClick={handleCopyLink}
          >
            {copiedLink ? <Check size={16} className="text-green" /> : <Share2 size={16} />}
            <span>{copiedLink ? 'LINK COPIED' : 'COPY LINK'}</span>
          </button>
        </div>

        <div className="challenge-status-indicator">
          <div className={`status-pulse-circle ${connectedPeerCount > 0 ? 'is-connected' : 'is-waiting'}`} />
          <span className="status-label">
            {connectedPeerCount > 0
              ? 'FRIEND CONNECTED! READY TO ENTER DUEL'
              : 'WAITING FOR FRIEND TO JOIN WITH LINK...'}
          </span>
        </div>

        <div className="challenge-actions-row">
          <CoGetherButton
            variant="primary"
            onClick={onStartDuel}
            icon={Swords}
            fullWidth={true}
          >
            {connectedPeerCount > 0 ? 'ENTER DUEL ARENA →' : 'ENTER & WAIT IN ROOM →'}
          </CoGetherButton>
        </div>
      </div>
    </div>
  );
}
