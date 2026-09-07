import React, { useState } from 'react';
import { Users, ChevronUp, ChevronDown, User, Mic, MicOff } from 'lucide-react';
import CoWatchCameraTile from './CoWatchCameraTile.jsx';
import './CoWatchCameraTray.css';

export default function CoWatchCameraTray({
  localStream,
  username = 'You',
  micEnabled = true,
  cameraEnabled = true,
  remoteStreams = {},
  pinnedParticipantId = null,
  onTogglePin,
  isSelfHidden = false,
  onToggleHideSelf
}) {
  const [isTrayCollapsed, setIsTrayCollapsed] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);

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

  const MAX_VISIBLE = 5;
  const visibleParticipants = allParticipants.slice(0, MAX_VISIBLE);
  const overflowCount = Math.max(0, allParticipants.length - MAX_VISIBLE);

  return (
    <div className={`cowatch-camera-tray-container ${isTrayCollapsed ? 'is-collapsed' : ''}`}>
      {/* Tray Toggle Tab */}
      <div className="tray-collapse-header">
        <button
          type="button"
          className="btn-tray-toggle"
          onClick={() => setIsTrayCollapsed(!isTrayCollapsed)}
          title={isTrayCollapsed ? 'Expand camera tray' : 'Minimize camera tray'}
        >
          {isTrayCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{isTrayCollapsed ? `SHOW CAMERAS (${allParticipants.length})` : 'MINIMIZE TRAY'}</span>
        </button>

        {isTrayCollapsed && (
          <div className="tray-mini-pills">
            {allParticipants.slice(0, 4).map((p) => (
              <span key={p.id} className="mini-user-badge">
                <span className={`mini-status-dot ${p.micEnabled ? 'online' : 'muted'}`} />
                {p.username}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Horizontal Camera Tiles Strip */}
      {!isTrayCollapsed && (
        <div className="tray-scrollable-track">
          {visibleParticipants.map((p) => (
            <div key={p.id} className="tray-tile-wrapper">
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

          {/* +N Overflow Badge Button */}
          {overflowCount > 0 && (
            <button
              type="button"
              className="tray-overflow-card"
              onClick={() => setShowAllModal(true)}
              title="View all participants"
            >
              <Users size={20} className="overflow-icon" />
              <span className="overflow-badge">+{overflowCount} MORE</span>
            </button>
          )}
        </div>
      )}

      {/* All Participants Modal Drawer */}
      {showAllModal && (
        <div className="tray-overflow-modal-backdrop" onClick={() => setShowAllModal(false)}>
          <div className="tray-overflow-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-modal-header">
              <div className="modal-title-row">
                <Users size={16} />
                <h3>Room Participants ({allParticipants.length})</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowAllModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="overflow-participants-list">
              {allParticipants.map((p) => (
                <div key={p.id} className="overflow-participant-item">
                  <div className="p-avatar-circle">
                    {(p.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="p-meta">
                    <span className="p-name">{p.username} {p.isLocal && '(You)'}</span>
                    <span className="p-status">
                      {p.cameraEnabled ? 'Camera On' : 'Camera Off'} • {p.micEnabled ? 'Mic Active' : 'Muted'}
                    </span>
                  </div>
                  <div className="p-icons">
                    {p.micEnabled ? <Mic size={14} className="green" /> : <MicOff size={14} className="red" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
