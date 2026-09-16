# 🏛️ Lines in Transit Studio

> **후지필름 X-T30 II & 애플 아이팟 터치 7**로 촬영한 도시·건축 사진을 《매거진 B》 감성의 **4:5 세로 매거진 커버(타입 A)** 및 **2분할 심리스 파노라마(Seamless Swipe)**로 10초 만에 인스타그램 규격 이미지로 생성/출력하는 개인용 웹 스튜디오입니다.

---

## ✨ 핵심 기능

1. **모바일 피드 최적화 4:5 / 심리스 규격 렌더링**:
   - 세로 4:5 매거진 커버 (`1080 × 1350 px`)
   - 가로 2분할 심리스 파노라마 (`2160 × 1350 px` ➔ 슬라이드 1 `[1/2]`, 슬라이드 2 `[2/2]` 자동 분할)
   - 가로 3:2 시네마스코프 스프레드 (`1080 × 1350 px`)
   - 스마트폰 화면(약 390px 폭)에서도 또렷하게 식별되는 **확대된 에디토리얼 타이포그래피** (마스트헤드 48px, 타이틀 38px, SWIPE 배지 22px/175×56px)
2. **미리보기와 내보내기 캔버스 물리적 분리**:
   - 안전영역(슬라이드 1, 슬라이드 2 독립 5% 마진) 및 중앙 절단선은 순수 CSS 오버레이로 구현되어 출력 이미지에 절대 포함되지 않습니다.
   - 뷰포트 조작 시 50% 스케일 미리보기 캔버스와 더티 플래그 기반 `requestAnimationFrame` 루프를 적용하여 모바일 기기에서도 부드러운 인터랙션을 목표로 최적화되었습니다.
3. **모바일 터치 핀치 투 줌 & 줌 슬라이더**:
   - 휠이 없는 모바일 기기를 위해 2점 터치 핀치 줌 제스처 지원 (조작 완료 시에만 로컬스토리지 저장)
   - 툴바 내 1.0x~3.0x 명시적 슬라이더 및 +/- 버튼 제공
4. **로컬 번들링 서체 (Cormorant Garamond, SIL OFL)**:
   - iOS, Android, Windows 등 모든 운영체제에서 동일한 세리프 조판을 보장하도록 Cormorant Garamond SemiBold(600) 및 Bold(700) woff2 서체 내장.
   - 한글 타이틀 지원을 위한 `Nanum Myeongjo` 및 `Noto Sans KR` 폰트 스택 폴백 탑재.
5. **가변 품질 자동 감축 인코딩 (Adaptive Quality Engine)**:
   - 렌더링 후 Blob 용량을 확인하여, 사용자가 지정한 목표 용량(1.0MB / 1.4MB / 2.0MB / 사용자 정의)을 초과할 경우 품질을 0.94에서 단계적으로 미세 조정합니다.
   - 인코딩 완료 시 토스트 메시지를 통해 목표 용량 달성 여부와 최종 품질을 투명하게 안내합니다.
   - *목표 용량은 전송 편의성과 디테일의 균형을 위한 앱 내부 최적화 기준이며, 특정 플랫폼의 공식 기준이 아닙니다.*
6. **EXIF GPS 로컬 분석 & 프라이버시 중심 역지오코딩**:
   - 사진 선택 시 브라우저 내에서 번들된 `exifr`를 통해 GPS 좌표(위도·경도 및 도분초 DMS)를 100% 로컬 분석합니다. (사진 원본은 외부 서버로 절대 전송되지 않음)
   - 사용자가 `[주소 자동 찾기]` 버튼을 클릭할 때만 좌표가 지오코딩 서비스(OpenStreetMap Nominatim / 카카오맵 프록시)로 전달되어 도시·구역·국가 중심 주소로 장소란을 자동 완성합니다.
   - '좌표 병기' 옵션으로 장소명과 `35°40′34″N · 139°39′01″E` 도분초 표기를 조합할 수 있습니다.
   - 최종 다운로드 이미지에는 캔버스 재생성을 통해 원본 사진의 숨겨진 GPS 메타데이터가 완전히 제거되어 인스타그램 등 SNS 업로드 시 개인 프라이버시가 보호됩니다.
7. **모바일 다운로드 편의성 (개별 저장, Web Share, ZIP)**:
   - 슬라이드 1 / 슬라이드 2 개별 저장
   - `navigator.canShare` 지원 환경에서 Web Share API 모바일 다중 사진 앱 저장 / AirDrop 공유
   - 오프라인에서도 작동하는 로컬 `vendor/jszip.min.js` 기반 ZIP 일괄 다운로드
8. **구조화된 카메라 & 필름 시뮬레이션 프리셋**:
   - `FUJIFILM X-T30 II · CLASSIC CHROME SOOC`
   - `FUJIFILM X-T30 II · CLASSIC NEG SOOC`
   - `APPLE IPOD TOUCH 7 · VINTAGE DIGITAL`
   - 직접 입력 커스텀 모드 (슬라이드 2에도 동적 반영)
