/**
 * Lines in Transit Studio - Canvas Rendering Engine
 * Renders high-precision 1080x1350 and 2160x1350 Instagram formats.
 */

export class CanvasEngine {
  constructor() {
    this.primaryCanvas = document.createElement('canvas');
    this.primaryCtx = this.primaryCanvas.getContext('2d', { willReadFrequently: true });
    
    // Slide split canvases for Seamless mode
    this.slide1Canvas = document.createElement('canvas');
    this.slide1Canvas.width = 1080;
    this.slide1Canvas.height = 1350;
    this.slide1Ctx = this.slide1Canvas.getContext('2d');

    this.slide2Canvas = document.createElement('canvas');
    this.slide2Canvas.width = 1080;
    this.slide2Canvas.height = 1350;
    this.slide2Ctx = this.slide2Canvas.getContext('2d');
  }

  async ensureFontsReady() {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  }

  /**
   * Safe image downscale on load to protect mobile memory
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
   * Main render dispatch
   */
  async render(image, state) {
    await this.ensureFontsReady();

    if (state.mode === 'vertical') {
      this.primaryCanvas.width = 1080;
      this.primaryCanvas.height = 1350;
      this.renderVertical(this.primaryCtx, image, state);
      return { canvas: this.primaryCanvas, isMultiSlide: false };
    } else if (state.mode === 'seamless') {
      this.primaryCanvas.width = 2160;
      this.primaryCanvas.height = 1350;
      this.renderSeamless(this.primaryCtx, image, state);
      
      // Slice into Slide 1 & Slide 2
      this.slide1Ctx.clearRect(0, 0, 1080, 1350);
      this.slide1Ctx.drawImage(this.primaryCanvas, 0, 0, 1080, 1350, 0, 0, 1080, 1350);

      this.slide2Ctx.clearRect(0, 0, 1080, 1350);
      this.slide2Ctx.drawImage(this.primaryCanvas, 1080, 0, 1080, 1350, 0, 0, 1080, 1350);

      return {
        canvas: this.primaryCanvas,
        isMultiSlide: true,
        slide1: this.slide1Canvas,
        slide2: this.slide2Canvas
      };
    } else if (state.mode === 'cinematic') {
      this.primaryCanvas.width = 1080;
      this.primaryCanvas.height = 1350;
      this.renderCinematic(this.primaryCtx, image, state);
      return { canvas: this.primaryCanvas, isMultiSlide: false };
    }
  }

