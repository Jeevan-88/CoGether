import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, 
  Users, Send, Smile, LogOut, Swords, CheckCircle2, ChevronRight, ChevronDown 
} from 'lucide-react';
import VideoTile from '../../videoroom/VideoTile.jsx';
import './GameSocialRail.css';

const QUICK_EMOJIS = ['🎮', '🔥', '🏆', '👏', '😂', '🚀', '👍', '❤️', '⚡', '🕹️', '🎯', '💥'];

/**
 * GameSocialRail
 * Dedicated non-overlapping social sidebar for CoGether gameplay.
 * Features:
 * - Real participant count (no fake numbers)
 * - Live WebRTC camera tiles with avatar fallback
 * - Dark charcoal in-call chat with timestamp & auto-scroll
 * - Compact emoji picker
 * - In-call control actions (Mic, Camera, Screen, Leave)
 */
export default function GameSocialRail({
  roomId,
  currentUsername = 'Player',
  localStream,
  remoteStreams = {},
  micEnabled = true,
  cameraEnabled = true,
  isScreenSharing = false,
  connected = false,
  chatMessages = [],
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onSendMessage,
  onLeaveSession,
  isChallengeMode = false,
  isLocalReady = false,
  isPeerReady = false,
  onToggleReady
}) {
  const [chatInput, setChatInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const chatMessagesEndRef = useRef(null);

  const remotePeerIds = Object.keys(remoteStreams);
  const totalCount = 1 + remotePeerIds.length;

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = (e) => {
    e?.preventDefault();
    if (chatInput.trim() && onSendMessage) {
      onSendMessage(chatInput.trim());
      setChatInput('');
      setShowEmojiPicker(false);
    }
  };

  const handleSelectEmoji = (emoji) => {
    setChatInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <aside className={`game-social-rail ${isCollapsed ? 'rail-collapsed' : ''}`} aria-label="Social Panel">
      {/* ── Top Rail Status Header ── */}
      <div className="rail-top-header">
        <div className="rail-room-info">
          <div className="live-status-dot" title={connected ? 'Connected' : 'Connecting'} />
          <span className="rail-count-badge">
            <Users size={13} />
            <span>{totalCount} {totalCount === 1 ? 'PLAYER' : 'PLAYERS'} IN ROOM</span>
          </span>
        </div>
        <button
          type="button"
          className="rail-collapse-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Social Rail' : 'Collapse Social Rail'}
          aria-label={isCollapsed ? 'Expand Social Rail' : 'Collapse Social Rail'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="rail-scrollable-body">
          {/* ── Challenge Readiness Card (If in challenge mode) ── */}
          {isChallengeMode && (
            <div className="rail-challenge-status-card">
              <div className="challenge-card-header">
                <Swords size={15} className="swords-icon" />
                <span>DUEL READINESS</span>
              </div>

              <div className="challenge-players-ready-grid">
                <div className={`player-ready-pill ${isLocalReady ? 'is-ready' : 'not-ready'}`}>
                  <span className="player-name">You</span>
                  <span className="ready-indicator">{isLocalReady ? 'READY' : 'WAITING'}</span>
                </div>
                <div className={`player-ready-pill ${isPeerReady ? 'is-ready' : 'not-ready'}`}>
                  <span className="player-name">
                    {remotePeerIds.length > 0 ? remoteStreams[remotePeerIds[0]]?.username || 'Peer' : 'Waiting...'}
                  </span>
                  <span className="ready-indicator">
                    {remotePeerIds.length === 0 ? 'NOT JOINED' : isPeerReady ? 'READY' : 'WAITING'}
                  </span>
                </div>
              </div>

              {onToggleReady && (
                <button
                  type="button"
                  className={`btn-challenge-ready-toggle ${isLocalReady ? 'ready-active' : ''}`}
                  onClick={onToggleReady}
                >
                  <CheckCircle2 size={15} />
                  <span>{isLocalReady ? 'YOU ARE READY' : 'CLICK WHEN READY'}</span>
                </button>
              )}
            </div>
          )}

          {/* ── Live Video Stream Grid (16:9 Tiles) ── */}
          <section className="rail-video-grid" aria-label="WebRTC Cameras">
            <div className="rail-video-tile-container">
              <VideoTile
                stream={localStream}
                label={currentUsername}
                isLocal={true}
                micEnabled={micEnabled}
                cameraEnabled={cameraEnabled}
              />
            </div>

            {remotePeerIds.map((peerId) => {
              const peer = remoteStreams[peerId];
              return (
                <div key={peerId} className="rail-video-tile-container">
                  <VideoTile
                    stream={peer.stream}
                    label={peer.username || 'Peer'}
                    isLocal={false}
                    micEnabled={peer.micEnabled}
                    cameraEnabled={peer.cameraEnabled}
                  />
                </div>
              );
            })}
          </section>

          {/* ── Real-Time Dark Charcoal In-Call Chat ── */}
          <section className="rail-chat-section" aria-label="Room Chat">
            <div className="chat-section-header">
              <MessageSquare size={14} />
              <span>ROOM CHAT</span>
            </div>

            <div className="rail-chat-messages-box">
              {chatMessages.length === 0 ? (
                <div className="chat-empty-hint">
                  <span>No messages yet. Chat with players in room!</span>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.senderName === currentUsername || msg.senderId === 'local';
                  return (
                    <div key={msg.id || Math.random()} className={`chat-message-row ${isMe ? 'msg-me' : 'msg-peer'}`}>
                      <div className="msg-meta">
                        <span className="msg-author">{isMe ? 'You' : msg.senderName}</span>
                        {msg.timestamp && <span className="msg-time">{msg.timestamp}</span>}
                      </div>
                      <div className="msg-bubble">{msg.text}</div>
                    </div>
                  );
                })
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Emoji Quick Picker Dropdown */}
            {showEmojiPicker && (
              <div className="emoji-quick-picker-popover fade-in">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="emoji-popover-item"
                    onClick={() => handleSelectEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input Bar */}
            <form onSubmit={handleSendChat} className="rail-chat-form">
              <button
                type="button"
                className="chat-emoji-btn"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Insert emoji"
                aria-label="Insert emoji"
              >
                <Smile size={16} />
              </button>
              <input
                type="text"
                placeholder="Type message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="rail-chat-input"
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!chatInput.trim()}
                title="Send"
                aria-label="Send"
              >
                <Send size={14} />
              </button>
            </form>
          </section>

          {/* ── Bottom Controls Bar ── */}
          <section className="rail-controls-bar" aria-label="Room Controls">
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

            {onToggleScreenShare && (
              <button
                type="button"
                className={`control-circle-btn ${isScreenSharing ? 'is-active' : ''}`}
                onClick={onToggleScreenShare}
                title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                aria-label={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
              >
                <Monitor size={16} />
              </button>
            )}

            <button
              type="button"
              className="control-circle-btn btn-leave-room"
              onClick={onLeaveSession}
              title="Leave Room"
              aria-label="Leave Room"
            >
              <LogOut size={16} />
            </button>
          </section>
        </div>
      )}
    </aside>
  );
}
