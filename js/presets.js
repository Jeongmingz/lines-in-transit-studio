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

export const DEFAULT_STATE = {
  mode: 'vertical', // 'vertical' (Type A 4:5), 'seamless' (2160x1350 2-slide), 'cinematic' (1080x1350 3:2 centered)
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
  autoFitTargetMB: 1.4
};
