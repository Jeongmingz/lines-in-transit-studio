/**
 * Lines in Transit Studio - Canvas Rendering Engine
 * Renders high-precision 1080x1350 and 2160x1350 Instagram formats.
 * Decoupled from preview overlays; pure photographic rendering.
 */

import { GEAR_PRESETS } from './presets.js';

export class CanvasEngine {
  static SERIF_FONT = "'Cormorant Garamond', Garamond, Georgia, 'Nanum Myeongjo', Batang, serif";
  static SANS_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif";

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
  static fitText(ctx, text, maxWidth, initialSize, minSize, fontFamily, isBold = false) {
    if (!text) return { text: '', size: initialSize };
    let size = initialSize;
    const weight = isBold ? 'bold ' : '';
    ctx.font = `${weight}${size}px ${fontFamily}`;

    while (ctx.measureText(text).width > maxWidth && size > minSize) {
      size -= 1;
      ctx.font = `${weight}${size}px ${fontFamily}`;
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
   * Direct render to target canvas (Used for 60fps UI preview without extra allocations)
   */
  async renderToCanvas(targetCanvas, image, state) {
    await this.ensureFontsReady();

    const isSeamless = (state.mode === 'seamless');
    const targetW = isSeamless ? 2160 : 1080;
    const targetH = 1350;

    if (targetCanvas.width !== targetW || targetCanvas.height !== targetH) {
      targetCanvas.width = targetW;
      targetCanvas.height = targetH;
    }

    const ctx = targetCanvas.getContext('2d', { willReadFrequently: false });
    if (state.mode === 'vertical') {
      this.renderVertical(ctx, image, state);
    } else if (state.mode === 'seamless') {
      this.renderSeamless(ctx, image, state);
    } else if (state.mode === 'cinematic') {
      this.renderCinematic(ctx, image, state);
    }
  }

  /**
   * Master Export Render (Isolated, off-screen, strictly zero guide lines)
   */
  async renderExport(image, state) {
    await this.ensureFontsReady();

    const masterCanvas = document.createElement('canvas');
    if (state.mode === 'seamless') {
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
        slide2
      };
    } else {
      masterCanvas.width = 1080;
      masterCanvas.height = 1350;
      const mctx = masterCanvas.getContext('2d');
      if (state.mode === 'vertical') {
        this.renderVertical(mctx, image, state);
      } else {
        this.renderCinematic(mctx, image, state);
      }
      return {
        canvas: masterCanvas,
        isMultiSlide: false
      };
    }
  }

  /**
   * 1. Mode A: Vertical 4:5 Magazine Cover (1080 x 1350)
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

    // Top contrast gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 180);
    grad.addColorStop(0, 'rgba(10, 12, 16, 0.72)');
    grad.addColorStop(0.65, 'rgba(10, 12, 16, 0.35)');
    grad.addColorStop(1, 'rgba(10, 12, 16, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 180);

    // Top Masthead (Prominent 48px Cormorant Garamond)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    const mastheadText = (state.magazineTitle || 'LINES IN TRANSIT').toUpperCase();
    const mastheadFit = CanvasEngine.fitText(ctx, mastheadText, W - 320, 48, 32, CanvasEngine.SERIF_FONT, true);
    ctx.font = `bold ${mastheadFit.size}px ${CanvasEngine.SERIF_FONT}`;
    ctx.fillText(mastheadFit.text, 60, 80);

    // Top Right Issue Tag (Clear 22px Sans)
    ctx.fillStyle = 'rgba(235, 240, 250, 0.9)';
    ctx.textAlign = 'right';
    ctx.font = `bold 22px ${CanvasEngine.SANS_FONT}`;
    ctx.fillText(`ISSUE ${state.issueNo || '01'} / ARCHIVE`, W - 60, 78);

    // Bottom Translucent Glass Tag (122px height, 48px margin from bottom edge)
    const tagX = 60, tagY = H - 170, tagW = W - 120, tagH = 122, radius = 8;
    this.drawRoundedRect(ctx, tagX, tagY, tagW, tagH, radius, 'rgba(18, 22, 28, 0.82)', 'rgba(255, 255, 255, 0.28)', 1);

    // Bottom Tag - Line 1: Title (Prominent 38px Cormorant Garamond)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    const rawTitle = `${state.issueNo || '01'}  ${(state.photoTitle || 'UNTITLED').toUpperCase()}`;
    const titleFit = CanvasEngine.fitText(ctx, rawTitle, tagW - 360, 38, 26, CanvasEngine.SERIF_FONT, true);
    ctx.font = `bold ${titleFit.size}px ${CanvasEngine.SERIF_FONT}`;
    ctx.fillText(titleFit.text, tagX + 28, tagY + 50);

    // Bottom Tag - Line 2: Location (24px Sans)
    ctx.fillStyle = 'rgba(200, 210, 225, 0.88)';
    const locFit = CanvasEngine.fitText(ctx, state.location || 'Location', tagW - 360, 24, 18, CanvasEngine.SANS_FONT, false);
    ctx.font = `${locFit.size}px ${CanvasEngine.SANS_FONT}`;
    ctx.fillText(locFit.text, tagX + 28, tagY + 92);

    // Bottom Tag - Right: Camera / SOOC Tag (24px Sans)
    ctx.fillStyle = 'rgba(235, 240, 250, 0.94)';
    ctx.textAlign = 'right';
    const tagText = state.customCameraTag || 'FUJIFILM X-T30 II · SOOC';
    const camFit = CanvasEngine.fitText(ctx, tagText, 340, 24, 17, CanvasEngine.SANS_FONT, true);
    ctx.font = `bold ${camFit.size}px ${CanvasEngine.SANS_FONT}`;
    ctx.fillText(camFit.text, tagX + tagW - 28, tagY + 70);
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

    // Top Gradient across whole 2160 width
    const grad = ctx.createLinearGradient(0, 0, 0, 180);
    grad.addColorStop(0, 'rgba(10, 12, 16, 0.72)');
    grad.addColorStop(0.65, 'rgba(10, 12, 16, 0.35)');
    grad.addColorStop(1, 'rgba(10, 12, 16, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 180);

    // ---------------- Slide 1 (Left: 0 ~ 1080) ----------------
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    const mastheadText = (state.magazineTitle || 'LINES IN TRANSIT').toUpperCase();
    const mastheadFit = CanvasEngine.fitText(ctx, mastheadText, W_single - 320, 48, 32, CanvasEngine.SERIF_FONT, true);
    ctx.font = `bold ${mastheadFit.size}px ${CanvasEngine.SERIF_FONT}`;
    ctx.fillText(mastheadFit.text, 60, 80);

    ctx.fillStyle = 'rgba(235, 240, 250, 0.9)';
    ctx.textAlign = 'right';
    ctx.font = `bold 22px ${CanvasEngine.SANS_FONT}`;
    ctx.fillText(`PANORAMA · [${state.issueNo || '01'}/1]`, W_single - 60, 78);

    // Slide 1 Glass Tag
    const tagX = 60, tagY = H - 170, tagW = W_single - 120, tagH = 122;
    this.drawRoundedRect(ctx, tagX, tagY, tagW, tagH, 8, 'rgba(18, 22, 28, 0.82)', 'rgba(255, 255, 255, 0.28)', 1);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    const rawTitle = `${state.issueNo || '01'}  ${(state.photoTitle || 'PANORAMA').toUpperCase()}`;
    const s1TitleFit = CanvasEngine.fitText(ctx, rawTitle, tagW - 56, 38, 26, CanvasEngine.SERIF_FONT, true);
    ctx.font = `bold ${s1TitleFit.size}px ${CanvasEngine.SERIF_FONT}`;
    ctx.fillText(s1TitleFit.text, tagX + 28, tagY + 50);

    ctx.fillStyle = 'rgba(200, 210, 225, 0.88)';
    const s1LocFit = CanvasEngine.fitText(ctx, state.location || 'Kanazawa, Japan', tagW - 56, 24, 18, CanvasEngine.SANS_FONT, false);
    ctx.font = `${s1LocFit.size}px ${CanvasEngine.SANS_FONT}`;
    ctx.fillText(s1LocFit.text, tagX + 28, tagY + 92);

    // Slide 1 "SWIPE ➔" Badge at right edge (Enlarged 1.4x for high mobile visibility)
    const badgeW = 175, badgeH = 56;
    const badgeX = W_single - badgeW;
    const badgeY = Math.round(H / 2 - badgeH / 2);
    this.drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 6, 'rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 1)', 0);
    ctx.fillStyle = '#0c0e12';
    ctx.font = `bold 22px ${CanvasEngine.SANS_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('SWIPE ➔', badgeX + badgeW / 2, badgeY + 35);

    // ---------------- Slide 2 (Right: 1080 ~ 2160) ----------------
    ctx.fillStyle = 'rgba(235, 240, 250, 0.9)';
    ctx.font = `bold 24px ${CanvasEngine.SANS_FONT}`;
    ctx.textAlign = 'left';
    const s2LocFit = CanvasEngine.fitText(ctx, `${state.location || 'Kanazawa'} · [${state.issueNo || '01'}/2]`, 480, 24, 18, CanvasEngine.SANS_FONT, true);
    ctx.fillText(s2LocFit.text, W_single + 60, 78);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.font = `bold 48px ${CanvasEngine.SERIF_FONT}`;
    ctx.fillText('SERIES ARCHIVE', W - 60, 80);

    // Slide 2 Right Glass Spec Box (Dynamic preset tags - Fixes hardcoded Classic Chrome issue)
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

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    const camLineFit = CanvasEngine.fitText(ctx, cameraText, s2BoxW - 56, 26, 20, CanvasEngine.SANS_FONT, true);
    ctx.font = `bold ${camLineFit.size}px ${CanvasEngine.SANS_FONT}`;
    ctx.fillText(camLineFit.text, s2BoxX + 28, s2BoxY + 46);

    ctx.fillStyle = 'rgba(200, 210, 225, 0.88)';
    const simLineFit = CanvasEngine.fitText(ctx, simText, s2BoxW - 56, 22, 16, CanvasEngine.SANS_FONT, false);
    ctx.font = `${simLineFit.size}px ${CanvasEngine.SANS_FONT}`;
    ctx.fillText(simLineFit.text, s2BoxX + 28, s2BoxY + 86);
  }

  /**
   * 3. Mode C: Cinematic Spread (1080 x 1350 with 3:2 Photo)
   */
  renderCinematic(ctx, image, state) {
    const W = 1080, H = 1350;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#141619';
    ctx.fillRect(0, 0, W, H);

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
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    const mastheadFit = CanvasEngine.fitText(ctx, (state.magazineTitle || 'LINES IN TRANSIT').toUpperCase(), W - 120, 50, 36, CanvasEngine.SERIF_FONT, true);
    ctx.font = `bold ${mastheadFit.size}px ${CanvasEngine.SERIF_FONT}`;
    ctx.fillText(mastheadFit.text, 60, 95);

    ctx.font = `bold 24px ${CanvasEngine.SANS_FONT}`;
    ctx.fillStyle = 'rgba(195, 205, 220, 0.9)';
    ctx.fillText('URBAN & ARCHITECTURAL ARCHIVE', 60, 142);

    ctx.font = `20px ${CanvasEngine.SANS_FONT}`;
    ctx.fillStyle = 'rgba(145, 155, 170, 0.85)';
    ctx.fillText(`VOL. ${state.issueNo || '01'} · SPECIAL WIDE SPREAD`, 60, 178);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 24px ${CanvasEngine.SANS_FONT}`;
    ctx.fillText(state.location || 'KANAZAWA, JP', W - 60, 100);

    // Top divider
    ctx.strokeStyle = '#2a2e36';
    ctx.beginPath();
    ctx.moveTo(60, 220);
    ctx.lineTo(W - 60, 220);
    ctx.stroke();

    // Bottom Editorial Section
    const tagY = 1055;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    const titleFit = CanvasEngine.fitText(ctx, `${state.issueNo || '01'}  ${(state.photoTitle || 'THE SCENE').toUpperCase()}`, W - 120, 42, 28, CanvasEngine.SERIF_FONT, true);
    ctx.font = `bold ${titleFit.size}px ${CanvasEngine.SERIF_FONT}`;
    ctx.fillText(titleFit.text, 60, tagY);

    ctx.font = `22px ${CanvasEngine.SANS_FONT}`;
    ctx.fillStyle = 'rgba(185, 195, 210, 0.85)';
    ctx.fillText('도시의 선과 여백이 빚어내는 고요한 찰나의 기록.', 60, tagY + 46);

    ctx.strokeStyle = '#2a2e36';
    ctx.beginPath();
    ctx.moveTo(60, tagY + 96);
    ctx.lineTo(W - 60, tagY + 96);
    ctx.stroke();

    ctx.fillStyle = 'rgba(220, 230, 245, 0.94)';
    ctx.font = `bold 24px ${CanvasEngine.SANS_FONT}`;
    ctx.fillText(state.customCameraTag || 'FUJIFILM X-T30 II · SOOC', 60, tagY + 134);

    ctx.textAlign = 'right';
    ctx.font = `20px ${CanvasEngine.SANS_FONT}`;
    ctx.fillStyle = 'rgba(140, 150, 165, 0.85)';
    ctx.fillText('ASPECT RATIO 3:2 WIDE', W - 60, tagY + 134);
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

