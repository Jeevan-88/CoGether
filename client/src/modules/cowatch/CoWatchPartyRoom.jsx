import React, { useState, useEffect } from 'react';
import { useWebRTC } from '../../core/useWebRTC.js';
import { 
  ArrowLeft, Copy, Check, Users, Eye, EyeOff, 
  Film, AlertCircle, Share2, Sparkles, X, MessageSquare 
} from 'lucide-react';
import CoWatchVideoStage from './components/CoWatchVideoStage.jsx';
import CoWatchSocialRail from './components/CoWatchSocialRail.jsx';
import CoWatchCameraTray from './components/CoWatchCameraTray.jsx';
import CoWatchChat from './components/CoWatchChat.jsx';
import CoWatchControlDeck from './components/CoWatchControlDeck.jsx';
import './CoWatchPartyRoom.css';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';

export default function CoWatchPartyRoom({
  movie,
  streamEngine = 'direct_mp4', // 'direct_mp4' | 'web_embed'
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
    connected,
    chatMessages,
    videoSyncPayload,
    incomingReaction,
    systemToast,
    toggleMic,
    toggleCamera,
    sendChatMessage,
    sendVideoSync,
    sendVideoReaction
  } = useWebRTC(roomId, username, SIGNALING_URL);

  // 2. Room & Layout States
  // layoutMode: 'RAIL' (desktop default) | 'TRAY' | 'OVERLAY' | 'FOCUS'
  const [layoutMode, setLayoutMode] = useState('RAIL');
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [pinnedParticipantId, setPinnedParticipantId] = useState(null);
  const [isSelfHidden, setIsSelfHidden] = useState(false);

  // Modals & Feedback
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeToast, setActiveToast] = useState(null);

  // Participant Calculations
  const remoteEntries = Object.entries(remoteStreams);
  const totalWatching = remoteEntries.length + 1;

  const allParticipantsList = [
    { id: 'local', isLocal: true, stream: localStream, username, micEnabled, cameraEnabled },
    ...remoteEntries.map(([id, peer]) => ({
      id,
      isLocal: false,
      stream: peer.stream,
      username: peer.username || 'Friend',
      micEnabled: peer.micEnabled ?? true,
      cameraEnabled: peer.cameraEnabled ?? true
    }))
  ].filter((p) => !(p.isLocal && isSelfHidden));

  // Copy Room Invite Link / Code
  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}&mode=watch`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  // Toast Handler for Join / Leave Events
  useEffect(() => {
    if (!systemToast) return;
    setActiveToast(systemToast);
    const timer = setTimeout(() => setActiveToast(null), 3500);
    return () => clearTimeout(timer);
  }, [systemToast]);

  // Toggle Pinned Participant
  const handleTogglePin = (id) => {
    setPinnedParticipantId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={`cowatch-party-surface-root ${isCinemaMode ? 'cinema-active' : ''}`}>
      {/* ── TOP HEADER BAR ── */}
      {!isCinemaMode && (
        <header className="cowatch-party-header">
          <div className="header-left-zone">
            <button type="button" className="btn-header-back" onClick={onBack} title="Back to catalog">
              <ArrowLeft size={15} />
              <span>CATALOG</span>
            </button>

            <div className="header-movie-info">
              <h1 className="header-movie-title">
                {movie?.title || 'CoWatch Cinema'}
                {movie?.year ? ` (${movie.year})` : ''}
              </h1>
              {movie?.category && (
                <span className="header-category-tag">{movie.category}</span>
              )}
            </div>
          </div>

          <div className="header-center-zone">
            <span className="header-sync-badge">
              <span className="live-pulse-dot" />
              LIVE SYNCHRONIZED PARTY
            </span>

            <button
              type="button"
              className="btn-room-code-badge"
              onClick={handleCopyInvite}
              title="Click to copy invite link"
            >
              <span className="code-label">ROOM:</span>
              <span className="code-val">{roomId}</span>
              {copiedCode ? <Check size={13} className="green" /> : <Copy size={13} />}
            </button>
          </div>

          <div className="header-right-zone">
            <div className="header-watching-pill">
              <Users size={14} className="users-icon" />
              <span>{totalWatching} WATCHING</span>
            </div>

            {/* Focus Video / Social View Toggle */}
            <button
              type="button"
              className={`btn-header-toggle-social ${layoutMode === 'FOCUS' ? 'is-focus' : ''}`}
              onClick={() => setLayoutMode((prev) => (prev === 'FOCUS' ? 'RAIL' : 'FOCUS'))}
              title={layoutMode === 'FOCUS' ? 'Restore Social Rail' : 'Focus On Video'}
            >
              {layoutMode === 'FOCUS' ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{layoutMode === 'FOCUS' ? 'RESTORE SOCIAL' : 'FOCUS VIDEO'}</span>
            </button>

            <button
              type="button"
              className="btn-header-leave"
              onClick={() => setShowLeaveConfirm(true)}
              title="Leave Room"
            >
              <X size={16} />
            </button>
          </div>
        </header>
      )}

      {/* ── SYSTEM EVENT TOAST ── */}
      {activeToast && (
        <div className="cowatch-system-toast-banner fade-in">
          <span className="toast-dot" />
          <span className="toast-message">{activeToast.text}</span>
        </div>
      )}

      {/* ── MAIN 100DVH PLAYGROUND BODY ── */}
      <main className={`cowatch-party-main-stage layout-${layoutMode.toLowerCase()}`}>
        {/* CENTER / LEFT: DOMINANT VIDEO STAGE */}
        <section className="cowatch-video-viewport-wrapper">
          <CoWatchVideoStage
            movie={movie}
            streamEngine={streamEngine}
            videoSyncPayload={videoSyncPayload}
            onBroadcastSync={sendVideoSync}
            incomingReaction={incomingReaction}
            layoutMode={layoutMode}
            overlayParticipants={allParticipantsList}
            pinnedParticipantId={pinnedParticipantId}
            onTogglePin={handleTogglePin}
            isCinemaMode={isCinemaMode}
            roomCode={roomId}
          />

          {/* BOTTOM FLOATING CONTROL DECK */}
          <div className="cowatch-floating-deck-layer">
            <CoWatchControlDeck
              micEnabled={micEnabled}
              cameraEnabled={cameraEnabled}
              onToggleMic={toggleMic}
              onToggleCamera={toggleCamera}
              isChatOpen={isChatOpen}
              onToggleChat={() => {
                if (window.innerWidth <= 768) {
                  setIsMobileChatOpen(!isMobileChatOpen);
                } else {
                  setIsChatOpen(!isChatOpen);
                }
              }}
              layoutMode={layoutMode}
              onChangeLayout={(mode) => setLayoutMode(mode)}
              isCinemaMode={isCinemaMode}
              onToggleCinema={() => setIsCinemaMode(!isCinemaMode)}
              onLeaveRoom={() => setShowLeaveConfirm(true)}
            />
          </div>

          {/* DOCKED BOTTOM CAMERA TRAY (in TRAY mode or Mobile) */}
          {layoutMode === 'TRAY' && !isCinemaMode && (
            <div className="cowatch-bottom-tray-layer">
              <CoWatchCameraTray
                localStream={localStream}
                username={username}
                micEnabled={micEnabled}
                cameraEnabled={cameraEnabled}
                remoteStreams={remoteStreams}
                pinnedParticipantId={pinnedParticipantId}
                onTogglePin={handleTogglePin}
                isSelfHidden={isSelfHidden}
                onToggleHideSelf={() => setIsSelfHidden(!isSelfHidden)}
              />
            </div>
          )}
        </section>

        {/* RIGHT: DESKTOP SOCIAL RAIL (in RAIL mode) */}
        {layoutMode === 'RAIL' && isChatOpen && !isCinemaMode && (
          <CoWatchSocialRail
            localStream={localStream}
            username={username}
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
            remoteStreams={remoteStreams}
            pinnedParticipantId={pinnedParticipantId}
            onTogglePin={handleTogglePin}
            isSelfHidden={isSelfHidden}
            onToggleHideSelf={() => setIsSelfHidden(!isSelfHidden)}
            chatMessages={chatMessages}
            onSendMessage={sendChatMessage}
            onSendReaction={sendVideoReaction}
            currentUsername={username}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </main>

      {/* ── MOBILE CHAT BOTTOM SHEET DRAWER ── */}
      {isMobileChatOpen && (
        <div className="mobile-chat-drawer-backdrop" onClick={() => setIsMobileChatOpen(false)}>
          <div className="mobile-chat-drawer-sheet" onClick={(e) => e.stopPropagation()}>
            <CoWatchChat
              messages={chatMessages}
              onSendMessage={sendChatMessage}
              onSendReaction={sendVideoReaction}
              currentUsername={username}
              onClose={() => setIsMobileChatOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── ACCIDENTAL LEAVE CONFIRMATION MODAL ── */}
      {showLeaveConfirm && (
        <div className="cowatch-modal-backdrop fade-in" onClick={() => setShowLeaveConfirm(false)}>
          <div className="cowatch-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog-header">
              <AlertCircle size={24} className="dialog-alert-icon" />
              <h3>LEAVE WATCH PARTY?</h3>
            </div>
            <p className="confirm-dialog-body">
              You are currently synchronized with your friends in room <strong>{roomId}</strong>. Leaving will disconnect your camera and audio.
            </p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="btn-confirm-cancel"
                onClick={() => setShowLeaveConfirm(false)}
              >
                STAY IN PARTY
              </button>
              <button
                type="button"
                className="btn-confirm-leave"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  onLeave?.();
                }}
              >
                LEAVE ROOM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
