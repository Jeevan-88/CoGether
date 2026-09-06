import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Layers, Image, UserCheck, UserX, Settings2 } from 'lucide-react';
import './MergedCameraStage.css';

const VIRTUAL_BACKGROUNDS = [
  {
    id: 'arcade-neon',
    name: 'Cyber Arcade',
    url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'vip-lounge',
    name: 'VIP Lounge',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'cinema-vip',
    name: 'Retro Cinema',
    url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80'
  }
];

export default function MergedCameraStage({
  localStream,
  remoteStreams = {},
  currentUsername = 'You',
  onToggleMergeOptOut,
  optedOutPeers = {}
}) {
  const [selectedBg, setSelectedBg] = useState('arcade-neon');
  const [showBgSelector, setShowBgSelector] = useState(false);

  const canvasRef = useRef(null);
  const localVideoRef = useRef(document.createElement('video'));
  const remoteVideoRefs = useRef({});
  const bgImageRef = useRef(new window.Image());
  const animRef = useRef(null);

  // Setup local video element
  useEffect(() => {
    const video = localVideoRef.current;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    if (localStream) {
      video.srcObject = localStream;
      video.play().catch(() => {});
    }
  }, [localStream]);

  // Setup remote video elements
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([id, peer]) => {
      if (!remoteVideoRefs.current[id]) {
        const v = document.createElement('video');
        v.autoplay = true;
        v.muted = false;
        v.playsInline = true;
        remoteVideoRefs.current[id] = v;
      }
      if (peer.stream && remoteVideoRefs.current[id].srcObject !== peer.stream) {
        remoteVideoRefs.current[id].srcObject = peer.stream;
        remoteVideoRefs.current[id].play().catch(() => {});
      }
    });

    // Cleanup disconnected
    Object.keys(remoteVideoRefs.current).forEach((id) => {
      if (!remoteStreams[id]) {
        delete remoteVideoRefs.current[id];
      }
    });
  }, [remoteStreams]);

  // Load selected background
  useEffect(() => {
    const bg = VIRTUAL_BACKGROUNDS.find((b) => b.id === selectedBg) || VIRTUAL_BACKGROUNDS[0];
    bgImageRef.current.crossOrigin = 'anonymous';
    bgImageRef.current.src = bg.url;
  }, [selectedBg]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw Virtual Background
      if (bgImageRef.current.complete && bgImageRef.current.naturalWidth > 0) {
        ctx.drawImage(bgImageRef.current, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
      }

      // Subtle dark vignette gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0,0,0,0.2)');
      grad.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Collect participants who are merged (not opted out)
      const participants = [];
      if (!optedOutPeers['local'] && localStream) {
        participants.push({
          id: 'local',
          name: currentUsername,
          video: localVideoRef.current,
          isLocal: true
        });
      }

      Object.entries(remoteStreams).forEach(([id, peer]) => {
        if (!optedOutPeers[id] && remoteVideoRefs.current[id]) {
          participants.push({
            id,
            name: peer.username || 'Friend',
            video: remoteVideoRefs.current[id],
            isLocal: false
          });
        }
      });

      const count = participants.length;
      if (count > 0) {
        const slotWidth = w / count;

        participants.forEach((p, index) => {
          const v = p.video;
          if (!v || v.readyState < 2) return;

          const cx = slotWidth * index + slotWidth / 2;
          const cy = h * 0.58;
          const radius = Math.min(slotWidth * 0.42, h * 0.42);

          // Draw Person Cutout (Rounded organic portrait with soft blur rim)
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          // Draw video feed mirrored for local
          if (p.isLocal) {
            ctx.translate(cx + radius, cy - radius);
            ctx.scale(-1, 1);
            ctx.drawImage(v, 0, 0, radius * 2, radius * 2);
          } else {
            ctx.drawImage(v, cx - radius, cy - radius, radius * 2, radius * 2);
          }
          ctx.restore();

          // Glowing Outline Rim
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#FFE500';
          ctx.shadowColor = '#FFE500';
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.restore();

          // Name Tag below player
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.roundRect(cx - 50, cy + radius + 6, 100, 20, 6);
          ctx.fill();
          ctx.font = '600 11px Barlow, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.name, cx, cy + radius + 16);
          ctx.restore();
        });
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [optedOutPeers, localStream, remoteStreams, currentUsername]);

  return (
    <div className="merged-camera-stage-wrapper">
      <canvas ref={canvasRef} width={480} height={260} className="merged-composite-canvas" />

      {/* Top Floating Mini Controls */}
      <div className="merged-stage-top-bar">
        <button
          type="button"
          className="btn-merged-bg-toggle"
          onClick={() => setShowBgSelector(!showBgSelector)}
          title="Change Virtual Background"
        >
          <Layers size={13} />
          <span>BG</span>
        </button>

        {/* Opt-out Badges list */}
        <div className="merged-opt-list">
          <button
            type="button"
            className={`btn-opt-pill ${optedOutPeers['local'] ? 'is-out' : ''}`}
            onClick={() => onToggleMergeOptOut && onToggleMergeOptOut('local')}
            title={optedOutPeers['local'] ? 'Include You in Merged View' : 'Exclude You from Merged View'}
          >
            {optedOutPeers['local'] ? <UserX size={11} /> : <UserCheck size={11} />}
            <span>You</span>
          </button>

          {Object.entries(remoteStreams).map(([id, peer]) => (
            <button
              key={id}
              type="button"
              className={`btn-opt-pill ${optedOutPeers[id] ? 'is-out' : ''}`}
              onClick={() => onToggleMergeOptOut && onToggleMergeOptOut(id)}
              title={optedOutPeers[id] ? `Include ${peer.username} in Merged View` : `Exclude ${peer.username}`}
            >
              {optedOutPeers[id] ? <UserX size={11} /> : <UserCheck size={11} />}
              <span>{peer.username || 'Peer'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Background Selector Drawer */}
      {showBgSelector && (
        <div className="merged-bg-drawer fade-in">
          {VIRTUAL_BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              type="button"
              className={`bg-thumb-option ${selectedBg === bg.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedBg(bg.id);
                setShowBgSelector(false);
              }}
            >
              <img src={bg.url} alt={bg.name} />
              <span>{bg.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
