import React, { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, Sparkles, ArrowRight, ShieldCheck, Copy, Check } from 'lucide-react';
import './Lobby.css';

export default function Lobby({ onJoinRoom }) {
  const [username, setUsername] = useState(localStorage.getItem('sp_username') || '');
  const [roomInput, setRoomInput] = useState('');
  const [previewStream, setPreviewStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef(null);

  useEffect(() => {
    let stream;
    async function startPreview() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setPreviewStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Could not load camera preview:', err);
      }
    }
    startPreview();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleCam = () => {
    if (previewStream) {
      const vTrack = previewStream.getVideoTracks()[0];
      if (vTrack) {
        vTrack.enabled = !camOn;
        setCamOn(!camOn);
      }
    }
  };

  const toggleMic = () => {
    if (previewStream) {
      const aTrack = previewStream.getAudioTracks()[0];
      if (aTrack) {
        aTrack.enabled = !micOn;
        setMicOn(!micOn);
      }
    }
  };

  const generateRoomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  };

  const handleStart = (targetRoomId) => {
    const finalName = username.trim() || 'User_' + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem('sp_username', finalName);
    onJoinRoom({
      roomId: targetRoomId || roomInput.trim() || generateRoomId(),
      username: finalName
    });
  };

  return (
    <div className="lobby-container fade-in">
      <div className="lobby-header-logo">
        <div className="logo-badge">
          <Sparkles size={20} className="sparkle-icon" />
          <span>StreamPulse WebRTC</span>
        </div>
      </div>

      <div className="lobby-grid">
        {/* Left Side: Preview Card */}
        <div className="preview-card">
          <div className="video-wrapper">
            {camOn ? (
              <video ref={videoRef} autoPlay playsInline muted className="preview-video" />
            ) : (
              <div className="cam-off-placeholder">
                <div className="avatar-circle">
                  {(username || 'U').charAt(0).toUpperCase()}
                </div>
                <p>Camera is turned off</p>
              </div>
            )}

            <div className="preview-controls-overlay">
              <button
                className={`preview-btn ${micOn ? '' : 'btn-off'}`}
                onClick={toggleMic}
                title={micOn ? 'Mute Mic' : 'Unmute Mic'}
              >
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                className={`preview-btn ${camOn ? '' : 'btn-off'}`}
                onClick={toggleCam}
                title={camOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {camOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
            </div>
          </div>
          <div className="preview-status">
            <span className="status-dot"></span> Ready to connect P2P
          </div>
        </div>

        {/* Right Side: Form Card */}
        <div className="form-card">
          <h2>Start or Join Video Call</h2>
          <p className="subtitle">High-quality, secure peer-to-peer WebRTC video rooms</p>

          <div className="input-group">
            <label>Your Display Name</label>
            <input
              type="text"
              placeholder="e.g. Alex Rivera"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="custom-input"
            />
          </div>

          <div className="input-group">
            <label>Room Code</label>
            <input
              type="text"
              placeholder="Enter 6-character room code"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              className="custom-input room-code-input"
            />
          </div>

          <div className="button-stack">
            {roomInput.trim() ? (
              <button className="btn-action primary-btn" onClick={() => handleStart(roomInput.trim())}>
                Join Meeting <ArrowRight size={18} />
              </button>
            ) : (
              <button className="btn-action primary-btn" onClick={() => handleStart()}>
                <Sparkles size={18} /> Create New Room
              </button>
            )}
          </div>

          <div className="privacy-note">
            <ShieldCheck size={16} /> Encrypted peer-to-peer signaling via WebRTC
          </div>
        </div>
      </div>
    </div>
  );
}
