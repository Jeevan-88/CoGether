# CoGether Watch Companion — Extension Integration & Provider Adapter Contract

## 1. Specification Overview

The **CoGether Watch Companion** is a planned browser extension designed to orchestrate synchronized playback across authorized third-party streaming providers (e.g., Netflix, Amazon Prime Video, Disney+, JioHotstar, Crunchyroll) without touching, proxying, decrypting, or circumventing Digital Rights Management (DRM) or copyright protections.

---

## 2. Core Legal & Security Invariants

1. **Zero DRM Circumvention**: The extension must NEVER intercept, decrypt, record, or extract protected media bitstreams, encryption keys (Widevine/FairPlay/PlayReady), or license exchange tokens.
2. **Zero Media Transport**: CoGether does NOT transport or host third-party movie bytes. Every room participant views the media using their own personal, authorized, paying subscriber account directly from the provider's official web player.
3. **User-Consented Tab Scoping**: The extension only activates on explicit user command for an active CoGether room session (`CW-XXXXXX`).
4. **Clean Decoupling**: Video playback remains in the official provider web application; CoGether only coordinates room synchronization events (Play, Pause, Seek, Rate Change).

---

## 3. Provider Adapter Interface (TypeScript / ES Contract)

```typescript
/**
 * Interface implemented by provider-specific content scripts.
 */
export interface IProviderAdapter {
  readonly providerId: string;
  readonly providerName: string;
  readonly matchPatterns: string[];

  /**
   * Detects if the current active tab is rendering an authorized playable title.
   */
  detectMedia(): Promise<{
    isPlayable: boolean;
    providerContentId: string | null;
    title: string | null;
    durationSeconds: number | null;
    currentTimeSeconds: number;
    isPaused: boolean;
  }>;

  /**
   * Subscribes to player state changes (play, pause, seek) on the active DOM video element.
   */
  attachListener(callback: (event: CompanionPlayerEvent) => void): () => void;

  /**
   * Programmatically pauses playback in response to an authoritative room event.
   */
  pause(): Promise<void>;

  /**
   * Programmatically resumes playback in response to an authoritative room event.
   */
  play(): Promise<void>;

  /**
   * Programmatically adjusts player timecode to authoritative position.
   */
  seek(positionSeconds: number): Promise<void>;

  /**
   * Gently trims playback rate for micro-drift adjustment (0.95x - 1.05x).
   */
  adjustPlaybackRate(rate: number): Promise<void>;
}

export interface CompanionPlayerEvent {
  action: 'PLAY' | 'PAUSE' | 'SEEK' | 'RATE_CHANGE';
  positionSeconds: number;
  timestamp: number;
}
```

---

## 4. Extension-to-CoWatch Messaging Protocol (PostMessage & WebSocket)

### Handshake & Session Binding
When a user launches a CoWatch Companion room in CoGether:

1. **Room Binding**:
   ```json
   {
     "type": "COGETHER_COMPANION_BIND",
     "payload": {
       "roomCode": "CW-816903",
       "userId": "usr_94218a",
       "username": "Jeevan",
       "providerId": "netflix",
       "controlPolicy": "HOST_ONLY"
     }
   }
   ```

2. **Handshake Ack**:
   ```json
   {
     "type": "COGETHER_COMPANION_ACK",
     "payload": {
       "extensionVersion": "1.0.0",
       "providerDetected": true,
       "providerContentId": "80057281",
       "synced": true
     }
   }
   ```

3. **Authoritative Sync Dispatch (CoGether Server -> Companion)**:
   ```json
   {
     "type": "COGETHER_SYNC_COMMAND",
     "payload": {
       "action": "PAUSE",
       "authoritativePosition": 124.5,
       "sequence": 42,
       "serverTimeMs": 1789568400000
     }
   }
   ```

---

## 5. Drift Compensation Architecture

The companion applies identical multi-tier clock drift correction to native players:
- **`drift < 100ms`**: Tolerated as human-imperceptible network jitter.
- **`100ms - 300ms`**: Micro-nudge of HTMLMediaElement `playbackRate` to `0.96` or `1.04` until aligned.
- **`300ms - 750ms`**: Controlled catch-up (`0.90x` / `1.10x`).
- **`> 750ms`**: Discrete timecode seek to authoritative target.
