import React, { useState } from 'react';
import { useWebRTC } from '../../core/useWebRTC.js';
import VideoTile from '../videoroom/VideoTile.jsx';
import ChatPanel from '../videoroom/ChatPanel.jsx';
import ControlBar from '../videoroom/ControlBar.jsx';
import { Sparkles, Users, Layers, ShieldCheck, Wand2, Tv, Gamepad2 } from 'lucide-react';
import './MergedCameraView.css';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';

export default function MergedCameraView({ roomId, username, onLeave }) {
  const {
    localStream,
    remoteStreams,
    micEnabled,
    cameraEnabled,
    isScreenSharing,
    chatMessages,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendChatMessage
  } = useWebRTC(roomId, username, SIGNALING_URL);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [aiBackdrop, setAiBackdrop] = useState('cinema-theater'); // 'cinema-theater' | 'living-room' | 'arcade-lounge'

  const remoteEntries = Object.entries(remoteStreams);
  const totalParticipants = remoteEntries.length + 1;

  const backdrops = [
    { id: 'cinema-theater', label: '🎬 IMAX Cinema Seats (Shared Room)', bg: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80' },
    { id: 'living-room', label: '🛋️ VIP Living Room Couch', bg: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=80' },
    { id: 'arcade-lounge', label: '🕹️ Cyberpunk Gaming Studio', bg: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&q=80' }
  ];

  const currentBgUrl = backdrops.find((b) => b.id === aiBackdrop)?.bg;

  return (
    <div className="merged-view-layout fade-in">
      {/* Header */}
      <header className="merged-header">
        <div className="header-left">
          <div className="brand-logo">
            <Wand2 size={20} className="sparkle-glow" />
            <span>AI Telepresence Room · {roomId}</span>
          </div>
        </div>

        <div className="backdrop-selector">
          <Layers size={15} /> AI Shared Room Background:
          <select value={aiBackdrop} onChange={(e) => setAiBackdrop(e.target.value)} className="backdrop-dropdown">
            {backdrops.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
        </div>

        <div className="header-right">
          <div className="privacy-pill">
            <ShieldCheck size={14} /> AI Background Blend · {totalParticipants} Online
          </div>
        </div>
      </header>

      {/* Main Stage with 1 SHARED VIRTUAL BACKGROUND */}
      <main
        className="merged-stage-ai-shared"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(9, 11, 18, 0.4) 0%, rgba(9, 11, 18, 0.85) 100%), url(${currentBgUrl})` }}
      >
        <div className="ai-single-background-wrapper">
          <div className="ai-badge-banner">
            <Wand2 size={14} className="wand-ic" /> AI Telepresence Active — Both Friends Merged on 1 Shared Background
          </div>

          {/* Both Camera Feeds Composited Side-by-Side on the SAME Background */}
          <div className="ai-merged-person-strip">
            <div className="ai-person-slot local">
              <VideoTile
                stream={localStream}
                label={username}
                isLocal
                micEnabled={micEnabled}
                cameraEnabled={cameraEnabled}
              />
            </div>

            {remoteEntries.map(([id, peer]) => (
              <div key={id} className="ai-person-slot remote">
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

        {/* Chat Drawer */}
        {isChatOpen && (
          <ChatPanel
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            onClose={() => setIsChatOpen(false)}
            currentUsername={username}
          />
        )}
      </main>

      {/* Control Bar */}
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
