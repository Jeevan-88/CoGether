import React, { useState, useEffect, useRef } from 'react';
import { useWebRTC } from '../../core/useWebRTC.js';
import { 
  ArrowLeft, Copy, Check, Users, MessageSquare, 
  Mic, MicOff, Video, VideoOff, Monitor, Smile, 
  Share2, Shield, SidebarClose, SidebarOpen, X,
  Lock, Unlock
} from 'lucide-react';
import NativePlayerStage from './components/NativePlayerStage.jsx';
import YouTubePlayerStage from './components/YouTubePlayerStage.jsx';
import CompanionHUDStage from './components/CompanionHUDStage.jsx';
import ScreenShareStage from './components/ScreenShareStage.jsx';
import CoWatchCameraTile from './components/CoWatchCameraTile.jsx';
import './CoWatchLayout.css';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';

export default function CoWatchPartyRoom({
  content,
  roomId,
  username,
  onBack,
  onLeave
}) {
  // 1. Live WebRTC Connection
  const {
    localStream,
    remoteStreams,
    micEnabled,
    cameraEnabled,
    isScreenSharing,
    connected,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    socketRef
  } = useWebRTC(roomId, username, SIGNALING_URL);

  // 2. Room & Layout States
  const [isSocialRailOpen, setIsSocialRailOpen] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [controlPolicy, setControlPolicy] = useState('HOST_ONLY'); // 'HOST_ONLY' | 'EVERYONE'
  const [chatMessages, setChatMessages] = useState([
    { id: 'sys-1', senderName: 'CoWatch', text: 'Room connected. Controls synced.', timestamp: 'Now' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [reactionsList, setReactionsList] = useState([]);
  const [remoteSyncState, setRemoteSyncState] = useState(null);
  const [isHost, setIsHost] = useState(true);
  const [activeStageMode, setActiveStageMode] = useState(() => {
    if (content?.playbackMode === 'EXTERNAL_PROVIDER') return 'COMPANION';
    if (content?.playbackMode === 'YOUTUBE_PLAYER') return 'YOUTUBE';
    return 'NATIVE';
  });

  const chatScrollRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Join authoritative room on socket
  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;

    s.emit('cowatch:join', {
      roomCode: roomId,
      username,
      role: 'HOST'
    });

    const handlePlaybackUpdate = (payload) => {
      setRemoteSyncState(payload);
    };

    const handleChatMessage = (msg) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const handleFloatingReaction = (reaction) => {
      setReactionsList((prev) => [...prev.slice(-6), reaction]);
      setTimeout(() => {
        setReactionsList((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 2500);
    };

    const handleScreenShareChange = ({ isSharing }) => {
      if (isSharing) setActiveStageMode('SCREEN_SHARE');
      else setActiveStageMode(content?.playbackMode === 'EXTERNAL_PROVIDER' ? 'COMPANION' : (content?.playbackMode === 'YOUTUBE_PLAYER' ? 'YOUTUBE' : 'NATIVE'));
    };

    s.on('cowatch:playback-update', handlePlaybackUpdate);
    s.on('cowatch:chat-message', handleChatMessage);
    s.on('cowatch:floating-reaction', handleFloatingReaction);
    s.on('cowatch:screen-share-change', handleScreenShareChange);

    return () => {
      s.emit('cowatch:leave', { roomCode: roomId });
      s.off('cowatch:playback-update', handlePlaybackUpdate);
      s.off('cowatch:chat-message', handleChatMessage);
      s.off('cowatch:floating-reaction', handleFloatingReaction);
      s.off('cowatch:screen-share-change', handleScreenShareChange);
    };
  }, [roomId, username, connected]);

  // Safe Clipboard Copy
  const handleCopyCode = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(roomId).catch(() => {});
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Broadcast Playback Action
  const handlePlaybackChange = ({ action, position }) => {
    const s = socketRef?.current;
    if (!s) return;

    if (action === 'PLAY') {
      s.emit('cowatch:play', { roomCode: roomId, position });
    } else if (action === 'PAUSE') {
      s.emit('cowatch:pause', { roomCode: roomId, position });
    } else if (action === 'SEEK') {
      s.emit('cowatch:seek', { roomCode: roomId, position });
    }
  };

  // Chat Send
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');

    const msgId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 6);
    const newMsg = {
      id: msgId,
      senderName: username || 'You',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages((prev) => [...prev, newMsg]);

    const s = socketRef?.current;
    if (s) {
      s.emit('cowatch:chat', { roomCode: roomId, text, msgId });
    }
  };

  // Emoji Reaction
  const handleSendEmoji = (emoji) => {
    const s = socketRef?.current;
    if (s) {
      s.emit('cowatch:reaction', { roomCode: roomId, emoji });
    } else {
      const newR = { id: Date.now(), senderName: username || 'You', emoji };
      setReactionsList((prev) => [...prev, newR]);
      setTimeout(() => setReactionsList((prev) => prev.filter((r) => r.id !== newR.id)), 2500);
    }
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    await toggleScreenShare();
    const nextState = !isScreenSharing;
    socketRef?.current?.emit('cowatch:screen-share-state', { roomCode: roomId, isSharing: nextState });
    if (nextState) {
      setActiveStageMode('SCREEN_SHARE');
    } else {
      setActiveStageMode(content?.playbackMode === 'EXTERNAL_PROVIDER' ? 'COMPANION' : (content?.playbackMode === 'YOUTUBE_PLAYER' ? 'YOUTUBE' : 'NATIVE'));
    }
  };

  // Participant List
  const remoteEntries = Object.entries(remoteStreams);
  const totalWatching = remoteEntries.length + 1;

  const participants = [
    { id: 'local', isLocal: true, stream: localStream, username: `${username} (You)`, micEnabled, cameraEnabled },
    ...remoteEntries.map(([id, peer]) => ({
      id,
      isLocal: false,
      stream: peer.stream,
      username: peer.username || 'Viewer',
      micEnabled: peer.micEnabled ?? true,
      cameraEnabled: peer.cameraEnabled ?? true
    }))
  ];

  return (
    <div className="cowatch-cinema-theater-root">
      {/* ── TOP THEATER BAR ── */}
      <header className="cinema-theater-top-bar">
        <div className="theater-top-left">
          <button type="button" className="btn-theater-back" onClick={onBack}>
            <ArrowLeft size={13} />
            <span>Cinema Hub</span>
          </button>

          <div className="theater-media-title-group">
            <h2>{content?.title || 'Watch Room'}</h2>
            <span className="theater-mode-indicator">
              {content?.genre || 'Feature'} · {content?.year || '2026'}
            </span>
          </div>
        </div>

        <div className="theater-top-right">
          {/* Host Control Policy Toggle */}
          {isHost && (
            <button
              type="button"
              className="btn-theater-back"
              onClick={() => setControlPolicy(controlPolicy === 'HOST_ONLY' ? 'EVERYONE' : 'HOST_ONLY')}
              title={controlPolicy === 'HOST_ONLY' ? 'Host only can control playback' : 'Everyone can control playback'}
              style={{ fontSize: '11px', gap: '5px' }}
            >
              {controlPolicy === 'HOST_ONLY' ? <Lock size={12} style={{ color: 'var(--cw-gold-primary)' }} /> : <Unlock size={12} />}
              <span>{controlPolicy === 'HOST_ONLY' ? 'Host Controls' : 'Open Controls'}</span>
            </button>
          )}

          {/* Room Code Badge */}
          <button
            type="button"
            className="theater-room-code-badge"
            onClick={handleCopyCode}
            title="Copy room invite code"
          >
            <span>{roomId}</span>
            {copiedCode ? <Check size={12} style={{ color: 'var(--cw-gold-light)' }} /> : <Copy size={12} />}
          </button>

          {/* Social Panel Toggle */}
          <button
            type="button"
            className="btn-theater-back btn-toggle-social"
            onClick={() => setIsSocialRailOpen(!isSocialRailOpen)}
            title={isSocialRailOpen ? 'Collapse Social Panel' : 'Expand Social Panel'}
          >
            {isSocialRailOpen ? <SidebarClose size={14} /> : <SidebarOpen size={14} />}
          </button>

          {/* Leave Button */}
          <button
            type="button"
            className="btn-theater-back"
            onClick={onLeave}
            style={{ color: 'var(--cw-crimson-primary)', borderColor: 'rgba(229, 9, 20, 0.5)' }}
          >
            <X size={13} />
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* ── MAIN THEATER STAGE & SOCIAL RAIL ── */}
      <div className="theater-stage-container">
        {/* DOMINANT CINEMA VIEWPORT */}
        <div className="theater-main-stage">
          {activeStageMode === 'SCREEN_SHARE' ? (
            <ScreenShareStage
              isSharing={isScreenSharing}
              screenStream={localStream}
              sharingUserName={username}
              onStartShare={handleToggleScreenShare}
              onStopShare={handleToggleScreenShare}
              onOpenProvider={() => {
                if (content?.externalUrl) window.open(content.externalUrl, '_blank', 'noopener,noreferrer');
              }}
              onSwitchToSyncMode={() => setActiveStageMode('COMPANION')}
            />
          ) : activeStageMode === 'COMPANION' ? (
            <CompanionHUDStage
              content={content}
              roomCode={roomId}
              isHost={isHost}
              controlPolicy={controlPolicy}
              onPlaybackChange={handlePlaybackChange}
              remoteSyncState={remoteSyncState}
            />
          ) : activeStageMode === 'YOUTUBE' ? (
            <YouTubePlayerStage
              videoId={content?.videoStreamUrl || 'jfKfPfyJRdk'}
              contentTitle={content?.title}
              isHost={isHost}
              controlPolicy={controlPolicy}
              onPlaybackChange={handlePlaybackChange}
              remoteSyncState={remoteSyncState}
              reactionsList={reactionsList}
            />
          ) : (
            <NativePlayerStage
              videoSrc={content?.videoStreamUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'}
              contentTitle={content?.title}
              isHost={isHost}
              controlPolicy={controlPolicy}
              onPlaybackChange={handlePlaybackChange}
              remoteSyncState={remoteSyncState}
              reactionsList={reactionsList}
            />
          )}
        </div>

        {/* SOCIAL PANEL: EXPANDED OR COLLAPSED ICON RAIL */}
        {isSocialRailOpen ? (
          <aside className="theater-social-rail">
            {/* Header */}
            <div className="social-rail-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={14} style={{ color: 'var(--cw-gold-primary)' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  Audience ({totalWatching})
                </span>
              </div>

              {/* Quick Media Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`btn-media-toggle ${micEnabled ? 'active' : 'off'}`}
                  title={micEnabled ? 'Mute' : 'Unmute'}
                >
                  {micEnabled ? <Mic size={12} /> : <MicOff size={12} />}
                </button>

                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`btn-media-toggle ${cameraEnabled ? 'active' : 'off'}`}
                  title={cameraEnabled ? 'Camera off' : 'Camera on'}
                >
                  {cameraEnabled ? <Video size={12} /> : <VideoOff size={12} />}
                </button>

                <button
                  type="button"
                  onClick={handleToggleScreenShare}
                  className={`btn-media-toggle ${isScreenSharing ? 'sharing' : ''}`}
                  title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                >
                  <Monitor size={12} />
                </button>
              </div>
            </div>

            {/* Rectangular Camera Tiles Grid */}
            <div className="social-camera-grid">
              {participants.map((p) => (
                <div key={p.id} style={{ height: '95px' }}>
                  <CoWatchCameraTile
                    stream={p.stream}
                    label={p.username}
                    micEnabled={p.micEnabled}
                    cameraEnabled={p.cameraEnabled}
                    isLocal={p.isLocal}
                  />
                </div>
              ))}
            </div>

            {/* Synchronized Live Chat Stream */}
            <div className="social-chat-stream">
              {chatMessages.map((m) => (
                <div key={m.id} className="social-chat-bubble">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 500, color: 'var(--cw-gold-light)', fontSize: '10px' }}>
                      {m.senderName}
                    </span>
                    <span style={{ color: 'var(--cw-text-muted)', fontSize: '9px', fontWeight: 300 }}>
                      {m.timestamp}
                    </span>
                  </div>
                  <div style={{ color: '#d8dae2', fontSize: '11px', lineHeight: '1.4', fontWeight: 300 }}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={chatScrollRef} />
            </div>

            {/* Quick Reaction Bar */}
            <div className="social-reactions-bar">
              {['🔥', '🍿', '😂', '👏', '❤️', '😱'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendEmoji(emoji)}
                  className="btn-reaction-emoji"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="social-chat-form">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message room..."
                className="social-chat-input"
              />
              <button type="submit" className="btn-social-chat-send">
                Send
              </button>
            </form>
          </aside>
        ) : (
          /* Collapsed Slim Icon Rail */
          <aside className="theater-social-rail-collapsed">
            <button
              type="button"
              onClick={() => setIsSocialRailOpen(true)}
              className="btn-rail-collapsed-action"
              title="Expand Social Panel"
            >
              <SidebarOpen size={16} />
            </button>

            <button
              type="button"
              onClick={() => setIsSocialRailOpen(true)}
              className="btn-rail-collapsed-action"
              title={`Audience (${totalWatching})`}
            >
              <Users size={16} />
              <span className="collapsed-rail-badge">{totalWatching}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSocialRailOpen(true)}
              className="btn-rail-collapsed-action"
              title="Chat"
            >
              <MessageSquare size={16} />
            </button>

            <button
              type="button"
              onClick={() => handleSendEmoji('🍿')}
              className="btn-rail-collapsed-action"
              title="Send Popcorn"
            >
              🍿
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
