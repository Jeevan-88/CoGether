import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, MessageSquare, 
  Users, Send, Smile, LogOut, Swords, CheckCircle2,
  ChevronRight, ChevronDown, Zap, Copy, Check, UserPlus
} from 'lucide-react';
import VideoTile from '../../videoroom/VideoTile.jsx';
import CogetherAvatarRenderer from '../../auth/CogetherAvatarRenderer.jsx';
import './GameSocialRail.css';

const QUICK_EMOJIS = ['🎮', '🔥', '🏆', '👏', '😂', '🚀', '👍', '⚡', '🕹️', '🎯'];

export default function GameSocialRail({
  roomId,
  currentUsername = 'Player',
  userProfile = null,
  localStream,
  remoteStreams = {},
  micEnabled = true,
  cameraEnabled = true,
  connected = false,
  connectionState = 'NEW',
  peerConnectionStates = {},
  chatMessages = [],
  onToggleMic,
  onToggleCamera,
  onSendMessage,
  onLeaveSession,
  isChallengeMode = false,
  isLocalReady = false,
  isPeerReady = false,
  onToggleReady,
  onStartPracticeDuel,
  onOpenInviteFriend,
  onOpenDirectMessages
}) {
  const [chatInput, setChatInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatMessagesEndRef = useRef(null);

  const remotePeerIds = Object.keys(remoteStreams);
  const totalParticipants = remotePeerIds.length + 1;

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
    setShowEmojiPicker(false);
  };

  const handleSelectEmoji = (emoji) => {
    onSendMessage(emoji);
    setShowEmojiPicker(false);
  };

  const handleCopyRoomCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const opponentName = remotePeerIds.length > 0 ? (remoteStreams[remotePeerIds[0]]?.username || 'Opponent') : 'Waiting...';

  return (
    <aside className={`game-social-rail ${isCollapsed ? 'is-collapsed' : ''}`} aria-label="Social Sidebar">
      {/* ── Rail Top Header ── */}
      <div className="rail-top-header">
        <div className="rail-header-info">
          <Users size={16} className="rail-users-icon" />
          <span className="rail-title">Social ({totalParticipants})</span>
        </div>

        <div className="rail-header-actions">
          {onOpenInviteFriend && !isCollapsed && (
            <button
              type="button"
              className="btn-rail-quick-invite"
              onClick={onOpenInviteFriend}
              title="Invite a friend to this room"
            >
              <UserPlus size={14} />
              <span>Invite</span>
            </button>
          )}

          {onOpenDirectMessages && !isCollapsed && (
            <button
              type="button"
              className="btn-rail-quick-dm"
              onClick={onOpenDirectMessages}
              title="Direct Messages"
            >
              <MessageSquare size={14} />
            </button>
          )}

          <button
            type="button"
            className="rail-collapse-toggle-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* ── Sub-header: 1-Click Room Code & WebRTC State ── */}
      {!isCollapsed && (
        <div className="rail-room-meta-bar">
          <button
            type="button"
            className="rail-room-code-badge"
            onClick={handleCopyRoomCode}
            title="Click to copy Room Code"
          >
            <span className="room-label">ROOM:</span>
            <span className="room-code">{roomId}</span>
            {copied ? <Check size={12} className="copy-icon copied" /> : <Copy size={12} className="copy-icon" />}
          </button>
          <div className={`rail-webrtc-state-pill state-${(connectionState || 'NEW').toLowerCase()}`} title={`Connection: ${connectionState}`}>
            <span className="state-dot" />
            <span className="state-label">{connectionState}</span>
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="rail-scrollable-body">
          {/* ── Compact Ready Toggle (Refined, no bulky DUEL READINESS banner) ── */}
          {isChallengeMode && (
            <div className="rail-compact-ready-bar">
              <div className="ready-players-row">
                <div className={`ready-player-chip ${isLocalReady ? 'is-ready' : 'not-ready'}`}>
                  {userProfile?.avatarConfig ? (
                    <div className="chip-avatar">
                      <CogetherAvatarRenderer config={userProfile.avatarConfig} size={18} animated={false} />
                    </div>
                  ) : null}
                  <span className="chip-name">You</span>
                  <span className="chip-status">{isLocalReady ? 'READY' : 'NOT READY'}</span>
                </div>

                <div className={`ready-player-chip ${isPeerReady ? 'is-ready' : 'not-ready'}`}>
                  <span className="chip-name">{opponentName}</span>
                  <span className="chip-status">
                    {remotePeerIds.length === 0 ? 'WAITING' : isPeerReady ? 'READY' : 'WAITING'}
                  </span>
                </div>
              </div>

              {onToggleReady && (
                <div className="ready-toggle-wrap">
                  <button
                    type="button"
                    className={`btn-compact-ready-toggle ${isLocalReady ? 'ready-active' : ''}`}
                    onClick={onToggleReady}
                  >
                    <CheckCircle2 size={14} />
                    <span>{isLocalReady ? 'Ready' : 'Set Ready'}</span>
                  </button>

                  {remotePeerIds.length === 0 && onStartPracticeDuel && (
                    <button
                      type="button"
                      className="btn-practice-duel-trigger"
                      onClick={onStartPracticeDuel}
                      title="Launch Practice Duel against AI"
                    >
                      <Zap size={13} />
                      <span>Practice</span>
                    </button>
                  )}
                </div>
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
              const streamData = remoteStreams[peerId];
              return (
                <div key={peerId} className="rail-video-tile-container">
                  <VideoTile
                    stream={streamData?.stream || streamData}
                    label={streamData?.username || `Player`}
                    isLocal={false}
                    micEnabled={streamData?.micEnabled ?? true}
                    cameraEnabled={streamData?.cameraEnabled ?? true}
                  />
                </div>
              );
            })}
          </section>

          {/* ── Real-Time Room Chat ── */}
          <section className="rail-chat-section" aria-label="Room Chat">
            <div className="rail-chat-header">
              <MessageSquare size={13} />
              <span>Room Chat</span>
            </div>

            <div className="rail-chat-messages-stream">
              {chatMessages.length === 0 ? (
                <div className="rail-chat-empty">
                  <span>No chat messages yet.</span>
                </div>
              ) : (
                chatMessages.map((msg, index) => {
                  const isMine = msg.sender === currentUsername || msg.sender === 'You';
                  return (
                    <div key={msg.id || index} className={`rail-chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                      <div className="bubble-meta">
                        <span className="bubble-sender">{isMine ? 'You' : msg.sender}</span>
                        <span className="bubble-time">{msg.time || ''}</span>
                      </div>
                      <div className="bubble-text">{msg.text}</div>
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
                <Smile size={15} />
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
                <Send size={13} />
              </button>
            </form>
          </section>

          {/* ── Bottom Controls Bar (Mic, Camera, Leave) ── */}
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
