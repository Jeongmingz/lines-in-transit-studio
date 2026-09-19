/**
 * Lines in Transit Studio - Main Application Controller
 * Optimized for mobile touch, pinch zoom, requestAnimationFrame render loop,
 * decoupled CSS guides, and reliable client-side export.
 */

import { GEAR_PRESETS, SAMPLE_PHOTOS, DEFAULT_STATE, SERIES_PRESETS, TYPOGRAPHY_PRESETS } from './presets.js';
import { ImageLoader } from './image-loader.js';
import { CanvasEngine } from './canvas-engine.js';
import { ExportEngine } from './export-engine.js';
import { DraftStore } from './draft-store.js';

class App {
  constructor() {
    this.state = this.loadState();
    this.canvasEngine = new CanvasEngine();
    this.currentImage = null;
    this.isRendering = false;
    this.renderDirty = false;
    this.isExporting = false;
    this.imageLoadRequestId = 0;
    this.currentGps = null;
    this.carouselItems = [];
    this.activeCarouselIndex = -1;

    // DOM Elements
    this.mainCanvas = document.getElementById('main-canvas');
    this.canvasWrapper = document.getElementById('canvas-container');
    this.liveInfo = document.getElementById('live-info');
    this.filenamePreview = document.getElementById('filename-preview');
    this.zoomSlider = document.getElementById('zoom-slider');
    this.zoomBadge = document.getElementById('zoom-val-badge');

    // GPS Elements
    this.gpsIndicator = document.getElementById('gps-indicator');
    this.gpsCard = document.getElementById('gps-card');
    this.gpsNoneCard = document.getElementById('gps-none-card');
    this.gpsCoordsText = document.getElementById('gps-coords-text');
    this.gpsDmsText = document.getElementById('gps-dms-text');
    this.btnFetchAddress = document.getElementById('btn-fetch-address');
    this.gpsStatusInfo = document.getElementById('gps-status-info');

    this.initPresetsUI();
    this.initEventListeners();
    this.loadInitialDraftOrImage();
    window.__app_instance__ = this;
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
        return {
          ...DEFAULT_STATE,
          ...parsed,
          zoom: typeof parsed.zoom === 'number' ? parsed.zoom : DEFAULT_STATE.zoom,
          panX: typeof parsed.panX === 'number' ? parsed.panX : DEFAULT_STATE.panX,
          panY: typeof parsed.panY === 'number' ? parsed.panY : DEFAULT_STATE.panY,
          series: parsed.series || DEFAULT_STATE.series,
          seriesNo: parsed.seriesNo || parsed.issueNo || DEFAULT_STATE.seriesNo,
          photoTitle: parsed.photoTitle || DEFAULT_STATE.photoTitle,
          location: parsed.location || DEFAULT_STATE.location,
          captureDate: parsed.captureDate || DEFAULT_STATE.captureDate,
          photoFitMode: parsed.photoFitMode || DEFAULT_STATE.photoFitMode,
          panoramaOverlay: parsed.panoramaOverlay !== undefined ? parsed.panoramaOverlay : DEFAULT_STATE.panoramaOverlay,
          typographyPreset: parsed.typographyPreset || DEFAULT_STATE.typographyPreset,
          captionNote: parsed.captionNote || '',
          mode: parsed.mode || DEFAULT_STATE.mode
        };
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }
    return { ...DEFAULT_STATE };
  }

  saveState() {
    try {
      const cleanState = {
        mode: this.state.mode,
        series: this.state.series,
        seriesNo: this.state.seriesNo || this.state.issueNo,
        issueNo: this.state.seriesNo || this.state.issueNo,
        photoTitle: this.state.photoTitle,
        location: this.state.location,
        captureDate: this.state.captureDate,
        photoFitMode: this.state.photoFitMode,
        panoramaOverlay: this.state.panoramaOverlay,
        typographyPreset: this.state.typographyPreset,
        captionNote: this.state.captionNote,
        magazineTitle: this.state.magazineTitle,
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
    if (select) {
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
    }

    // Sync series preset UI
    const seriesSelect = document.getElementById('select-series');
    const seriesCustom = document.getElementById('input-series-custom');
    if (seriesSelect) {
      if (SERIES_PRESETS.includes(this.state.series)) {
        seriesSelect.value = this.state.series;
        if (seriesCustom) seriesCustom.style.display = 'none';
      } else {
        seriesSelect.value = 'custom';
        if (seriesCustom) {
          seriesCustom.style.display = 'block';
          seriesCustom.value = this.state.series || '';
        }
      }
    }

    // Sync form inputs from state
    const inputIssue = document.getElementById('input-issue');
    if (inputIssue) inputIssue.value = this.state.seriesNo || this.state.issueNo || '01';

    const inputTitle = document.getElementById('input-title');
    if (inputTitle) inputTitle.value = this.state.photoTitle || '';

    const inputLoc = document.getElementById('input-location');
    if (inputLoc) inputLoc.value = this.state.location || '';

    const inputDate = document.getElementById('input-date');
    if (inputDate) inputDate.value = this.state.captureDate || '';

    const inputCam = document.getElementById('input-camera-tag');
    if (inputCam) inputCam.value = this.state.customCameraTag || '';

    const captionNote = document.getElementById('input-caption-note');
    if (captionNote) captionNote.value = this.state.captionNote || '';

    const typographySelect = document.getElementById('select-typography');
    if (typographySelect) {
      typographySelect.innerHTML = '';
      TYPOGRAPHY_PRESETS.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.name;
        option.selected = preset.id === this.state.typographyPreset;
        typographySelect.appendChild(option);
      });
      this.updateTypographyDescription();
    }

    const chkSafety = document.getElementById('chk-safety');
    if (chkSafety) chkSafety.checked = !!this.state.showSafetyGuide;

    const selectQual = document.getElementById('select-quality-mode');
    if (selectQual) selectQual.value = this.state.exportQualityMode;

    // Framing buttons
    const btnFitCover = document.getElementById('btn-fit-cover');
    const btnFitLetterbox = document.getElementById('btn-fit-letterbox');
    if (btnFitCover && btnFitLetterbox) {
      btnFitCover.classList.toggle('active', this.state.photoFitMode !== 'fit');
      btnFitLetterbox.classList.toggle('active', this.state.photoFitMode === 'fit');
    }

    // Panorama overlay checkbox
    const chkPanoramaOverlay = document.getElementById('chk-panorama-overlay');
    if (chkPanoramaOverlay) {
      chkPanoramaOverlay.checked = !!this.state.panoramaOverlay;
    }

    this.updateModeUI(this.state.mode);

    // Target MB selection
    const targetMbSelect = document.getElementById('select-target-mb');
    const targetMbInput = document.getElementById('input-target-mb');
    const currentMB = String(this.state.autoFitTargetMB || 1.4);
    if (['1.0', '1.4', '2.0'].includes(currentMB)) {
      if (targetMbSelect) targetMbSelect.value = currentMB;
      if (targetMbInput) targetMbInput.style.display = 'none';
    } else {
      if (targetMbSelect) targetMbSelect.value = 'custom';
      if (targetMbInput) {
        targetMbInput.value = currentMB;
        targetMbInput.style.display = 'block';
      }
    }

    this.syncGuideUI();
    this.syncZoomUI();
    this.updateModeUI(this.state.mode);
  }

  syncGuideUI() {
    if (this.state.showSafetyGuide) {
      this.canvasWrapper.classList.add('show-guides');
    } else {
      this.canvasWrapper.classList.remove('show-guides');
    }
  }

  syncZoomUI() {
    if (this.zoomSlider) this.zoomSlider.value = this.state.zoom.toFixed(2);
    if (this.zoomBadge) this.zoomBadge.textContent = `${this.state.zoom.toFixed(1)}x`;
  }

  updateTypographyDescription() {
    const preset = TYPOGRAPHY_PRESETS.find(item => item.id === this.state.typographyPreset) || TYPOGRAPHY_PRESETS[0];
    const description = document.getElementById('typography-description');
    if (description) description.textContent = preset.description;
  }

  persistActiveComposition() {
    const item = this.carouselItems[this.activeCarouselIndex];
    if (!item) return;
    item.zoom = this.state.zoom;
    item.panX = this.state.panX;
    item.panY = this.state.panY;
  }

  activateCarouselItem(index) {
    if (index < 0 || index >= this.carouselItems.length) return;
    this.persistActiveComposition();
    this.activeCarouselIndex = index;
    const item = this.carouselItems[index];
    this.currentImage = item.image;
    this.currentGps = item.gps || null;
    this.state.zoom = item.zoom ?? 1;
    this.state.panX = item.panX ?? 0;
    this.state.panY = item.panY ?? 0;
    this.syncZoomUI();
    this.updateGpsUI(this.currentGps);
    this.renderCarouselEditor();
    this.scheduleRender();
  }

  renderCarouselEditor() {
    const editor = document.getElementById('carousel-editor');
    const list = document.getElementById('carousel-list');
    const count = document.getElementById('carousel-count');
    if (!editor || !list || !count) return;

    editor.hidden = this.carouselItems.length === 0;
    count.textContent = `사진 ${this.carouselItems.length}장`;
    list.innerHTML = '';

    this.carouselItems.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `carousel-item${index === this.activeCarouselIndex ? ' active' : ''}`;
      const safeName = item.name
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      card.innerHTML = `
        <span class="carousel-number">${index + 1}</span>
        <img class="carousel-thumb" alt="${safeName}">
        <div class="carousel-name" title="${safeName}">${safeName}</div>
        <div class="carousel-actions">
          <button type="button" data-action="left" aria-label="앞으로 이동" ${index === 0 ? 'disabled' : ''}>←</button>
          <button type="button" data-action="right" aria-label="뒤로 이동" ${index === this.carouselItems.length - 1 ? 'disabled' : ''}>→</button>
          <button type="button" data-action="remove" aria-label="사진 삭제">×</button>
        </div>`;
      const thumb = card.querySelector('.carousel-thumb');
      thumb.src = item.previewUrl;
      thumb.addEventListener('click', () => this.activateCarouselItem(index));
      card.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => this.handleCarouselAction(index, button.dataset.action));
      });
      list.appendChild(card);
    });
    this.updateFilenamePreview();
    const downloadButton = document.getElementById('btn-download-single');
    if (downloadButton && this.state.mode === 'photo') {
      downloadButton.textContent = this.carouselItems.length > 1
        ? `📦 캐러셀 ${this.carouselItems.length}장 ZIP 다운로드`
        : '📥 클린 사진 다운로드';
    }
  }

  handleCarouselAction(index, action) {
    if (action === 'remove') {
      const [removed] = this.carouselItems.splice(index, 1);
      if (removed?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(removed.previewUrl);
      if (this.carouselItems.length === 0) {
        this.activeCarouselIndex = -1;
        this.currentImage = null;
        this.renderCarouselEditor();
        this.scheduleRender();
        return;
      }
      this.activateCarouselItem(Math.min(index, this.carouselItems.length - 1));
      return;
    }

    const target = action === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= this.carouselItems.length) return;
    [this.carouselItems[index], this.carouselItems[target]] = [this.carouselItems[target], this.carouselItems[index]];
    this.activeCarouselIndex = target;
    this.renderCarouselEditor();
  }

  setZoom(newZoom, shouldSave = true) {
    this.state.zoom = Math.max(1.0, Math.min(3.0, parseFloat(newZoom)));
    this.syncZoomUI();
    this.persistActiveComposition();
    if (shouldSave) {
      this.saveState();
    }
    this.scheduleRender();
  }

  scheduleRender() {
    this.renderDirty = true;
    if (this.isRendering) return;
    this.runRenderLoop();
  }

  async runRenderLoop() {
    this.isRendering = true;
    while (this.renderDirty) {
      this.renderDirty = false;
      await new Promise(resolve => requestAnimationFrame(resolve));
      await this.render();
    }
    this.isRendering = false;
  }

  initEventListeners() {
    // Tab switching with Accessibility and Keyboard Arrow Navigation
    const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
    tabButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.panel-content').forEach(p => p.style.display = 'none');
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const targetPanel = document.getElementById(btn.dataset.tab);
        if (targetPanel) targetPanel.style.display = 'flex';
      });

      btn.addEventListener('keydown', (e) => {
        let targetIndex = -1;
        if (e.key === 'ArrowRight') {
          targetIndex = (index + 1) % tabButtons.length;
        } else if (e.key === 'ArrowLeft') {
          targetIndex = (index - 1 + tabButtons.length) % tabButtons.length;
        } else if (e.key === 'Home') {
          targetIndex = 0;
        } else if (e.key === 'End') {
          targetIndex = tabButtons.length - 1;
        }
        if (targetIndex >= 0) {
          e.preventDefault();
          tabButtons[targetIndex].focus();
          tabButtons[targetIndex].click();
        }
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
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        this.handleFiles(Array.from(e.dataTransfer.files));
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) {
        this.handleFiles(Array.from(e.target.files));
        e.target.value = '';
      }
    });

    // Sample button clicks
    [1, 2, 3].forEach(idx => {
      const btn = document.getElementById(`btn-sample-${idx}`);
      if (btn && SAMPLE_PHOTOS[idx - 1]) {
        btn.addEventListener('click', () => {
          this.loadSample(SAMPLE_PHOTOS[idx - 1]);
        });
      }
    });

    document.querySelectorAll('.sample-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sample = SAMPLE_PHOTOS.find(s => s.id === btn.dataset.sample);
        if (sample) this.loadSample(sample);
      });
    });

    // Series selection & custom series input
    const seriesSelect = document.getElementById('select-series');
    const seriesCustom = document.getElementById('input-series-custom');
    if (seriesSelect) {
      seriesSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          if (seriesCustom) {
            seriesCustom.style.display = 'block';
            seriesCustom.focus();
            this.state.series = seriesCustom.value || 'UNTITLED';
          }
        } else {
          if (seriesCustom) seriesCustom.style.display = 'none';
          this.state.series = e.target.value;
        }
        this.saveState();
        this.updateFilenamePreview();
        this.scheduleRender();
      });
    }

    if (seriesCustom) {
      seriesCustom.addEventListener('input', (e) => {
        this.state.series = e.target.value || 'UNTITLED';
        this.saveState();
        this.updateFilenamePreview();
        this.scheduleRender();
      });
    }

    // Framing mode buttons (PHOTO mode)
    const btnFitCover = document.getElementById('btn-fit-cover');
    const btnFitLetterbox = document.getElementById('btn-fit-letterbox');
    if (btnFitCover && btnFitLetterbox) {
      btnFitCover.addEventListener('click', () => {
        this.state.photoFitMode = 'cover';
        btnFitCover.classList.add('active');
        btnFitLetterbox.classList.remove('active');
        this.saveState();
        this.scheduleRender();
      });
      btnFitLetterbox.addEventListener('click', () => {
        this.state.photoFitMode = 'fit';
        btnFitLetterbox.classList.add('active');
        btnFitCover.classList.remove('active');
        this.saveState();
        this.scheduleRender();
      });
    }

    // Panorama overlay toggle (PANORAMA mode)
    const chkPanoramaOverlay = document.getElementById('chk-panorama-overlay');
    if (chkPanoramaOverlay) {
      chkPanoramaOverlay.addEventListener('change', (e) => {
        this.state.panoramaOverlay = e.target.checked;
        this.updateModeUI(this.state.mode);
        this.saveState();
        this.scheduleRender();
      });
    }

    // Input changes
    const bindInput = (id, prop, extraSync) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', (e) => {
        this.state[prop] = e.target.value;
        if (extraSync) extraSync(e.target.value);
        this.saveState();
        this.updateFilenamePreview();
        this.scheduleRender();
      });
    };

    bindInput('input-issue', 'seriesNo', (val) => { this.state.issueNo = val; });
    bindInput('input-title', 'photoTitle');
    bindInput('input-location', 'location');
    bindInput('input-date', 'captureDate');
    bindInput('input-camera-tag', 'customCameraTag');
    bindInput('input-caption-note', 'captionNote');

    const typographySelect = document.getElementById('select-typography');
    if (typographySelect) {
      typographySelect.addEventListener('change', (e) => {
        this.state.typographyPreset = e.target.value;
        this.updateTypographyDescription();
        this.saveState();
        this.scheduleRender();
      });
    }

    // Preset dropdown change
    const presetSelect = document.getElementById('select-preset');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        this.state.selectedPresetId = e.target.value;
        const preset = GEAR_PRESETS.find(p => p.id === e.target.value);
        const cameraInput = document.getElementById('input-camera-tag');
        if (preset && preset.id !== 'custom') {
          this.state.customCameraTag = preset.label;
          if (cameraInput) cameraInput.value = preset.label;
        } else if (e.target.value === 'custom') {
          if (cameraInput) {
            cameraInput.focus();
            cameraInput.select();
          }
        }
        this.saveState();
        this.scheduleRender();
      });
    }

    // Safety guide toggle (Pure CSS overlay toggle)
    const chkSafety = document.getElementById('chk-safety');
    if (chkSafety) {
      chkSafety.addEventListener('change', (e) => {
        this.state.showSafetyGuide = e.target.checked;
        this.syncGuideUI();
        this.saveState();
      });
    }

    // Zoom Controls
    if (this.zoomSlider) {
      this.zoomSlider.addEventListener('input', (e) => {
        this.setZoom(e.target.value, false);
      });
      this.zoomSlider.addEventListener('change', () => {
        this.saveState();
      });
    }

    const btnZoomIn = document.getElementById('btn-zoom-in');
    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        this.setZoom(this.state.zoom + 0.1);
      });
    }

    const btnZoomOut = document.getElementById('btn-zoom-out');
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        this.setZoom(this.state.zoom - 0.1);
      });
    }

    // Reset view
    const btnResetView = document.getElementById('btn-reset-view');
    if (btnResetView) {
      btnResetView.addEventListener('click', () => {
        this.state.zoom = 1.0;
        this.state.panX = 0;
        this.state.panY = 0;
        this.persistActiveComposition();
        this.syncZoomUI();
        this.saveState();
        this.scheduleRender();
        this.showToast('구도와 줌이 초기화되었습니다.');
      });
    }

    // Canvas Pan & Pinch Zoom Interactions
    this.setupCanvasInteractions();

    // Export Controls
    const selectQualityMode = document.getElementById('select-quality-mode');
    if (selectQualityMode) {
      selectQualityMode.addEventListener('change', (e) => {
        this.state.exportQualityMode = e.target.value;
        const targetMbGroup = document.getElementById('target-mb-group');
        if (targetMbGroup) {
          targetMbGroup.style.display = (e.target.value === 'auto') ? 'block' : 'none';
        }
        this.saveState();
        this.updateFilenamePreview();
      });
    }

    const targetMbSelect = document.getElementById('select-target-mb');
    const targetMbInput = document.getElementById('input-target-mb');
    if (targetMbSelect && targetMbInput) {
      targetMbSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          targetMbInput.style.display = 'block';
          const val = parseFloat(targetMbInput.value) || 1.4;
          this.state.autoFitTargetMB = Math.max(0.5, Math.min(5.0, val));
        } else {
          targetMbInput.style.display = 'none';
          this.state.autoFitTargetMB = parseFloat(e.target.value);
        }
        this.saveState();
      });

      targetMbInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 1.4;
        this.state.autoFitTargetMB = Math.max(0.5, Math.min(5.0, val));
        this.saveState();
      });
    }

    // GPS Reverse Geocoding Controls
    if (this.btnFetchAddress) {
      this.btnFetchAddress.addEventListener('click', () => this.handleReverseGeocode());
    }

    // Instagram Caption clipboard copy (Observation-based journal notes)
    const btnCopyCaption = document.getElementById('btn-copy-caption');
    if (btnCopyCaption) {
      btnCopyCaption.addEventListener('click', () => {
        const noteInput = document.getElementById('input-caption-note');
        const note = noteInput ? noteInput.value.trim() : '';

        const caption = App.formatCaption(note, this.state);
        navigator.clipboard.writeText(caption).then(() => {
          this.showToast('인스타그램 저널 캡션이 복사되었습니다!');
        }).catch(() => {
          this.showToast('캡션 복사에 실패했습니다.');
        });
      });
    }

    const btnDownloadSingle = document.getElementById('btn-download-single');
    if (btnDownloadSingle) {
      btnDownloadSingle.addEventListener('click', () => this.exportSingle());
    }
    const btnShareVertical = document.getElementById('btn-share-vertical-mobile');
    if (btnShareVertical) {
      btnShareVertical.addEventListener('click', () => this.shareVerticalMobile());
    }
    const btnDownloadS1 = document.getElementById('btn-download-s1');
    if (btnDownloadS1) {
      btnDownloadS1.addEventListener('click', () => this.exportSeamlessSlide(1));
    }
    const btnDownloadS2 = document.getElementById('btn-download-s2');
    if (btnDownloadS2) {
      btnDownloadS2.addEventListener('click', () => this.exportSeamlessSlide(2));
    }
    const btnShareMobile = document.getElementById('btn-share-mobile');
    if (btnShareMobile) {
      btnShareMobile.addEventListener('click', () => this.shareSeamlessMobile());
    }
    const btnDownloadZip = document.getElementById('btn-download-zip');
    if (btnDownloadZip) {
      btnDownloadZip.addEventListener('click', () => this.exportSeamlessZip());
    }

    const btnSaveDraft = document.getElementById('btn-save-draft');
    if (btnSaveDraft) btnSaveDraft.addEventListener('click', () => this.saveDraft());
    const btnClearDraft = document.getElementById('btn-clear-draft');
    if (btnClearDraft) btnClearDraft.addEventListener('click', () => this.clearDraft());
  }

  setupCanvasInteractions() {
    let isDragging = false;
    let isPinching = false;
    let startX = 0, startY = 0;
    let initialPanX = 0, initialPanY = 0;
    let initialPinchDist = 0;
    let initialPinchZoom = 1.0;

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

      const factor = 0.003 / this.state.zoom;
      this.state.panX = Math.max(-1, Math.min(1, initialPanX - dx * factor));
      this.state.panY = Math.max(-1, Math.min(1, initialPanY - dy * factor));
      this.persistActiveComposition();
      this.scheduleRender();
    };

    const onEnd = () => {
      isDragging = false;
      isPinching = false;
      this.saveState();
    };

    // Mouse drag
    this.canvasWrapper.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onEnd);

    // Touch events with 2-finger Pinch-to-Zoom
    this.canvasWrapper.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        isPinching = true;
        isDragging = false;
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialPinchZoom = this.state.zoom;
      } else if (e.touches.length === 1) {
        isPinching = false;
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (isPinching && e.touches.length === 2) {
        e.preventDefault();
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (initialPinchDist > 0) {
          const scale = currentDist / initialPinchDist;
          this.setZoom(Math.max(1.0, Math.min(3.0, initialPinchZoom * scale)), false);
        }
      } else if (!isPinching && e.touches.length === 1 && isDragging) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        isPinching = false;
      }
      if (e.touches.length === 0) {
        onEnd();
      }
    });

    // Wheel to Zoom
    this.canvasWrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      this.setZoom(this.state.zoom + delta);
    }, { passive: false });
  }

  setMode(mode) {
    this.persistActiveComposition();
    this.state.mode = mode;
    this.state.panX = 0;
    this.state.panY = 0;
    this.state.zoom = 1.0;
    this.syncZoomUI();
    this.updateModeUI(mode);
    this.saveState();
    this.scheduleRender();
  }

  updateModeUI(mode) {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const isPanorama = (mode === 'panorama');
    if (isPanorama) {
      this.canvasWrapper.classList.add('mode-seamless');
    } else {
      this.canvasWrapper.classList.remove('mode-seamless');
    }

    const photoFitGroup = document.getElementById('photo-fit-group');
    if (photoFitGroup) {
      photoFitGroup.style.display = (mode === 'photo') ? 'flex' : 'none';
    }

    const panoramaOverlayGroup = document.getElementById('panorama-overlay-group');
    if (panoramaOverlayGroup) {
      panoramaOverlayGroup.style.display = (mode === 'panorama') ? 'block' : 'none';
    }

    const exportSingleSection = document.getElementById('export-single-section');
    if (exportSingleSection) {
      exportSingleSection.style.display = isPanorama ? 'none' : 'block';
    }

    const exportSeamlessSection = document.getElementById('export-seamless-section');
    if (exportSeamlessSection) {
      exportSeamlessSection.style.display = isPanorama ? 'block' : 'none';
    }

    const btnDownloadSingle = document.getElementById('btn-download-single');
    if (btnDownloadSingle) {
      if (mode === 'chapter') {
        btnDownloadSingle.textContent = '📥 챕터 세트 다운로드 (표지+클린 2장)';
      } else {
        btnDownloadSingle.textContent = this.carouselItems.length > 1
          ? `📦 캐러셀 ${this.carouselItems.length}장 ZIP 다운로드`
          : '📥 클린 사진 다운로드';
      }
    }

    // Mode-adaptive Journal Inputs visibility
    const journalDetails = document.getElementById('journal-details');
    const journalSummary = document.getElementById('journal-summary');
    const journalCardHeader = document.getElementById('journal-card-header');
    const journalCardTitle = document.getElementById('journal-card-title');
    const journalCardSub = document.getElementById('journal-card-sub');
    const groupSeriesNo = document.getElementById('group-series-no');
    const groupPhotoTitle = document.getElementById('group-photo-title');
    const groupLocationDate = document.getElementById('group-location-date');
    const groupDate = document.getElementById('group-date');
    const groupTypography = document.getElementById('group-typography');
    if (groupTypography) {
      groupTypography.style.display = (mode === 'chapter' || (mode === 'panorama' && this.state.panoramaOverlay)) ? 'block' : 'none';
    }

    if (mode === 'photo') {
      if (journalDetails) journalDetails.open = false; // Collapsed by default for ultra-minimal 10s flow
      if (journalSummary) journalSummary.style.display = 'block';
      if (journalCardHeader) journalCardHeader.style.display = 'none';
      if (groupPhotoTitle) groupPhotoTitle.style.display = 'none';
      if (groupDate) groupDate.style.display = 'none';
      if (groupSeriesNo) groupSeriesNo.style.display = 'grid';
      if (groupLocationDate) groupLocationDate.style.display = 'block';
    } else if (mode === 'chapter') {
      if (journalDetails) journalDetails.open = true; // Always visible in chapter mode
      if (journalSummary) journalSummary.style.display = 'none';
      if (journalCardHeader) journalCardHeader.style.display = 'flex';
      if (journalCardTitle) journalCardTitle.textContent = '저널 정보 기록 (표지 조판)';
      if (journalCardSub) journalCardSub.textContent = '표지 텍스트';
      if (groupPhotoTitle) groupPhotoTitle.style.display = 'block';
      if (groupDate) groupDate.style.display = 'block';
      if (groupSeriesNo) groupSeriesNo.style.display = 'grid';
      if (groupLocationDate) groupLocationDate.style.display = 'grid';
    } else { // 'panorama'
      if (journalDetails) journalDetails.open = true; // Always visible in panorama mode
      if (journalSummary) journalSummary.style.display = 'none';
      if (journalCardHeader) journalCardHeader.style.display = 'flex';
      if (journalCardTitle) journalCardTitle.textContent = '파노라마 정보 & 캡션';
      if (journalCardSub) journalCardSub.textContent = '장소 메타데이터';
      if (groupPhotoTitle) groupPhotoTitle.style.display = 'none';
      if (groupSeriesNo) groupSeriesNo.style.display = 'none';
      if (groupDate) groupDate.style.display = 'none';
      if (groupLocationDate) groupLocationDate.style.display = 'block';
    }

    this.updateFilenamePreview();
  }

  static formatCaption(note, state) {
    const lines = [];
    if (note && note.trim()) {
      lines.push(note.trim());
      lines.push('');
    }

    // Natural location display (e.g. "Kanazawa, Japan" or "서울 종로구")
    if (state.location) {
      const naturalLoc = state.location.replace(/\s*·\s*/g, ', ').trim();
      lines.push(naturalLoc);
    }

    // Camera and preset display without raw SOOC keyword
    if (state.customCameraTag) {
      const cleanCam = state.customCameraTag.replace(/\s*SOOC\s*/gi, '').trim();
      if (cleanCam) {
        lines.push(cleanCam);
      }
    }

    lines.push('');

    // Dynamic hashtags
    const tags = ['#linesintransit'];

    // Series hashtag
    const series = state.series || 'PASSING PLACES';
    const seriesTag = series.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
    if (seriesTag) {
      tags.push(`#${seriesTag}`);
    }

    // Location hashtag (supports Korean e.g. #카나자와, #서울 and English #kanazawa without empty #)
    if (state.location) {
      const primaryLoc = state.location.split(/[,·/]/)[0].trim();
      const locTag = primaryLoc.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
      if (locTag) {
        tags.push(`#${locTag}`);
      }
    }

    // Camera model hashtag: extract specific model e.g. FUJIFILM X-T30 II -> #fujifilmxt30ii
    if (state.customCameraTag) {
      const camLower = state.customCameraTag.toLowerCase();
      if (camLower.includes('x-t30 ii') || camLower.includes('xt30')) {
        tags.push('#fujifilmxt30ii');
      } else if (camLower.includes('ipod')) {
        tags.push('#ipodtouch');
      } else if (camLower.includes('fujifilm') || camLower.includes('fuji')) {
        tags.push('#fujifilm');
      } else {
        const rawCam = state.customCameraTag.split('·')[0].toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
        if (rawCam) tags.push(`#${rawCam}`);
      }
    }

    lines.push(tags.join(' '));
    return lines.join('\n');
  }

  updateFilenamePreview() {
    const ext = (this.state.exportQualityMode === 'png') ? 'png' : 'jpg';
    const series = this.state.series || 'PASSING PLACES';
    const seriesNo = this.state.seriesNo || this.state.issueNo || '01';
    const location = this.state.location || 'SCENE';

    if (!this.filenamePreview) return;

    if (this.state.mode === 'panorama') {
      const f1 = ExportEngine.generateFileName(seriesNo, location, '01_LEFT', ext, series);
      this.filenamePreview.textContent = `${f1} 외 1장 (02_RIGHT)`;
    } else if (this.state.mode === 'chapter') {
      const f1 = ExportEngine.generateFileName(seriesNo, location, '01_COVER', ext, series);
      this.filenamePreview.textContent = `${f1} 외 1장 (02_CLEAN)`;
    } else {
      const first = ExportEngine.generateFileName(seriesNo, location, '01_PHOTO', ext, series);
      this.filenamePreview.textContent = this.carouselItems.length > 1
        ? `${first} 외 ${this.carouselItems.length - 1}장 (ZIP)`
        : first;
    }
  }


  static toDMS(coordinate, isLatitude) {
    const absolute = Math.abs(coordinate);
    let degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    let minutes = Math.floor(minutesNotTruncated);
    let seconds = Math.round((minutesNotTruncated - minutes) * 60);

    // Handle 60 seconds rounding boundary condition
    if (seconds >= 60) {
      seconds = 0;
      minutes += 1;
    }
    if (minutes >= 60) {
      minutes = 0;
      degrees += 1;
    }

    const direction = isLatitude ? (coordinate >= 0 ? 'N' : 'S') : (coordinate >= 0 ? 'E' : 'W');
    return `${degrees}°${String(minutes).padStart(2, '0')}′${String(seconds).padStart(2, '0')}″${direction}`;
  }

  async extractGps(file) {
    if (typeof window.exifr === 'undefined' || !window.exifr.gps) {
      console.warn('exifr library not loaded');
      return null;
    }
    try {
      const gps = await window.exifr.gps(file);
      if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
        const dmsLat = App.toDMS(gps.latitude, true);
        const dmsLon = App.toDMS(gps.longitude, false);
        return {
          latitude: gps.latitude,
          longitude: gps.longitude,
          dms: `${dmsLat} · ${dmsLon}`,
          shortAddress: '',
          fullAddress: ''
        };
      }
    } catch (e) {
      console.warn('EXIF parsing error:', e);
    }
    return null;
  }

  updateGpsUI(gps) {
    this.currentGps = gps;
    if (gps) {
      if (this.gpsIndicator) this.gpsIndicator.style.display = 'inline-flex';
      if (this.gpsCard) this.gpsCard.style.display = 'block';
      if (this.gpsNoneCard) this.gpsNoneCard.style.display = 'none';
      if (this.gpsCoordsText) this.gpsCoordsText.textContent = `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`;
      if (this.gpsDmsText) this.gpsDmsText.textContent = gps.dms;
      if (this.gpsStatusInfo) this.gpsStatusInfo.textContent = '';
      if (this.btnFetchAddress) {
        this.btnFetchAddress.disabled = false;
        this.btnFetchAddress.textContent = '🔍 주소 자동 찾기';
      }
    } else {
      if (this.gpsIndicator) this.gpsIndicator.style.display = 'none';
      if (this.gpsCard) this.gpsCard.style.display = 'none';
      if (this.gpsNoneCard) this.gpsNoneCard.style.display = 'block';
    }
  }

  async handleReverseGeocode() {
    if (!this.currentGps) return;
    if (this.isGeocoding) return;

    this.isGeocoding = true;
    this.btnFetchAddress.disabled = true;
    this.btnFetchAddress.textContent = '조회 중...';
    this.gpsStatusInfo.textContent = '좌표 역지오코딩 조회 중...';

    const { latitude, longitude } = this.currentGps;
    let addressData = null;

    // 1. Try Vercel Serverless Function first
    try {
      const resp = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}&lang=ko,en`);
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) {
          addressData = json;
        }
      }
    } catch (e) {
      console.warn('API route not available, falling back to direct Nominatim client query:', e);
    }

    // 2. Direct client fallback to OpenStreetMap Nominatim
    if (!addressData) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=ko,en`;
        const resp = await fetch(nomUrl);
        if (resp.ok) {
          const data = await resp.json();
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
          const district = addr.suburb || addr.borough || addr.quarter || addr.city_district || addr.neighbourhood || '';
          const state = addr.state || addr.province || '';
          const country = addr.country || '';
          const shortLabel = (city && district) ? `${city} · ${district}` : (city || district || state || country || '위치 미상');
          const fullLabel = [country, state, city, district].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(' ');
          addressData = { success: true, shortLabel, fullLabel };
        }
      } catch (e) {
        console.warn('Direct Nominatim query failed:', e);
      }
    }

    if (addressData && addressData.shortLabel) {
      this.currentGps.shortAddress = addressData.shortLabel;
      this.currentGps.fullAddress = addressData.fullLabel || addressData.shortLabel;

      const finalLocation = addressData.shortLabel;

      this.state.location = finalLocation;
      document.getElementById('input-location').value = finalLocation;
      this.saveState();
      this.updateFilenamePreview();
      this.scheduleRender();
      this.gpsStatusInfo.textContent = `✓ 주소 적용: ${addressData.fullLabel || addressData.shortLabel}`;
      this.showToast(`장소 적용 완료: ${addressData.shortLabel}`);
    } else {
      this.gpsStatusInfo.textContent = '주소를 찾을 수 없습니다. (좌표는 유지됨)';
      this.showToast('주소 조회에 실패했습니다. 직접 입력해 주세요.');
    }

    // 2-second cooldown to adhere to Nominatim 1 request/sec policy
    let cooldown = 2;
    this.btnFetchAddress.textContent = `조회 완료 (${cooldown}초)`;
    const timer = setInterval(() => {
      cooldown--;
      if (cooldown <= 0) {
        clearInterval(timer);
        this.btnFetchAddress.disabled = false;
        this.btnFetchAddress.textContent = '🔍 주소 다시 찾기';
        this.isGeocoding = false;
      } else {
        this.btnFetchAddress.textContent = `조회 완료 (${cooldown}초)`;
      }
    }, 1000);
  }

  async handleFile(file) {
    return this.handleFiles([file]);
  }

  async handleFiles(files, { replace = false } = {}) {
    const imageFiles = files.filter(file => file && /^image\/(jpeg|png|webp)$/i.test(file.type));
    if (!imageFiles.length) {
      this.showToast('JPEG, PNG 또는 WebP 사진을 선택해 주세요.');
      return;
    }

    const hasPlaceholder = this.carouselItems.some(item => item.isPlaceholder);
    const existingCount = (replace || hasPlaceholder) ? 0 : this.carouselItems.length;
    const acceptedFiles = imageFiles.slice(0, Math.max(0, 10 - existingCount));
    if (!acceptedFiles.length) {
      this.showToast('캐러셀에는 사진을 최대 10장까지 넣을 수 있습니다.');
      return;
    }

    const requestId = ++this.imageLoadRequestId;
    const loaded = [];
    this.showToast(`${acceptedFiles.length}장 불러오는 중...`);

    for (const file of acceptedFiles) {
      try {
        const [gps, image] = await Promise.all([
          this.extractGps(file),
          ImageLoader.loadFromFile(file)
        ]);
        if (requestId !== this.imageLoadRequestId) return;
        loaded.push({
          id: `${Date.now()}-${loaded.length}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name || `photo-${loaded.length + 1}`,
          blob: file,
          image,
          previewUrl: URL.createObjectURL(file),
          gps,
          zoom: 1,
          panX: 0,
          panY: 0
        });
      } catch (err) {
        console.warn(`Image load failed: ${file.name}`, err);
      }
    }

    if (!loaded.length) {
      this.showToast('사진을 불러오지 못했습니다.');
      return;
    }

    if (replace || hasPlaceholder) this.releaseCarouselItems();
    const startIndex = this.carouselItems.length;
    this.carouselItems.push(...loaded);
    this.activateCarouselItem(startIndex);
    this.updateModeUI(this.state.mode);
    this.showToast(`${loaded.length}장이 캐러셀에 추가되었습니다.`);
  }

  releaseCarouselItems() {
    this.carouselItems.forEach(item => {
      if (item.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
    });
    this.carouselItems = [];
    this.activeCarouselIndex = -1;
  }

  async saveDraft() {
    if (!this.carouselItems.length) {
      this.showToast('저장할 사진을 먼저 불러오세요.');
      return;
    }
    this.persistActiveComposition();
    try {
      await DraftStore.save({
        state: { ...this.state },
        activeIndex: this.activeCarouselIndex,
        items: this.carouselItems.map(item => ({
          name: item.name,
          blob: item.blob,
          sourceUrl: item.blob ? null : item.previewUrl,
          zoom: item.zoom,
          panX: item.panX,
          panY: item.panY,
          gps: item.gps
        }))
      });
      const status = document.getElementById('draft-status');
      if (status) status.textContent = `저장 완료 · ${new Date().toLocaleString('ko-KR')} · 사진 ${this.carouselItems.length}장`;
      this.showToast('현재 작업을 이 브라우저에 저장했습니다.');
    } catch (err) {
      console.error('Draft save failed:', err);
      this.showToast('초안 저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요.');
    }
  }

  async restoreDraft() {
    try {
      const draft = await DraftStore.get();
      if (!draft?.items?.length) return false;
      this.state = { ...DEFAULT_STATE, ...draft.state };
      const restored = [];
      for (const saved of draft.items) {
        if (!saved.blob && !saved.sourceUrl) continue;
        const image = saved.blob
          ? await ImageLoader.loadFromFile(new File([saved.blob], saved.name || 'draft-photo.jpg', { type: saved.blob.type || 'image/jpeg' }))
          : await ImageLoader.loadFromUrl(saved.sourceUrl);
        restored.push({
          id: `${Date.now()}-${restored.length}`,
          name: saved.name || `photo-${restored.length + 1}`,
          blob: saved.blob,
          image,
          previewUrl: saved.blob ? URL.createObjectURL(saved.blob) : saved.sourceUrl,
          gps: saved.gps || null,
          zoom: saved.zoom ?? 1,
          panX: saved.panX ?? 0,
          panY: saved.panY ?? 0
        });
      }
      if (!restored.length) return false;
      this.releaseCarouselItems();
      this.carouselItems = restored;
      this.initPresetsUI();
      this.activateCarouselItem(Math.min(draft.activeIndex ?? 0, restored.length - 1));
      const status = document.getElementById('draft-status');
      if (status) status.textContent = `저장된 작업 복원 · ${new Date(draft.savedAt).toLocaleString('ko-KR')} · 사진 ${restored.length}장`;
      this.showToast('저장된 작업을 복원했습니다.');
      return true;
    } catch (err) {
      console.warn('Draft restore failed:', err);
      return false;
    }
  }

  async clearDraft() {
    try {
      await DraftStore.clear();
      const status = document.getElementById('draft-status');
      if (status) status.textContent = '저장된 작업이 없습니다. 현재 편집 중인 사진은 유지됩니다.';
      this.showToast('저장된 작업을 삭제했습니다.');
    } catch (err) {
      this.showToast('저장된 작업을 삭제하지 못했습니다.');
    }
  }

  async loadSample(sample) {
    const requestId = ++this.imageLoadRequestId;
    try {
      const image = await ImageLoader.loadFromUrl(sample.path);
      if (requestId !== this.imageLoadRequestId) return;

      this.currentImage = image;
      this.releaseCarouselItems();
      this.state.mode = sample.mode || 'photo';
      this.state.series = sample.series || 'PASSING PLACES';
      this.state.seriesNo = sample.seriesNo || sample.issueNo || '01';
      this.state.issueNo = this.state.seriesNo;
      this.state.photoTitle = sample.title || '';
      this.state.location = sample.location || '';
      this.state.captureDate = sample.captureDate || '2026';
      this.state.selectedPresetId = sample.presetId || 'fuji-classic-chrome';
      this.state.photoFitMode = sample.photoFitMode || 'cover';
      this.state.panoramaOverlay = !!sample.panoramaOverlay;
      this.state.panX = 0;
      this.state.panY = 0;
      this.state.zoom = 1.0;

      const preset = GEAR_PRESETS.find(p => p.id === this.state.selectedPresetId);
      if (preset) {
        this.state.customCameraTag = preset.label;
      }

      this.updateGpsUI(null);
      this.carouselItems = [{
        id: `sample-${sample.id}`,
        name: sample.name,
        blob: null,
        image,
        previewUrl: sample.path,
        gps: null,
        zoom: 1,
        panX: 0,
        panY: 0
      }];
      this.activeCarouselIndex = 0;
      this.renderCarouselEditor();
      this.initPresetsUI();
      this.scheduleRender();
      this.showToast(`샘플 '${sample.name}' 적용 완료`);
    } catch (err) {
      if (requestId === this.imageLoadRequestId) {
        console.warn('Sample load error:', err);
      }
    }
  }

  /**
   * Only load initial image pixels, preserving user's saved state in localStorage
   */
  async loadInitialDraftOrImage() {
    if (await this.restoreDraft()) return;
    return this.loadInitialImage();
  }

  async loadInitialImage() {
    const requestId = ++this.imageLoadRequestId;
    try {
      const image = await ImageLoader.loadFromUrl(SAMPLE_PHOTOS[0].path);
      if (requestId !== this.imageLoadRequestId) return;
      this.currentImage = image;
      this.carouselItems = [{
        id: 'sample-initial',
        name: SAMPLE_PHOTOS[0].name,
        blob: null,
        image,
        previewUrl: SAMPLE_PHOTOS[0].path,
        gps: null,
        zoom: this.state.zoom,
        panX: this.state.panX,
        panY: this.state.panY,
        isPlaceholder: true
      }];
      this.activeCarouselIndex = 0;
      this.renderCarouselEditor();
      this.scheduleRender();
    } catch (err) {
      if (requestId === this.imageLoadRequestId) {
        console.warn('Initial image load error:', err);
      }
    }
  }

  /**
   * Fast preview rendering directly into mainCanvas (50% scale for smooth RAF interaction)
   */
  async render() {
    await this.canvasEngine.renderToCanvas(this.mainCanvas, this.currentImage, this.state, 0.5);

    if (this.state.mode === 'panorama' || this.state.mode === 'seamless') {
      this.liveInfo.textContent = '2160 × 1350 px (가로 2분할 파노라마)';
    } else if (this.state.mode === 'chapter') {
      this.liveInfo.textContent = '1080 × 1350 px (표지 + 클린 2장 세트)';
    } else {
      this.liveInfo.textContent = '1080 × 1350 px (4:5 클린 포스트)';
    }
  }

  /**
   * Generate dedicated export master artifacts on-demand (full resolution, zero guides)
   */
  async getExportArtifacts() {
    return await this.canvasEngine.renderExport(this.currentImage, this.state);
  }

  setExportButtonsDisabled(disabled) {
    const btnIds = [
      'btn-download-single',
      'btn-download-s1',
      'btn-download-s2',
      'btn-share-vertical-mobile',
      'btn-share-mobile',
      'btn-download-zip'
    ];
    btnIds.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = disabled;
    });
  }

  formatExportToast(res, prefix = '저장 완료!') {
    if (this.state.exportQualityMode === 'auto') {
      if (res.targetMet) {
        if (res.qualityReduced) {
          this.showToast(`${prefix} (목표 용량 달성 · ${res.sizeFormatted} · 품질 ${(res.quality * 100).toFixed(0)}%)`);
        } else {
          this.showToast(`${prefix} (${res.sizeFormatted} · 원본 품질 ${(res.quality * 100).toFixed(0)}%)`);
        }
      } else {
        this.showToast(`${prefix} (목표 용량 초과 · ${res.sizeFormatted} · 가능한 최저 품질 ${(res.quality * 100).toFixed(0)}%)`);
      }
    } else {
      this.showToast(`${prefix} (${res.sizeFormatted} · 품질 ${(res.quality * 100).toFixed(0)}%)`);
    }
  }

  async exportSingle() {
    if (this.isExporting) {
      this.showToast('이미지 처리 중입니다. 잠시만 기다려주세요.');
      return;
    }
    this.isExporting = true;
    this.setExportButtonsDisabled(true);
    this.showToast('고화질 렌더링 인코딩 중...');

    try {
      if (this.state.mode === 'photo' && this.carouselItems.length > 1) {
        await this.exportCarouselZip();
        return;
      }
      const artifacts = await this.getExportArtifacts();
      const ext = (this.state.exportQualityMode === 'png') ? 'png' : 'jpg';
      const series = this.state.series || 'PASSING PLACES';
      const seriesNo = this.state.seriesNo || this.state.issueNo || '01';

      if (artifacts.isMultiSlide) {
        // Slide 1 (Cover)
        const res1 = await ExportEngine.encodeCanvas(
          artifacts.slide1,
          this.state.exportQualityMode,
          this.state.autoFitTargetMB
        );
        const file1Name = ExportEngine.generateFileName(seriesNo, this.state.location, artifacts.tag1 || '01_COVER', ext, series);
        ExportEngine.downloadBlob(res1.blob, file1Name);

        // Slide 2 (Clean photo)
        await new Promise(r => setTimeout(r, 350));
        const res2 = await ExportEngine.encodeCanvas(
          artifacts.slide2,
          this.state.exportQualityMode,
          this.state.autoFitTargetMB
        );
        const file2Name = ExportEngine.generateFileName(seriesNo, this.state.location, artifacts.tag2 || '02_CLEAN', ext, series);
        ExportEngine.downloadBlob(res2.blob, file2Name);

        this.showToast(`챕터 표지와 클린 사진 2장 저장 완료! (${res1.sizeFormatted}, ${res2.sizeFormatted})`);
      } else {
        const res = await ExportEngine.encodeCanvas(
          artifacts.canvas,
          this.state.exportQualityMode,
          this.state.autoFitTargetMB
        );
        const filename = ExportEngine.generateFileName(seriesNo, this.state.location, artifacts.tag1 || '01_PHOTO', ext, series);
        ExportEngine.downloadBlob(res.blob, filename);
        this.formatExportToast(res, '클린 사진 저장 완료!');
      }
    } catch (err) {
      this.showToast(`저장 실패: ${err.message}`);
    } finally {
      this.isExporting = false;
      this.setExportButtonsDisabled(false);
    }
  }

  async exportCarouselZip() {
    if (typeof JSZip === 'undefined') throw new Error('ZIP 라이브러리를 불러오지 못했습니다.');
    this.persistActiveComposition();
    const zip = new JSZip();
    const ext = this.state.exportQualityMode === 'png' ? 'png' : 'jpg';
    const series = this.state.series || 'PASSING PLACES';
    const seriesNo = this.state.seriesNo || this.state.issueNo || '01';

    for (let index = 0; index < this.carouselItems.length; index += 1) {
      const item = this.carouselItems[index];
      const itemState = {
        ...this.state,
        zoom: item.zoom ?? 1,
        panX: item.panX ?? 0,
        panY: item.panY ?? 0,
        mode: 'photo'
      };
      const artifacts = await this.canvasEngine.renderExport(item.image, itemState);
      const encoded = await ExportEngine.encodeCanvas(artifacts.canvas, this.state.exportQualityMode, this.state.autoFitTargetMB);
      const suffix = `${String(index + 1).padStart(2, '0')}_PHOTO`;
      const filename = ExportEngine.generateFileName(seriesNo, this.state.location, suffix, ext, series);
      zip.file(filename, encoded.blob);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const zipName = ExportEngine.generateFileName(seriesNo, this.state.location, 'CAROUSEL', 'zip', series);
    ExportEngine.downloadBlob(blob, zipName);
    this.showToast(`캐러셀 ${this.carouselItems.length}장 ZIP 저장 완료!`);
  }

  async shareVerticalMobile() {
    if (this.isExporting) {
      this.showToast('이미지 처리 중입니다. 잠시만 기다려주세요.');
      return;
    }
    this.isExporting = true;
    this.setExportButtonsDisabled(true);
    this.showToast('모바일 공유용 이미지 준비 중...');

    try {
      const ext = (this.state.exportQualityMode === 'png') ? 'png' : 'jpg';
      const mime = (this.state.exportQualityMode === 'png') ? 'image/png' : 'image/jpeg';
      const series = this.state.series || 'PASSING PLACES';
      const seriesNo = this.state.seriesNo || this.state.issueNo || '01';
      const files = [];

      if (this.state.mode === 'photo' && this.carouselItems.length > 1) {
        this.persistActiveComposition();
        for (let index = 0; index < this.carouselItems.length; index += 1) {
          const item = this.carouselItems[index];
          const artifacts = await this.canvasEngine.renderExport(item.image, {
            ...this.state,
            mode: 'photo',
            zoom: item.zoom,
            panX: item.panX,
            panY: item.panY
          });
          const encoded = await ExportEngine.encodeCanvas(artifacts.canvas, this.state.exportQualityMode, this.state.autoFitTargetMB);
          const suffix = `${String(index + 1).padStart(2, '0')}_PHOTO`;
          const name = ExportEngine.generateFileName(seriesNo, this.state.location, suffix, ext, series);
          files.push(new File([encoded.blob], name, { type: mime }));
        }
      } else {
        const artifacts = await this.getExportArtifacts();
        const res1 = await ExportEngine.encodeCanvas(
          artifacts.isMultiSlide ? artifacts.slide1 : artifacts.canvas,
          this.state.exportQualityMode,
          this.state.autoFitTargetMB
        );
        const name1 = ExportEngine.generateFileName(seriesNo, this.state.location, artifacts.tag1 || '01_PHOTO', ext, series);
        files.push(new File([res1.blob], name1, { type: mime }));

        if (artifacts.isMultiSlide && artifacts.slide2) {
          const res2 = await ExportEngine.encodeCanvas(artifacts.slide2, this.state.exportQualityMode, this.state.autoFitTargetMB);
          const name2 = ExportEngine.generateFileName(seriesNo, this.state.location, artifacts.tag2 || '02_CLEAN', ext, series);
          files.push(new File([res2.blob], name2, { type: mime }));
        }
      }

      const shareRes = await ExportEngine.shareFiles(files, `LINES IN TRANSIT - ${series} No.${seriesNo}`);
      if (shareRes.success) {
        this.showToast('공유 완료!');
      } else if (shareRes.notSupported) {
        this.showToast('모바일 공유를 지원하지 않는 브라우저입니다. 개별 저장을 이용해주세요.');
      }
    } catch (err) {
      this.showToast(`공유 실패: ${err.message}`);
    } finally {
      this.isExporting = false;
      this.setExportButtonsDisabled(false);
    }
  }

  async exportSeamlessSlide(slideNum) {
    if (this.isExporting) {
      this.showToast('이미지 처리 중입니다. 잠시만 기다려주세요.');
      return;
    }
    this.isExporting = true;
    this.setExportButtonsDisabled(true);
    this.showToast(`슬라이드 ${slideNum} 인코딩 중...`);

    try {
      const artifacts = await this.getExportArtifacts();
      const canvas = (slideNum === 1) ? artifacts.slide1 : artifacts.slide2;

      const res = await ExportEngine.encodeCanvas(
        canvas,
        this.state.exportQualityMode,
        this.state.autoFitTargetMB
      );

      const ext = res.format.toLowerCase();
      const series = this.state.series || 'PASSING PLACES';
      const seriesNo = this.state.seriesNo || this.state.issueNo || '01';
      const tag = (slideNum === 1) ? '01_LEFT' : '02_RIGHT';
      const filename = ExportEngine.generateFileName(
        seriesNo,
        this.state.location,
        tag,
        ext,
        series
      );

      ExportEngine.downloadBlob(res.blob, filename);
      this.formatExportToast(res, `슬라이드 ${slideNum} (${tag}) 저장 완료!`);
    } catch (err) {
      this.showToast(`저장 실패: ${err.message}`);
    } finally {
      this.isExporting = false;
      this.setExportButtonsDisabled(false);
    }
  }

  async shareSeamlessMobile() {
    if (this.isExporting) {
      this.showToast('이미지 처리 중입니다. 잠시만 기다려주세요.');
      return;
    }
    this.isExporting = true;
    this.setExportButtonsDisabled(true);
    this.showToast('모바일 공유 패키지 생성 중...');

    try {
      const artifacts = await this.getExportArtifacts();
      const series = this.state.series || 'PASSING PLACES';
      const seriesNo = this.state.seriesNo || this.state.issueNo || '01';

      const res1 = await ExportEngine.encodeCanvas(artifacts.slide1, this.state.exportQualityMode, this.state.autoFitTargetMB);
      const res2 = await ExportEngine.encodeCanvas(artifacts.slide2, this.state.exportQualityMode, this.state.autoFitTargetMB);

      const ext = res1.format.toLowerCase();
      const f1 = new File([res1.blob], ExportEngine.generateFileName(seriesNo, this.state.location, '01_LEFT', ext, series), { type: res1.blob.type });
      const f2 = new File([res2.blob], ExportEngine.generateFileName(seriesNo, this.state.location, '02_RIGHT', ext, series), { type: res2.blob.type });

      const shareRes = await ExportEngine.shareFiles([f1, f2], `LINES IN TRANSIT - ${series} No.${seriesNo}`);
      if (shareRes.success) {
        this.showToast('공유 완료!');
      } else if (shareRes.notSupported) {
        alert('현재 브라우저 환경에서는 Web Share 파일 공유가 지원되지 않습니다. 아래 개별 저장 또는 ZIP 다운로드를 이용해 주세요.');
      }
    } catch (err) {
      this.showToast(`공유 실패: ${err.message}`);
    } finally {
      this.isExporting = false;
      this.setExportButtonsDisabled(false);
    }
  }

  async exportSeamlessZip() {
    if (typeof JSZip === 'undefined') {
      alert('JSZip 라이브러리를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if (this.isExporting) {
      this.showToast('이미지 처리 중입니다. 잠시만 기다려주세요.');
      return;
    }
    this.isExporting = true;
    this.setExportButtonsDisabled(true);
    this.showToast('ZIP 압축 파일 생성 중...');

    try {
      const artifacts = await this.getExportArtifacts();
      const series = this.state.series || 'PASSING PLACES';
      const seriesNo = this.state.seriesNo || this.state.issueNo || '01';

      const res1 = await ExportEngine.encodeCanvas(artifacts.slide1, this.state.exportQualityMode, this.state.autoFitTargetMB);
      const res2 = await ExportEngine.encodeCanvas(artifacts.slide2, this.state.exportQualityMode, this.state.autoFitTargetMB);

      const ext = res1.format.toLowerCase();
      const name1 = ExportEngine.generateFileName(seriesNo, this.state.location, '01_LEFT', ext, series);
      const name2 = ExportEngine.generateFileName(seriesNo, this.state.location, '02_RIGHT', ext, series);

      const zip = new JSZip();
      zip.file(name1, res1.blob);
      zip.file(name2, res2.blob);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const cleanSeries = series.replace(/[^a-zA-Z0-9가-힣]/g, '_').toUpperCase() || 'JOURNAL';
      const zipName = `LIT_${cleanSeries}-${String(seriesNo).padStart(3, '0')}_PANORAMA.zip`;
      ExportEngine.downloadBlob(zipBlob, zipName);
      this.showToast('ZIP 다운로드 완료!');
    } catch (err) {
      this.showToast(`ZIP 생성 실패: ${err.message}`);
    } finally {
      this.isExporting = false;
      this.setExportButtonsDisabled(false);
    }
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }
}

// Bootstrap on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
