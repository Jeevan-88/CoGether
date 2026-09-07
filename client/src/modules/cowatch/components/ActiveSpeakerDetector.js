/**
 * ActiveSpeakerDetector.js
 * Real-time native Web Audio API active speaker & speech energy detector.
 * Zero external dependencies, zero fake audio indicators.
 */

export class ActiveSpeakerDetector {
  constructor(stream, onSpeakingChange, options = {}) {
    this.stream = stream;
    this.onSpeakingChange = onSpeakingChange;
    this.threshold = options.threshold ?? 14; // RMS threshold (0 - 255)
    this.holdDuration = options.holdDuration ?? 350; // Milliseconds to hold speech state

    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.timer = null;
    this.isSpeaking = false;
    this.lastSpokeTime = 0;
    this.destroyed = false;

    this.init();
  }

  init() {
    if (!this.stream || this.stream.getAudioTracks().length === 0) {
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.75;

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.timer = setInterval(() => {
        if (this.destroyed || !this.analyser) return;

        const audioTrack = this.stream.getAudioTracks()[0];
        if (!audioTrack || !audioTrack.enabled || audioTrack.muted) {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            this.onSpeakingChange(false);
          }
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average energy
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        const now = Date.now();
        if (average >= this.threshold) {
          this.lastSpokeTime = now;
          if (!this.isSpeaking) {
            this.isSpeaking = true;
            this.onSpeakingChange(true);
          }
        } else if (this.isSpeaking && (now - this.lastSpokeTime > this.holdDuration)) {
          this.isSpeaking = false;
          this.onSpeakingChange(false);
        }
      }, 60);
    } catch (err) {
      console.warn('Web Audio active speaker detector could not initialize:', err);
    }
  }

  cleanup() {
    this.destroyed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch (_) {}
      this.source = null;
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch (_) {}
      this.analyser = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (_) {}
      this.audioContext = null;
    }
    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.onSpeakingChange(false);
    }
  }
}
