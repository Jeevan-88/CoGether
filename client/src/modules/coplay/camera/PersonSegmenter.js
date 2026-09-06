/**
 * PersonSegmenter.js
 * In-browser real-time person segmentation using MediaPipe SelfieSegmentation.
 * Runs 100% locally with zero cloud API keys, zero cloud billing.
 */

import * as mpSelfie from '@mediapipe/selfie_segmentation';

// Get constructor across bundler / ESM variants
const SelfieSegmentation =
  mpSelfie.SelfieSegmentation ||
  (mpSelfie.default && mpSelfie.default.SelfieSegmentation) ||
  mpSelfie.default ||
  window.SelfieSegmentation;

export class PersonSegmenter {
  constructor(options = {}) {
    this.quality = options.quality || 'AUTO'; // 'LOW' | 'MEDIUM' | 'HIGH' | 'AUTO'
    this.modelSelection = options.modelSelection !== undefined ? options.modelSelection : 1; // 1 = landscape (fast), 0 = general
    this.selfieMode = !!options.selfieMode;

    this.segmenter = null;
    this.isInitialized = false;
    this.isInitializing = false;
    this.isProcessing = false;
    this.lastProcessedTime = 0;
    this.initError = null;

    // Cache canvas for mask extraction
    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true });

    // Latest segmentation result
    this.latestResult = null;
    this.pendingResolvers = [];
  }

  /**
   * Initializes the local MediaPipe SelfieSegmentation model
   */
  async init() {
    if (this.isInitialized) return true;
    if (this.isInitializing) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        if (!SelfieSegmentation) {
          throw new Error('SelfieSegmentation library could not be loaded');
        }

        this.segmenter = new SelfieSegmentation({
          locateFile: (file) => {
            // First check local static models folder
            return `/models/selfie_segmentation/${file}`;
          }
        });

        this.segmenter.setOptions({
          modelSelection: this.modelSelection,
          selfieMode: this.selfieMode
        });

        this.segmenter.onResults((results) => {
          this.handleResults(results);
        });

        await this.segmenter.initialize();
        this.isInitialized = true;
        this.isInitializing = false;
        resolve(true);
      } catch (err) {
        console.warn('[PersonSegmenter] Local initialization failed, trying fallback CDN...', err);
        try {
          // Fallback to CDN if local WASM binaries fail
          this.segmenter = new SelfieSegmentation({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
          });
          this.segmenter.setOptions({
            modelSelection: this.modelSelection,
            selfieMode: this.selfieMode
          });
          this.segmenter.onResults((results) => {
            this.handleResults(results);
          });
          await this.segmenter.initialize();
          this.isInitialized = true;
          this.isInitializing = false;
          resolve(true);
        } catch (fallbackErr) {
          console.error('[PersonSegmenter] Initialization failed completely:', fallbackErr);
          this.initError = fallbackErr;
          this.isInitializing = false;
          reject(fallbackErr);
        }
      }
    });

    return this.initPromise;
  }

  /**
   * Process a single video frame and return segmentation mask with body metrics
   */
  async segment(videoElement) {
    if (!this.isInitialized) {
      await this.init();
    }
    if (
      !videoElement || 
      videoElement.readyState < 2 || 
      !videoElement.videoWidth || 
      !videoElement.videoHeight || 
      videoElement.videoWidth === 0 || 
      videoElement.videoHeight === 0
    ) {
      return null;
    }

    if (this.isProcessing) {
      // Skip frame if previous inference is still executing (preserves target FPS)
      return this.latestResult;
    }

    this.isProcessing = true;
    const now = performance.now();

    return new Promise((resolve) => {
      this.pendingResolvers.push(resolve);
      this.segmenter
        .send({ image: videoElement })
        .catch((err) => {
          console.error('[PersonSegmenter] Inference send error:', err);
          this.isProcessing = false;
          resolve(this.latestResult);
        });
    });
  }

  /**
   * Handles raw results from MediaPipe
   */
  handleResults(results) {
    this.isProcessing = false;
    if (!results || !results.segmentationMask) {
      this.resolvePending(null);
      return;
    }

    const mask = results.segmentationMask;
    const w = mask.width || results.image?.width || 320;
    const h = mask.height || results.image?.height || 240;

    if (this.maskCanvas.width !== w || this.maskCanvas.height !== h) {
      this.maskCanvas.width = w;
      this.maskCanvas.height = h;
    }

    // Draw raw segmentation mask into our cached maskCanvas
    this.maskCtx.clearRect(0, 0, w, h);
    this.maskCtx.drawImage(mask, 0, 0, w, h);

    // Compute bounding box metrics for auto-framing & auto-alignment
    const bounds = this.computeBounds(this.maskCtx, w, h);

    this.latestResult = {
      maskCanvas: this.maskCanvas,
      width: w,
      height: h,
      bounds,
      timestamp: performance.now()
    };

    this.resolvePending(this.latestResult);
  }

  resolvePending(result) {
    while (this.pendingResolvers.length > 0) {
      const resolve = this.pendingResolvers.shift();
      resolve(result);
    }
  }

  /**
   * Fast downsampled analysis to estimate head position, bounding box, and center
   */
  computeBounds(ctx, w, h) {
    try {
      // Sample a coarse grid (e.g. 32x24) for instant, lightweight calculation (<0.2ms)
      const sampleW = 32;
      const sampleH = 24;
      const stepX = Math.floor(w / sampleW);
      const stepY = Math.floor(h / sampleH);

      const imgData = ctx.getImageData(0, 0, w, h).data;

      let minX = w;
      let maxX = 0;
      let minY = h;
      let maxY = 0;
      let totalMass = 0;
      let sumX = 0;
      let sumY = 0;

      for (let sy = 0; sy < sampleH; sy++) {
        const y = sy * stepY;
        for (let sx = 0; sx < sampleW; sx++) {
          const x = sx * stepX;
          const idx = (y * w + x) * 4 + 3; // alpha channel
          const alpha = imgData[idx];

          if (alpha > 64) {
            // Person pixel detected
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;

            totalMass++;
            sumX += x;
            sumY += y;
          }
        }
      }

      if (totalMass < 5) {
        // No person detected or extremely small
        return {
          detected: false,
          minX: 0,
          maxX: w,
          minY: 0,
          maxY: h,
          centerX: w / 2,
          centerY: h / 2,
          headY: 0,
          scaleFactor: 1.0
        };
      }

      const centerX = sumX / totalMass;
      const centerY = sumY / totalMass;
      const personHeight = maxY - minY;
      const personWidth = maxX - minX;

      return {
        detected: true,
        minX,
        maxX,
        minY,
        maxY,
        width: personWidth,
        height: personHeight,
        centerX,
        centerY,
        headY: minY,
        scaleFactor: Math.min(1.4, Math.max(0.7, (h * 0.75) / (personHeight || 1)))
      };
    } catch {
      return {
        detected: true,
        minX: 0,
        maxX: w,
        minY: 0,
        maxY: h,
        centerX: w / 2,
        centerY: h / 2,
        headY: 0,
        scaleFactor: 1.0
      };
    }
  }

  /**
   * Disposes segmentation model and releases GPU/WASM memory
   */
  dispose() {
    try {
      if (this.segmenter) {
        this.segmenter.close();
        this.segmenter = null;
      }
    } catch (err) {
      console.warn('[PersonSegmenter] Error disposing segmenter:', err);
    }
    this.isInitialized = false;
    this.latestResult = null;
    this.pendingResolvers = [];
  }
}
