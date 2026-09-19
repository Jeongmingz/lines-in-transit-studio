/**
 * Lines in Transit Studio - Presets & Data Definitions
 * Journal Post Maker for landscape, spatial, and travel photography.
 */

export const SERIES_PRESETS = [
  'PASSING PLACES',
  'CITY LINES',
  'WATERLINES',
  'OPEN LAND',
  'POCKET NOTES'
];

export const GEAR_PRESETS = [
  {
    id: 'xt30ii_classic_chrome',
    camera: 'FUJIFILM X-T30 II',
    lens: 'XC 15-45mm F3.5-5.6 OIS PZ',
    filmSimulation: 'CLASSIC CHROME',
    processing: 'SOOC',
    label: 'FUJIFILM X-T30 II · CLASSIC CHROME SOOC'
  },
  {
    id: 'xt30ii_classic_neg',
    camera: 'FUJIFILM X-T30 II',
    lens: 'XF 35mm F2 R WR',
    filmSimulation: 'CLASSIC NEG',
    processing: 'SOOC',
    label: 'FUJIFILM X-T30 II · CLASSIC NEG SOOC'
  },
  {
    id: 'ipod_touch_7',
    camera: 'APPLE IPOD TOUCH 7',
    lens: 'BUILT-IN LENS',
    filmSimulation: 'STANDARD',
    processing: 'VINTAGE DIGITAL',
    label: 'APPLE IPOD TOUCH 7 · VINTAGE DIGITAL'
  },
  {
    id: 'custom',
    camera: '',
    lens: '',
    filmSimulation: '',
    processing: '',
    label: '직접 입력 (Custom)'
  }
];

export const SAMPLE_PHOTOS = [
  {
    id: 'hotel',
    name: '🏙 공간과 건축',
    path: './assets/samples/sample-01.jpg',
    mode: 'photo',
    series: 'CITY LINES',
    seriesNo: '01',
    title: 'BASE LAYER HOTEL',
    location: 'TOKYO · JAPAN',
    captureDate: '2026',
    presetId: 'xt30ii_classic_chrome'
  },
  {
    id: 'landscape',
    name: '🏞 자연 풍경',
    path: './assets/samples/sample-03.jpg',
    mode: 'chapter',
    series: 'PASSING PLACES',
    seriesNo: '02',
    title: 'AVENUE OF TREES',
    location: 'KANAZAWA · JAPAN',
    captureDate: '2026',
    presetId: 'ipod_touch_7'
  },
  {
    id: 'canal',
    name: '🌊 물길과 여행',
    path: './assets/samples/sample-02.jpg',
    mode: 'panorama',
    series: 'WATERLINES',
    seriesNo: '03',
    title: 'KANAZAWA WATERWAY',
    location: 'KANAZAWA · JAPAN',
    captureDate: '2026',
    presetId: 'xt30ii_classic_chrome'
  }
];

/**
 * Unified Brand Typography Configuration
 * Consistent, refined identity: Archivo for header/series, Pretendard for title & metadata.
 */
export const TYPOGRAPHY_PRESETS = [
  {
    id: 'editorial',
    name: 'Editorial — Archivo + Pretendard',
    description: '단단한 마스트헤드와 차분한 본문',
    mastheadFont: "'Archivo', 'Pretendard', sans-serif",
    mastheadWeight: '800',
    mastheadSpacing: '-0.035em',
    seriesFont: "'Archivo', 'Pretendard', sans-serif",
    seriesWeight: '700',
    seriesSpacing: '0.06em',
    titleFont: "'Pretendard', sans-serif",
    titleWeight: '600',
    titleSpacing: '-0.01em',
    locationFont: "'Pretendard', sans-serif",
    locationWeight: '500',
    locationSpacing: '0.02em'
  },
  {
    id: 'minimal',
    name: 'Minimal — Pretendard',
    description: '한국어와 영문 모두 절제된 산세리프',
    mastheadFont: "'Pretendard', sans-serif",
    mastheadWeight: '700',
    mastheadSpacing: '-0.02em',
    seriesFont: "'Pretendard', sans-serif",
    seriesWeight: '600',
    seriesSpacing: '0.08em',
    titleFont: "'Pretendard', sans-serif",
    titleWeight: '500',
    titleSpacing: '-0.015em',
    locationFont: "'Pretendard', sans-serif",
    locationWeight: '400',
    locationSpacing: '0.035em'
  },
  {
    id: 'archive',
    name: 'Archive — IBM Plex Mono + Archivo',
    description: '이동 기록과 데이터 라벨의 인상',
    mastheadFont: "'Archivo', 'Pretendard', sans-serif",
    mastheadWeight: '700',
    mastheadSpacing: '-0.02em',
    seriesFont: "'IBM Plex Mono', 'Pretendard', monospace",
    seriesWeight: '500',
    seriesSpacing: '0.05em',
    titleFont: "'Archivo', 'Pretendard', sans-serif",
    titleWeight: '600',
    titleSpacing: '-0.015em',
    locationFont: "'IBM Plex Mono', 'Pretendard', monospace",
    locationWeight: '500',
    locationSpacing: '0.02em'
  }
];

export const BRAND_TYPOGRAPHY = TYPOGRAPHY_PRESETS[0];

export const DEFAULT_STATE = {
  mode: 'photo', // 'photo' (clean single), 'chapter' (cover + clean), 'panorama' (2-slide 2160x1350)
  series: 'PASSING PLACES',
  seriesNo: '01',
  photoTitle: '',
  location: '',
  captureDate: '',
  magazineTitle: 'LINES IN TRANSIT',
  photoFitMode: 'cover', // 'cover' (4:5 crop) or 'fit' (aspect ratio preserved / letterboxed)
  panoramaOverlay: false, // default clean photo for panorama
  typographyPreset: 'editorial',
  captionNote: '',
  selectedPresetId: 'custom',
  customCameraTag: '',
  showSafetyGuide: false,
  zoom: 1.0,
  panX: 0,
  panY: 0,
  exportQualityMode: 'auto', // 'auto', 'high', 'normal', 'png'
  autoFitTargetMB: 1.4
};


