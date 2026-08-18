import React, { useState, useEffect, useRef } from 'react';
import { useWebRTC } from '../../core/useWebRTC.js';
import VideoTile from '../videoroom/VideoTile.jsx';
import ChatPanel from '../videoroom/ChatPanel.jsx';
import ControlBar from '../videoroom/ControlBar.jsx';
import { Tv, Play, Pause, RotateCcw, Link, Copy, Check, Users, MessageSquare, Sparkles } from 'lucide-react';
import './WatchPartyRoom.css';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';

export default function WatchPartyRoom({ roomId, username, onLeave }) {
  const {
    localStream,
    remoteStreams,
    micEnabled,
    cameraEnabled,
    isScreenSharing,
    connected,
    chatMessages,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendChatMessage
  } = useWebRTC(roomId, username, SIGNALING_URL);

  const [videoUrl, setVideoUrl] = useState('https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1');
  const [inputUrl, setInputUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const remoteEntries = Object.entries(remoteStreams);
  const totalParticipants = remoteEntries.length + 1;

  const copyInvite = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadUrl = (e) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    
    // Simple parser for YouTube URLs to Embed format
    let target = inputUrl.trim();
    if (target.includes('youtube.com/watch?v=')) {
      const vId = target.split('v=')[1]?.split('&')[0];
      target = `https://www.youtube.com/embed/${vId}?autoplay=1`;
    } else if (target.includes('youtu.be/')) {
      const vId = target.split('youtu.be/')[1]?.split('?')[0];
      target = `https://www.youtube.com/embed/${vId}?autoplay=1`;
    }

    setVideoUrl(target);
    setInputUrl('');
  };

  return (
    <div className="watch-room-layout">
      {/* Header Bar */}
      <header className="watch-header">
        <div className="header-left">
          <div className="brand-logo">
            <Tv size={18} className="tv-icon-glow" />
            <span>TeleParty Watch</span>
          </div>
          <div className="room-code-badge" onClick={copyInvite}>
            <span>Room: {roomId}</span>
            {copied ? <Check size={13} className="success-icon" /> : <Copy size={13} />}
          </div>
        </div>

        {/* Video URL Input Bar */}
        <form onSubmit={handleLoadUrl} className="url-bar-form">
          <input
            type="text"
            placeholder="Paste YouTube or MP4 video URL to stream together..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="url-input"
          />
          <button type="submit" className="btn-load-video">
            <Link size={14} /> Sync Stream
          </button>
        </form>

        <div className="header-right">
          <div className="participants-pill">
            <Users size={14} /> {totalParticipants}
          </div>
        </div>
      </header>

      {/* Main Watch Body */}
      <main className="watch-body">
        {/* Synchronized Player Stage */}
        <div className="player-stage">
          <iframe
            src={videoUrl}
            title="Teleparty Synchronized Stream"
            className="sync-iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />

          {/* Floating Video Call Camera Overlay Tiles */}
          <div className="floating-cam-overlay">
            <div className="cam-tile-wrapper local-cam">
              <VideoTile
                stream={localStream}
                label={username}
                isLocal
                micEnabled={micEnabled}
                cameraEnabled={cameraEnabled}
              />
            </div>

            {remoteEntries.map(([id, peer]) => (
              <div key={id} className="cam-tile-wrapper">
                <VideoTile
                  stream={peer.stream}
                  label={peer.username || 'Guest'}
                  micEnabled={peer.micEnabled}
                  cameraEnabled={peer.cameraEnabled}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Chat Drawer Side Panel */}
        {isChatOpen && (
          <ChatPanel
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            onClose={() => setIsChatOpen(false)}
            currentUsername={username}
          />
        )}
      </main>

      {/* Bottom Floating Control Dock */}
      <ControlBar
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        isScreenSharing={isScreenSharing}
        isChatOpen={isChatOpen}
        unreadCount={0}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onLeaveCall={onLeave}
      />
    </div>
  );
}