9. **100% 클라이언트 렌더링 & 프라이버시**:
   - 모든 사진 렌더링과 텍스트 조판은 브라우저 내부 캔버스에서만 처리됩니다.
   - `localStorage`에는 편집 텍스트 설정값만 저장되며, 고용량 바이너리 사진 데이터는 저장하지 않아 용량 한도를 초과하지 않습니다.
   - 영문 세리프는 로컬 번들링 Cormorant Garamond로 모든 기기에서 동일 조판을 보장하며, 한글은 Google Fonts 및 OS별 명조/고딕 폴백으로 유려하게 렌더링됩니다.

---

## 📂 프로젝트 구조

```text
lines-in-transit-studio/
├── index.html              # 시맨틱 구조, 줌 툴바 & 반응형 스튜디오 UI
├── css/
│   └── style.css           # 에디토리얼 다크 테마, 로컬 font-face, CSS 가이드 오버레이
├── js/
│   ├── presets.js          # 구조화된 장비 프리셋 & 샘플 메타데이터
│   ├── image-loader.js     # HEIC/RAW 검증, 디코딩, 메모리 안전 다운스케일
│   ├── canvas-engine.js    # 고화질 리샘플링, 타이포 오토스케일, 온디맨드 마스터 렌더러
│   ├── export-engine.js    # 가변 품질 Blob 인코딩, Web Share API, ZIP 내보내기
│   └── app.js              # RAF 루프, 핀치 줌, EXIF GPS 추출, 상태 관리
├── api/
│   └── geocode.js          # Vercel Serverless 역지오코딩 프록시 (Nominatim / Kakao)
├── assets/
│   ├── fonts/              # 로컬 번들링 Cormorant Garamond woff2 서체 (SIL OFL)
│   └── samples/            # EXIF/위치정보가 안전하게 제거된 기본 테스트 샘플
├── vendor/
│   ├── jszip.min.js        # 로컬 번들 ZIP 라이브러리
│   ├── exifr.mini.umd.js   # 로컬 번들 EXIF GPS 파서 라이브러리
│   └── LICENSE-exifr.txt   # exifr MIT 라이선스 원문
├── tests/
│   ├── verify_v1.py        # 정적 코드 & 서체 & DOM 구조 검증기
│   ├── test_functional.py  # DMS 좌표 변환, targetMB 클램프 알고리즘 단위 테스트
│   └── test_browser.py     # Playwright 기반 실제 브라우저(MS Edge) E2E 통합 테스트
├── vercel.json             # Vercel 보안 및 정적 캐싱 헤더
└── README.md
```

---

## 🧪 테스트 실행 방법

```bash
# 1. 정적 코드 및 서체·DOM 무결성 검증
python -X utf8 tests/verify_v1.py

# 2. 핵심 알고리즘(DMS, 용량 클램프, 파일명) 단위 테스트
python -X utf8 tests/test_functional.py

# 3. Playwright 기반 실제 브라우저 E2E 통합 테스트 (상태 보존, GPS 파싱, 안전영역 분리)
python -X utf8 tests/test_browser.py
```

---

## 📜 오픈소스 라이선스 안내 (Open Source Licenses)

- **Cormorant Garamond**: SIL Open Font License 1.1 ([LICENSE-OFL.txt](assets/fonts/LICENSE-OFL.txt))
- **exifr**: MIT License by Mike Kovařík ([LICENSE-exifr.txt](vendor/LICENSE-exifr.txt))
- **JSZip**: Dual MIT / GPLv3 License
- **Address Data**: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL)

---

## 🚀 로컬 테스트 실행 방법

별도의 Node.js나 빌드 설치 없이 Python 내장 서버로 즉시 실행할 수 있습니다:

```bash
cd lines-in-transit-studio
python -m http.server 3000
```

브라우저에서 `http://localhost:3000` 접속!

---

## 🌐 Vercel 배포 방법 (Zero-Config)

본 프로젝트는 별도 번들러와 빌드 도구 없이 동작하는 Vanilla Web Stack이며, ZIP 생성 및 EXIF 분석에 로컬 번들 라이브러리를 사용합니다.

```bash
cd lines-in-transit-studio
git init
git add .
git commit -m "feat: Initial release Lines in Transit Studio"
git branch -M main
git remote add origin https://github.com/Jeongmingz/lines-in-transit-studio.git
git push -u origin main
```

1. [Vercel Dashboard](https://vercel.com/new)에서 해당 GitHub 레포지토리를 **Import**합니다.
2. **Framework Preset**: `Other` (또는 비워둠)
3. **Deploy** 버튼 클릭 ➔ 즉시 전 세계 어디서나 접속 가능한 나만의 배포 URL 생성 완료!
