/**
 * Lines in Transit Studio - Presets & Data Definitions
 */

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
    name: '호텔 파사드 & 택시',
    path: './assets/samples/sample-01.jpg',
    mode: 'vertical',
    issueNo: '01',
    title: 'BASE LAYER HOTEL',
    location: '35°40\'N · Tokyo City Center',
    presetId: 'xt30ii_classic_chrome'
  },
  {
    id: 'canal',
    name: '운하 & 도심 전경 (파노라마)',
    path: './assets/samples/sample-02.jpg',
    mode: 'seamless',
    issueNo: '02',
    title: 'CANAL CITY ARCHIVE',
    location: '36°33\'N · Urban Waterway',
    presetId: 'xt30ii_classic_chrome'
  },
  {
    id: 'street',
    name: '기하학 파사드 & 신호등',
    path: './assets/samples/sample-03.jpg',
    mode: 'vertical',
    issueNo: '03',
    title: 'URBAN INTERSECTION',
    location: 'Tokyo, Japan',
    presetId: 'ipod_touch_7'
  }
];

export const TYPOGRAPHY_PRESETS = [
  {
    id: 'archivo',
    name: '1. Archivo + Pretendard (도시 & 건축 · 권장)',
    badge: '1순위 권장',
    headFont: "'Archivo', 'Pretendard', sans-serif",
    headWeight: '800',
    headSpacing: '-0.035em',
    headUppercase: true,
    titleFont: "'Archivo', 'Pretendard', sans-serif",
    titleWeight: '700',
    titleSpacing: '-0.02em',
    titleUppercase: true,
    issueFont: "'Archivo', 'Pretendard', sans-serif",
    issueWeight: '700',
    issueSpacing: '0.08em',
    locationFont: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    locationWeight: '500',
    locationSpacing: '0.02em',
    cameraFont: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    cameraWeight: '600',
    cameraSpacing: '0.08em',
    monoFont: "'IBM Plex Mono', 'Pretendard', monospace"
  },
  {
    id: 'instrument',
    name: '2. Instrument Serif + 마루 부리 (컨템포러리 에디토리얼)',
    badge: '2순위 세리프',
    headFont: "'Instrument Serif', 'Maru Buri', Georgia, serif",
    headWeight: '400',
    headSpacing: '0.01em',
    headUppercase: true,
    titleFont: "'Instrument Serif', 'Maru Buri', serif",
    titleWeight: '400',
    titleSpacing: '0.01em',
    titleUppercase: false,
    issueFont: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    issueWeight: '600',
    issueSpacing: '0.08em',
    locationFont: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    locationWeight: '500',
    locationSpacing: '0.02em',
    cameraFont: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    cameraWeight: '600',
    cameraSpacing: '0.06em',
    monoFont: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif"
  },
  {
    id: 'ibm-plex',
    name: '3. IBM Plex Sans + KR (교통 시스템 & 아카이브)',
    badge: '3순위 표지판',
    headFont: "'IBM Plex Sans Condensed', 'IBM Plex Sans KR', sans-serif",
    headWeight: '700',
    headSpacing: '-0.01em',
    headUppercase: true,
    titleFont: "'IBM Plex Sans Condensed', 'IBM Plex Sans KR', sans-serif",
    titleWeight: '600',
    titleSpacing: '-0.01em',
    titleUppercase: true,
    issueFont: "'IBM Plex Mono', monospace",
    issueWeight: '500',
    issueSpacing: '0.06em',
    locationFont: "'IBM Plex Sans KR', sans-serif",
    locationWeight: '400',
    locationSpacing: '0.02em',
    cameraFont: "'IBM Plex Sans KR', sans-serif",
    cameraWeight: '500',
    cameraSpacing: '0.06em',
    monoFont: "'IBM Plex Mono', monospace"
  }
];

export const DEFAULT_STATE = {
  mode: 'vertical', // 'vertical' (Type A 4:5), 'seamless' (2160x1350 2-slide), 'cinematic' (1080x1350 3:2 centered)
  typographyPreset: 'archivo', // 'archivo' (1순위), 'instrument' (2순위), 'ibm-plex' (3순위)
  magazineTitle: 'LINES IN TRANSIT',
  issueNo: '01',
  photoTitle: 'BASE LAYER HOTEL',
  location: '35°40\'N · Tokyo City Center',
  selectedPresetId: 'xt30ii_classic_chrome',
  customCameraTag: 'FUJIFILM X-T30 II · SOOC',
  showSafetyGuide: false,
  zoom: 1.0,
  panX: 0,
  panY: 0,
  exportQualityMode: 'auto', // 'auto', 'high', 'normal', 'png'
  autoFitTargetMB: 1.4,
  includeCleanPhoto: true // Automatically generates a clean, text-free photo slide for Vertical and Cinematic
};


