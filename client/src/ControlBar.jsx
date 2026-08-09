import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, PhoneOff, Share2 } from 'lucide-react';

export default function ControlBar({
  micEnabled,
  cameraEnabled,
  isScreenSharing,
  isChatOpen,
  unreadCount,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onLeaveCall
}) {
  return (
    <div className="control-bar-floating">
      <div className="controls-group">
        <button
          className={`ctrl-btn ${micEnabled ? '' : 'btn-danger'}`}
          onClick={onToggleMic}
          title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button
          className={`ctrl-btn ${cameraEnabled ? '' : 'btn-danger'}`}
          onClick={onToggleCamera}
          title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <button
          className={`ctrl-btn ${isScreenSharing ? 'btn-active-cyan' : ''}`}
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
        >
          <Monitor size={20} />
        </button>

        <button
          className={`ctrl-btn ${isChatOpen ? 'btn-active-violet' : ''}`}
          onClick={onToggleChat}
          title="In-call Chat"
        >
          <MessageSquare size={20} />
          {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
        </button>

        <button className="ctrl-btn btn-leave" onClick={onLeaveCall} title="Leave Meeting">
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}
