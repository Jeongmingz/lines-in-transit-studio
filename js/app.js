/**
 * Lines in Transit Studio - Main Application Controller
 * Optimized for mobile touch, pinch zoom, requestAnimationFrame render loop,
 * decoupled CSS guides, and reliable client-side export.
 */

import { GEAR_PRESETS, SAMPLE_PHOTOS, DEFAULT_STATE, TYPOGRAPHY_PRESETS } from './presets.js';
import { ImageLoader } from './image-loader.js';
import { CanvasEngine } from './canvas-engine.js';
import { ExportEngine } from './export-engine.js';

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
    this.chkAppendCoords = document.getElementById('chk-append-coords');
    this.gpsStatusInfo = document.getElementById('gps-status-info');

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
        return {
          ...DEFAULT_STATE,
          ...parsed,
          zoom: typeof parsed.zoom === 'number' ? parsed.zoom : DEFAULT_STATE.zoom,
          panX: typeof parsed.panX === 'number' ? parsed.panX : DEFAULT_STATE.panX,
          panY: typeof parsed.panY === 'number' ? parsed.panY : DEFAULT_STATE.panY,
          typographyPreset: parsed.typographyPreset || DEFAULT_STATE.typographyPreset,
          includeCleanPhoto: (parsed.includeCleanPhoto !== undefined) ? parsed.includeCleanPhoto : DEFAULT_STATE.includeCleanPhoto
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
        typographyPreset: this.state.typographyPreset,
        includeCleanPhoto: this.state.includeCleanPhoto,
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

    // Sync typography preset UI
    const typoSelect = document.getElementById('select-typography');
    const typoBadge = document.getElementById('badge-typography');
    if (typoSelect) {
      typoSelect.value = this.state.typographyPreset || 'archivo';
    }
    const currentTypo = TYPOGRAPHY_PRESETS.find(p => p.id === (this.state.typographyPreset || 'archivo')) || TYPOGRAPHY_PRESETS[0];
    if (typoBadge) {
      typoBadge.textContent = currentTypo.badge;
    }

    // Sync clean photo toggle
    const chkClean = document.getElementById('chk-include-clean');
    if (chkClean) {
      chkClean.checked = (this.state.includeCleanPhoto !== false);
    }


    // Sync form inputs from state
    document.getElementById('input-issue').value = this.state.issueNo;
    document.getElementById('input-title').value = this.state.photoTitle;
    document.getElementById('input-location').value = this.state.location;
    document.getElementById('input-masthead').value = this.state.magazineTitle;
    document.getElementById('input-camera-tag').value = this.state.customCameraTag;
    document.getElementById('chk-safety').checked = this.state.showSafetyGuide;
    document.getElementById('select-quality-mode').value = this.state.exportQualityMode;

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

  setZoom(newZoom, shouldSave = true) {
    this.state.zoom = Math.max(1.0, Math.min(3.0, parseFloat(newZoom)));
    this.syncZoomUI();
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
        this.scheduleRender();
      });
    };

    bindInput('input-issue', 'issueNo');
    bindInput('input-title', 'photoTitle');
    bindInput('input-location', 'location');
    bindInput('input-masthead', 'magazineTitle');
    bindInput('input-camera-tag', 'customCameraTag');

    // Typography preset dropdown change
    const typoSelect = document.getElementById('select-typography');
    const typoBadge = document.getElementById('badge-typography');
    if (typoSelect) {
      typoSelect.addEventListener('change', (e) => {
        this.state.typographyPreset = e.target.value;
        const typo = TYPOGRAPHY_PRESETS.find(p => p.id === this.state.typographyPreset) || TYPOGRAPHY_PRESETS[0];
        if (typoBadge) {
          typoBadge.textContent = typo.badge;
        }
        this.saveState();
        this.scheduleRender();
      });
    }

    // Preset dropdown change

    document.getElementById('select-preset').addEventListener('change', (e) => {
      this.state.selectedPresetId = e.target.value;
      const preset = GEAR_PRESETS.find(p => p.id === e.target.value);
      const cameraInput = document.getElementById('input-camera-tag');
      if (preset && preset.id !== 'custom') {
        this.state.customCameraTag = preset.label;
        cameraInput.value = preset.label;
      } else if (e.target.value === 'custom') {
        cameraInput.focus();
        cameraInput.select();
      }
      this.saveState();
      this.scheduleRender();
    });

    // Safety guide toggle (Pure CSS overlay toggle)
    document.getElementById('chk-safety').addEventListener('change', (e) => {
      this.state.showSafetyGuide = e.target.checked;
      this.syncGuideUI();
      this.saveState();
    });

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
    document.getElementById('btn-reset-view').addEventListener('click', () => {
      this.state.zoom = 1.0;
      this.state.panX = 0;
      this.state.panY = 0;
      this.syncZoomUI();
      this.saveState();
      this.scheduleRender();
      this.showToast('구도와 줌이 초기화되었습니다.');
    });

    // Canvas Pan & Pinch Zoom Interactions
    this.setupCanvasInteractions();

    // Export Controls
    document.getElementById('select-quality-mode').addEventListener('change', (e) => {
      this.state.exportQualityMode = e.target.value;
      const targetMbGroup = document.getElementById('target-mb-group');
      if (targetMbGroup) {
        targetMbGroup.style.display = (e.target.value === 'auto') ? 'block' : 'none';
      }
      this.saveState();
      this.updateFilenamePreview();
    });

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
    if (this.chkAppendCoords) {
      this.chkAppendCoords.addEventListener('change', () => this.handleAppendCoordsToggle());
    }

    // Clean Photo toggle
    const chkClean = document.getElementById('chk-include-clean');
    if (chkClean) {
      chkClean.addEventListener('change', (e) => {
        this.state.includeCleanPhoto = e.target.checked;
        this.saveState();
        this.updateFilenamePreview();
      });
    }

    // Instagram Caption clipboard copy
    const btnCopyCaption = document.getElementById('btn-copy-caption');
    if (btnCopyCaption) {
      btnCopyCaption.addEventListener('click', () => {
        const lines = [
          this.state.magazineTitle || 'LINES IN TRANSIT',
          `ISSUE ${this.state.issueNo || '01'} — ${this.state.photoTitle || ''}`,
          `📍 ${this.state.location || ''}`,
          `📷 ${this.state.customCameraTag || ''}`,
          '',
          '#linesintransit #fujifilm #streetphotography #architecture #urbanphotography'
        ];
        const caption = lines.filter(Boolean).join('\n');
        navigator.clipboard.writeText(caption).then(() => {
          this.showToast('인스타그램 캡션이 클립보드에 복사되었습니다!');
        }).catch(() => {
          this.showToast('캡션 복사에 실패했습니다.');
        });
      });
    }

    document.getElementById('btn-download-single').addEventListener('click', () => this.exportSingle());
    const btnShareVertical = document.getElementById('btn-share-vertical-mobile');
    if (btnShareVertical) {
      btnShareVertical.addEventListener('click', () => this.shareVerticalMobile());
    }
    document.getElementById('btn-download-s1').addEventListener('click', () => this.exportSeamlessSlide(1));

    document.getElementById('btn-download-s2').addEventListener('click', () => this.exportSeamlessSlide(2));
    document.getElementById('btn-share-mobile').addEventListener('click', () => this.shareSeamlessMobile());
    document.getElementById('btn-download-zip').addEventListener('click', () => this.exportSeamlessZip());
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

    const isSeamless = (mode === 'seamless');
    if (isSeamless) {
      this.canvasWrapper.classList.add('mode-seamless');
    } else {
      this.canvasWrapper.classList.remove('mode-seamless');
    }

    document.getElementById('export-single-section').style.display = isSeamless ? 'none' : 'block';
    document.getElementById('export-seamless-section').style.display = isSeamless ? 'block' : 'none';

    this.updateFilenamePreview();
  }

  updateFilenamePreview() {
    const ext = (this.state.exportQualityMode === 'png') ? 'png' : 'jpg';
    if (this.state.mode === 'seamless') {
      this.filenamePreview.textContent = `${ExportEngine.generateFileName(this.state.issueNo, this.state.location, 'SLIDE-01', ext)} 외 1장`;
    } else {
      const tag = (this.state.mode === 'cinematic') ? 'CINEMATIC' : 'COVER';
      if (this.state.includeCleanPhoto) {
        this.filenamePreview.textContent = `${ExportEngine.generateFileName(this.state.issueNo, this.state.location, tag, ext)} 외 1장 (클린 사진)`;
      } else {
        this.filenamePreview.textContent = ExportEngine.generateFileName(this.state.issueNo, this.state.location, tag, ext);
      }
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

      let finalLocation = addressData.shortLabel;
      if (this.chkAppendCoords && this.chkAppendCoords.checked) {
        finalLocation = `${finalLocation} · ${this.currentGps.dms}`;
      }

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

  handleAppendCoordsToggle() {
    if (!this.currentGps || !this.currentGps.shortAddress) return;
    const shouldAppend = this.chkAppendCoords.checked;
    let loc = this.currentGps.shortAddress;
    if (shouldAppend) {
      loc = `${loc} · ${this.currentGps.dms}`;
    }
    this.state.location = loc;
    document.getElementById('input-location').value = loc;
    this.saveState();
    this.updateFilenamePreview();
    this.scheduleRender();
  }

  async handleFile(file) {
    const requestId = ++this.imageLoadRequestId;
    try {
      // 1. Read EXIF GPS from original File before canvas decoding
      const gps = await this.extractGps(file);
      if (requestId !== this.imageLoadRequestId) return;
      this.updateGpsUI(gps);

      // 2. Decode and downscale image
      const image = await ImageLoader.loadFromFile(file);
      if (requestId !== this.imageLoadRequestId) return;

      this.currentImage = image;
      this.state.panX = 0;
      this.state.panY = 0;
      this.state.zoom = 1.0;
      this.syncZoomUI();
      this.scheduleRender();
      this.showToast('사진이 로드되었습니다.');
    } catch (err) {
      if (requestId === this.imageLoadRequestId) {
        alert(err.message);
      }
    }
  }

  async loadSample(sample) {
    const requestId = ++this.imageLoadRequestId;
    try {
      const image = await ImageLoader.loadFromUrl(sample.path);
      if (requestId !== this.imageLoadRequestId) return;

      this.currentImage = image;
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

      this.updateGpsUI(null);
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
  async loadInitialImage() {
    const requestId = ++this.imageLoadRequestId;
    try {
      const image = await ImageLoader.loadFromUrl(SAMPLE_PHOTOS[0].path);
      if (requestId !== this.imageLoadRequestId) return;
      this.currentImage = image;
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

    if (this.state.mode === 'seamless') {
      this.liveInfo.textContent = '2160 × 1350 px (2-Slide 심리스)';
    } else {
      this.liveInfo.textContent = '1080 × 1350 px (4:5 인스타 규격)';
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
      const artifacts = await this.getExportArtifacts();
      const ext = (this.state.exportQualityMode === 'png') ? 'png' : 'jpg';

      if (artifacts.isMultiSlide) {
        // Slide 1 (Cover / Cinematic)
        const res1 = await ExportEngine.encodeCanvas(
          artifacts.slide1,
          this.state.exportQualityMode,
          this.state.autoFitTargetMB
        );
        const file1Name = ExportEngine.generateFileName(this.state.issueNo, this.state.location, artifacts.tag1 || 'COVER', ext);
        ExportEngine.downloadBlob(res1.blob, file1Name);

        // Slide 2 (Clean photo)
        await new Promise(r => setTimeout(r, 350));
        const res2 = await ExportEngine.encodeCanvas(
          artifacts.slide2,
          this.state.exportQualityMode,
          this.state.autoFitTargetMB
        );
        const file2Name = ExportEngine.generateFileName(this.state.issueNo, this.state.location, artifacts.tag2 || 'CLEAN', ext);
        ExportEngine.downloadBlob(res2.blob, file2Name);

        this.showToast(`커버와 클린 사진 2장 저장 완료! (${res1.sizeFormatted}, ${res2.sizeFormatted})`);
      } else {
        const res = await ExportEngine.encodeCanvas(
          artifacts.canvas,
          this.state.exportQualityMode,
          this.state.autoFitTargetMB
        );
        const filename = ExportEngine.generateFileName(this.state.issueNo, this.state.location, artifacts.tag1 || 'COVER', ext);
        ExportEngine.downloadBlob(res.blob, filename);
        this.formatExportToast(res, '저장 완료!');
      }
    } catch (err) {
      this.showToast(`저장 실패: ${err.message}`);
    } finally {
      this.isExporting = false;
      this.setExportButtonsDisabled(false);
    }
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
      const artifacts = await this.getExportArtifacts();
      const ext = (this.state.exportQualityMode === 'png') ? 'png' : 'jpg';
      const mime = (this.state.exportQualityMode === 'png') ? 'image/png' : 'image/jpeg';

      const res1 = await ExportEngine.encodeCanvas(
        artifacts.isMultiSlide ? artifacts.slide1 : artifacts.canvas,
        this.state.exportQualityMode,
        this.state.autoFitTargetMB
      );
      const name1 = ExportEngine.generateFileName(this.state.issueNo, this.state.location, artifacts.tag1 || 'COVER', ext);
      const file1 = new File([res1.blob], name1, { type: mime });

      const files = [file1];

      if (artifacts.isMultiSlide && artifacts.slide2) {
        const res2 = await ExportEngine.encodeCanvas(
          artifacts.slide2,
          this.state.exportQualityMode,
          this.state.autoFitTargetMB
        );
        const name2 = ExportEngine.generateFileName(this.state.issueNo, this.state.location, artifacts.tag2 || 'CLEAN', ext);
        const file2 = new File([res2.blob], name2, { type: mime });
        files.push(file2);
      }

      const shareRes = await ExportEngine.shareFiles(files, `${this.state.magazineTitle} - ${this.state.photoTitle}`);
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
      const filename = ExportEngine.generateFileName(
        this.state.issueNo,
        this.state.location,
        `SLIDE-${String(slideNum).padStart(2, '0')}`,
        ext
      );

      ExportEngine.downloadBlob(res.blob, filename);
      this.formatExportToast(res, `슬라이드 ${slideNum} 저장 완료!`);
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

      const res1 = await ExportEngine.encodeCanvas(artifacts.slide1, this.state.exportQualityMode, this.state.autoFitTargetMB);
      const res2 = await ExportEngine.encodeCanvas(artifacts.slide2, this.state.exportQualityMode, this.state.autoFitTargetMB);

      const ext = res1.format.toLowerCase();
      const f1 = new File([res1.blob], ExportEngine.generateFileName(this.state.issueNo, this.state.location, 'SLIDE-01', ext), { type: res1.blob.type });
      const f2 = new File([res2.blob], ExportEngine.generateFileName(this.state.issueNo, this.state.location, 'SLIDE-02', ext), { type: res2.blob.type });

      const shareRes = await ExportEngine.shareFiles([f1, f2], `Lines in Transit Issue ${this.state.issueNo}`);
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

      const res1 = await ExportEngine.encodeCanvas(artifacts.slide1, this.state.exportQualityMode, this.state.autoFitTargetMB);
      const res2 = await ExportEngine.encodeCanvas(artifacts.slide2, this.state.exportQualityMode, this.state.autoFitTargetMB);

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
