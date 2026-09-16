/**
 * Lines in Transit Studio - Export & Compression Engine
 * Adaptive Quality JPEG/PNG encoder and mobile-safe multi-download handler.
 */

export class ExportEngine {
  /**
   * Adaptive JPEG encoder testing Blob size against target threshold.
   * Note: Target size is an internal benchmark for transmission balance,
   * not an official Instagram threshold.
   */
  static async encodeCanvas(canvas, mode = 'auto', targetMB = 1.4) {
    if (mode === 'png') {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG 인코딩에 실패했습니다.');
      return {
        blob,
        format: 'PNG',
        quality: 1.0,
        bytes: blob.size,
        sizeFormatted: this.formatBytes(blob.size),
        targetMet: true,
        qualityReduced: false
      };
    }

    if (mode === 'high') {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!blob) throw new Error('JPEG 인코딩에 실패했습니다.');
      return {
        blob,
        format: 'JPEG',
        quality: 0.95,
        bytes: blob.size,
        sizeFormatted: this.formatBytes(blob.size),
        targetMet: true,
        qualityReduced: false
      };
    }

    if (mode === 'normal') {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('JPEG 인코딩에 실패했습니다.');
      return {
        blob,
        format: 'JPEG',
        quality: 0.92,
        bytes: blob.size,
        sizeFormatted: this.formatBytes(blob.size),
        targetMet: true,
        qualityReduced: false
      };
    }

    // 'auto' Adaptive Quality Mode:
    // Starts at 0.94, drops iteratively if exceeds target size (default 1.4MB, clamped between 0.5MB and 5.0MB)
    const parsedMB = parseFloat(targetMB) || 1.4;
    const clampedMB = Math.max(0.5, Math.min(5.0, parsedMB));
    const targetBytes = clampedMB * 1024 * 1024;
    const testQualities = [0.94, 0.92, 0.90, 0.88, 0.85, 0.82, 0.78];
    let selectedBlob = null;
    let selectedQuality = 0.94;

    for (const q of testQualities) {
      const b = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', q));
      if (!b) continue;
      selectedBlob = b;
      selectedQuality = q;
      if (b.size <= targetBytes) {
        break; // Reached balanced size
      }
    }

    if (!selectedBlob) {
      throw new Error('캔버스 이미지 인코딩에 실패했습니다.');
    }

    const targetMet = selectedBlob.size <= targetBytes;
    const qualityReduced = selectedQuality < 0.94;

    return {
      blob: selectedBlob,
      format: 'JPEG',
      quality: selectedQuality,
      bytes: selectedBlob.size,
      sizeFormatted: this.formatBytes(selectedBlob.size),
      targetMet,
      qualityReduced
    };
  }

  /**
   * Generate standardized file name
   */
  static generateFileName(issueNo = '01', location = 'SCENE', suffix = 'COVER', ext = 'jpg') {
    const cleanNo = String(issueNo).padStart(3, '0');
    const cleanLoc = location
      .replace(/[^a-zA-Z0-9가-힣]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 15)
      .toUpperCase() || 'SCENE';
    return `LIT_ISSUE-${cleanNo}_${cleanLoc}_${suffix}.${ext}`;
  }

  /**
   * Trigger single file download
   */
  static downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /**
   * Native Mobile Web Share API with capability detection
   */
  static async shareFiles(filesArray, title = 'Lines in Transit') {
    const shareData = {
      files: filesArray,
      title: title,
      text: 'Lines in Transit photography post'
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return { success: true };
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
        return { success: false, error: err };
      }
    }
    return { success: false, notSupported: true };
  }

  /**
   * Utility byte formatter
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
