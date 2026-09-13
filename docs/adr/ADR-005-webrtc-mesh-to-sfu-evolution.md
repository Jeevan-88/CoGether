# ADR-005: WebRTC Mesh to SFU Evolution

## Status
Accepted

## Context
Small rooms (2–4 users) achieve optimal latency and zero infrastructure cost via WebRTC peer-to-peer Full Mesh. However, bandwidth requirements scale quadratically ($N \times (N-1)$), causing stream degradation beyond 4 peers.

## Decision
We adopt a **Two-Tier WebRTC Strategy**:
- **Current / Small Rooms (2–4 participants)**: Direct peer-to-peer full mesh via encrypted SRTP/DTLS. Zero media frames routed through backend servers.
- **Scale Roadmap (Rooms > 4 participants)**: Migrate to a Selective Forwarding Unit (SFU) cluster using Mediasoup or LiveKit, providing simulcast spatial layers and single upstream connections.

## Consequences
- **Positive**: Zero media server bandwidth costs for the majority of 2-peer gaming and shopping sessions; clear upgrade path for large cinema and tournament rooms.
- **Negative**: Client must support switching between mesh peer connection handles and SFU subscriber channels.
