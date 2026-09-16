/**
 * Lines in Transit Studio - Image Loader & Safety Processor
 * Handles file validation (RAW/HEIC check), safe decoding, and OffscreenCanvas downscaling.
 */

export class ImageLoader {
  /**
   * Validate file format and guard against HEIC/RAW
   */
  static validateFileType(file) {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();

    // Check HEIC / HEIF
    if (name.endsWith('.heic') || name.endsWith('.heif') || type.includes('heic') || type.includes('heif')) {
      return {
        valid: false,
        error: '아이폰 HEIC 형식은 브라우저에서 직접 디코딩이 어렵습니다.\n사진 앱에서 JPEG로 내보내거나, 아이폰 카메라 설정(포맷 > 가장 높은 호환성)으로 촬영한 사진을 사용해 주세요.'
      };
    }

    // Check RAW files (Fuji RAF, Canon CR2/CR3, Nikon NEF, Sony ARW, Adobe DNG)
    const rawExtensions = ['.raw', '.raf', '.cr2', '.cr3', '.nef', '.arw', '.dng', '.orf', '.rw2'];
    if (rawExtensions.some(ext => name.endsWith(ext))) {
      return {
        valid: false,
        error: '카메라 RAW 파일은 브라우저에서 직접 열 수 없습니다.\n카메라 내 필름 시뮬레이션으로 현상된 SOOC JPEG 또는 현상 소프트웨어에서 내보낸 JPEG를 사용해 주세요.'
      };
    }

    return { valid: true };
  }

  /**
   * Safe image downscale on load using OffscreenCanvas with fallback
   */
  static downscaleIfNeeded(img, maxDim = 3200) {
    if (img.width <= maxDim && img.height <= maxDim) {
      return img;
    }

    const ratio = Math.min(maxDim / img.width, maxDim / img.height);
    const targetW = Math.round(img.width * ratio);
    const targetH = Math.round(img.height * ratio);

    // OffscreenCanvas with document.createElement fallback
    const resizeCanvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(targetW, targetH)
        : Object.assign(document.createElement('canvas'), {
            width: targetW,
            height: targetH
          });

    const ctx = resizeCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    return resizeCanvas;
  }

  /**
   * Load image from File object
   */
  static async loadFromFile(file) {
    const check = this.validateFileType(file);
    if (!check.valid) {
      throw new Error(check.error);
    }

    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const safeImg = ImageLoader.downscaleIfNeeded(img);
        resolve(safeImg);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(new Error('이미지를 불러오는 도중 오류가 발생했습니다. 올바른 JPEG/PNG 파일인지 확인해 주세요.'));
      };
      img.src = url;
    });
  }

  /**
   * Load image from URL (sample photos)
   */
  static async loadFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const safeImg = ImageLoader.downscaleIfNeeded(img);
        resolve(safeImg);
      };
      img.onerror = () => {
        reject(new Error(`샘플 사진 로드 실패: ${url}`));
      };
      img.src = url;
    });
  }
}
