import React from 'react';
import { Users } from 'lucide-react';
import CoWatchCameraTile from './CoWatchCameraTile.jsx';
import CoWatchChat from './CoWatchChat.jsx';
import './CoWatchSocialRail.css';

export default function CoWatchSocialRail({
  localStream,
  username = 'You',
  micEnabled = true,
  cameraEnabled = true,
  remoteStreams = {},
  pinnedParticipantId,
  onTogglePin,
  isSelfHidden = false,
  onToggleHideSelf,
  chatMessages = [],
  onSendMessage,
  onSendReaction,
  currentUsername,
  onClose
}) {
  const remoteEntries = Object.entries(remoteStreams);
  const allParticipants = [
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

  // If a participant is pinned, place them first
  const sortedParticipants = [...allParticipants].sort((a, b) => {
    if (a.id === pinnedParticipantId) return -1;
    if (b.id === pinnedParticipantId) return 1;
    return 0;
  });

  return (
    <aside className="cowatch-social-rail-aside">
      {/* Upper Section: Camera Presence */}
      <div className="rail-cameras-section">
        <div className="rail-section-header">
          <div className="header-meta-label">
            <Users size={13} className="header-icon" />
            <span>FRIENDS ({allParticipants.length})</span>
          </div>
        </div>

        <div className="rail-camera-tiles-stack">
          {sortedParticipants.map((p) => (
            <div key={p.id} className="rail-tile-slot">
              <CoWatchCameraTile
                stream={p.stream}
                label={p.username}
                isLocal={p.isLocal}
                micEnabled={p.micEnabled}
                cameraEnabled={p.cameraEnabled}
                isPinned={pinnedParticipantId === p.id}
                onTogglePin={() => onTogglePin?.(p.id)}
                onHideSelf={p.isLocal ? onToggleHideSelf : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Lower Section: Live Synchronized Chat */}
      <div className="rail-chat-section">
        <CoWatchChat
          messages={chatMessages}
          onSendMessage={onSendMessage}
          onSendReaction={onSendReaction}
          currentUsername={currentUsername}
          onClose={onClose}
        />
      </div>
    </aside>
  );
}
