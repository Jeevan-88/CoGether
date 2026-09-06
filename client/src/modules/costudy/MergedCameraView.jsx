import React, { useState, useEffect, useRef } from 'react';
import { useWebRTC } from '../../core/useWebRTC.js';
import ChatPanel from '../videoroom/ChatPanel.jsx';
import ControlBar from '../videoroom/ControlBar.jsx';
import { 
  Users, Copy, Check, ShieldCheck, Sparkles, 
  Layers, Image, Upload, Video, Mic, MicOff, Camera, 
  CameraOff, Maximize2, Minimize2, ArrowLeft, Palette, 
  Settings2, Wand2, Sliders, ChevronDown, Sun, SunMedium, 
  Tv, Eye, UserCheck, Crop, LayoutGrid, Zap, Smile
} from 'lucide-react';
import { FaceDetection } from '@mediapipe/face_detection';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import './MergedCameraView.css';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';

// Vibrant, High-Resolution Virtual Shared Rooms
const SHARED_ROOMS = [
  {
    id: 'cinema-vip',
    name: 'VIP Cinema Theater (Velvet Seats)',
    category: 'Cinema',
    url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1920&q=85',
    tag: 'CINEMA'
  },
  {
    id: 'luxury-sofa',
    name: 'Modern Living Room (Shared Sofa)',
    category: 'Living Room',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=85',
    tag: 'LIVING ROOM'
  },
  {
    id: 'cyber-loft',
    name: 'Neon Cyberpunk Gaming Studio',
    category: 'Studio',
    url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1920&q=85',
    tag: 'CYBERPUNK'
  },
  {
    id: 'midnight-lounge',
    name: 'Warm Wooden Cafe Lounge',
    category: 'Cafe',
    url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1920&q=85',
    tag: 'LOUNGE'
  },
  {
    id: 'sunset-balcony',
    name: 'Golden Hour Penthouse Balcony',
    category: 'Outdoor',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=85',
    tag: 'PENTHOUSE'
  },
  {
    id: 'pure-stage',
    name: 'Clean Bright Broadcast Soundstage',
    category: 'Soundstage',
    url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1920&q=85',
    tag: 'SOUNDSTAGE'
  }
];

