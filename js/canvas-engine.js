/**
 * Lines in Transit Studio - Canvas Rendering Engine
 * Journal Post Maker: PHOTO (clean), CHAPTER (cover + clean), PANORAMA (2-slide).
 * Decoupled from preview overlays; pure photographic rendering.
 */

import { BRAND_TYPOGRAPHY, TYPOGRAPHY_PRESETS } from './presets.js';

export const TYPE_SAFE_AREA = Object.freeze({
  top: 72,
  right: 72,
  bottom: 72,
  left: 72
});

export class CanvasEngine {
  constructor() {
    this.fontsLoaded = false;
    this.lastTextLayout = [];
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
   * Draw text only after fitting and clamping its measured glyph bounds to a safe area.
   * Returns the final bounds so browser tests can verify the exported composition.
   */
  static drawSafeText(ctx, options) {
    const {
      text, x, y, fontFamily, weight, initialSize, minSize, letterSpacing,
      color, align = 'left', safeArea, maxWidth = safeArea.right - safeArea.left
    } = options;
    if (!text) return null;

    const availableWidth = Math.min(maxWidth, safeArea.right - safeArea.left);
    const fit = CanvasEngine.fitText(
      ctx, text, availableWidth, initialSize, minSize,
      fontFamily, weight, letterSpacing
    );

    if (ctx.letterSpacing !== undefined) {
      ctx.letterSpacing = letterSpacing || 'normal';
    }
    const weightString = typeof weight === 'boolean'
      ? (weight ? 'bold ' : '')
      : (weight ? `${weight} ` : '');
    ctx.font = `${weightString}${fit.size}px ${fontFamily}`;
    const metrics = ctx.measureText(fit.text);
    const ascent = metrics.actualBoundingBoxAscent || fit.size * 0.78;
    const descent = metrics.actualBoundingBoxDescent || fit.size * 0.22;
    const width = metrics.width;
    let safeX = x;

    if (align === 'right') {
      safeX = Math.min(safeArea.right, Math.max(safeArea.left + width, x));
    } else if (align === 'center') {
      safeX = Math.min(safeArea.right - width / 2, Math.max(safeArea.left + width / 2, x));
    } else {
      safeX = Math.min(safeArea.right - width, Math.max(safeArea.left, x));
    }
    const safeY = Math.min(safeArea.bottom - descent, Math.max(safeArea.top + ascent, y));

    CanvasEngine.applyText(
      ctx, fit.text, safeX, safeY, fontFamily, weight, fit.size,
      letterSpacing, color, align
    );

    let left = safeX;
    if (align === 'right') left = safeX - width;
    if (align === 'center') left = safeX - width / 2;
    return {
      text: fit.text,
      left,
      right: left + width,
      top: safeY - ascent,
      bottom: safeY + descent,
      size: fit.size
    };
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
    const safe = {
      top: TYPE_SAFE_AREA.top,
      right: W - TYPE_SAFE_AREA.right,
      bottom: H - TYPE_SAFE_AREA.bottom,
      left: TYPE_SAFE_AREA.left
    };
    this.lastTextLayout = [];

    // 1. Subtle top gradient for masthead legibility
    const topGrad = ctx.createLinearGradient(0, 0, 0, 220);
    topGrad.addColorStop(0, 'rgba(10, 12, 16, 0.66)');
    topGrad.addColorStop(0.65, 'rgba(10, 12, 16, 0.22)');
    topGrad.addColorStop(1, 'rgba(10, 12, 16, 0.0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 220);

    // 2. Subtle bottom gradient for title and location legibility
    const btmGrad = ctx.createLinearGradient(0, H - 300, 0, H);
    btmGrad.addColorStop(0, 'rgba(10, 12, 16, 0.0)');
    btmGrad.addColorStop(0.5, 'rgba(10, 12, 16, 0.30)');
    btmGrad.addColorStop(1, 'rgba(10, 12, 16, 0.72)');
    ctx.fillStyle = btmGrad;
    ctx.fillRect(0, H - 300, W, 300);

    // Editorial rail: masthead and series share one measured line.
    const mastheadText = 'LINES IN TRANSIT';
    const seriesName = state.series || 'PASSING PLACES';
    const seriesNum = state.seriesNo || state.issueNo || '01';
    const seriesText = `${seriesName.toUpperCase()} · ${seriesNum}`;
    const mastheadBounds = CanvasEngine.drawSafeText(ctx, {
      text: mastheadText, x: safe.left, y: 116, fontFamily: typo.mastheadFont,
      weight: typo.mastheadWeight, initialSize: 42, minSize: 32,
      letterSpacing: typo.mastheadSpacing, color: '#ffffff', align: 'left',
      safeArea: safe, maxWidth: 590
    });
    const seriesBounds = CanvasEngine.drawSafeText(ctx, {
      text: seriesText, x: safe.right, y: 112, fontFamily: typo.seriesFont,
      weight: typo.seriesWeight, initialSize: 18, minSize: 14,
      letterSpacing: typo.seriesSpacing, color: 'rgba(238, 242, 248, 0.90)', align: 'right',
      safeArea: safe, maxWidth: 300
    });
    this.lastTextLayout.push(...[mastheadBounds, seriesBounds].filter(Boolean));

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.56)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(safe.left, 140.5);
    ctx.lineTo(safe.right, 140.5);
    ctx.stroke();

    // Bottom information block stays quiet until the author supplies metadata.
    const rawTitle = (state.photoTitle || '').trim().toUpperCase();
    const locParts = [];
    if (state.location) locParts.push(state.location.toUpperCase());
    if (state.captureDate) locParts.push(state.captureDate);
    const locDateText = locParts.join(' · ');

    if (rawTitle || locDateText) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.fillRect(safe.left, 1156, 48, 2);
    }
    const titleBounds = CanvasEngine.drawSafeText(ctx, {
      text: rawTitle, x: safe.left, y: 1216, fontFamily: typo.titleFont,
      weight: typo.titleWeight, initialSize: 42, minSize: 26,
      letterSpacing: typo.titleSpacing, color: '#ffffff', align: 'left',
      safeArea: safe, maxWidth: safe.right - safe.left
    });
    const locationBounds = CanvasEngine.drawSafeText(ctx, {
      text: locDateText, x: safe.left, y: 1258, fontFamily: typo.locationFont,
      weight: typo.locationWeight, initialSize: 20, minSize: 15,
      letterSpacing: typo.locationSpacing, color: 'rgba(238, 242, 248, 0.90)', align: 'left',
      safeArea: safe, maxWidth: safe.right - safe.left
    });
    this.lastTextLayout.push(...[titleBounds, locationBounds].filter(Boolean));
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
      const slide1Safe = { top: 72, right: 1008, bottom: 1278, left: 72 };
      const slide2Safe = { top: 72, right: 2088, bottom: 1278, left: 1152 };
      this.lastTextLayout = [];

      // Slide 1 Top-Left: Masthead (subtle)
      this.lastTextLayout.push(CanvasEngine.drawSafeText(ctx, {
        text: 'LINES IN TRANSIT', x: slide1Safe.left, y: 104,
        fontFamily: typo.mastheadFont, weight: typo.mastheadWeight,
        initialSize: 24, minSize: 18, letterSpacing: typo.mastheadSpacing,
        color: 'rgba(255, 255, 255, 0.85)', align: 'left', safeArea: slide1Safe
      }));

      // Slide 1 Bottom-Right: subtle arrow
      this.lastTextLayout.push(CanvasEngine.drawSafeText(ctx, {
        text: '→', x: slide1Safe.right, y: 1260, fontFamily: typo.seriesFont,
        weight: '600', initialSize: 26, minSize: 22, letterSpacing: 'normal',
        color: 'rgba(255, 255, 255, 0.85)', align: 'right', safeArea: slide1Safe
      }));

      // Slide 2 Bottom-Right: Location
      if (state.location) {
        this.lastTextLayout.push(CanvasEngine.drawSafeText(ctx, {
          text: state.location.toUpperCase(), x: slide2Safe.right, y: 1260,
          fontFamily: typo.locationFont, weight: typo.locationWeight,
          initialSize: 22, minSize: 16, letterSpacing: typo.locationSpacing,
          color: 'rgba(235, 240, 250, 0.85)', align: 'right',
          safeArea: slide2Safe, maxWidth: 440
        }));
      }
      this.lastTextLayout = this.lastTextLayout.filter(Boolean);
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

