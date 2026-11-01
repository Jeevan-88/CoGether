import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, Copy, Check, Link, Crown, Lock, 
  MessageSquare, MoreVertical, Smile, Send, ChevronDown, ChevronRight,
  Mic, MicOff, Video, VideoOff, Monitor, LogOut, ExternalLink, Layers
} from 'lucide-react';
import VideoTile from '../../videoroom/VideoTile.jsx';
import CogetherAvatarRenderer from '../../auth/CogetherAvatarRenderer.jsx';
import './GameSocialRail.css';

const QUICK_EMOJIS = ['🎮', '🔥', '🏆', '👏', '😂', '🚀', '👍', '⚡', '🕹️', '🎯', '😊', '🙌'];

export default function GameSocialRail({
  roomId = 'duel-3852',
  currentUsername = 'Player',
  userProfile = null,
  localStream,
  remoteStreams = {},
  micEnabled = true,
  cameraEnabled = true,
  isScreenSharing = false,
  connected = false,
  connectionState = 'NEW',
  peerConnectionStates = {},
  chatMessages = [],
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onSendMessage,
  onLeaveSession,
  onOpenInviteFriend,
  onOpenDirectMessages,
  videoLayoutMode = 'COMBINED', // 'COMBINED' | 'SEPARATE'
  onToggleVideoLayout
}) {
  const [chatInput, setChatInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPartyCollapsed, setIsPartyCollapsed] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
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
  }, [chatMessages]);

  const handleCopyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    if (onSendMessage) {
      onSendMessage(chatInput.trim());
    }

    setChatInput('');
    setShowEmojiPicker(false);
  };

  const handleSelectEmoji = (emoji) => {
    setChatInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const displayName = currentUsername?.replace(/\s*\(You\)$/i, '') || 'Player';

  return (
    <aside className="game-social-rail game-social-rail-target" aria-label="Game and Party Social Rail">
      {/* ══════════════════════════════════════════════════════════
          TOP SECTION: PARTY ROOM & VIDEO FEEDS
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
            {/* Member 1: Local User (You) */}
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
              className={`party-pill-btn ${cameraEnabled ? 'is-default-white' : 'is-off'}`}
              onClick={onToggleCamera}
            >
              {cameraEnabled ? 'Cam' : 'Cam off'}
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
          BOTTOM SECTION: REAL-TIME ROOM CHAT
          ══════════════════════════════════════════════════════════ */}
      <section className={`party-chat-panel ${isChatCollapsed ? 'is-collapsed' : ''}`}>
        {/* Chat Header */}
        <div className="party-chat-header">
          <div 
            className="chat-title-group"
            onClick={() => setIsChatCollapsed(!isChatCollapsed)}
            style={{ cursor: 'pointer' }}
          >
            <MessageSquare size={15} className="chat-icon-muted" />
            <div className="chat-title-ref-group">
              <span className="chat-title-bold">Party chat</span>
              <span className="chat-title-sub">Aarav, Meera</span>
            </div>
            {chatMessages.length > 0 && (
              <span className="chat-badge-count">{chatMessages.length}</span>
            )}
          </div>

          <div className="chat-header-actions">
            <button 
              type="button" 
              className="chat-chevron-btn" 
              onClick={() => setIsChatCollapsed(!isChatCollapsed)}
              aria-label="Toggle chat"
            >
              {isChatCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        {!isChatCollapsed && (
          <>
            <div className="chat-messages-container" tabIndex={0} aria-label="Party Messages">
              {chatMessages.length === 0 ? (
                <div className="chat-empty-state">
                  <p>Party chat ready. Send a message or emoji to your squad!</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => {
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
                })
              )}
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
          </>
        )}
      </section>
    </aside>
  );
}