export default function MergedCameraView({ roomId, username, onLeave }) {
  const {
    localStream,
    remoteStreams,
    micEnabled,
    cameraEnabled,
    isScreenSharing,
    connected,
    chatMessages,
    mediaError,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendChatMessage
  } = useWebRTC(roomId, username, SIGNALING_URL);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isBgPickerOpen, setIsBgPickerOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('cinema-vip');
  const [customBgUrl, setCustomBgUrl] = useState('');
  const [inputCustomUrl, setInputCustomUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Cutout Modes: 'face-cutout' (Face & Head Tracked Cutout) | 'body-cutout' (Full Selfie Segmentation)
  const [cutoutMode, setCutoutMode] = useState('face-cutout');
  const [brightnessLevel, setBrightnessLevel] = useState(105);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const compositeCanvasRef = useRef(null);
  const stageContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Real-Time Face Tracker Coordinates (Smooth Lerp Filtering)
  const localFaceBoxRef = useRef({ x: 0.5, y: 0.45, width: 0.35, height: 0.45, detected: false });
  const remoteFaceBoxRef = useRef({ x: 0.5, y: 0.45, width: 0.35, height: 0.45, detected: false });

  // Segmentation Mask Buffers
  const localCutoutCanvasRef = useRef(document.createElement('canvas'));
  const remoteCutoutCanvasRef = useRef(document.createElement('canvas'));
  const localMaskRef = useRef(null);
  const remoteMaskRef = useRef(null);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach primary remote stream
  const remoteEntries = Object.entries(remoteStreams);
  const primaryRemote = remoteEntries.length > 0 ? remoteEntries[0][1] : null;

  useEffect(() => {
    if (remoteVideoRef.current && primaryRemote?.stream) {
      remoteVideoRef.current.srcObject = primaryRemote.stream;
    }
  }, [primaryRemote?.stream]);

  // Background Image object for Canvas Compositor
  const activeBgUrl = selectedRoomId === 'custom' && customBgUrl 
    ? customBgUrl 
    : (SHARED_ROOMS.find(r => r.id === selectedRoomId)?.url || SHARED_ROOMS[0].url);

  const bgImageRef = useRef(new window.Image());
  useEffect(() => {
    bgImageRef.current.crossOrigin = 'anonymous';
    bgImageRef.current.src = activeBgUrl;
  }, [activeBgUrl]);

  /**
   * 1. MediaPipe Real-Time Face Detection (Tracks Face & Head Bounding Box)
   */
  useEffect(() => {
    let localFaceDetector = null;
    let remoteFaceDetector = null;
    let localSegmenter = null;
    let remoteSegmenter = null;
    let isMounted = true;

    try {
      // Face Detectors
      localFaceDetector = new FaceDetection({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
      });
      localFaceDetector.setOptions({ model: 'short', minDetectionConfidence: 0.5 });
      localFaceDetector.onResults((results) => {
        if (!isMounted || !results.detections || results.detections.length === 0) return;
        const bb = results.detections[0].boundingBox;
        // Smooth lerp interpolation
        const prev = localFaceBoxRef.current;
        localFaceBoxRef.current = {
          x: prev.x + (bb.xCenter - prev.x) * 0.3,
          y: prev.y + (bb.yCenter - prev.y) * 0.3,
          width: prev.width + (bb.width - prev.width) * 0.3,
          height: prev.height + (bb.height - prev.height) * 0.3,
          detected: true
        };
      });

      remoteFaceDetector = new FaceDetection({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
      });
      remoteFaceDetector.setOptions({ model: 'short', minDetectionConfidence: 0.5 });
      remoteFaceDetector.onResults((results) => {
        if (!isMounted || !results.detections || results.detections.length === 0) return;
        const bb = results.detections[0].boundingBox;
        const prev = remoteFaceBoxRef.current;
        remoteFaceBoxRef.current = {
          x: prev.x + (bb.xCenter - prev.x) * 0.3,
          y: prev.y + (bb.yCenter - prev.y) * 0.3,
          width: prev.width + (bb.width - prev.width) * 0.3,
          height: prev.height + (bb.height - prev.height) * 0.3,
          detected: true
        };
      });

      // Body Segmenters
      localSegmenter = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
      });
      localSegmenter.setOptions({ modelSelection: 1, selfieMode: true });
      localSegmenter.onResults((results) => {
        if (!isMounted) return;
        localMaskRef.current = results;
      });

      remoteSegmenter = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
      });
      remoteSegmenter.setOptions({ modelSelection: 1, selfieMode: false });
      remoteSegmenter.onResults((results) => {
        if (!isMounted) return;
        remoteMaskRef.current = results;
      });

      // Frame Analysis Loop (~30 FPS)
      let isRunning = true;
      const processVisionFrames = async () => {
        if (!isRunning) return;

        const localVid = localVideoRef.current;
        const remoteVid = remoteVideoRef.current;

        if (cameraEnabled && localVid && localVid.readyState >= 2 && localVid.videoWidth > 0) {
          try {
            await localFaceDetector.send({ image: localVid });
            await localSegmenter.send({ image: localVid });
          } catch (e) {}
        }

        if (primaryRemote && primaryRemote.cameraEnabled && remoteVid && remoteVid.readyState >= 2 && remoteVid.videoWidth > 0) {
          try {
            await remoteFaceDetector.send({ image: remoteVid });
            await remoteSegmenter.send({ image: remoteVid });
          } catch (e) {}
        }

        if (isRunning) {
          setTimeout(processVisionFrames, 33);
        }
      };

      processVisionFrames();

      return () => {
        isMounted = false;
        isRunning = false;
        localFaceDetector?.close();
        remoteFaceDetector?.close();
        localSegmenter?.close();
        remoteSegmenter?.close();
      };
    } catch (err) {
      console.warn('Face detection initialization note:', err);
    }
  }, [cameraEnabled, primaryRemote]);

  /**
   * 60FPS Video Face Cutout Canvas Compositor
   * Extracts face and head directly from video stream, and paints both faces side-by-side on 1 background!
   */
  useEffect(() => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const renderComposite = () => {
      if (!isRunning) return;

      const cw = canvas.width;
      const ch = canvas.height;

      // 1. Draw Shared Room Background
      if (bgImageRef.current && bgImageRef.current.complete) {
        ctx.filter = `brightness(${brightnessLevel}%) contrast(105%)`;
        ctx.drawImage(bgImageRef.current, 0, 0, cw, ch);
      } else {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, cw, ch);
      }

      ctx.filter = `brightness(${brightnessLevel}%) contrast(105%) saturate(106%)`;

      const localVid = localVideoRef.current;
      const remoteVid = remoteVideoRef.current;
      const localFace = localFaceBoxRef.current;
      const remoteFace = remoteFaceBoxRef.current;
      const localMask = localMaskRef.current;
      const remoteMask = remoteMaskRef.current;

      // ─────────────────────────────────────────────────────────────
      // 2. PERSON 1 (FACE & HEAD CUTOUT ON LEFT SIDE)
      // ─────────────────────────────────────────────────────────────
      if (cameraEnabled && localVid && localVid.readyState >= 2) {
        const targetW = cw * 0.44;
        const targetH = ch * 0.78;
        const targetX = cw * 0.05; // Left Seat
        const targetY = ch * 0.16;

        ctx.save();

        if (cutoutMode === 'face-cutout' && localFace.detected) {
          // Dynamic Face & Head Tracked Cutout
          const vw = localVid.videoWidth || 640;
          const vh = localVid.videoHeight || 480;

          // Crop region centered on detected face
          const faceCenterX = localFace.x * vw;
          const faceCenterY = localFace.y * vh;
          const cropSize = Math.max(localFace.width * vw * 1.8, localFace.height * vh * 1.8, 220);

          const srcX = Math.max(0, faceCenterX - cropSize / 2);
          const srcY = Math.max(0, faceCenterY - cropSize / 2 * 1.1);
          const srcW = Math.min(vw - srcX, cropSize);
          const srcH = Math.min(vh - srcY, cropSize * 1.25);

          // Smooth Portrait Face Oval Clip
          ctx.beginPath();
          ctx.ellipse(targetX + targetW * 0.5, targetY + targetH * 0.48, targetW * 0.38, targetH * 0.46, 0, 0, Math.PI * 2);
          ctx.clip();

          // Draw mirrored
          ctx.translate(targetX + targetW, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(localVid, srcX, srcY, srcW, srcH, 0, targetY, targetW, targetH);
        } else if (localMask && localMask.segmentationMask) {
          // Full Body Cutout with MediaPipe
          const tCanvas = localCutoutCanvasRef.current;
          tCanvas.width = localMask.image.width || 640;
          tCanvas.height = localMask.image.height || 480;
          const tCtx = tCanvas.getContext('2d');

          tCtx.clearRect(0, 0, tCanvas.width, tCanvas.height);
          tCtx.drawImage(localMask.segmentationMask, 0, 0, tCanvas.width, tCanvas.height);
          tCtx.globalCompositeOperation = 'source-in';
          tCtx.drawImage(localMask.image, 0, 0, tCanvas.width, tCanvas.height);
          tCtx.globalCompositeOperation = 'source-over';

          ctx.translate(targetX + targetW, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(tCanvas, 0, targetY, targetW, targetH);
        } else {
          // Fallback Face Portrait
          ctx.beginPath();
          ctx.ellipse(targetX + targetW * 0.5, targetY + targetH * 0.5, targetW * 0.4, targetH * 0.45, 0, 0, Math.PI * 2);
          ctx.clip();

          ctx.translate(targetX + targetW, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(localVid, 0, targetY, targetW, targetH);
        }

        ctx.restore();
      }

      // ─────────────────────────────────────────────────────────────
      // 3. PERSON 2 (FACE & HEAD CUTOUT ON RIGHT SIDE)
      // ─────────────────────────────────────────────────────────────
      if (primaryRemote && primaryRemote.cameraEnabled && remoteVid && remoteVid.readyState >= 2) {
        const targetW = cw * 0.44;
        const targetH = ch * 0.78;
        const targetX = cw * 0.51; // Right Seat
        const targetY = ch * 0.16;

        ctx.save();

        if (cutoutMode === 'face-cutout' && remoteFace.detected) {
          // Dynamic Face & Head Tracked Cutout
          const vw = remoteVid.videoWidth || 640;
          const vh = remoteVid.videoHeight || 480;

          const faceCenterX = remoteFace.x * vw;
          const faceCenterY = remoteFace.y * vh;
          const cropSize = Math.max(remoteFace.width * vw * 1.8, remoteFace.height * vh * 1.8, 220);

          const srcX = Math.max(0, faceCenterX - cropSize / 2);
          const srcY = Math.max(0, faceCenterY - cropSize / 2 * 1.1);
          const srcW = Math.min(vw - srcX, cropSize);
          const srcH = Math.min(vh - srcY, cropSize * 1.25);

          // Smooth Portrait Face Oval Clip
          ctx.beginPath();
          ctx.ellipse(targetX + targetW * 0.5, targetY + targetH * 0.48, targetW * 0.38, targetH * 0.46, 0, 0, Math.PI * 2);
          ctx.clip();

          ctx.drawImage(remoteVid, srcX, srcY, srcW, srcH, targetX, targetY, targetW, targetH);
        } else if (remoteMask && remoteMask.segmentationMask) {
          // Full Body Cutout with MediaPipe
          const tCanvas = remoteCutoutCanvasRef.current;
          tCanvas.width = remoteMask.image.width || 640;
          tCanvas.height = remoteMask.image.height || 480;
          const tCtx = tCanvas.getContext('2d');

          tCtx.clearRect(0, 0, tCanvas.width, tCanvas.height);
          tCtx.drawImage(remoteMask.segmentationMask, 0, 0, tCanvas.width, tCanvas.height);
          tCtx.globalCompositeOperation = 'source-in';
          tCtx.drawImage(remoteMask.image, 0, 0, tCanvas.width, tCanvas.height);
          tCtx.globalCompositeOperation = 'source-over';

          ctx.drawImage(tCanvas, targetX, targetY, targetW, targetH);
        } else {
          // Fallback Face Portrait
          ctx.beginPath();
          ctx.ellipse(targetX + targetW * 0.5, targetY + targetH * 0.5, targetW * 0.4, targetH * 0.45, 0, 0, Math.PI * 2);
          ctx.clip();

          ctx.drawImage(remoteVid, targetX, targetY, targetW, targetH);
        }

        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(renderComposite);
    };

    renderComposite();

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cutoutMode, brightnessLevel, cameraEnabled, primaryRemote]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}?room=${roomId}&mode=merged`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCustomFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomBgUrl(event.target.result);
        setSelectedRoomId('custom');
        setIsBgPickerOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCustomUrl = (e) => {
    e.preventDefault();
    if (!inputCustomUrl.trim()) return;
    setCustomBgUrl(inputCustomUrl.trim());
    setSelectedRoomId('custom');
    setInputCustomUrl('');
    setIsBgPickerOpen(false);
  };

  const toggleStageFullscreen = () => {
    if (!document.fullscreenElement) {
      stageContainerRef.current?.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  const totalParticipants = remoteEntries.length + 1;

  return (
    <div className="seamless-merged-universe fade-in" ref={stageContainerRef}>
      {/* Hidden Source Video Elements for AI Canvas Compositing */}
      <video ref={localVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
      <video ref={remoteVideoRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* ── 1. TOP NAVBAR (PURE BLACK, CRISP WHITE & YELLOW) ── */}
      <header className="seamless-camera-header">
        <div className="header-left-col">
          <button className="btn-header-back" onClick={onLeave} title="Back to Home">
            <ArrowLeft size={14} />
            <span>EXIT STUDIO</span>
          </button>

          <div className="studio-branding-wrap">
            <h1 className="studio-title-yellow">FACE CUTOUT VIDEO STUDIO</h1>
            <span className="studio-subtitle-cursive">real-time face cutout • side-by-side in 1 room</span>
          </div>
        </div>

        {/* Center: Controls for Room Background & Studio Brightness */}
        <div className="header-center-col">
          <button 
            className={`btn-choose-backdrop-trigger ${isBgPickerOpen ? 'active' : ''}`}
            onClick={() => setIsBgPickerOpen(!isBgPickerOpen)}
          >
            <Palette size={15} />
            <span>CHOOSE SHARED ROOM</span>
            <ChevronDown size={13} className={`chevron-ic ${isBgPickerOpen ? 'rotated' : ''}`} />
          </button>

          {/* Cutout Mode Selector */}
          <div className="cutout-mode-switcher-group">
            <button 
              className={`btn-mode-toggle ${cutoutMode === 'face-cutout' ? 'active-toggle' : ''}`}
              onClick={() => setCutoutMode('face-cutout')}
              title="Tracked Face & Head Cutout"
            >
              <Smile size={13} />
              <span>FACE CUTOUT</span>
            </button>
            <button 
              className={`btn-mode-toggle ${cutoutMode === 'body-cutout' ? 'active-toggle' : ''}`}
              onClick={() => setCutoutMode('body-cutout')}
              title="Full Body & Torso Cutout"
            >
              <UserCheck size={13} />
              <span>BODY CUTOUT</span>
            </button>
          </div>

          {/* Studio Brightness Slider */}
          <div className="studio-brightness-box">
            <Sun size={15} className="sun-icon" />
            <input 
              type="range" 
              min="90" 
              max="150" 
              value={brightnessLevel} 
              onChange={(e) => setBrightnessLevel(Number(e.target.value))}
              className="brightness-slider"
              title="Adjust Room Brightness"
            />
            <span className="bright-val">{brightnessLevel}%</span>
          </div>
        </div>

        {/* Right: Room Code & Participant Meta */}
        <div className="header-right-col">
          <button className="btn-room-code-badge" onClick={copyRoomCode} title="Click to copy Room Code">
            <span className="code-label">ROOM:</span>
            <strong className="code-val">{roomId}</strong>
            {copied ? <Check size={13} className="copied-yellow" /> : <Copy size={13} />}
          </button>

          <div className="participants-count-pill">
            <Users size={14} />
            <span>{totalParticipants} / 2 IN ROOM</span>
          </div>

          <button className="btn-fs-toggle" onClick={toggleStageFullscreen} title="Toggle Fullscreen">
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </header>

      {/* ── 2. VIRTUAL ROOM CHOOSER POPUP MODAL ── */}
      {isBgPickerOpen && (
        <div className="backdrop-picker-modal-overlay fade-in" onClick={() => setIsBgPickerOpen(false)}>
          <div className="backdrop-picker-card" onClick={(e) => e.stopPropagation()}>
            <div className="picker-card-header">
              <div>
                <h3 className="picker-main-title">Select Virtual Shared Room</h3>
                <p className="picker-subtitle">Both faces will be cut out and placed side-by-side inside this room.</p>
              </div>
              <button className="btn-close-picker" onClick={() => setIsBgPickerOpen(false)}>✕</button>
            </div>

            {/* Grid of Preset Virtual Rooms */}
            <div className="backdrops-preset-grid">
              {SHARED_ROOMS.map((room) => (
                <div 
                  key={room.id} 
                  className={`backdrop-preset-tile ${selectedRoomId === room.id ? 'active-tile' : ''}`}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setIsBgPickerOpen(false);
                  }}
                >
                  <img src={room.url} alt={room.name} className="backdrop-thumb-img" />
                  <div className="backdrop-tile-overlay">
                    <span className="backdrop-name">{room.name}</span>
                    <span className="backdrop-cat">{room.tag}</span>
                  </div>
                  {selectedRoomId === room.id && <span className="active-check-badge"><Check size={12} /></span>}
                </div>
              ))}
            </div>

            {/* Custom Image Upload & URL Input */}
            <div className="custom-bg-input-strip">
              <form onSubmit={handleApplyCustomUrl} className="custom-url-form">
                <Image size={15} className="url-form-icon" />
                <input 
                  type="text" 
                  placeholder="Or paste any custom room wallpaper URL..."
                  value={inputCustomUrl}
                  onChange={(e) => setInputCustomUrl(e.target.value)}
                  className="input-custom-bg-url"
                />
                <button type="submit" className="btn-apply-custom-url">APPLY URL</button>
              </form>

              <div className="upload-file-side">
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleCustomFileUpload} 
                />
                <button className="btn-upload-file" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={14} />
                  <span>UPLOAD PHOTO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. MAIN SAME-ROOM FACE CUTOUT CANVAS STAGE ── */}
      <main className="seamless-camera-stage-viewport">
        {mediaError && (
          <div className="studio-media-error-pill">
            <span>⚠️ {mediaError}</span>
          </div>
        )}

        {/* 
          SINGLE UNIFIED 1920x1080 CANVAS STAGE
          Both faces are cut out directly from video and painted side-by-side inside ONE shared background!
        */}
        <div className="unified-single-camera-wrapper">
          <canvas
            ref={compositeCanvasRef}
            width={1920}
            height={1080}
            className="unified-composite-canvas"
          />

          {/* On-Screen Participant Name Badges (Discreet Studio Overlays) */}
          <div className="studio-participant-tags-row">
            <div className="studio-tag-pill local-pill">
              <span className="pill-dot green-dot" />
              <span>{username} (You)</span>
              <span className={`pill-mic ${micEnabled ? 'mic-on' : 'mic-off'}`}>
                {micEnabled ? <Mic size={11} /> : <MicOff size={11} />}
              </span>
            </div>

            {primaryRemote ? (
              <div className="studio-tag-pill remote-pill">
                <span className="pill-dot green-dot" />
                <span>{primaryRemote.username || 'Friend'}</span>
                <span className={`pill-mic ${primaryRemote.micEnabled ? 'mic-on' : 'mic-off'}`}>
                  {primaryRemote.micEnabled ? <Mic size={11} /> : <MicOff size={11} />}
                </span>
              </div>
            ) : (
              <div className="studio-waiting-buddy-card" onClick={copyInviteLink}>
                <Users size={16} className="yellow-txt" />
                <span>Invite Friend to Couch: <strong>{roomId}</strong></span>
                {copied ? <Check size={12} className="copied-yellow" /> : <Copy size={12} />}
              </div>
            )}
          </div>

          {/* Studio Top Watermark Badge */}
          <div className="studio-top-watermark">
            <span className="watermark-live-dot">● FACE CUTOUT LIVE</span>
            <span className="watermark-info">MediaPipe Vision • 60 FPS Single Camera</span>
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

      {/* ── 4. CONTROL BAR (BOTTOM DECK) ── */}
      <footer className="seamless-bottom-deck">
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
      </footer>
    </div>
  );
}