  /**
   * 1. Mode A: Vertical 4:5 Magazine Cover
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

    // Top subtle gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 140);
    grad.addColorStop(0, 'rgba(10, 12, 16, 0.65)');
    grad.addColorStop(1, 'rgba(10, 12, 16, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 140);

    // Top masthead text
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px Garamond, "Nanum Myeongjo", Batang, serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.magazineTitle || 'LINES IN TRANSIT', 54, 52);

    ctx.fillStyle = 'rgba(230, 235, 245, 0.85)';
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`ISSUE ${state.issueNo || '01'} / ARCHIVE`, W - 54, 50);

    // Bottom Translucent Glass Tag
    const tagX = 54, tagY = H - 150, tagW = W - 108, tagH = 96, radius = 6;
    this.drawRoundedRect(ctx, tagX, tagY, tagW, tagH, radius, 'rgba(18, 22, 28, 0.78)', 'rgba(255, 255, 255, 0.28)', 1);

    // Bottom Tag - Line 1: Title (with auto-shrink if long)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    let titleFontSize = 26;
    ctx.font = `${titleFontSize}px Garamond, "Nanum Myeongjo", Batang, serif`;
    const fullTitle = `${state.issueNo || '01'}  ${(state.photoTitle || 'UNTITLED').toUpperCase()}`;
    const maxTitleWidth = tagW - 360;
    while (ctx.measureText(fullTitle).width > maxTitleWidth && titleFontSize > 18) {
      titleFontSize -= 1;
      ctx.font = `${titleFontSize}px Garamond, "Nanum Myeongjo", Batang, serif`;
    }
    ctx.fillText(fullTitle, tagX + 26, tagY + 38);

    // Bottom Tag - Line 2: Location
    ctx.fillStyle = 'rgba(200, 205, 215, 0.85)';
    ctx.font = '17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(state.location || 'Location', tagX + 26, tagY + 72);

    // Bottom Tag - Right: Camera / SOOC Tag
    ctx.fillStyle = 'rgba(230, 235, 245, 0.92)';
    ctx.font = '17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(state.customCameraTag || 'FUJIFILM X-T30 II · SOOC', tagX + tagW - 26, tagY + 54);

    if (state.showSafetyGuide) {
      this.drawSafetyGuides(ctx, W, H);
    }
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
    const grad = ctx.createLinearGradient(0, 0, 0, 140);
    grad.addColorStop(0, 'rgba(10, 12, 16, 0.65)');
    grad.addColorStop(1, 'rgba(10, 12, 16, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 140);

    // ---------------- Slide 1 (Left: 0 ~ 1080) ----------------
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px Garamond, "Nanum Myeongjo", Batang, serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.magazineTitle || 'LINES IN TRANSIT', 54, 52);

    ctx.fillStyle = 'rgba(230, 235, 245, 0.85)';
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`PANORAMA · [${state.issueNo || '01'}/1]`, W_single - 54, 50);

    // Slide 1 Glass Tag
    const tagX = 54, tagY = H - 150, tagW = W_single - 108, tagH = 96;
    this.drawRoundedRect(ctx, tagX, tagY, tagW, tagH, 6, 'rgba(18, 22, 28, 0.78)', 'rgba(255, 255, 255, 0.28)', 1);

    ctx.fillStyle = '#ffffff';
    ctx.font = '26px Garamond, "Nanum Myeongjo", Batang, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${state.issueNo || '01'}  ${(state.photoTitle || 'PANORAMA').toUpperCase()}`, tagX + 26, tagY + 38);

    ctx.fillStyle = 'rgba(200, 205, 215, 0.85)';
    ctx.font = '17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(state.location || 'Kanazawa, Japan', tagX + 26, tagY + 72);

    // Slide 1 "SWIPE ➔" Badge at right edge
    const badgeW = 125, badgeH = 40;
    const badgeX = W_single - badgeW;
    const badgeY = Math.round(H / 2 - badgeH / 2);
    this.drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 4, 'rgba(255, 255, 255, 0.90)', 'rgba(255, 255, 255, 1)', 0);
    ctx.fillStyle = '#111317';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SWIPE ➔', badgeX + badgeW / 2, badgeY + 25);

    // ---------------- Slide 2 (Right: 1080 ~ 2160) ----------------
    ctx.fillStyle = 'rgba(230, 235, 245, 0.85)';
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${state.location || 'Kanazawa'} · [${state.issueNo || '01'}/2]`, W_single + 54, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '26px Garamond, "Nanum Myeongjo", Batang, serif';
    ctx.textAlign = 'right';
    ctx.fillText('SERIES ARCHIVE', W - 54, 52);

    // Slide 2 Right Glass Spec Box
    const s2BoxW = 420, s2BoxH = 80;
    const s2BoxX = W - 54 - s2BoxW;
    const s2BoxY = H - 134;
    this.drawRoundedRect(ctx, s2BoxX, s2BoxY, s2BoxW, s2BoxH, 6, 'rgba(18, 22, 28, 0.78)', 'rgba(255, 255, 255, 0.28)', 1);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.customCameraTag ? state.customCameraTag.split('·')[0].trim() : 'FUJIFILM X-T30 II', s2BoxX + 22, s2BoxY + 32);

    ctx.fillStyle = 'rgba(200, 205, 215, 0.85)';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('CLASSIC CHROME · SOOC ARCHIVE', s2BoxX + 22, s2BoxY + 60);

    // Cut Seam Indicator in editing mode
    if (state.showSafetyGuide) {
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(W_single, 0);
      ctx.lineTo(W_single, H);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /**
   * 3. Mode C: Cinematic Spread (1080 x 1350)
   */
  renderCinematic(ctx, image, state) {
    const W = 1080, H = 1350;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#141619';
    ctx.fillRect(0, 0, W, H);

    // 3:2 Photo in center: 1080 x 720 (y: 280 to 1000)
    const photoH = 720;
    const photoY = 280;
    if (image) {
      this.drawFittedImage(ctx, image, 0, photoY, W, photoH, state.panX, state.panY, state.zoom);
    }

    // Border lines
    ctx.strokeStyle = '#2d323b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, photoY);
    ctx.lineTo(W, photoY);
    ctx.moveTo(0, photoY + photoH);
    ctx.lineTo(W, photoY + photoH);
    ctx.stroke();

    // Top Editorial Masthead
    ctx.fillStyle = '#ffffff';
    ctx.font = '36px Garamond, "Nanum Myeongjo", Batang, serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.magazineTitle || 'LINES IN TRANSIT', 54, 90);

    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(190, 200, 215, 0.9)';
    ctx.fillText('URBAN & ARCHITECTURAL ARCHIVE', 54, 135);

    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(140, 150, 165, 0.85)';
    ctx.fillText(`VOL. ${state.issueNo || '01'} · SPECIAL WIDE SPREAD`, 54, 170);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(state.location || 'KANAZAWA, JP', W - 54, 95);

    // Divider line
    ctx.strokeStyle = '#2a2e36';
    ctx.beginPath();
    ctx.moveTo(54, 215);
    ctx.lineTo(W - 54, 215);
    ctx.stroke();

    // Bottom Editorial Section
    const tagY = 1050;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '32px Garamond, "Nanum Myeongjo", Batang, serif';
    ctx.fillText(`${state.issueNo || '01'}  ${(state.photoTitle || 'THE SCENE').toUpperCase()}`, 54, tagY);

    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(180, 190, 205, 0.85)';
    ctx.fillText('도시의 선과 여백이 빚어내는 고요한 찰나의 기록.', 54, tagY + 45);

    ctx.strokeStyle = '#2a2e36';
    ctx.beginPath();
    ctx.moveTo(54, tagY + 95);
    ctx.lineTo(W - 54, tagY + 95);
    ctx.stroke();

    ctx.fillStyle = 'rgba(215, 225, 240, 0.92)';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(state.customCameraTag || 'FUJIFILM X-T30 II · SOOC', 54, tagY + 128);

    ctx.textAlign = 'right';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(130, 140, 155, 0.8)';
    ctx.fillText('ASPECT RATIO 3:2 WIDE', W - 54, tagY + 128);
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

  /**
   * Helper: draw safety guidelines
   */
  drawSafetyGuides(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);

    // Outer safe margin: 54px
    ctx.strokeRect(54, 54, w - 108, h - 108);

    // Center crosshairs
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.restore();
  }
}
