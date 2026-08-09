import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export function useWebRTC(roomId, username, signalingUrl) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // id -> { stream, username, micEnabled, cameraEnabled }
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [mediaError, setMediaError] = useState(null);

  const socketRef = useRef(null);
  const peersRef = useRef({}); // id -> RTCPeerConnection
  const sendersRef = useRef({}); // id -> { videoSender, audioSender }
  const localStreamRef = useRef(null);
  const screenTrackRef = useRef(null);

  // Helper to create RTCPeerConnection for a remote peer
  const createPeerConnection = useCallback((remoteId, remoteUsername, initialMic = true, initialCam = true) => {
    if (peersRef.current[remoteId]) {
      return peersRef.current[remoteId];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    sendersRef.current[remoteId] = {};

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

    // Connection state logging
    pc.onconnectionstatechange = () => {
      console.log(`[Peer ${remoteId}] State: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Option to restart ice or cleanup if disconnected long term
      }
    };

    peersRef.current[remoteId] = pc;
    return pc;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initMediaAndSocket() {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        console.warn('Could not get video+audio, trying audio only...', err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setCameraEnabled(false);
        } catch (audioErr) {
          console.error('Could not get any media stream', audioErr);
          setMediaError('Camera/Microphone access denied or unavailable.');
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

      // Initialize Socket connection
      const socket = io(signalingUrl, {
        reconnectionAttempts: 5,
        timeout: 10000
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('join-room', {
          roomId,
          username,
          micEnabled: true,
          cameraEnabled: stream?.getVideoTracks().length > 0
        });
      });

      socket.on('disconnect', () => setConnected(false));

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
      });

      // Handle incoming offer from a peer
      socket.on('offer', async ({ from, offer, username: peerUsername }) => {
        const pc = createPeerConnection(from, peerUsername);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
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

      // User Left
      socket.on('user-left', (id) => {
        if (peersRef.current[id]) {
          peersRef.current[id].close();
          delete peersRef.current[id];
        }
        delete sendersRef.current[id];
        setRemoteStreams((prev) => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
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
  }, [roomId, username, signalingUrl, createPeerConnection]);

  // Toggle Microphone
  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const newMicState = !micEnabled;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = newMicState;
    });
    setMicEnabled(newMicState);
    socketRef.current?.emit('toggle-media', { micEnabled: newMicState, cameraEnabled });
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const newCameraState = !cameraEnabled;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = newCameraState;
    });
    setCameraEnabled(newCameraState);
    socketRef.current?.emit('toggle-media', { micEnabled, cameraEnabled: newCameraState });
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop Screen Share -> Revert to local camera track
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
      // Start Screen Share
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        // Replace video track for all connected peers
        Object.values(sendersRef.current).forEach(({ videoSender }) => {
          if (videoSender) videoSender.replaceTrack(screenTrack);
        });

        setIsScreenSharing(true);
        socketRef.current?.emit('screen-share-status', { isSharing: true });

        // When user stops sharing via browser bar
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

  // Send Chat Message
  const sendChatMessage = (text) => {
    if (socketRef.current && text.trim()) {
      socketRef.current.emit('send-chat-message', { text });
    }
  };

  return {
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
  };
}
