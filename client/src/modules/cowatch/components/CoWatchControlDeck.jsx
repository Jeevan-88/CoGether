import React from 'react';
import { 
  Mic, MicOff, Video, VideoOff, MessageSquare, 
  Layout, Film, Maximize, Minimize, LogOut, Eye, EyeOff
} from 'lucide-react';
import './CoWatchControlDeck.css';

export default function CoWatchControlDeck({
  micEnabled = true,
  cameraEnabled = true,
  onToggleMic,
  onToggleCamera,
  isChatOpen = true,
  onToggleChat,
  layoutMode = 'RAIL', // 'RAIL' | 'TRAY' | 'OVERLAY' | 'FOCUS'
  onChangeLayout,
  isCinemaMode = false,
  onToggleCinema,
  isFullscreen = false,
  onToggleFullscreen,
  onLeaveRoom
}) {
  const nextLayout = () => {
    if (layoutMode === 'RAIL') return 'TRAY';
    if (layoutMode === 'TRAY') return 'OVERLAY';
    return 'RAIL';
  };

  const getLayoutLabel = () => {
    if (layoutMode === 'RAIL') return 'SIDE RAIL';
    if (layoutMode === 'TRAY') return 'BOTTOM TRAY';
    if (layoutMode === 'OVERLAY') return 'CORNER OVERLAY';
    return 'FOCUS';
  };

  return (
    <div className="cowatch-control-deck-dock">
      <div className="deck-buttons-cluster">
        {/* Microphone Toggle */}
        <button
          type="button"
          className={`deck-btn ${micEnabled ? 'is-active-audio' : 'is-muted'}`}
          onClick={onToggleMic}
          title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
          <span className="deck-btn-label">{micEnabled ? 'MIC ON' : 'MUTED'}</span>
        </button>

        {/* Camera Toggle */}
        <button
          type="button"
          className={`deck-btn ${cameraEnabled ? 'is-active-cam' : 'is-cam-off'}`}
          onClick={onToggleCamera}
          title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {cameraEnabled ? <Video size={16} /> : <VideoOff size={16} />}
          <span className="deck-btn-label">{cameraEnabled ? 'CAM ON' : 'CAM OFF'}</span>
        </button>

        <div className="deck-divider" />

        {/* Chat Toggle */}
        <button
          type="button"
          className={`deck-btn ${isChatOpen ? 'is-highlighted' : ''}`}
          onClick={onToggleChat}
          title={isChatOpen ? 'Hide Chat' : 'Show Chat'}
        >
          <MessageSquare size={16} />
          <span className="deck-btn-label">CHAT</span>
        </button>

        {/* Layout Switcher (Rail / Tray / Overlay) */}
        <button
          type="button"
          className="deck-btn btn-layout-switch"
          onClick={() => onChangeLayout(nextLayout())}
          title={`Switch Layout (Current: ${getLayoutLabel()})`}
        >
          <Layout size={16} />
          <span className="deck-btn-label">{getLayoutLabel()}</span>
        </button>

        {/* Cinema Mode Toggle */}
        <button
          type="button"
          className={`deck-btn ${isCinemaMode ? 'is-cinema-active' : ''}`}
          onClick={onToggleCinema}
          title={isCinemaMode ? 'Exit Cinema Mode' : 'Enter Cinema Mode (Theater Darkened)'}
        >
          <Film size={16} />
          <span className="deck-btn-label">{isCinemaMode ? 'THEATER ON' : 'CINEMA'}</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          className="deck-btn"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          <span className="deck-btn-label">{isFullscreen ? 'EXIT' : 'FULLSCREEN'}</span>
        </button>

        <div className="deck-divider" />

        {/* Leave Room Button */}
        <button
          type="button"
          className="deck-btn btn-deck-leave"
          onClick={onLeaveRoom}
          title="Leave Watch Party"
        >
          <LogOut size={16} />
          <span className="deck-btn-label">LEAVE</span>
        </button>
      </div>
    </div>
  );
}
