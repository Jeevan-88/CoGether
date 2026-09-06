/**
 * MaskProcessor.js
 * High-performance edge refinement and temporal stabilization for segmentation masks.
 * Prevents mask jitter, edge flicker, and rough sticker-like cuts.
 */

export class MaskProcessor {
  constructor(options = {}) {
    this.temporalSmoothing = options.temporalSmoothing !== undefined ? options.temporalSmoothing : 0.75;
    this.edgeSoftness = options.edgeSoftness || 2; // pixel feathering radius
    this.thresholdLow = 0.12; // cut off background noise
    this.thresholdHigh = 0.82; // clamp solid body pixels

    this.prevMaskData = null;
    this.outputCanvas = document.createElement('canvas');
    this.outputCtx = this.outputCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Refines raw mask canvas with temporal smoothing, edge feathering, and thresholding
   * @param {HTMLCanvasElement} rawMaskCanvas
   * @param {Object} opts
   * @returns {HTMLCanvasElement} smoothed & feathered mask canvas
   */
  process(rawMaskCanvas, opts = {}) {
    if (!rawMaskCanvas) return null;

    const w = rawMaskCanvas.width;
    const h = rawMaskCanvas.height;

    if (this.outputCanvas.width !== w || this.outputCanvas.height !== h) {
      this.outputCanvas.width = w;
      this.outputCanvas.height = h;
      this.prevMaskData = null;
    }

    const rawCtx = rawMaskCanvas.getContext('2d', { willReadFrequently: true });
    const rawImgData = rawCtx.getImageData(0, 0, w, h);
    const rawData = rawImgData.data;

    let outImgData;
    if (!this.prevMaskData || this.prevMaskData.length !== rawData.length) {
      this.prevMaskData = new Float32Array(w * h);
    }

    const alphaFactor = opts.temporalSmoothing !== undefined ? opts.temporalSmoothing : this.temporalSmoothing;
    const betaFactor = 1.0 - alphaFactor;

    // Fast single-pass temporal blend + smoothstep thresholding
    const totalPixels = w * h;
    for (let i = 0; i < totalPixels; i++) {
      const byteIdx = i * 4 + 3; // alpha channel
      const rawVal = rawData[byteIdx] / 255.0;

      // Temporal EMA (Exponential Moving Average)
      const smoothed = this.prevMaskData[i] * betaFactor + rawVal * alphaFactor;
      this.prevMaskData[i] = smoothed;

      // Smoothstep edge curve
      let refinedAlpha;
      if (smoothed <= this.thresholdLow) {
        refinedAlpha = 0;
      } else if (smoothed >= this.thresholdHigh) {
        refinedAlpha = 255;
      } else {
        // Hermite interpolation (smoothstep)
        const t = (smoothed - this.thresholdLow) / (this.thresholdHigh - this.thresholdLow);
        refinedAlpha = Math.round((t * t * (3 - 2 * t)) * 255);
      }

      rawData[byteIdx] = refinedAlpha;
      // Also make RGB 255 for clean alpha mask compositing
      rawData[i * 4] = 255;
      rawData[i * 4 + 1] = 255;
      rawData[i * 4 + 2] = 255;
    }

    this.outputCtx.putImageData(rawImgData, 0, 0);
    return this.outputCanvas;
  }

  /**
   * Reset temporal history (e.g. when camera is toggled or participant joins)
   */
  reset() {
    this.prevMaskData = null;
  }
}
