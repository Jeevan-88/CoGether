import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const DEFAULT_ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
};

export function useWebRTC(roomId, username, signalingUrl, options = { autoStartMedia: true }) {
  const autoStart = options?.autoStartMedia !== false;
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // id -> { stream, username, micEnabled, cameraEnabled }
  const [peerConnectionStates, setPeerConnectionStates] = useState({}); // id -> 'NEW' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED'
  const [micEnabled, setMicEnabled] = useState(autoStart);
  const [cameraEnabled, setCameraEnabled] = useState(autoStart);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [mediaError, setMediaError] = useState(null);
  const [peerReady, setPeerReady] = useState(false);
  const [challengeCountdown, setChallengeCountdown] = useState(null);
  const [peerScore, setPeerScore] = useState(null);
  const [peerBoards, setPeerBoards] = useState({});
  const [peerEliminated, setPeerEliminated] = useState({});
  const [peerWon, setPeerWon] = useState(null);
  const [videoSyncPayload, setVideoSyncPayload] = useState(null);
  const [incomingReaction, setIncomingReaction] = useState(null);
  const [systemToast, setSystemToast] = useState(null);

  const socketRef = useRef(null);
  const peersRef = useRef({}); // id -> RTCPeerConnection
  const sendersRef = useRef({}); // id -> { videoSender, audioSender }
  const localStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const iceServersRef = useRef(DEFAULT_ICE_SERVERS);

  // Helper to send structured client WebRTC lifecycle telemetry to backend
  const sendTelemetry = useCallback((eventType, details = {}) => {
    if (!signalingUrl) return;
    fetch(`${signalingUrl}/api/v1/telemetry/webrtc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        roomId,
        details: typeof details === 'string' ? details : JSON.stringify(details)
      })
    }).catch(() => {});
  }, [signalingUrl, roomId]);

  // Helper to evaluate and update peer connection status
  const updatePeerState = useCallback((remoteId, pc) => {
    let state = 'NEW';
    const connState = pc.connectionState;
    const iceState = pc.iceConnectionState;

    if (connState === 'connected' || iceState === 'connected' || iceState === 'completed') {
      state = 'CONNECTED';
    } else if (connState === 'connecting' || iceState === 'checking') {
      state = 'CONNECTING';
    } else if (connState === 'failed' || iceState === 'failed') {
      state = 'FAILED';
    } else if (connState === 'disconnected' || iceState === 'disconnected') {
      state = 'DISCONNECTED';
    }

    setPeerConnectionStates((prev) => {
      if (prev[remoteId] === state) return prev;
      return { ...prev, [remoteId]: state };
    });

    if (state === 'CONNECTED') {
      sendTelemetry('webrtc_connected', { remoteId, iceState, connState });
    } else if (state === 'FAILED') {
      sendTelemetry('webrtc_failed', { remoteId, iceState, connState });
    }
  }, [sendTelemetry]);

  // Helper to create RTCPeerConnection for a remote peer
  const createPeerConnection = useCallback((remoteId, remoteUsername, initialMic = true, initialCam = true) => {
    if (peersRef.current[remoteId]) {
      return peersRef.current[remoteId];
    }

    const pc = new RTCPeerConnection(iceServersRef.current);
    sendersRef.current[remoteId] = {};
    sendTelemetry('webrtc_peer_connection_created', { remoteId });

    // Add local tracks to PC
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, localStreamRef.current);
        if (track.kind === 'video') {
          sendersRef.current[remoteId].videoSender = sender;
        } else if (track.kind === 'audio') {
          sendersRef.current[remoteId].audioSender = sender;
        }
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { to: remoteId, candidate: event.candidate });
      }
    };

    pc.onicecandidateerror = (err) => {
      sendTelemetry('ice_gathering_failed', { remoteId, code: err.errorCode, text: err.errorText });
    };

    // Remote Track handler
    pc.ontrack = (event) => {
      const incomingStream = event.streams[0];
      setRemoteStreams((prev) => ({
        ...prev,
        [remoteId]: {
          stream: incomingStream,
          username: remoteUsername || prev[remoteId]?.username || 'Participant',
          micEnabled: prev[remoteId]?.micEnabled ?? initialMic,
          cameraEnabled: prev[remoteId]?.cameraEnabled ?? initialCam
        }
      }));
    };

    // Connection state listeners
    pc.onconnectionstatechange = () => updatePeerState(remoteId, pc);
    pc.oniceconnectionstatechange = () => updatePeerState(remoteId, pc);

    peersRef.current[remoteId] = pc;
    updatePeerState(remoteId, pc);
    return pc;
  }, [sendTelemetry, updatePeerState]);

  useEffect(() => {
    let cancelled = false;

    async function initMediaAndSocket() {
      // 1. Resolve Dynamic ICE Servers
      try {
        const iceRes = await fetch(`${signalingUrl}/api/v1/webrtc/ice-servers`);
        if (iceRes.ok) {
          const iceData = await iceRes.json();
          if (iceData.iceServers && iceData.iceServers.length > 0) {
            iceServersRef.current = iceData;
          }
        }
      } catch (e) {
        console.warn('Could not fetch dynamic ICE servers, using defaults');
      }

      // 2. Initialize Local Camera / Microphone
      let stream = null;
      if (autoStart) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (err) {
          console.warn('Could not get video+audio, trying audio only...', err);
          sendTelemetry('camera_permission_denied', { error: err.message });
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            setCameraEnabled(false);
          } catch (audioErr) {
            console.warn('Could not get any media stream', audioErr);
            sendTelemetry('mic_permission_denied', { error: audioErr.message });
            setMediaError('Camera and microphone access denied or unavailable. Avatar fallback mode active.');
            setCameraEnabled(false);
            setMicEnabled(false);
          }
        }
      }

      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (stream) {
        localStreamRef.current = stream;
        setLocalStream(stream);
      }

      // 3. Ensure Authenticated JWT Token Exists (prefer verified member token)
      let authToken = localStorage.getItem('cogether_access_token') || localStorage.getItem('cogether_jwt');
      if (!authToken) {
        try {
          const authRes = await fetch(`${signalingUrl}/api/v1/auth/guest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: username || 'Guest' })
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            authToken = authData.token;
            localStorage.setItem('cogether_jwt', authToken);
          }
        } catch (e) {
          console.warn('Could not obtain guest session token:', e);
        }
      }

      // 4. Initialize Authenticated Socket Connection
      const socket = io(signalingUrl, {
        auth: { token: authToken },
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 10000
      });
      socketRef.current = socket;

      socket.on('connect_error', async (err) => {
        if (err.message && err.message.includes('AUTHENTICATION')) {
          console.warn('Socket auth expired or invalid, refreshing token...');
          localStorage.removeItem('cogether_jwt');
          try {
            const authRes = await fetch(`${signalingUrl}/api/v1/auth/guest`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ displayName: username || 'Guest' })
            });
            if (authRes.ok) {
              const authData = await authRes.json();
              socket.auth = { token: authData.token };
              localStorage.setItem('cogether_jwt', authData.token);
              socket.connect();
            }
          } catch (e) {}
        }
      });

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('join-room', {
          roomId,
          username,
          micEnabled: autoStart ? (stream?.getAudioTracks().length > 0) : false,
          cameraEnabled: autoStart ? (stream?.getVideoTracks().length > 0) : false
        });

        // Trigger ICE restart for any existing peer connections recovering from reconnect
        Object.entries(peersRef.current).forEach(async ([peerId, pc]) => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            try {
              const offer = await pc.createOffer({ iceRestart: true });
              await pc.setLocalDescription(offer);
              socket.emit('offer', { to: peerId, offer });
            } catch (e) {}
          }
        });
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('error', (errPayload) => {
        if (errPayload?.code === 'INVALID_ROOM_ID') {
          setMediaError(errPayload.message || 'Invalid Room ID');
        }
      });

      // Handle list of users already in the room
      socket.on('existing-users', async (users) => {
        for (const user of users) {
          const pc = createPeerConnection(user.id, user.username, user.micEnabled, user.cameraEnabled);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('offer', { to: user.id, offer });
          } catch (err) {
            console.error('Error creating offer:', err);
          }
        }
      });

      // Handle incoming offer from a peer
      socket.on('offer', async ({ from, offer, username: peerUsername }) => {
        const pc = createPeerConnection(from, peerUsername);
        try {
          if (pc.signalingState !== 'stable') {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }).catch(() => {}),
              pc.setRemoteDescription(new RTCSessionDescription(offer))
            ]);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { to: from, answer });
        } catch (err) {
          console.error('Error handling offer:', err);
        }
      });

      // Handle incoming answer from a peer
      socket.on('answer', async ({ from, answer }) => {
        const pc = peersRef.current[from];
        if (pc && pc.signalingState !== 'stable') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error('Error setting remote description:', err);
          }
        }
      });

      // Handle ICE Candidate
      socket.on('ice-candidate', async ({ from, candidate }) => {
        const pc = peersRef.current[from];
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Failed to add ICE candidate', err);
          }
        }
      });

      // Remote peer updated mic/camera state
      socket.on('user-media-changed', ({ id, micEnabled: remoteMic, cameraEnabled: remoteCam }) => {
        setRemoteStreams((prev) => {
          if (!prev[id]) return prev;
          return {
            ...prev,
            [id]: {
              ...prev[id],
              micEnabled: remoteMic,
              cameraEnabled: remoteCam
            }
          };
        });
      });

      // Incoming Chat Message
      socket.on('chat-message', (messagePayload) => {
        setChatMessages((prev) => [...prev, messagePayload]);
      });

      // CoGether Challenge Sync Events
      socket.on('challenge-peer-ready', ({ ready }) => {
        setPeerReady(ready);
      });

      socket.on('challenge-countdown-start', ({ countdownSeconds }) => {
        setChallengeCountdown(countdownSeconds);
      });

      socket.on('challenge-peer-score', ({ score, finalResult }) => {
        setPeerScore({ score, finalResult });
      });

      socket.on('challenge-peer-board-sync', (payload) => {
        setPeerBoards((prev) => ({
          ...prev,
          [payload.peerId]: {
            ...prev[payload.peerId],
            ...payload
          }
        }));
      });

      socket.on('challenge-peer-eliminated', (payload) => {
        setPeerEliminated((prev) => ({
          ...prev,
          [payload.peerId]: payload
        }));
      });

      socket.on('challenge-peer-won', (payload) => {
        setPeerWon(payload);
      });

      // Co-Watch Synchronized Video Stream Sync
      socket.on('video-sync', (payload) => {
        setVideoSyncPayload(payload);
      });

      // Co-Watch Real-Time Floating Reactions
      socket.on('video-reaction', (payload) => {
        setIncomingReaction(payload);
      });

      // Someone new joined after us
      socket.on('user-joined', ({ id, username: newUsername, micEnabled: newMic, cameraEnabled: newCam }) => {
        setRemoteStreams((prev) => ({
          ...prev,
          [id]: {
            stream: null,
            username: newUsername,
            micEnabled: newMic,
            cameraEnabled: newCam
          }
        }));
        setSystemToast({
          id: Math.random().toString(36).substring(2, 9),
          text: `${newUsername || 'A friend'} joined the room`,
          type: 'join',
          time: Date.now()
        });
      });

      // User Left
      socket.on('user-left', (id) => {
        const leavingName = remoteStreams[id]?.username || 'A friend';
        if (peersRef.current[id]) {
          peersRef.current[id].close();
          delete peersRef.current[id];
        }
        delete sendersRef.current[id];
        setPeerConnectionStates((prev) => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        setRemoteStreams((prev) => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        setSystemToast({
          id: Math.random().toString(36).substring(2, 9),
          text: `${leavingName} left the room`,
          type: 'leave',
          time: Date.now()
        });
      });
    }

    initMediaAndSocket();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenTrackRef.current?.stop();
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      sendersRef.current = {};
      socketRef.current?.disconnect();
    };
  }, [roomId, username, signalingUrl, autoStart, createPeerConnection, sendTelemetry]);

  // Toggle Microphone
  const toggleMic = async () => {
    if (!localStreamRef.current || localStreamRef.current.getAudioTracks().length === 0) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: cameraEnabled, audio: true });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setMicEnabled(true);

        // Add tracks and renegotiate
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          for (const [remoteId, pc] of Object.entries(peersRef.current)) {
            const sender = pc.addTrack(audioTrack, stream);
            sendersRef.current[remoteId] = sendersRef.current[remoteId] || {};
            sendersRef.current[remoteId].audioSender = sender;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current?.emit('offer', { to: remoteId, offer });
          }
        }
        socketRef.current?.emit('toggle-media', { micEnabled: true, cameraEnabled });
        return;
      } catch (err) {
        console.warn('Could not activate microphone on demand:', err);
        return;
      }
    }

    const nextMic = !micEnabled;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = nextMic;
    });
    setMicEnabled(nextMic);
    socketRef.current?.emit('toggle-media', { micEnabled: nextMic, cameraEnabled });
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (!localStreamRef.current || localStreamRef.current.getVideoTracks().length === 0) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: micEnabled });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setCameraEnabled(true);

        // Add tracks and renegotiate
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          for (const [remoteId, pc] of Object.entries(peersRef.current)) {
            const sender = pc.addTrack(videoTrack, stream);
            sendersRef.current[remoteId] = sendersRef.current[remoteId] || {};
            sendersRef.current[remoteId].videoSender = sender;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current?.emit('offer', { to: remoteId, offer });
          }
        }
        socketRef.current?.emit('toggle-media', { micEnabled, cameraEnabled: true });
        return;
      } catch (err) {
        console.warn('Could not activate camera on demand:', err);
        return;
      }
    }

    const nextCam = !cameraEnabled;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = nextCam;
    });
    setCameraEnabled(nextCam);
    socketRef.current?.emit('toggle-media', { micEnabled, cameraEnabled: nextCam });
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      if (cameraTrack) {
        Object.values(sendersRef.current).forEach(({ videoSender }) => {
          if (videoSender) videoSender.replaceTrack(cameraTrack);
        });
      }
      setIsScreenSharing(false);
      socketRef.current?.emit('screen-share-status', { isSharing: false });
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        Object.values(sendersRef.current).forEach(({ videoSender }) => {
          if (videoSender) videoSender.replaceTrack(screenTrack);
        });

        setIsScreenSharing(true);
        socketRef.current?.emit('screen-share-status', { isSharing: true });

        screenTrack.onended = () => {
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          if (camTrack) {
            Object.values(sendersRef.current).forEach(({ videoSender }) => {
              if (videoSender) videoSender.replaceTrack(camTrack);
            });
          }
          setIsScreenSharing(false);
          socketRef.current?.emit('screen-share-status', { isSharing: false });
        };
      } catch (err) {
        console.error('Error starting screen share:', err);
      }
    }
  };

  const sendChatMessage = (text) => {
    if (socketRef.current && text.trim()) {
      socketRef.current.emit('send-chat-message', { text });
    }
  };

  const sendChallengeReady = (ready) => {
    socketRef.current?.emit('challenge-ready', { ready });
  };

  const sendChallengeStart = (countdownSeconds = 3) => {
    socketRef.current?.emit('challenge-start', { countdownSeconds });
  };

  const sendChallengeScore = (score, finalResult = false) => {
    socketRef.current?.emit('challenge-score', { score, finalResult });
  };

  const sendChallengeBoardSync = (payload) => {
    socketRef.current?.emit('challenge-board-sync', payload);
  };

  const sendPlayerEliminated = (score) => {
    socketRef.current?.emit('challenge-player-eliminated', { score });
  };

  const sendPlayerWon = (score) => {
    socketRef.current?.emit('challenge-player-won', { score });
  };

  const sendVideoSync = (actionPayload) => {
    socketRef.current?.emit('video-sync', actionPayload);
  };

  const sendVideoReaction = (emoji) => {
    socketRef.current?.emit('video-reaction', { emoji });
  };

  // Derive composite connection state:
  // ONLY reported as CONNECTED when an active peer's RTCPeerConnection is actually connected.
  const remotePeerIds = Object.keys(remoteStreams);
  let overallConnectionState = 'DISCONNECTED';
  if (connected) {
    if (remotePeerIds.length === 0) {
      overallConnectionState = 'NEW';
    } else {
      const states = Object.values(peerConnectionStates);
      if (states.includes('CONNECTED')) {
        overallConnectionState = 'CONNECTED';
      } else if (states.includes('CONNECTING')) {
        overallConnectionState = 'CONNECTING';
      } else if (states.includes('FAILED')) {
        overallConnectionState = 'FAILED';
      } else if (states.includes('DISCONNECTED')) {
        overallConnectionState = 'DISCONNECTED';
      } else {
        overallConnectionState = 'CONNECTING';
      }
    }
  }

  return {
    localStream,
    remoteStreams,
    micEnabled,
    cameraEnabled,
    isScreenSharing,
    connected,
    connectionState: overallConnectionState,
    peerConnectionStates,
    chatMessages,
    mediaError,
    peerReady,
    challengeCountdown,
    peerScore,
    peerBoards,
    peerEliminated,
    peerWon,
    videoSyncPayload,
    incomingReaction,
    systemToast,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendChatMessage,
    sendChallengeReady,
    sendChallengeStart,
    sendChallengeScore,
    sendChallengeBoardSync,
    sendPlayerEliminated,
    sendPlayerWon,
    sendVideoSync,
    sendVideoReaction,
    socket: socketRef.current,
    socketRef
  };
}
