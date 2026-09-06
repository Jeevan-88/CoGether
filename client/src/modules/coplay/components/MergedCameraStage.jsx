import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, Layers, Image as ImageIcon, UserCheck, UserX, 
  Upload, AlertTriangle, RefreshCw, Sliders 
} from 'lucide-react';
import { BUILTIN_BACKGROUNDS, getBackgroundById } from '../camera/BackgroundLibrary.js';
import { PersonSegmenter } from '../camera/PersonSegmenter.js';
import { MaskProcessor } from '../camera/MaskProcessor.js';
import { MergeCompositor } from '../camera/MergeCompositor.js';
import './MergedCameraStage.css';

export default function MergedCameraStage({
  localStream,
  remoteStreams = {},
  currentUsername = 'You',
  cameraEnabled = true,
  onToggleMergeOptOut,
  optedOutPeers = {},
  onFallbackToNormal
}) {
  const [selectedBgId, setSelectedBgId] = useState('cogether-stage');
  const [customBgUrl, setCustomBgUrl] = useState(null);
  const [showBgSelector, setShowBgSelector] = useState(false);
  const [qualityMode, setQualityMode] = useState('AUTO'); // 'AUTO' | 'HIGH' | 'MED' | 'LOW'
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const canvasRef = useRef(null);
  const compositorRef = useRef(null);
  const fileInputRef = useRef(null);

  // Segmentation & Video references
  const localVideoRef = useRef(document.createElement('video'));
  const remoteVideoRefs = useRef({});

  const segmenterRef = useRef(null);
  const maskProcessorsRef = useRef(new Map()); // id -> MaskProcessor
  const animFrameRef = useRef(null);
  const segmentIntervalRef = useRef(null);
  const isTabVisibleRef = useRef(!document.hidden);

  // 1. Initialize Local Video Stream
  useEffect(() => {
    const video = localVideoRef.current;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    if (localStream && cameraEnabled) {
      video.srcObject = localStream;
      video.play().catch(() => {});
    } else {
      video.srcObject = null;
    }
  }, [localStream, cameraEnabled]);

  // 2. Initialize Remote Video Streams
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([id, peer]) => {
      if (!remoteVideoRefs.current[id]) {
        const v = document.createElement('video');
        v.autoplay = true;
        v.muted = false;
        v.playsInline = true;
        remoteVideoRefs.current[id] = v;
      }
      const v = remoteVideoRefs.current[id];
      if (peer.stream && peer.cameraEnabled !== false && v.srcObject !== peer.stream) {
        v.srcObject = peer.stream;
        v.play().catch(() => {});
      } else if (peer.cameraEnabled === false) {
        v.srcObject = null;
      }
    });

    // Cleanup disconnected remote streams
    Object.keys(remoteVideoRefs.current).forEach((id) => {
      if (!remoteStreams[id]) {
        if (compositorRef.current) {
          compositorRef.current.removeParticipant(id);
        }
        delete remoteVideoRefs.current[id];
        maskProcessorsRef.current.delete(id);
      }
    });
  }, [remoteStreams]);

  // 3. Tab Visibility Handler (Throttles processing when hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 4. Initialize Local MediaPipe Segmenter & Compositor
  useEffect(() => {
    let isMounted = true;
    setStatus('loading');

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize Compositor
    const compositor = new MergeCompositor(canvas, {
      enableShadows: true,
      enableRimGlow: true
    });
    compositorRef.current = compositor;

    // Set Initial Background
    const bg = getBackgroundById(selectedBgId, customBgUrl);
    compositor.setBackground(bg.dataUrl);

    // Initialize PersonSegmenter
    const segmenter = new PersonSegmenter({
      quality: qualityMode,
      modelSelection: 1 // landscape model
    });
    segmenterRef.current = segmenter;

    segmenter
      .init()
      .then(() => {
        if (!isMounted) return;
        setStatus('ready');
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[MergedCameraStage] MediaPipe Segmenter failed to initialize:', err);
        setStatus('error');
        setErrorMessage("Live background segmentation couldn't start on this device.");
      });

    return () => {
      isMounted = false;
      if (segmenterRef.current) {
        segmenterRef.current.dispose();
        segmenterRef.current = null;
      }
      if (compositorRef.current) {
        compositorRef.current.dispose();
        compositorRef.current = null;
      }
    };
  }, []);

  // 5. Update Background on selection change
  useEffect(() => {
    if (compositorRef.current) {
      const bg = getBackgroundById(selectedBgId, customBgUrl);
      compositorRef.current.setBackground(bg.dataUrl);
    }
  }, [selectedBgId, customBgUrl]);

  // 6. Helper: get or create MaskProcessor for a participant
  const getMaskProcessor = (id) => {
    if (!maskProcessorsRef.current.has(id)) {
      maskProcessorsRef.current.set(id, new MaskProcessor({ temporalSmoothing: 0.72 }));
    }
    return maskProcessorsRef.current.get(id);
  };

  // 7. Segmentation Processing Loop (~18 FPS inference loop)
  useEffect(() => {
    if (status !== 'ready') return;

    const runSegmentation = async () => {
      if (!isTabVisibleRef.current) return;
      const segmenter = segmenterRef.current;
      const compositor = compositorRef.current;
      if (!segmenter || !compositor) return;

      // Process Local Stream
      if (!optedOutPeers['local'] && cameraEnabled && localStream) {
        const localVid = localVideoRef.current;
        if (localVid && localVid.readyState >= 2 && localVid.videoWidth > 0 && localVid.videoHeight > 0) {
          try {
            const rawResult = await segmenter.segment(localVid);
            if (rawResult && rawResult.maskCanvas) {
              const processor = getMaskProcessor('local');
              const smoothedMask = processor.process(rawResult.maskCanvas);

              compositor.updateParticipant('local', {
                video: localVid,
                maskCanvas: smoothedMask,
                isLocal: true,
                name: currentUsername,
                bounds: rawResult.bounds,
                cameraEnabled: true
              });
            }
          } catch (e) {
            console.warn('[MergedCameraStage] Local segmentation error:', e);
          }
        }
      } else {
        compositor.removeParticipant('local');
      }

      // Process Remote Streams (up to 3 peers)
      for (const [id, peer] of Object.entries(remoteStreams)) {
        if (!optedOutPeers[id] && peer.cameraEnabled !== false && peer.stream) {
          const remoteVid = remoteVideoRefs.current[id];
          if (remoteVid && remoteVid.readyState >= 2 && remoteVid.videoWidth > 0 && remoteVid.videoHeight > 0) {
            try {
              const rawResult = await segmenter.segment(remoteVid);
              if (rawResult && rawResult.maskCanvas) {
                const processor = getMaskProcessor(id);
                const smoothedMask = processor.process(rawResult.maskCanvas);

                compositor.updateParticipant(id, {
                  video: remoteVid,
                  maskCanvas: smoothedMask,
                  isLocal: false,
                  name: peer.username || 'Friend',
                  bounds: rawResult.bounds,
                  cameraEnabled: true
                });
              }
            } catch (e) {
              console.warn(`[MergedCameraStage] Remote segmentation error for ${id}:`, e);
            }
          }
        } else {
          compositor.removeParticipant(id);
        }
      }
    };

    // Run segmentation at a steady ~18 FPS (every 55ms)
    const intervalId = setInterval(runSegmentation, 55);
    segmentIntervalRef.current = intervalId;

    return () => {
      clearInterval(intervalId);
    };
  }, [status, optedOutPeers, cameraEnabled, localStream, remoteStreams, currentUsername]);

  // 8. 60 FPS GPU/Canvas Compositor Render Loop
  useEffect(() => {
    const renderLoop = () => {
      if (compositorRef.current && isTabVisibleRef.current) {
        compositorRef.current.render();
      }
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // 9. Custom Background File Upload Handler
  const handleCustomUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('Image file is too large (maximum 8MB).');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomBgUrl(objectUrl);
    setSelectedBgId('custom');
    setShowBgSelector(false);
  };

  return (
    <div className="merged-camera-stage-root">
      {/* Hidden mounted video elements for active MediaStream decoding & WebGL sinks */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      {Object.entries(remoteStreams).map(([id, peer]) => (
        <video
          key={id}
          ref={(el) => {
            if (el) {
              remoteVideoRefs.current[id] = el;
              if (peer.stream && el.srcObject !== peer.stream) {
                el.srcObject = peer.stream;
                el.play().catch(() => {});
              }
            }
          }}
          autoPlay
          playsInline
          muted={false}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        />
      ))}

      {/* Compositor Canvas (16:9 widescreen arcade resolution) */}
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        className="merged-composite-canvas"
      />

      {/* Loading Overlay */}
      {status === 'loading' && (
        <div className="merged-stage-loading-overlay">
          <div className="merge-spinner" />
          <span className="merge-loading-text">PREPARING MERGE STAGE...</span>
          <span className="merge-loading-subtext">Loading local AI human segmentation</span>
        </div>
      )}

      {/* Error Fallback Banner */}
      {status === 'error' && (
        <div className="merged-stage-error-overlay">
          <AlertTriangle size={24} className="error-icon" />
          <p className="error-text">{errorMessage}</p>
          <button
            type="button"
            className="btn-merge-fallback"
            onClick={onFallbackToNormal}
          >
            USE NORMAL CAMERAS
          </button>
        </div>
      )}

      {/* Top Floating Controls Bar */}
      <div className="merged-stage-top-controls">
        <div className="top-ctrl-left">
          <button
            type="button"
            className={`btn-merged-bg-toggle ${showBgSelector ? 'active' : ''}`}
            onClick={() => setShowBgSelector(!showBgSelector)}
            title="Change Scene Background"
          >
            <Layers size={12} />
            <span>BG</span>
          </button>

          <span className="merged-scene-tag">
            {getBackgroundById(selectedBgId, customBgUrl).name}
          </span>
        </div>

        {/* Participant Opt-Out Buttons */}
        <div className="merged-stage-opt-list">
          <button
            type="button"
            className={`btn-opt-pill ${optedOutPeers['local'] ? 'is-out' : ''}`}
            onClick={() => onToggleMergeOptOut && onToggleMergeOptOut('local')}
            title={optedOutPeers['local'] ? 'Add You to Merged Stage' : 'Opt Out You from Merge'}
          >
            {optedOutPeers['local'] ? <UserX size={10} /> : <UserCheck size={10} />}
            <span>You</span>
          </button>

          {Object.entries(remoteStreams).map(([id, peer]) => (
            <button
              key={id}
              type="button"
              className={`btn-opt-pill ${optedOutPeers[id] ? 'is-out' : ''}`}
              onClick={() => onToggleMergeOptOut && onToggleMergeOptOut(id)}
              title={optedOutPeers[id] ? `Add ${peer.username} to Merged Stage` : `Opt Out ${peer.username}`}
            >
              {optedOutPeers[id] ? <UserX size={10} /> : <UserCheck size={10} />}
              <span>{peer.username || 'Friend'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Background Selector Drawer */}
      {showBgSelector && (
        <div className="merged-bg-drawer fade-in">
          <div className="bg-drawer-header">
            <span>SELECT SHARED ENVIRONMENT</span>
            <button
              type="button"
              className="btn-drawer-close"
              onClick={() => setShowBgSelector(false)}
            >
              ✕
            </button>
          </div>

          <div className="bg-grid-options">
            {BUILTIN_BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                className={`bg-thumb-card ${selectedBgId === bg.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedBgId(bg.id);
                  setShowBgSelector(false);
                }}
              >
                <img
                  src={bg.dataUrl}
                  alt={bg.name}
                  className="bg-thumb-preview"
                />
                <span className="bg-thumb-label">{bg.name}</span>
              </button>
            ))}

            {/* Custom Image Option */}
            <button
              type="button"
              className={`bg-thumb-card custom-upload-card ${selectedBgId === 'custom' ? 'active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="bg-thumb-preview custom-preview">
                {customBgUrl ? (
                  <div
                    className="custom-img-fill"
                    style={{ backgroundImage: `url(${customBgUrl})` }}
                  />
                ) : (
                  <Upload size={18} className="upload-icon" />
                )}
              </div>
              <span className="bg-thumb-label">
                {customBgUrl ? 'Custom Image' : '+ Upload Image'}
              </span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleCustomUpload}
          />
        </div>
      )}
    </div>
  );
}
