/**
 * Lines in Transit Studio - Main Application Controller
 */

import { GEAR_PRESETS, SAMPLE_PHOTOS, DEFAULT_STATE } from './presets.js';
import { ImageLoader } from './image-loader.js';
import { CanvasEngine } from './canvas-engine.js';
import { ExportEngine } from './export-engine.js';

class App {
  constructor() {
    this.state = this.loadState();
    this.canvasEngine = new CanvasEngine();
    this.currentImage = null;
    this.lastRenderResult = null;

    // DOM Elements
    this.mainCanvas = document.getElementById('main-canvas');
    this.canvasWrapper = document.getElementById('canvas-container');
    this.liveInfo = document.getElementById('live-info');
    this.filenamePreview = document.getElementById('filename-preview');

    this.initPresetsUI();
    this.initEventListeners();
    this.loadInitialImage();
  }

  /**
   * Only lightweight configuration and text states are persisted in localStorage.
   * Image data is NEVER stored in localStorage to prevent quota exhaustion.
   */
  loadState() {
    try {
      const saved = localStorage.getItem('lit_studio_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Exclude any binary or unexpected data
        delete parsed.image;
        delete parsed.imageData;
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }
    return { ...DEFAULT_STATE };
  }

  saveState() {
    try {
      // Whitelist only lightweight metadata
      const cleanState = {
        mode: this.state.mode,
        magazineTitle: this.state.magazineTitle,
        issueNo: this.state.issueNo,
        photoTitle: this.state.photoTitle,
        location: this.state.location,
        selectedPresetId: this.state.selectedPresetId,
        customCameraTag: this.state.customCameraTag,
        showSafetyGuide: this.state.showSafetyGuide,
        zoom: this.state.zoom,
        panX: this.state.panX,
        panY: this.state.panY,
        exportQualityMode: this.state.exportQualityMode,
        autoFitTargetMB: this.state.autoFitTargetMB
      };
      localStorage.setItem('lit_studio_state', JSON.stringify(cleanState));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  initPresetsUI() {
    const select = document.getElementById('select-preset');
    select.innerHTML = '';
    GEAR_PRESETS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label;
      if (p.id === this.state.selectedPresetId) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    // Sync form inputs from state
    document.getElementById('input-issue').value = this.state.issueNo;
    document.getElementById('input-title').value = this.state.photoTitle;
    document.getElementById('input-location').value = this.state.location;
    document.getElementById('input-masthead').value = this.state.magazineTitle;
    document.getElementById('input-camera-tag').value = this.state.customCameraTag;
    document.getElementById('chk-safety').checked = this.state.showSafetyGuide;
    document.getElementById('select-quality-mode').value = this.state.exportQualityMode;

    this.updateModeUI(this.state.mode);
  }

  initEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel-content').forEach(p => p.style.display = 'none');
        btn.classList.add('active');
        const targetPanel = document.getElementById(btn.dataset.tab);
        if (targetPanel) targetPanel.style.display = 'flex';
      });
    });

    // Mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setMode(btn.dataset.mode);
      });
    });

    // Dropzone & File Input
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFile(e.target.files[0]);
      }
    });

    // Sample button clicks
    document.querySelectorAll('.sample-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sample = SAMPLE_PHOTOS.find(s => s.id === btn.dataset.sample);
        if (sample) this.loadSample(sample);
      });
    });

    // Input changes
    const bindInput = (id, prop) => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.state[prop] = e.target.value;
        this.saveState();
        this.updateFilenamePreview();
        this.render();
      });
    };

    bindInput('input-issue', 'issueNo');
    bindInput('input-title', 'photoTitle');
    bindInput('input-location', 'location');
    bindInput('input-masthead', 'magazineTitle');
    bindInput('input-camera-tag', 'customCameraTag');

    // Preset dropdown change
    document.getElementById('select-preset').addEventListener('change', (e) => {
      this.state.selectedPresetId = e.target.value;
      const preset = GEAR_PRESETS.find(p => p.id === e.target.value);
      if (preset && preset.id !== 'custom') {
        this.state.customCameraTag = preset.label;
        document.getElementById('input-camera-tag').value = preset.label;
      }
      this.saveState();
      this.render();
    });

    // Safety guide toggle
    document.getElementById('chk-safety').addEventListener('change', (e) => {
      this.state.showSafetyGuide = e.target.checked;
      this.render();
    });

    // Reset view
    document.getElementById('btn-reset-view').addEventListener('click', () => {
      this.state.zoom = 1.0;
      this.state.panX = 0;
      this.state.panY = 0;
      this.render();
      this.showToast('구도와 줌이 초기화되었습니다.');
    });

    // Canvas Pan & Zoom Interaction
    this.setupCanvasInteractions();

    // Export Controls
    document.getElementById('select-quality-mode').addEventListener('change', (e) => {
      this.state.exportQualityMode = e.target.value;
      this.saveState();
    });

    document.getElementById('btn-download-single').addEventListener('click', () => this.exportSingle());
    document.getElementById('btn-download-s1').addEventListener('click', () => this.exportSeamlessSlide(1));
    document.getElementById('btn-download-s2').addEventListener('click', () => this.exportSeamlessSlide(2));
    document.getElementById('btn-share-mobile').addEventListener('click', () => this.shareSeamlessMobile());
    document.getElementById('btn-download-zip').addEventListener('click', () => this.exportSeamlessZip());
  }

  setupCanvasInteractions() {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialPanX = 0, initialPanY = 0;

    const onStart = (clientX, clientY) => {
      isDragging = true;
      startX = clientX;
      startY = clientY;
      initialPanX = this.state.panX;
      initialPanY = this.state.panY;
    };

    const onMove = (clientX, clientY) => {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;

      // Sensitivity factor
      const factor = 0.003 / this.state.zoom;
      this.state.panX = Math.max(-1, Math.min(1, initialPanX - dx * factor));
      this.state.panY = Math.max(-1, Math.min(1, initialPanY - dy * factor));
      this.render();
    };

    const onEnd = () => {
      isDragging = false;
    };

    this.canvasWrapper.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onEnd);

    // Touch support for mobile
    this.canvasWrapper.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', onEnd);

    // Wheel to Zoom
    this.canvasWrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      this.state.zoom = Math.max(1.0, Math.min(3.0, this.state.zoom + delta));
      this.render();
    }, { passive: false });
  }

  setMode(mode) {
    this.state.mode = mode;
    this.state.panX = 0;
    this.state.panY = 0;
    this.state.zoom = 1.0;
    this.updateModeUI(mode);
    this.saveState();
    this.render();
  }

  updateModeUI(mode) {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const isSeamless = (mode === 'seamless');
    document.getElementById('export-single-section').style.display = isSeamless ? 'none' : 'block';
    document.getElementById('export-seamless-section').style.display = isSeamless ? 'block' : 'none';

    this.updateFilenamePreview();
  }

  updateFilenamePreview() {
    const ext = (this.state.exportQualityMode === 'png') ? 'png' : 'jpg';
    if (this.state.mode === 'seamless') {
      this.filenamePreview.textContent = `${ExportEngine.generateFileName(this.state.issueNo, this.state.location, 'SLIDE-01', ext)} 외 1장`;
    } else {
      this.filenamePreview.textContent = ExportEngine.generateFileName(this.state.issueNo, this.state.location, 'COVER', ext);
    }
  }

  async handleFile(file) {
    try {
      this.currentImage = await ImageLoader.loadFromFile(file);
      this.state.panX = 0;
      this.state.panY = 0;
      this.state.zoom = 1.0;
      this.render();
      this.showToast('사진이 로드되었습니다.');
    } catch (err) {
      alert(err.message);
    }
  }

  async loadSample(sample) {
    try {
      this.currentImage = await ImageLoader.loadFromUrl(sample.path);
      this.state.mode = sample.mode;
      this.state.issueNo = sample.issueNo;
      this.state.photoTitle = sample.title;
      this.state.location = sample.location;
      this.state.selectedPresetId = sample.presetId;
      this.state.panX = 0;
      this.state.panY = 0;
      this.state.zoom = 1.0;

      const preset = GEAR_PRESETS.find(p => p.id === sample.presetId);
      if (preset) {
        this.state.customCameraTag = preset.label;
      }

      this.initPresetsUI();
      this.render();
      this.showToast(`샘플 '${sample.name}' 적용 완료`);
    } catch (err) {
      console.warn('Sample load error:', err);
    }
  }

  loadInitialImage() {
    this.loadSample(SAMPLE_PHOTOS[0]);
  }

  async render() {
    this.lastRenderResult = await this.canvasEngine.render(this.currentImage, this.state);
    
    // Copy result to preview canvas
    this.mainCanvas.width = this.lastRenderResult.canvas.width;
    this.mainCanvas.height = this.lastRenderResult.canvas.height;
    const ctx = this.mainCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    ctx.drawImage(this.lastRenderResult.canvas, 0, 0);

    // Update live resolution label
    if (this.state.mode === 'seamless') {
      this.liveInfo.textContent = '2160 × 1350 px (2-Slide 심리스)';
    } else {
      this.liveInfo.textContent = '1080 × 1350 px (4:5 인스타 규격)';
    }
  }

  async exportSingle() {
    if (!this.lastRenderResult) return;
    this.showToast('고화질 렌더링 인코딩 중...');

    const res = await ExportEngine.encodeCanvas(
      this.lastRenderResult.canvas,
      this.state.exportQualityMode,
      this.state.autoFitTargetMB
    );

    const ext = res.format.toLowerCase();
    const filename = ExportEngine.generateFileName(this.state.issueNo, this.state.location, 'COVER', ext);
    ExportEngine.downloadBlob(res.blob, filename);

    this.showToast(`저장 완료! (${res.sizeFormatted} · 품질 ${(res.quality * 100).toFixed(0)}%)`);
  }

  async exportSeamlessSlide(slideNum) {
    if (!this.lastRenderResult || !this.lastRenderResult.isMultiSlide) return;
    const canvas = (slideNum === 1) ? this.lastRenderResult.slide1 : this.lastRenderResult.slide2;

    this.showToast(`슬라이드 ${slideNum} 인코딩 중...`);
    const res = await ExportEngine.encodeCanvas(
      canvas,
      this.state.exportQualityMode,
      this.state.autoFitTargetMB
    );

    const ext = res.format.toLowerCase();
    const filename = ExportEngine.generateFileName(
      this.state.issueNo,
      this.state.location,
      `SLIDE-${String(slideNum).padStart(2, '0')}`,
      ext
    );

    ExportEngine.downloadBlob(res.blob, filename);
    this.showToast(`슬라이드 ${slideNum} 저장 완료 (${res.sizeFormatted})`);
  }

  async shareSeamlessMobile() {
    if (!this.lastRenderResult || !this.lastRenderResult.isMultiSlide) return;
    this.showToast('모바일 공유 패키지 생성 중...');

    const res1 = await ExportEngine.encodeCanvas(this.lastRenderResult.slide1, this.state.exportQualityMode);
    const res2 = await ExportEngine.encodeCanvas(this.lastRenderResult.slide2, this.state.exportQualityMode);

    const ext = res1.format.toLowerCase();
    const f1 = new File([res1.blob], ExportEngine.generateFileName(this.state.issueNo, this.state.location, 'SLIDE-01', ext), { type: res1.blob.type });
    const f2 = new File([res2.blob], ExportEngine.generateFileName(this.state.issueNo, this.state.location, 'SLIDE-02', ext), { type: res2.blob.type });

    const shareRes = await ExportEngine.shareFiles([f1, f2], `Lines in Transit Issue ${this.state.issueNo}`);
    if (shareRes.success) {
      this.showToast('공유 완료!');
    } else if (shareRes.notSupported) {
      alert('현재 브라우저 환경에서는 Web Share 파일 공유가 지원되지 않습니다. 아래 개별 저장 또는 ZIP 다운로드를 이용해 주세요.');
    }
  }

  async exportSeamlessZip() {
    if (typeof JSZip === 'undefined') {
      alert('JSZip 라이브러리를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    this.showToast('ZIP 압축 파일 생성 중...');

    const res1 = await ExportEngine.encodeCanvas(this.lastRenderResult.slide1, this.state.exportQualityMode);
    const res2 = await ExportEngine.encodeCanvas(this.lastRenderResult.slide2, this.state.exportQualityMode);

    const ext = res1.format.toLowerCase();
    const name1 = ExportEngine.generateFileName(this.state.issueNo, this.state.location, 'SLIDE-01', ext);
    const name2 = ExportEngine.generateFileName(this.state.issueNo, this.state.location, 'SLIDE-02', ext);

    const zip = new JSZip();
    zip.file(name1, res1.blob);
    zip.file(name2, res2.blob);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipName = `LIT_ISSUE-${String(this.state.issueNo).padStart(3, '0')}_PANORAMA.zip`;
    ExportEngine.downloadBlob(zipBlob, zipName);
    this.showToast('ZIP 다운로드 완료!');
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }
}

// Bootstrap on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
