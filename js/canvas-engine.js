/**
 * Lines in Transit Studio - Canvas Rendering Engine
 * Journal Post Maker: PHOTO (clean), CHAPTER (cover + clean), PANORAMA (2-slide).
 * Decoupled from preview overlays; pure photographic rendering.
 */

import { BRAND_TYPOGRAPHY, TYPOGRAPHY_PRESETS } from './presets.js';

export class CanvasEngine {
  constructor() {
    this.fontsLoaded = false;
  }

  static getTypography(presetId) {
    return TYPOGRAPHY_PRESETS.find(preset => preset.id === presetId) || BRAND_TYPOGRAPHY;
  }

  async ensureFontsReady() {
    if (this.fontsLoaded) return;
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
        if (document.fonts.load) {
          await Promise.allSettled([
            document.fonts.load("800 48px 'Archivo'"),
            document.fonts.load("700 24px 'Archivo'"),
            document.fonts.load("600 38px 'Pretendard'"),
            document.fonts.load("500 24px 'Pretendard'"),
            document.fonts.load("400 20px 'Pretendard'")
          ]);
        }
        this.fontsLoaded = true;
      } catch (e) {
        console.warn('Font loading check error:', e);
      }
    }
  }

  /**
   * Safe image downscale on initial load to protect mobile memory
   */
  static downscaleIfNeeded(img, maxDim = 3200) {
    if (img.width <= maxDim && img.height <= maxDim) {
      return img;
    }
    const ratio = Math.min(maxDim / img.width, maxDim / img.height);
    const oc = document.createElement('canvas');
    oc.width = Math.round(img.width * ratio);
    oc.height = Math.round(img.height * ratio);
    const octx = oc.getContext('2d');
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(img, 0, 0, oc.width, oc.height);
    return oc;
  }

  /**
   * Universal text fitting and truncation helper
   */
  static fitText(ctx, text, maxWidth, initialSize, minSize, fontFamily, isBoldOrWeight = false, letterSpacing = 'normal') {
    if (!text) return { text: '', size: initialSize };
    let size = initialSize;
    let weightStr = '';
    if (typeof isBoldOrWeight === 'boolean') {
      weightStr = isBoldOrWeight ? 'bold ' : '';
    } else if (isBoldOrWeight) {
      weightStr = `${isBoldOrWeight} `;
    }
    if (ctx.letterSpacing !== undefined) {
      ctx.letterSpacing = letterSpacing || 'normal';
    }
    ctx.font = `${weightStr}${size}px ${fontFamily}`;

    while (ctx.measureText(text).width > maxWidth && size > minSize) {
      size -= 1;
      ctx.font = `${weightStr}${size}px ${fontFamily}`;
    }

    let fitted = text;
    if (ctx.measureText(fitted).width > maxWidth) {
      while (ctx.measureText(fitted + '…').width > maxWidth && fitted.length > 0) {
        fitted = fitted.slice(0, -1);
      }
      fitted += '…';
    }

    return { text: fitted, size };
  }

  /**
   * Helper: apply styled text with letter-spacing and alignment
   */
  static applyText(ctx, text, x, y, fontFamily, weight, size, letterSpacing, color, align = 'left') {
    if (ctx.letterSpacing !== undefined) {
      ctx.letterSpacing = letterSpacing || 'normal';
    }
    let weightStr = '';
    if (typeof weight === 'boolean') {
      weightStr = weight ? 'bold ' : '';
    } else if (weight) {
      weightStr = `${weight} `;
    }
    ctx.font = `${weightStr}${size}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  }

  /**
   * Fast preview rendering (Default scale: 0.5 -> 540x675 for single, 1080x675 for panorama)
   */
  async renderToCanvas(targetCanvas, image, state, scale = 0.5) {
    await this.ensureFontsReady();

    const isPanorama = (state.mode === 'panorama' || state.mode === 'seamless');
    const masterW = isPanorama ? 2160 : 1080;
    const masterH = 1350;

    const targetW = Math.round(masterW * scale);
    const targetH = Math.round(masterH * scale);

    if (targetCanvas.width !== targetW || targetCanvas.height !== targetH) {
      targetCanvas.width = targetW;
      targetCanvas.height = targetH;
    }

    const ctx = targetCanvas.getContext('2d', { willReadFrequently: false });
    ctx.save();
    if (scale !== 1.0) {
      ctx.scale(scale, scale);
    }

    if (state.mode === 'chapter' || state.mode === 'vertical') {
      this.renderChapter(ctx, image, state);
    } else if (state.mode === 'panorama' || state.mode === 'seamless') {
      this.renderPanorama(ctx, image, state);
    } else { // 'photo'
      this.renderPhoto(ctx, image, state);
    }
    ctx.restore();
  }

  /**
   * Master Export Render (Isolated, off-screen, strictly zero guide lines)
   */
  async renderExport(image, state) {
    await this.ensureFontsReady();

    const mode = state.mode;

    if (mode === 'panorama' || mode === 'seamless') {
      const masterCanvas = document.createElement('canvas');
      masterCanvas.width = 2160;
      masterCanvas.height = 1350;
      const mctx = masterCanvas.getContext('2d');
      this.renderPanorama(mctx, image, state);

      // Slice into Slide 1 (0..1080) and Slide 2 (1080..2160)
      const slide1 = document.createElement('canvas');
      slide1.width = 1080;
      slide1.height = 1350;
      const s1ctx = slide1.getContext('2d');
      s1ctx.imageSmoothingEnabled = true;
      s1ctx.imageSmoothingQuality = 'high';
      s1ctx.drawImage(masterCanvas, 0, 0, 1080, 1350, 0, 0, 1080, 1350);

      const slide2 = document.createElement('canvas');
      slide2.width = 1080;
      slide2.height = 1350;
      const s2ctx = slide2.getContext('2d');
      s2ctx.imageSmoothingEnabled = true;
      s2ctx.imageSmoothingQuality = 'high';
      s2ctx.drawImage(masterCanvas, 1080, 0, 1080, 1350, 0, 0, 1080, 1350);

      return {
        canvas: masterCanvas,
        isMultiSlide: true,
        slide1,
        slide2,
        tag1: '01_LEFT',
        tag2: '02_RIGHT',
        count: 2
      };
    } else if (mode === 'chapter' || mode === 'vertical') {
      const coverCanvas = document.createElement('canvas');
      coverCanvas.width = 1080;
      coverCanvas.height = 1350;
      const cctx = coverCanvas.getContext('2d');
      this.renderChapter(cctx, image, state);

      const cleanCanvas = document.createElement('canvas');
      cleanCanvas.width = 1080;
      cleanCanvas.height = 1350;
      const clctx = cleanCanvas.getContext('2d');
      this.renderPhoto(clctx, image, {
        ...state,
        photoFitMode: 'cover'
      });

      return {
        canvas: coverCanvas,
        isMultiSlide: true,
        slide1: coverCanvas,
        slide2: cleanCanvas,
        tag1: '01_COVER',
        tag2: '02_CLEAN',
        count: 2
      };
    } else { // 'photo' (Clean single post)
      const photoCanvas = document.createElement('canvas');
      photoCanvas.width = 1080;
      photoCanvas.height = 1350;
      const pctx = photoCanvas.getContext('2d');
      this.renderPhoto(pctx, image, state);

      return {
        canvas: photoCanvas,
        isMultiSlide: false,
        tag1: '01_PHOTO',
        count: 1
      };
    }
  }

  /**
   * 1. PHOTO Format (1080 x 1350)
   * Pure photography. Strictly zero text, zero overlays.
   * Supports 'cover' (4:5 crop fill) or 'fit' (aspect ratio preserved / letterboxed).
   */
  renderPhoto(ctx, image, state) {
    const W = 1080, H = 1350;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#141619';
    ctx.fillRect(0, 0, W, H);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (!image) {
      ctx.fillStyle = '#1e2126';
      ctx.fillRect(0, 0, W, H);
      return;
    }

    const fitMode = state.photoFitMode || 'cover';

    if (fitMode === 'fit') {
      // Letterbox: fit image into 1080 x 1350 while maintaining aspect ratio
      const imgRatio = image.width / image.height;
      const frameRatio = W / H;
      let drawW, drawH, drawX, drawY;

      if (imgRatio > frameRatio) {
        drawW = W;
        drawH = W / imgRatio;
        drawX = 0;
        drawY = (H - drawH) / 2;
      } else {
        drawH = H;
        drawW = H * imgRatio;
        drawX = (W - drawW) / 2;
        drawY = 0;
      }

      ctx.drawImage(image, drawX, drawY, drawW, drawH);

      // Subtle framing divider lines when letterboxed
      if (drawY > 0) {
        ctx.strokeStyle = '#22272e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, drawY);
        ctx.lineTo(W, drawY);
        ctx.moveTo(0, drawY + drawH);
        ctx.lineTo(W, drawY + drawH);
        ctx.stroke();
      }
    } else {
      // Cover fill with user's pan/zoom
      this.drawFittedImage(ctx, image, 0, 0, W, H, state.panX, state.panY, state.zoom);
    }
  }

  /**
   * 2. CHAPTER Format (1080 x 1350)
   * Minimal editorial cover for starting new travel or project series.
   * Elements:
   * - Top: LINES IN TRANSIT (Masthead)
   * - Top sub: SERIES · NO (e.g. PASSING PLACES · 01)
   * - Bottom line 1: Photo Title (e.g. KANAZAWA WATERWAY)
   * - Bottom line 2: Location · Date (e.g. KANAZAWA · JAPAN · 2026)
   * Zero thick glass boxes, zero camera/lens/film tags, zero fixed slogans.
   */
  renderChapter(ctx, image, state) {
    const W = 1080, H = 1350;
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (image) {
      this.drawFittedImage(ctx, image, 0, 0, W, H, state.panX, state.panY, state.zoom);
    } else {
      ctx.fillStyle = '#1e2126';
      ctx.fillRect(0, 0, W, H);
    }

    const typo = CanvasEngine.getTypography(state.typographyPreset);

    // 1. Subtle top gradient for masthead legibility
    const topGrad = ctx.createLinearGradient(0, 0, 0, 190);
    topGrad.addColorStop(0, 'rgba(10, 12, 16, 0.70)');
    topGrad.addColorStop(0.65, 'rgba(10, 12, 16, 0.28)');
    topGrad.addColorStop(1, 'rgba(10, 12, 16, 0.0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 190);

    // 2. Subtle bottom gradient for title and location legibility
    const btmGrad = ctx.createLinearGradient(0, H - 230, 0, H);
    btmGrad.addColorStop(0, 'rgba(10, 12, 16, 0.0)');
    btmGrad.addColorStop(0.4, 'rgba(10, 12, 16, 0.35)');
    btmGrad.addColorStop(1, 'rgba(10, 12, 16, 0.75)');
    ctx.fillStyle = btmGrad;
    ctx.fillRect(0, H - 230, W, 230);

    // Top: Masthead
    const mastheadText = 'LINES IN TRANSIT';
    const mastheadFit = CanvasEngine.fitText(ctx, mastheadText, W - 120, 48, 32, typo.mastheadFont, typo.mastheadWeight, typo.mastheadSpacing);
    CanvasEngine.applyText(ctx, mastheadFit.text, 60, 80, typo.mastheadFont, typo.mastheadWeight, mastheadFit.size, typo.mastheadSpacing, '#ffffff', 'left');

    // Top Sub: Series & Number (e.g. PASSING PLACES · 01)
    const seriesName = state.series || 'PASSING PLACES';
    const seriesNum = state.seriesNo || state.issueNo || '01';
    const seriesText = `${seriesName.toUpperCase()} · ${seriesNum}`;
    const seriesFit = CanvasEngine.fitText(ctx, seriesText, W - 120, 22, 16, typo.seriesFont, typo.seriesWeight, typo.seriesSpacing);
    CanvasEngine.applyText(ctx, seriesFit.text, 60, 115, typo.seriesFont, typo.seriesWeight, seriesFit.size, typo.seriesSpacing, 'rgba(230, 238, 250, 0.88)', 'left');

    // Bottom - Line 1: Photo Title
    const rawTitle = (state.photoTitle || 'UNTITLED').toUpperCase();
    const titleFit = CanvasEngine.fitText(ctx, rawTitle, W - 120, 40, 26, typo.titleFont, typo.titleWeight, typo.titleSpacing);
    CanvasEngine.applyText(ctx, titleFit.text, 60, H - 105, typo.titleFont, typo.titleWeight, titleFit.size, typo.titleSpacing, '#ffffff', 'left');

    // Bottom - Line 2: Location and Date/Year (e.g. KANAZAWA · JAPAN · 2026)
    const locParts = [];
    if (state.location) locParts.push(state.location.toUpperCase());
    if (state.captureDate) locParts.push(state.captureDate);
    const locDateText = locParts.length > 0 ? locParts.join(' · ') : 'SCENE';
    const locFit = CanvasEngine.fitText(ctx, locDateText, W - 120, 23, 17, typo.locationFont, typo.locationWeight, typo.locationSpacing);
    CanvasEngine.applyText(ctx, locFit.text, 60, H - 62, typo.locationFont, typo.locationWeight, locFit.size, typo.locationSpacing, 'rgba(230, 238, 250, 0.90)', 'left');
  }

  /**
   * 3. PANORAMA Format (2160 x 1350)
   * 2-slide seamless horizontal landscape.
   * Default output: 100% clean photo, zero boxes, zero overlays.
   * Optional overlay: only if state.panoramaOverlay is true.
   */
  renderPanorama(ctx, image, state) {
    const W = 2160, H = 1350, W_single = 1080;
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (image) {
      this.drawFittedImage(ctx, image, 0, 0, W, H, state.panX, state.panY, state.zoom);
    } else {
      ctx.fillStyle = '#1e2126';
      ctx.fillRect(0, 0, W, H);
    }

    // Only render subtle text if specifically requested by user
    if (state.panoramaOverlay) {
      const typo = CanvasEngine.getTypography(state.typographyPreset);

      // Slide 1 Top-Left: Masthead (subtle)
      CanvasEngine.applyText(ctx, 'LINES IN TRANSIT', 60, 75, typo.mastheadFont, typo.mastheadWeight, 24, typo.mastheadSpacing, 'rgba(255, 255, 255, 0.85)', 'left');

      // Slide 1 Bottom-Right: subtle arrow
      CanvasEngine.applyText(ctx, '→', W_single - 60, H - 60, typo.seriesFont, '600', 26, 'normal', 'rgba(255, 255, 255, 0.85)', 'right');

      // Slide 2 Bottom-Right: Location
      if (state.location) {
        const locFit = CanvasEngine.fitText(ctx, state.location.toUpperCase(), 400, 22, 16, typo.locationFont, typo.locationWeight, typo.locationSpacing);
        CanvasEngine.applyText(ctx, locFit.text, W - 60, H - 60, typo.locationFont, typo.locationWeight, locFit.size, typo.locationSpacing, 'rgba(235, 240, 250, 0.85)', 'right');
      }
    }
  }

  // Backward compatibility aliases
  renderVertical(ctx, image, state) {
    this.renderChapter(ctx, image, state);
  }

  renderCleanVertical(ctx, image, state) {
    this.renderPhoto(ctx, image, state);
  }

  renderSeamless(ctx, image, state) {
    this.renderPanorama(ctx, image, state);
  }

  renderCinematic(ctx, image, state) {
    this.renderPhoto(ctx, image, { ...state, photoFitMode: 'fit' });
  }

  renderCleanCinematic(ctx, image, state) {
    this.renderPhoto(ctx, image, { ...state, photoFitMode: 'fit' });
  }

  /**
   * Helper: draw image with pan and zoom covering the destination rect
   */
  drawFittedImage(ctx, image, dx, dy, dw, dh, panX = 0, panY = 0, zoom = 1.0) {
    const srcRatio = image.width / image.height;
    const destRatio = dw / dh;

    let srcW, srcH;
    if (srcRatio > destRatio) {
      srcH = image.height;
      srcW = image.height * destRatio;
    } else {
      srcW = image.width;
      srcH = image.width / destRatio;
    }

    // Apply zoom
    srcW = srcW / zoom;
    srcH = srcH / zoom;

    // Apply pan (panX and panY normalized from -1 to 1)
    const maxOffsetX = (image.width - srcW) / 2;
    const maxOffsetY = (image.height - srcH) / 2;
    const sx = Math.max(0, Math.min(image.width - srcW, (image.width - srcW) / 2 + panX * maxOffsetX));
    const sy = Math.max(0, Math.min(image.height - srcH, (image.height - srcH) / 2 + panY * maxOffsetY));

    ctx.drawImage(image, sx, sy, srcW, srcH, dx, dy, dw, dh);
  }
}

