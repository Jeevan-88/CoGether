import React, { useState, useEffect } from 'react';
import { useWebRTC } from './useWebRTC.js';
import VideoTile from './VideoTile.jsx';
import ChatPanel from './ChatPanel.jsx';
import ControlBar from './ControlBar.jsx';
import { Copy, Check, Users, Shield, Sparkles } from 'lucide-react';
import './VideoRoom.css';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';

export default function VideoRoom({ roomId, username, onLeave }) {
  const {
    localStream,
    remoteStreams,
    micEnabled,
    cameraEnabled,
    isScreenSharing,
    connected,
    chatMessages,
    mediaError,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendChatMessage
  } = useWebRTC(roomId, username, SIGNALING_URL);

  const [copied, setCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastReadIndex, setLastReadIndex] = useState(0);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (isChatOpen) {
      setLastReadIndex(chatMessages.length);
    }
  }, [isChatOpen, chatMessages.length]);

  const unreadCount = isChatOpen ? 0 : Math.max(0, chatMessages.length - lastReadIndex);
  const remoteEntries = Object.entries(remoteStreams);
  const totalParticipants = remoteEntries.length + 1;

  return (
    <div className="room-layout">
      {/* Top Header Navigation */}
      <header className="room-header">
        <div className="header-left">
          <div className="header-logo">
            <Sparkles size={18} className="logo-sparkle" />
            <span className="brand-name">StreamPulse</span>
          </div>
          <div className="status-badge" data-connected={connected}>
            <span className="dot-pulse" />
            <span>{connected ? 'Connected' : 'Connecting...'}</span>
          </div>
        </div>

        <div className="header-right">
          <button className="room-code-pill" onClick={copyRoomCode} title="Click to copy room code">
            <span className="code-text">{roomId}</span>
            {copied ? <Check size={14} className="icon-success" /> : <Copy size={14} />}
          </button>

          <div className="participant-badge">
            <Users size={15} />
            <span>{totalParticipants}</span>
          </div>
        </div>
      </header>

      {/* Main Call View Area */}
      <main className="room-body">
        {mediaError && (
          <div className="media-error-banner">
            ⚠️ {mediaError}
          </div>
        )}

        <div className={`video-grid-container grid-size-${Math.min(totalParticipants, 4)}`}>
          {/* Local User Tile */}
          <VideoTile
            stream={localStream}
            label={username}
            isLocal
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
          />

          {/* Remote Participants Tiles */}
          {remoteEntries.map(([id, peer]) => (
            <VideoTile
              key={id}
              stream={peer.stream}
              label={peer.username || 'Guest'}
              micEnabled={peer.micEnabled}
              cameraEnabled={peer.cameraEnabled}
            />
          ))}

          {/* Waiting banner if alone */}
          {remoteEntries.length === 0 && (
            <div className="waiting-placeholder">
              <div className="waiting-card">
                <Users size={32} className="waiting-icon" />
                <h3>Waiting for others to join...</h3>
                <p>Share this room code with your friends or team members:</p>
                <div className="invite-box" onClick={copyInviteLink}>
                  <span>{roomId}</span>
                  <button className="invite-copy-btn">
                    {copied ? 'Copied Link!' : 'Copy Invite Code'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* In-Call Chat Drawer */}
        {isChatOpen && (
          <ChatPanel
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            onClose={() => setIsChatOpen(false)}
            currentUsername={username}
          />
        )}
      </main>

      {/* Floating Control Bar */}
      <ControlBar
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        isScreenSharing={isScreenSharing}
        isChatOpen={isChatOpen}
        unreadCount={unreadCount}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onLeaveCall={onLeave}
      />
    </div>
  );
}
