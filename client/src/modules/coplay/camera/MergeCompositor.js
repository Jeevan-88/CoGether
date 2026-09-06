/**
 * MergeCompositor.js
 * GPU-accelerated Live Camera Merge Compositor for CoGether.
 * Composites multiple real-time body cutouts onto a single shared environment with
 * contact shadows, auto-framing, common baseline alignment, and smooth transitions.
 */

export class MergeCompositor {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) || canvas.getContext('2d');

    this.options = {
      enableShadows: options.enableShadows !== undefined ? options.enableShadows : true,
      enableRimGlow: options.enableRimGlow !== undefined ? options.enableRimGlow : true,
      ...options
    };

    // Cached background image element
    this.bgImage = new window.Image();
    this.bgImage.crossOrigin = 'anonymous';
    this.currentBgUrl = null;

    // Participant layer states
    // Key: participantId -> { video, maskCanvas, isLocal, name, bounds, currentX, currentY, currentScale, opacity, targetOpacity, cutoutCanvas, cutoutCtx }
    this.participants = new Map();

    // Default target baseline (approx. 78% down the scene height)
    this.baselineYRatio = 0.82;
  }

  /**
   * Set the active shared background by data URL or web image URL
   */
  setBackground(url) {
    if (this.currentBgUrl === url) return;
    this.currentBgUrl = url;
    this.bgImage.src = url;
  }

  /**
   * Register or update a participant layer
   */
  updateParticipant(id, { video, maskCanvas, isLocal = false, name = 'Player', bounds = null, cameraEnabled = true }) {
    let p = this.participants.get(id);

    if (!p) {
      const cutoutCanvas = document.createElement('canvas');
      const cutoutCtx = cutoutCanvas.getContext('2d', { willReadFrequently: false });

      p = {
        id,
        video,
        maskCanvas,
        isLocal,
        name,
        bounds,
        cameraEnabled,
        // Positioning & animation states
        currentX: 0.5,
        targetX: 0.5,
        currentY: this.baselineYRatio,
        targetY: this.baselineYRatio,
        currentScale: 0.95,
        targetScale: 1.0,
        opacity: 0.0,
        targetOpacity: cameraEnabled ? 1.0 : 0.0,
        cutoutCanvas,
        cutoutCtx
      };
      this.participants.set(id, p);
    } else {
      p.video = video;
      p.maskCanvas = maskCanvas;
      p.name = name;
      p.isLocal = isLocal;
      p.bounds = bounds || p.bounds;
      p.cameraEnabled = cameraEnabled;
      p.targetOpacity = cameraEnabled ? 1.0 : 0.0;
    }
  }

  /**
   * Remove a participant layer with optional smooth fade-out
   */
  removeParticipant(id, immediate = false) {
    const p = this.participants.get(id);
    if (!p) return;

    if (immediate) {
      this.participants.delete(id);
    } else {
      p.targetOpacity = 0.0;
      // Removed automatically once opacity reaches 0 in render loop
    }
  }

  /**
   * Auto-calculates normalized horizontal positions based on active participant count
   */
  calculateSlotPositions(activeCount) {
    if (activeCount <= 1) return [0.5];
    if (activeCount === 2) return [0.32, 0.68];
    if (activeCount === 3) return [0.22, 0.50, 0.78];
    if (activeCount === 4) return [0.15, 0.38, 0.62, 0.85];

    // For 5+ participants: distribute evenly
    const step = 0.8 / (activeCount - 1);
    const positions = [];
    for (let i = 0; i < activeCount; i++) {
      positions.push(0.1 + i * step);
    }
    return positions;
  }

  /**
   * Main render method called per animation frame
   */
  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // 1. Draw Shared Background (Cover aspect ratio)
    if (this.bgImage.complete && this.bgImage.naturalWidth > 0) {
      const imgW = this.bgImage.naturalWidth;
      const imgH = this.bgImage.naturalHeight;
      const scale = Math.max(w / imgW, h / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const offsetX = (w - drawW) / 2;
      const offsetY = (h - drawH) / 2;

      ctx.drawImage(this.bgImage, offsetX, offsetY, drawW, drawH);
    } else {
      // Fallback dark gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#14141e');
      grad.addColorStop(1, '#07070a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Identify visible/active participants
    const activeList = [];
    for (const [id, p] of this.participants.entries()) {
      // Smooth fade transitions
      p.opacity += (p.targetOpacity - p.opacity) * 0.14;

      if (p.opacity < 0.01 && p.targetOpacity <= 0) {
        // Clean up invisible participants
        this.participants.delete(id);
        continue;
      }

      if (p.opacity > 0.01) {
        activeList.push(p);
      }
    }

    const count = activeList.length;
    if (count === 0) return;

    // 3. Compute target positions
    const targetSlots = this.calculateSlotPositions(count);

    activeList.forEach((p, index) => {
      p.targetX = targetSlots[index];

      // Auto-align to common baseline
      let scaleAdj = 1.0;
      if (p.bounds && p.bounds.detected && p.bounds.height > 0) {
        // Normalize size so people appear comparable in stature
        scaleAdj = Math.min(1.25, Math.max(0.75, p.bounds.scaleFactor || 1.0));
      }

      p.targetScale = scaleAdj;

      // Smooth interpolation (lerp)
      p.currentX += (p.targetX - p.currentX) * 0.12;
      p.currentScale += (p.targetScale - p.currentScale) * 0.08;
    });

    // 4. Render Contact Shadows beneath each participant
    if (this.options.enableShadows) {
      activeList.forEach((p) => {
        const cx = p.currentX * w;
        const shadowY = h * 0.88;
        const shadowRx = (w / (count + 1)) * 0.45 * p.currentScale;
        const shadowRy = shadowRx * 0.22;

        ctx.save();
        ctx.globalAlpha = p.opacity * 0.45;
        ctx.beginPath();
        ctx.ellipse(cx, shadowY, shadowRx, shadowRy, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.filter = 'blur(10px)';
        ctx.fill();
        ctx.restore();
      });
    }

    // 5. Render Individual Human Cutouts onto the Scene
    activeList.forEach((p) => {
      const v = p.video;
      const mask = p.maskCanvas;

      if (!v || v.readyState < 2 || !mask) return;

      const vidW = v.videoWidth || 640;
      const vidH = v.videoHeight || 480;

      // Ensure offscreen cutout buffer matches video aspect
      if (p.cutoutCanvas.width !== vidW || p.cutoutCanvas.height !== vidH) {
        p.cutoutCanvas.width = vidW;
        p.cutoutCanvas.height = vidH;
      }

      const cCtx = p.cutoutCtx;
      cCtx.clearRect(0, 0, vidW, vidH);

      // Step A: Draw video frame into cutout buffer (mirrored if local)
      cCtx.save();
      if (p.isLocal) {
        cCtx.translate(vidW, 0);
        cCtx.scale(-1, 1);
      }
      cCtx.drawImage(v, 0, 0, vidW, vidH);
      cCtx.restore();

      // Step B: Clip with refined alpha mask
      cCtx.save();
      cCtx.globalCompositeOperation = 'destination-in';
      if (p.isLocal) {
        cCtx.translate(vidW, 0);
        cCtx.scale(-1, 1);
      }
      cCtx.drawImage(mask, 0, 0, vidW, vidH);
      cCtx.restore();

      // Step C: Draw Cutout onto Main Scene Canvas
      // Calculate drawing dimensions relative to scene height
      const targetRenderHeight = h * 0.86 * p.currentScale;
      const targetRenderWidth = (vidW / vidH) * targetRenderHeight;

      const drawX = p.currentX * w - targetRenderWidth / 2;
      const drawY = h * this.baselineYRatio - targetRenderHeight * 0.88;

      ctx.save();
      ctx.globalAlpha = Math.min(1.0, Math.max(0.0, p.opacity));

      // Optional subtle rim glow / separation from dark background
      if (this.options.enableRimGlow) {
        ctx.shadowColor = 'rgba(255, 229, 0, 0.25)';
        ctx.shadowBlur = 8;
      }

      ctx.drawImage(p.cutoutCanvas, drawX, drawY, targetRenderWidth, targetRenderHeight);
      ctx.restore();

      // Step D: Subtle Player Name Tag (Unobtrusive Barlow Typography)
      ctx.save();
      ctx.globalAlpha = p.opacity;
      const tagX = p.currentX * w;
      const tagY = h * 0.93;

      ctx.fillStyle = 'rgba(14, 14, 19, 0.85)';
      ctx.roundRect(tagX - 55, tagY - 10, 110, 20, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 229, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = '500 11px Barlow, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.name, tagX, tagY);
      ctx.restore();
    });

    // 6. Subtle Scene Ambient Vignette
    ctx.save();
    const vig = ctx.createLinearGradient(0, 0, 0, h);
    vig.addColorStop(0, 'rgba(0,0,0,0.15)');
    vig.addColorStop(0.85, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /**
   * Release all canvases, textures, and references
   */
  dispose() {
    this.participants.clear();
    this.currentBgUrl = null;
  }
}
