/**
 * Lines in Transit Studio - Canvas Rendering Engine
 * Renders high-precision 1080x1350 and 2160x1350 Instagram formats.
 * Decoupled from preview overlays; pure photographic rendering.
 */

import { GEAR_PRESETS, TYPOGRAPHY_PRESETS } from './presets.js';

export class CanvasEngine {
  static SERIF_FONT = "'Cormorant Garamond', 'Nanum Myeongjo', Batang, Georgia, serif";
  static SANS_FONT = "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";


  static getTypography(presetId) {
    return TYPOGRAPHY_PRESETS.find(p => p.id === presetId) || TYPOGRAPHY_PRESETS[0];
  }

  constructor() {
    this.fontsLoaded = false;
  }

  async ensureFontsReady() {
    if (this.fontsLoaded) return;
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
        this.fontsLoaded = true;
      } catch (e) {
        console.warn('Font loading check error:', e);
      }
    }
  }

  async ensurePresetFonts(presetId) {
    const typo = CanvasEngine.getTypography(presetId);
    if (document.fonts && document.fonts.load) {
      try {
        await Promise.allSettled([
          document.fonts.load(`${typo.headWeight} 48px ${typo.headFont}`),
          document.fonts.load(`${typo.titleWeight} 38px ${typo.titleFont}`),
          document.fonts.load(`${typo.locationWeight} 24px ${typo.locationFont}`),
          document.fonts.load(`${typo.cameraWeight} 24px ${typo.cameraFont}`)
        ]);
      } catch (e) {
        // Safe fallback
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
   * Fast preview rendering (Default scale: 0.5 -> 540x675 for vertical, 1080x675 for seamless)
   * Reduces pixel count by 75% for silky smooth mobile performance.
   */
  async renderToCanvas(targetCanvas, image, state, scale = 0.5) {
    await this.ensureFontsReady();
    await this.ensurePresetFonts(state.typographyPreset);

    const isSeamless = (state.mode === 'seamless');
    const masterW = isSeamless ? 2160 : 1080;
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

    if (state.mode === 'vertical') {
      this.renderVertical(ctx, image, state);
    } else if (state.mode === 'seamless') {
      this.renderSeamless(ctx, image, state);
    } else if (state.mode === 'cinematic') {
      this.renderCinematic(ctx, image, state);
    }
    ctx.restore();
  }

  /**
   * Master Export Render (Isolated, off-screen, strictly zero guide lines)
   */
  async renderExport(image, state) {
    await this.ensureFontsReady();
    await this.ensurePresetFonts(state.typographyPreset);

    const includeClean = (state.includeCleanPhoto !== false);

    if (state.mode === 'seamless') {
      const masterCanvas = document.createElement('canvas');
      masterCanvas.width = 2160;
      masterCanvas.height = 1350;
      const mctx = masterCanvas.getContext('2d');
      this.renderSeamless(mctx, image, state);

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
        tag1: 'SLIDE-01',
        tag2: 'SLIDE-02',
        count: 2
      };
    } else if (state.mode === 'vertical') {
      const coverCanvas = document.createElement('canvas');
      coverCanvas.width = 1080;
      coverCanvas.height = 1350;
      const cctx = coverCanvas.getContext('2d');
      this.renderVertical(cctx, image, state);

      if (includeClean) {
        const cleanCanvas = document.createElement('canvas');
        cleanCanvas.width = 1080;
        cleanCanvas.height = 1350;
        const clctx = cleanCanvas.getContext('2d');
        this.renderCleanVertical(clctx, image, state);

        return {
          canvas: coverCanvas,
          isMultiSlide: true,
          slide1: coverCanvas,
          slide2: cleanCanvas,
          tag1: 'COVER',
          tag2: 'CLEAN',
          count: 2
        };
      } else {
        return {
          canvas: coverCanvas,
          isMultiSlide: false,
          tag1: 'COVER'
        };
      }
    } else { // cinematic
      const cineCanvas = document.createElement('canvas');
      cineCanvas.width = 1080;
      cineCanvas.height = 1350;
      const cctx = cineCanvas.getContext('2d');
      this.renderCinematic(cctx, image, state);

      if (includeClean) {
        const cleanCanvas = document.createElement('canvas');
        cleanCanvas.width = 1080;
        cleanCanvas.height = 1350;
        const clctx = cleanCanvas.getContext('2d');
        this.renderCleanCinematic(clctx, image, state);

        return {
          canvas: cineCanvas,
          isMultiSlide: true,
          slide1: cineCanvas,
          slide2: cleanCanvas,
          tag1: 'CINEMATIC',
          tag2: 'CLEAN',
          count: 2
        };
      } else {
        return {
          canvas: cineCanvas,
          isMultiSlide: false,
          tag1: 'CINEMATIC'
        };
      }
    }
  }

  /**
   * 1. Mode A: Vertical 4:5 Magazine Cover (1080 x 1350)
   * Refined Minimal Signature Layout:
   * Top: LINES IN TRANSIT (Masthead)
   * Bottom: Artwork Title & Location / Coordinates
   * Pure photography emphasis; zero clutter, zero thick glass cards.
   */
  renderVertical(ctx, image, state) {
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
    const topGrad = ctx.createLinearGradient(0, 0, 0, 160);
    topGrad.addColorStop(0, 'rgba(10, 12, 16, 0.65)');
    topGrad.addColorStop(0.6, 'rgba(10, 12, 16, 0.25)');
    topGrad.addColorStop(1, 'rgba(10, 12, 16, 0.0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 160);

    // 2. Subtle bottom gradient for title and location legibility (no box needed)
    const btmGrad = ctx.createLinearGradient(0, H - 220, 0, H);
    btmGrad.addColorStop(0, 'rgba(10, 12, 16, 0.0)');
    btmGrad.addColorStop(0.4, 'rgba(10, 12, 16, 0.35)');
    btmGrad.addColorStop(1, 'rgba(10, 12, 16, 0.70)');
    ctx.fillStyle = btmGrad;
    ctx.fillRect(0, H - 220, W, 220);

    // Top: Masthead (Single pure branding)
    const rawMasthead = state.magazineTitle || 'LINES IN TRANSIT';
    const mastheadText = typo.headUppercase ? rawMasthead.toUpperCase() : rawMasthead;
    const mastheadFit = CanvasEngine.fitText(ctx, mastheadText, W - 120, 48, 32, typo.headFont, typo.headWeight, typo.headSpacing);
    CanvasEngine.applyText(ctx, mastheadFit.text, 60, 80, typo.headFont, typo.headWeight, mastheadFit.size, typo.headSpacing, '#ffffff', 'left');

    // Bottom - Line 1: Artwork Title
    const rawTitleBase = state.photoTitle || 'UNTITLED';
    const rawTitleText = typo.titleUppercase ? rawTitleBase.toUpperCase() : rawTitleBase;
    const titleFit = CanvasEngine.fitText(ctx, rawTitleText, W - 120, 42, 28, typo.titleFont, typo.titleWeight, typo.titleSpacing);
    CanvasEngine.applyText(ctx, titleFit.text, 60, H - 105, typo.titleFont, typo.titleWeight, titleFit.size, typo.titleSpacing, '#ffffff', 'left');

    // Bottom - Line 2: Location or Coordinates
    const locText = state.location || 'Location';
    const locFit = CanvasEngine.fitText(ctx, locText, W - 120, 24, 18, typo.locationFont, typo.locationWeight, typo.locationSpacing);
    CanvasEngine.applyText(ctx, locFit.text, 60, H - 62, typo.locationFont, typo.locationWeight, locFit.size, typo.locationSpacing, 'rgba(230, 238, 250, 0.92)', 'left');
  }

  /**
   * Pure Clean Photo (1080 x 1350) - Zero text, zero overlays, matching user's composition
   */
  renderCleanVertical(ctx, image, state) {
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
  }

  /**
   * Pure Clean Cinematic Photo (1080 x 1350 with 3:2 centered frame)
   */
  renderCleanCinematic(ctx, image, state) {
    const W = 1080, H = 1350;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#141619';
    ctx.fillRect(0, 0, W, H);

    const photoH = 720;
    const photoY = 280;
    if (image) {
      this.drawFittedImage(ctx, image, 0, photoY, W, photoH, state.panX, state.panY, state.zoom);
    }

    ctx.strokeStyle = '#2d323b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, photoY);
    ctx.lineTo(W, photoY);
    ctx.moveTo(0, photoY + photoH);
    ctx.lineTo(W, photoY + photoH);
    ctx.stroke();
  }


  /**
   * 2. Mode B: Seamless 2-Slide Panorama (2160 x 1350)
   */
  renderSeamless(ctx, image, state) {
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

    const typo = CanvasEngine.getTypography(state.typographyPreset);

    // Top Gradient across whole 2160 width
    const grad = ctx.createLinearGradient(0, 0, 0, 180);
    grad.addColorStop(0, 'rgba(10, 12, 16, 0.72)');
    grad.addColorStop(0.65, 'rgba(10, 12, 16, 0.35)');
    grad.addColorStop(1, 'rgba(10, 12, 16, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 180);

    // ---------------- Slide 1 (Left: 0 ~ 1080) ----------------
    const rawMasthead = state.magazineTitle || 'LINES IN TRANSIT';
    const mastheadText = typo.headUppercase ? rawMasthead.toUpperCase() : rawMasthead;
    const mastheadFit = CanvasEngine.fitText(ctx, mastheadText, W_single - 320, 48, 32, typo.headFont, typo.headWeight, typo.headSpacing);
    CanvasEngine.applyText(ctx, mastheadFit.text, 60, 80, typo.headFont, typo.headWeight, mastheadFit.size, typo.headSpacing, '#ffffff', 'left');

    CanvasEngine.applyText(ctx, 'PANORAMA · [1/2]', W_single - 60, 78, typo.issueFont, typo.issueWeight, 22, typo.issueSpacing, 'rgba(235, 240, 250, 0.9)', 'right');

    // Slide 1 Glass Tag
    const tagX = 60, tagY = H - 170, tagW = W_single - 120, tagH = 122;
    this.drawRoundedRect(ctx, tagX, tagY, tagW, tagH, 8, 'rgba(18, 22, 28, 0.82)', 'rgba(255, 255, 255, 0.28)', 1);

    const s1TitleBase = state.photoTitle || 'PANORAMA';
    const s1TitleText = typo.titleUppercase ? s1TitleBase.toUpperCase() : s1TitleBase;
    const rawTitle = `${state.issueNo || '01'}  ${s1TitleText}`;
    const s1TitleFit = CanvasEngine.fitText(ctx, rawTitle, tagW - 56, 38, 26, typo.titleFont, typo.titleWeight, typo.titleSpacing);
    CanvasEngine.applyText(ctx, s1TitleFit.text, tagX + 28, tagY + 50, typo.titleFont, typo.titleWeight, s1TitleFit.size, typo.titleSpacing, '#ffffff', 'left');

    const s1LocFit = CanvasEngine.fitText(ctx, state.location || 'Kanazawa, Japan', tagW - 56, 24, 18, typo.locationFont, typo.locationWeight, typo.locationSpacing);
    CanvasEngine.applyText(ctx, s1LocFit.text, tagX + 28, tagY + 92, typo.locationFont, typo.locationWeight, s1LocFit.size, typo.locationSpacing, 'rgba(200, 210, 225, 0.88)', 'left');

    // Slide 1 "SWIPE ➔" Badge at right edge (Enlarged 1.4x for high mobile visibility)
    const badgeW = 175, badgeH = 56;
    const badgeX = W_single - badgeW;
    const badgeY = Math.round(H / 2 - badgeH / 2);
    this.drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 6, 'rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 1)', 0);
    CanvasEngine.applyText(ctx, 'SWIPE ➔', badgeX + badgeW / 2, badgeY + 35, typo.cameraFont, 'bold', 22, '0.04em', '#0c0e12', 'center');

    // ---------------- Slide 2 (Right: 1080 ~ 2160) ----------------
    const s2LocFit = CanvasEngine.fitText(ctx, `${state.location || 'Kanazawa'} · [2/2]`, 480, 24, 18, typo.locationFont, typo.locationWeight, typo.locationSpacing);
    CanvasEngine.applyText(ctx, s2LocFit.text, W_single + 60, 78, typo.locationFont, typo.locationWeight, s2LocFit.size, typo.locationSpacing, 'rgba(235, 240, 250, 0.9)', 'left');

    CanvasEngine.applyText(ctx, 'SERIES ARCHIVE', W - 60, 80, typo.headFont, typo.headWeight, 48, typo.headSpacing, '#ffffff', 'right');

    // Slide 2 Right Glass Spec Box
    const s2BoxW = 520, s2BoxH = 115;
    const s2BoxX = W - 60 - s2BoxW;
    const s2BoxY = H - 165;
    this.drawRoundedRect(ctx, s2BoxX, s2BoxY, s2BoxW, s2BoxH, 8, 'rgba(18, 22, 28, 0.82)', 'rgba(255, 255, 255, 0.28)', 1);

    const preset = GEAR_PRESETS.find(p => p.id === state.selectedPresetId);
    let cameraText = '';
    let simText = '';

    if (preset && preset.id !== 'custom') {
      cameraText = preset.camera;
      simText = `${preset.filmSimulation} · ${preset.processing || 'ARCHIVE'}`;
    } else if (state.customCameraTag && state.customCameraTag.includes('·')) {
      const parts = state.customCameraTag.split('·');
      cameraText = parts[0].trim();
      simText = parts.slice(1).join('·').trim();
    } else {
      cameraText = state.customCameraTag || 'FUJIFILM X-T30 II';
      simText = 'CLASSIC CHROME · SOOC ARCHIVE';
    }

    const camLineFit = CanvasEngine.fitText(ctx, cameraText, s2BoxW - 56, 26, 20, typo.cameraFont, typo.cameraWeight, typo.cameraSpacing);
    CanvasEngine.applyText(ctx, camLineFit.text, s2BoxX + 28, s2BoxY + 46, typo.cameraFont, typo.cameraWeight, camLineFit.size, typo.cameraSpacing, '#ffffff', 'left');

    const simLineFit = CanvasEngine.fitText(ctx, simText, s2BoxW - 56, 22, 16, typo.locationFont, typo.locationWeight, typo.locationSpacing);
    CanvasEngine.applyText(ctx, simLineFit.text, s2BoxX + 28, s2BoxY + 86, typo.locationFont, typo.locationWeight, simLineFit.size, typo.locationSpacing, 'rgba(200, 210, 225, 0.88)', 'left');
  }

  /**
   * 3. Mode C: Cinematic Spread (1080 x 1350 with 3:2 Photo)
   */
  renderCinematic(ctx, image, state) {
    const W = 1080, H = 1350;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#141619';
    ctx.fillRect(0, 0, W, H);

    const typo = CanvasEngine.getTypography(state.typographyPreset);

    // 3:2 Photo centered: 1080 x 720 (y: 280 to 1000)
    const photoH = 720;
    const photoY = 280;
    if (image) {
      this.drawFittedImage(ctx, image, 0, photoY, W, photoH, state.panX, state.panY, state.zoom);
    }

    // Framing dividers
    ctx.strokeStyle = '#2d323b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, photoY);
    ctx.lineTo(W, photoY);
    ctx.moveTo(0, photoY + photoH);
    ctx.lineTo(W, photoY + photoH);
    ctx.stroke();

    // Top Section
    const rawMasthead = state.magazineTitle || 'LINES IN TRANSIT';
    const mastheadText = typo.headUppercase ? rawMasthead.toUpperCase() : rawMasthead;
    const mastheadFit = CanvasEngine.fitText(ctx, mastheadText, W - 120, 50, 36, typo.headFont, typo.headWeight, typo.headSpacing);
    CanvasEngine.applyText(ctx, mastheadFit.text, 60, 95, typo.headFont, typo.headWeight, mastheadFit.size, typo.headSpacing, '#ffffff', 'left');

    CanvasEngine.applyText(ctx, 'URBAN & ARCHITECTURAL ARCHIVE', 60, 142, typo.issueFont, typo.issueWeight, 24, typo.issueSpacing, 'rgba(195, 205, 220, 0.9)', 'left');

    CanvasEngine.applyText(ctx, `VOL. ${state.issueNo || '01'} · SPECIAL WIDE SPREAD`, 60, 178, typo.locationFont, typo.locationWeight, 20, typo.locationSpacing, 'rgba(145, 155, 170, 0.85)', 'left');

    const locFit = CanvasEngine.fitText(ctx, (state.location || 'KANAZAWA, JP').toUpperCase(), 400, 24, 16, typo.locationFont, typo.locationWeight, typo.locationSpacing);
    CanvasEngine.applyText(ctx, locFit.text, W - 60, 100, typo.locationFont, typo.locationWeight, locFit.size, typo.locationSpacing, '#ffffff', 'right');

    // Top divider
    ctx.strokeStyle = '#2a2e36';
    ctx.beginPath();
    ctx.moveTo(60, 220);
    ctx.lineTo(W - 60, 220);
    ctx.stroke();

    // Bottom Editorial Section
    const tagY = 1055;
    const titleBase = state.photoTitle || 'THE SCENE';
    const titleFormatted = typo.titleUppercase ? titleBase.toUpperCase() : titleBase;
    const rawTitle = `${state.issueNo || '01'}  ${titleFormatted}`;
    const titleFit = CanvasEngine.fitText(ctx, rawTitle, W - 120, 42, 28, typo.titleFont, typo.titleWeight, typo.titleSpacing);
    CanvasEngine.applyText(ctx, titleFit.text, 60, tagY, typo.titleFont, typo.titleWeight, titleFit.size, typo.titleSpacing, '#ffffff', 'left');

    CanvasEngine.applyText(ctx, '도시의 선과 여백이 빚어내는 고요한 찰나의 기록.', 60, tagY + 46, typo.locationFont, typo.locationWeight, 22, typo.locationSpacing, 'rgba(185, 195, 210, 0.85)', 'left');

    ctx.strokeStyle = '#2a2e36';
    ctx.beginPath();
    ctx.moveTo(60, tagY + 96);
    ctx.lineTo(W - 60, tagY + 96);
    ctx.stroke();

    const camFit = CanvasEngine.fitText(ctx, state.customCameraTag || 'FUJIFILM X-T30 II · SOOC', W - 360, 24, 16, typo.cameraFont, typo.cameraWeight, typo.cameraSpacing);
    CanvasEngine.applyText(ctx, camFit.text, 60, tagY + 134, typo.cameraFont, typo.cameraWeight, camFit.size, typo.cameraSpacing, 'rgba(220, 230, 245, 0.94)', 'left');

    CanvasEngine.applyText(ctx, 'ASPECT RATIO 3:2 WIDE', W - 60, tagY + 134, typo.locationFont, typo.locationWeight, 20, typo.locationSpacing, 'rgba(140, 150, 165, 0.85)', 'right');
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

  /**
   * Helper: draw rounded rect
   */
  drawRoundedRect(ctx, x, y, w, h, r, fillColor, strokeColor, strokeWidth = 1) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (strokeColor && strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }
}

