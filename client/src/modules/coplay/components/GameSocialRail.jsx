import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, Copy, Check, Link, Crown, Lock, 
  MessageSquare, MoreVertical, Smile, Send, ChevronDown, ChevronRight,
  Mic, MicOff, Video, VideoOff, Monitor, LogOut
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
  onOpenDirectMessages
}) {
  const [chatInput, setChatInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPartyCollapsed, setIsPartyCollapsed] = useState(false);
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
        {/* Header Bar */}
        <div 
          className="party-room-header" 
          onClick={() => setIsPartyCollapsed(!isPartyCollapsed)}
        >
          <div className="party-room-title-group">
            <Users size={16} className="party-icon-yellow" />
            <span className="party-title-text">Party Room</span>
            <span className="party-badge-count">
              <Users size={11} className="badge-user-icon" />
              <span>{totalCount}/2</span>
            </span>
          </div>

          <button 
            type="button" 
            className="party-chevron-btn" 
            aria-label="Toggle party room"
          >
            {isPartyCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Party Body */}
        {!isPartyCollapsed && (
          <div className="party-room-content">
            {/* Room Code & Invite Row */}
            <div className="party-action-row">
              <div 
                className="party-room-code-box" 
                onClick={handleCopyCode}
                title="Click to copy Room Code"
              >
                <div className="code-meta-col">
                  <span className="code-label">Room Code</span>
                  <span className="code-string">{roomId}</span>
                </div>
                <button type="button" className="code-copy-btn" aria-label="Copy room code">
                  {copied ? <Check size={14} className="copy-check" /> : <Copy size={14} />}
                </button>
              </div>

              {onOpenInviteFriend && (
                <button
                  type="button"
                  className="btn-party-invite-yellow"
                  onClick={onOpenInviteFriend}
                  title="Invite a friend to this room"
                >
                  <Link size={14} />
                  <span>Invite friend</span>
                </button>
              )}
            </div>

            {/* Connected Participants List */}
            <div className="party-members-card">
              {/* Member 1: Local User (You) */}
              <div className="party-member-row">
                <div className="member-avatar-wrap bg-red-user">
                  {userProfile?.avatarConfig ? (
                    <CogetherAvatarRenderer config={userProfile.avatarConfig} size={28} animated={false} />
                  ) : (
                    <span className="member-avatar-char">
                      {(displayName || 'P')[0].toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="member-info-col">
                  <span className="member-name">{displayName} (You)</span>
                  <div className="member-status-row">
                    <span className="status-dot-green" />
                    <span className="status-label">{connected ? 'Connected' : 'Online'}</span>
                  </div>
                </div>

                <div className="member-crown-badge" title="Room Host">
                  <Crown size={15} className="crown-icon-gold" />
                </div>
              </div>

              {/* Member 2: Remote Peer or Open Invitation Slot */}
              {hasRemotePeer ? (
                <div className="party-member-row">
                  <div className="member-avatar-wrap bg-blue-peer">
                    <span className="member-avatar-char">
                      {(remotePlayerName || 'P')[0].toUpperCase()}
                    </span>
                  </div>

                  <div className="member-info-col">
                    <span className="member-name">{remotePlayerName}</span>
                    <div className="member-status-row">
                      <span className="status-dot-green" />
                      <span className="status-label">In Arena</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  className="party-member-row party-member-empty" 
                  onClick={onOpenInviteFriend} 
                  style={{ cursor: 'pointer', opacity: 0.75 }}
                  title="Click to invite friend"
                >
                  <div className="member-avatar-wrap member-avatar-waiting">
                    <span className="member-avatar-char" style={{ color: '#8E95A5' }}>+</span>
                  </div>

                  <div className="member-info-col">
                    <span className="member-name" style={{ color: '#8E95A5', fontStyle: 'italic' }}>Waiting for opponent...</span>
                    <div className="member-status-row">
                      <span className="status-dot-green" style={{ background: '#F59E0B' }} />
                      <span className="status-label" style={{ color: '#8E95A5' }}>Ready to invite</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Live WebRTC Video Calling Stage ── */}
            {(cameraEnabled || localStream || hasRemotePeer) && (
              <div className="rail-video-grid" style={{ marginTop: '10px' }}>
                <div className="rail-video-tile-container">
                  <VideoTile
                    stream={localStream}
                    label={displayName}
                    isLocal={true}
                    micEnabled={micEnabled}
                    cameraEnabled={cameraEnabled}
                  />
                </div>

                {remotePeerIds.map((peerId) => {
                  const peerData = remoteStreams[peerId];
                  return (
                    <div key={peerId} className="rail-video-tile-container">
                      <VideoTile
                        stream={peerData?.stream || peerData}
                        label={peerData?.username || 'Player 2'}
                        isLocal={false}
                        micEnabled={peerData?.micEnabled ?? true}
                        cameraEnabled={peerData?.cameraEnabled ?? true}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── In-Call Controls Bar (Mic, Camera, Screen Share, Leave) ── */}
            <div className="rail-controls-bar" style={{ marginTop: '8px' }}>
              <button
                type="button"
                className={`control-circle-btn ${!micEnabled ? 'is-off' : ''}`}
                onClick={onToggleMic}
                title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
                aria-label={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
              </button>

              <button
                type="button"
                className={`control-circle-btn ${!cameraEnabled ? 'is-off' : ''}`}
                onClick={onToggleCamera}
                title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                aria-label={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {cameraEnabled ? <Video size={16} /> : <VideoOff size={16} />}
              </button>

              <button
                type="button"
                className={`control-circle-btn ${isScreenSharing ? 'is-active' : ''}`}
                onClick={onToggleScreenShare}
                title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                aria-label={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
              >
                <Monitor size={16} />
              </button>

              {onLeaveSession && (
                <button
                  type="button"
                  className="control-circle-btn btn-leave-room"
                  onClick={onLeaveSession}
                  title="Leave Room"
                  aria-label="Leave Room"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════
          BOTTOM SECTION: REAL-TIME ROOM CHAT
          ══════════════════════════════════════════════════════════ */}
      <section className="party-chat-panel">
        {/* Chat Header */}
        <div className="party-chat-header">
          <div className="chat-title-group">
            <MessageSquare size={15} className="chat-icon-muted" />
            <span className="chat-title-text">Chat</span>
          </div>

          <button 
            type="button" 
            className="chat-more-btn"
            onClick={onOpenDirectMessages}
            title="Chat Options"
            aria-label="Chat Options"
          >
            <MoreVertical size={16} />
          </button>
        </div>

        {/* Chat Messages Stream */}
        <div className="party-chat-stream">
          {(!chatMessages || chatMessages.length === 0) ? (
            <div className="telegram-chat-empty-state">
              <div className="telegram-date-badge">TODAY</div>
              <div className="telegram-encryption-notice">
                <Lock size={14} className="notice-lock-icon" />
                <span className="notice-heading">End-to-End Encrypted Room</span>
                <p className="notice-sub">Messages are sent in real time directly to connected room members.</p>
              </div>
            </div>
          ) : (
            chatMessages.map((msg, index) => {
              const sender = msg.senderName || msg.sender || 'Player';
              const isMine = sender === currentUsername || sender === displayName || sender === 'You' || msg.senderId === 'local';
              const text = msg.text || '';
              const time = msg.timestamp || msg.time || '';

              if (isMine) {
                return (
                  <div key={msg.id || index} className="chat-message-row outgoing">
                    <div className="chat-bubble outgoing">
                      <span className="bubble-text-content">{text}</span>
                    </div>
                    <div className="bubble-sub-meta">
                      <span className="bubble-timestamp">{time}</span>
                      <span className="read-receipt-ticks">✓✓</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id || index} className="chat-message-row incoming">
                  <div className="incoming-avatar-col">
                    <div className="incoming-avatar" style={{ background: '#3B82F6' }}>
                      {sender[0]?.toUpperCase() || 'P'}
                    </div>
                  </div>
                  <div className="incoming-bubble-col">
                    <div className="bubble-meta" style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>
                      <span>{sender}</span>
                    </div>
                    <div className="chat-bubble incoming">
                      <span className="bubble-text-content">{text}</span>
                    </div>
                    <div className="bubble-sub-meta">
                      <span className="bubble-timestamp">{time}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatMessagesEndRef} />
        </div>

        {/* Emoji Quick Picker Popover */}
        {showEmojiPicker && (
          <div className="emoji-picker-dock fade-in">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="emoji-dock-item"
                onClick={() => handleSelectEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Chat Input Pill */}
        <form onSubmit={handleSendChat} className="party-chat-input-pill">
          <button
            type="button"
            className="btn-chat-emoji"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emoji"
            aria-label="Add emoji"
          >
            <Smile size={18} />
          </button>

          <input
            type="text"
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="party-chat-textfield"
          />

          <button
            type="submit"
            className="btn-chat-send-yellow"
            disabled={!chatInput.trim()}
            title="Send Message"
            aria-label="Send Message"
          >
            <Send size={14} className="send-icon-black" />
          </button>
        </form>
      </section>
    </aside>
  );
}
