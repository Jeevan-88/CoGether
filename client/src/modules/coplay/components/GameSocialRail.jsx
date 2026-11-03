import React, { useState, useRef, useEffect } from 'react';
import { Check, Smile, Send } from 'lucide-react';
import './GameSocialRail.css';

const QUICK_EMOJIS = ['🎮', '🔥', '🏆', '👏', '😂', '🚀', '👍', '⚡', '🕹️', '🎯', '😊', '🙌'];

const DEFAULT_SQUAD_MESSAGES = [
  { id: 'msg-aarav-1', sender: 'Aarav', text: "Ready? Let's go!", time: '12:01', isLocal: false },
  { id: 'msg-meera-1', sender: 'Meera', text: "Press start on 3 🥳", time: '12:02', isLocal: false }
];

export default function GameSocialRail({
  roomId = 'duel-6643',
  currentUsername = 'Jeevan',
  userProfile = null,
  localStream,
  remoteStreams = {},
  micEnabled = true,
  cameraEnabled = false,
  isScreenSharing = false,
  connected = true,
  chatMessages = [],
  onToggleMic,
  onToggleCamera,
  onSendMessage,
  onLeaveSession
}) {
  const [chatInput, setChatInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localMessages, setLocalMessages] = useState(DEFAULT_SQUAD_MESSAGES);
  const chatMessagesEndRef = useRef(null);

  const remotePeerIds = Object.keys(remoteStreams || {});
  const totalCount = 1 + remotePeerIds.length;
  const hasRemotePeer = remotePeerIds.length > 0;
  const remotePlayerName = hasRemotePeer 
    ? (remoteStreams[remotePeerIds[0]]?.username || 'Player 2') 
    : null;

  // Auto-scroll chat to latest message
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, chatMessages]);

  const handleCopyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newMsg = {
      id: 'local-' + Date.now(),
      sender: displayName || 'You',
      text,
      time: timeStr,
      isLocal: true
    };

    setLocalMessages((prev) => [...prev, newMsg]);

    if (onSendMessage) {
      onSendMessage(text);
    }

    setChatInput('');
    setShowEmojiPicker(false);
  };

  const handleSelectEmoji = (emoji) => {
    setChatInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const displayName = currentUsername?.replace(/\s*\(You\)$/i, '') || 'Jeevan';

  const allDisplayMessages = [...localMessages, ...(chatMessages || [])];

  return (
    <aside className="game-social-rail game-social-rail-target" aria-label="Game and Party Social Rail">
      {/* ══════════════════════════════════════════════════════════
          TOP SECTION: PARTY ROOM (Matches Reference Image 1)
          ══════════════════════════════════════════════════════════ */}
      <section className="party-room-panel">
        {/* Header Bar: PARTY ROOM and 1/3 badge */}
        <div className="party-room-header">
          <span className="party-label-uppercase">PARTY ROOM</span>
          <span className="party-badge-count-green">{totalCount}/3</span>
        </div>

        <div className="party-room-content">
          {/* Room Code Pill with integrated Copy button */}
          <div className="party-room-code-pill">
            <span className="room-code-display">{roomId}</span>
            <button type="button" className="btn-room-copy-pill" onClick={handleCopyCode}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Connected Participants List */}
          <div className="party-members-list">
            {/* Member 1: Local User (You) with Red 'J' Avatar */}
            <div className="party-member-row-ref">
              <div className="member-avatar-circle-red">
                <span>{(displayName || 'J')[0].toUpperCase()}</span>
              </div>

              <div className="member-info-col-ref">
                <span className="member-name-bold">{displayName} (you)</span>
                <div className="member-status-connected">
                  <span className="green-dot" />
                  <span>connected</span>
                </div>
              </div>
            </div>

            {/* Member 2: Remote Peer if connected */}
            {hasRemotePeer && (
              <div className="party-member-row-ref">
                <div className="member-avatar-circle-blue">
                  <span>{(remotePlayerName || 'P')[0].toUpperCase()}</span>
                </div>

                <div className="member-info-col-ref">
                  <span className="member-name-bold">{remotePlayerName}</span>
                  <div className="member-status-connected">
                    <span className="green-dot" />
                    <span>connected</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Mic on / Cam / Exit Action Pills (Matches Reference Image 1) ── */}
          <div className="party-actions-pills-row">
            <button
              type="button"
              className={`party-pill-btn ${micEnabled ? 'is-active-yellow' : 'is-default-white'}`}
              onClick={onToggleMic}
            >
              {micEnabled ? 'Mic on' : 'Mic off'}
            </button>

            <button
              type="button"
              className={`party-pill-btn ${cameraEnabled ? 'is-active-yellow' : 'is-default-white'}`}
              onClick={onToggleCamera}
            >
              Cam
            </button>

            <button
              type="button"
              className="party-pill-btn is-default-white"
              onClick={onLeaveSession || (() => window.history.back())}
            >
              Exit
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          BOTTOM SECTION: REAL-TIME ROOM CHAT (Matches Reference Image 1)
          ══════════════════════════════════════════════════════════ */}
      <section className="party-chat-panel">
        {/* Chat Header: Party chat Aarav, Meera */}
        <div className="party-chat-header">
          <div className="chat-title-ref-group">
            <span className="chat-title-bold">Party chat</span>
            <span className="chat-title-sub">Aarav, Meera</span>
          </div>
        </div>

        {/* Chat Messages Body with Pre-loaded squad messages & Live sync */}
        <div className="chat-messages-container" tabIndex={0} aria-label="Party Messages">
          {allDisplayMessages.map((msg, idx) => {
            const isOutgoing = msg.isLocal || msg.sender === currentUsername || msg.sender === displayName;
            return (
              <div 
                key={msg.id || idx} 
                className={`chat-bubble-row ${isOutgoing ? 'outgoing' : 'incoming'}`}
              >
                <div className="bubble-wrapper">
                  {!isOutgoing && (
                    <span className="bubble-sender-name">{msg.sender}</span>
                  )}
                  <p className="bubble-text">{msg.text}</p>
                  <div className="bubble-meta">
                    <span className="bubble-time">{msg.time || 'now'}</span>
                    {isOutgoing && <Check size={11} className="read-tick" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatMessagesEndRef} />
        </div>

        {/* Quick Emoji Bar */}
        {showEmojiPicker && (
          <div className="chat-emoji-drawer fade-in">
            <div className="emoji-grid">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="btn-emoji-item"
                  onClick={() => handleSelectEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Input Form */}
        <form className="chat-compose-form" onSubmit={handleSendChat}>
          <button
            type="button"
            className={`btn-emoji-toggle ${showEmojiPicker ? 'active' : ''}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Add Reaction Emoji"
            aria-label="Add Reaction Emoji"
          >
            <Smile size={18} />
          </button>

          <input
            type="text"
            className="chat-text-input"
            placeholder="Send party message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            maxLength={280}
          />

          <button
            type="submit"
            className={`btn-chat-send-yellow ${chatInput.trim() ? 'has-content' : ''}`}
            disabled={!chatInput.trim()}
            title="Send message"
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </form>
      </section>
    </aside>
  );
}
