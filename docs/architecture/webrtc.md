# WebRTC Architecture & SFU Evolution Roadmap: CoGether

## 1. Current State: Peer-to-Peer Full Mesh Topology

CoGether currently uses a client-side WebRTC Full Mesh topology for small-group collaboration (2 to 4 active peers).

```
                      [ Peer A ]
                     /    |    \
                    /     |     \  (Encrypted DTLS/SRTP Direct Media)
                   /      |      \
            [ Peer B ]----+----[ Peer C ]
```

### Media Characteristics & Invariants
- **End-to-End Encryption**: Direct peer-to-peer media transmission via DTLS/SRTP.
- **Strict Database Boundary**: **Zero audio, video, or screen-share frames ever touch application servers or databases.**
- **Hardware Acceleration**: Browsers use hardware VP8/VP9/H.264 codecs via HTML5 `<video>` elements.
- **Client Side ML Integration**: MediaPipe (`@mediapipe/selfie_segmentation`, `@mediapipe/face_mesh`) runs entirely client-side on WebGL/WASM without server computation.

---

## 2. NAT Traversal & Relay Infrastructure (STUN / TURN)

1. **STUN (Session Traversal Utilities for NAT)**:
   - Discovers public IP and port mappings for direct peer routing.
   - Default fallback: Public Google STUN servers (`stun:stun.l.google.com:19302`, `stun:stun1.l.google.com:19302`).
2. **TURN (Traversal Using Relays around NAT)**:
   - For symmetric NAT and enterprise firewall scenarios (approx. 12–18% of sessions).
   - Ephemeral credential generation via REST API (`GET /api/v1/realtime/ice-servers`) using HMAC-SHA1 timestamped tokens.
   - Provider strategy: Managed Coturn cluster or Cloudflare Calls / Twilio Network Traversal Service.

---

## 3. Scalability Limits & Selective Forwarding Unit (SFU) Target

### The $N \times (N - 1)$ Mesh Boundary
In a full mesh topology, each client must encode and upload $N - 1$ video streams and download $N - 1$ streams:
- 2 participants: 1 upload, 1 download (Ideal, ~1.5 Mbps).
- 4 participants: 3 uploads, 3 downloads (~4.5 Mbps upstream, near consumer boundary).
- 6+ participants: 5 uploads, 5 downloads (Causes packet loss, CPU throttling, and audio stuttering).

### Phase 7 Target: SFU Architecture (LiveKit / Mediasoup)
```
          [ Peer A ]       [ Peer B ]       [ Peer C ]
              \                |                /
         (1 Up) \              | (1 Up)        / (1 Up)
                 v             v              v
               +----------------------------------+
               |   Selective Forwarding Unit      |
               |       (LiveKit / Mediasoup)      |
               +----------------------------------+
                 /             |              \
       (Simulcast)        (Simulcast)      (Simulcast)
               v               v              v
          [ Peer A ]       [ Peer B ]       [ Peer C ]
```
- **Simulcast**: Each publisher transmits 3 bitrate spatial layers (180p, 360p, 720p). The SFU forwards the optimal layer based on recipient viewport size and network conditions.
- **Single Upload Stream**: Reduces client upstream bandwidth by up to 75%.
