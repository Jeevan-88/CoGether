# Realtime Architecture & WebSocket Specification: CoGether

## 1. High-Level Realtime Topology

CoGether utilizes a horizontally scalable WebSocket signaling and coordination cluster powered by Socket.IO backed by the `@socket.io/redis-adapter`.

```
                    [ Client Browser (React SPA) ]
                                  |
                                  v (WSS)
               +-------------------------------------+
               |       Load Balancer / Cloudflare    |
               +-------------------------------------+
                     |                         |
          (Least Conn / Sticky)     (Least Conn / Sticky)
                     v                         v
           [ Realtime Node A ]       [ Realtime Node B ]
                     \                         /
                      \                       /
                +------------------------------------+
                |       Redis 7 Pub/Sub Engine       |
                |    (Signaling & Broadcast Bus)     |
                +------------------------------------+
```

---

## 2. Realtime Gateway Responsibilities

1. **WebRTC Signaling Pass-Through**:
   - `offer`: Routing SDP offer from initiator to recipient peer.
   - `answer`: Routing SDP answer from recipient to initiator.
   - `ice-candidate`: Exchanging ICE trickle network candidates.
   - **Zero Media Processing**: Signaling nodes route JSON descriptions only. They do not decode or inspect media packets.

2. **Room Membership & Presence**:
   - Ephemeral member tracking in Redis (`room:{roomId}:members`).
   - Broadcasting `user-joined`, `user-left`, and `user-media-changed` (mic/camera mute states).
   - Dynamic host election upon host disconnection.

3. **Synchronized Experience Coordination**:
   - **CoPlay**: Challenge ready flags (`challenge-ready`), countdown timers (`challenge-start`), real-time scores (`challenge-score`), elimination notices.
   - **CoWatch**: Playback synchronization (`video-sync` with media time, playing state, speed) and floating emoji bursts (`video-reaction`).
   - **CoShop**: Real-time product cards (`coshop-share-product`), shared wishlist edits (`coshop-wishlist-sync`), and multi-store cart sync (`coshop-cart-sync`).
   - **Room Chat**: Ephemeral text chat messages (`send-chat-message`).

---

## 3. Liveness, Heartbeats & Fault Recovery

- **Ping/Pong Protocol**:
  - `pingInterval`: 20,000ms.
  - `pingTimeout`: 10,000ms.
  - Sockets failing to respond to two consecutive pings are pruned from memory and Redis presence.
- **Graceful Reconnection & State Recovery**:
  - Sockets authenticate with a short-lived guest or user JWT upon handshake (`io.use(authMiddleware)`).
  - Clients send their `lastReceivedTimestamp` upon reconnecting to recover missing room state directly from the Redis room state hash.
- **Payload Restrictions & Rate Limiting**:
  - Maximum WebSocket packet size: 64 KB (rejects oversized malicious payloads).
  - Socket event rate limit: Maximum 30 events/sec per socket connection; excessive event spam triggers socket disconnection.
