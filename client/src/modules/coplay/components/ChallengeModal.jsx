import React, { useState, useEffect } from 'react';
import { Copy, Check, Swords, X, Users, Share2, Sparkles } from 'lucide-react';
import CoGetherButton from './CoGetherButton.jsx';
import { API_URL } from '../../../config/api.js';
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
  const [inviteLink, setInviteLink] = useState(
    `${window.location.origin}?room=${roomId}&mode=coplay&challenge=${game?.id || '2048'}`
  );

  useEffect(() => {
    async function initOpaqueInvite() {
      const token = localStorage.getItem('cogether_access_token');
      if (!token) return;
      try {
        const apiBase = API_URL;
        const res = await fetch(`${apiBase}/api/v1/invites`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ resourceType: 'room', resourceId: roomId })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            setInviteLink(`${window.location.origin}/invite/${data.token}`);
          }
        }
      } catch (e) {}
    }
    initOpaqueInvite();
  }, [roomId]);

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
            <span>COGETHER DUEL ARENA • UP TO 3 PLAYERS</span>
          </div>
          <h2 className="challenge-title">CHALLENGE FRIENDS</h2>
          <p className="challenge-subtitle">
            Battle up to 3 players in <strong className="game-name-highlight">{game?.title}</strong> with synchronized 3-2-1 countdown, live split-screen gameplay, live scores, and cameras!
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
              ? `${connectedPeerCount + 1}/3 PLAYERS READY FOR SPLIT-SCREEN DUEL`
              : '1/3 PLAYERS (WAITING FOR UP TO 2 FRIENDS TO JOIN)'}
          </span>
        </div>

        <div className="challenge-actions-row">
          <CoGetherButton
            variant="primary"
            onClick={onStartDuel}
            icon={Swords}
            fullWidth={true}
          >
            {connectedPeerCount > 0 ? 'ENTER SPLIT ARENA →' : 'ENTER & WAIT IN ROOM →'}
          </CoGetherButton>
        </div>
      </div>
    </div>
  );
}
