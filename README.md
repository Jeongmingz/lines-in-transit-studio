# 📷 Lines in Transit Studio — Journal Post Maker

> **Lines in Transit Studio는 이동하며 촬영한 풍경, 공간, 사람의 장면을 인스타그램용 사진 저널 세트로 정리하는 개인용 웹 도구입니다.**
>
> 템플릿과 텍스트로 사진을 가리는 대신, 사진 본연의 힘을 살리는 **70% 사진 · 20% 기록 · 10% 브랜드** 원칙에 따라 깔끔하고 일관된 피드를 완성합니다.

---

## ✨ 3가지 핵심 포맷

사이트 첫 화면에서 게시물의 목적에 맞춰 세 가지 직관적인 포맷을 선택할 수 있습니다:

| 포맷 | 설명 | 슬라이드 구성 | 기본 프레이밍 & 설정 |
|:---|:---|:---|:---|
| **📷 PHOTO**<br>*(클린 포스트)* | 텍스트와 프레임이 일절 없는 100% 순수 사진 포스트 | 1장 (`01_PHOTO`) | **4:5 채우기(Crop)** 또는 **원본 비율 유지(Fit)** 선택 가능 |
| **📖 CHAPTER**<br>*(시리즈 표지 + 클린)* | 새로운 여행지나 연재 시리즈의 개막을 알리는 에디토리얼 표지 세트 | 2장 (`01_COVER` + `02_CLEAN`) | 마스트헤드 + 시리즈명/No + 사진제목 + 장소/연도 (글래스 박스 없음) |
| **🌊 PANORAMA**<br>*(가로 2분할)* | 광활한 풍경이나 수평선을 매끄럽게 이어주는 2-Slide 심리스 파노라마 | 2장 (`01_LEFT` + `02_RIGHT`) | 100% 클린 사진 기본 (미니멀 텍스트 오버레이 선택 가능) |

---

## 🧭 브랜드 원칙: 70 · 20 · 10

매 게시물에 매거진 표지를 반복하면 사진작가의 계정이 아니라 템플릿 제작기처럼 보입니다.

```text
70% 사진 (PHOTO) ─── 순수한 사진 대표작과 디테일 컷
20% 기록 (NOTES) ─── 장소, 현장 관찰 노트, 촬영 과정 릴스
10% 브랜드 (CHAPTER) ── 새 시리즈 시작을 알리는 에디토리얼 챕터 표지
```

### 게시물 유형별 권장 슬라이드 순서
- **일반 포트폴리오 (기본)**: `CLEAN` (대표작) ➔ `DETAIL` (디테일/질감) ➔ `CONTEXT` (주변 풍경/거리)
- **새 시리즈 개막**: `COVER` (챕터 표지) ➔ `CLEAN` (순수 원본) ➔ `DETAIL` (세부 장면)
- **와이드 풍경**: `LEFT` (좌측 1번) ➔ `RIGHT` (우측 2번)

---

## 🔤 통합 브랜드 타이포그래피 (Brand Typography)

복잡한 폰트 선택 드롭다운을 제거하고, 건축과 도시의 정갈한 비례감을 주는 단일 서체 시스템으로 통일했습니다.

- **마스트헤드 (`LINES IN TRANSIT`)**: `Archivo 800` (대문자, 자간 `-0.035em`)
- **시리즈 & No (`PASSING PLACES · 01`)**: `Archivo 700` (자간 `0.08em`)
- **사진 제목 (`KANAZAWA WATERWAY`)**: `Pretendard 600` (자간 `-0.02em`)
- **장소 & 연도 (`KANAZAWA · JAPAN · 2026`)**: `Pretendard 400~500` (자간 `0.02em`)

---

## 📝 현장 관찰 중심 캡션 도우미

시적인 미사여구 대신, 사진작가가 그 순간 셔터를 누른 **구체적인 시선과 관찰**을 기록하도록 돕습니다:

> *"골목 끝 수로에 오후 햇살이 닿으면서 물결에 비친 처마의 선이 선명해졌다."*

- **입력 프롬프트**: 걸음을 멈추게 한 빛, 날씨, 시선의 초점 기록
- **클립보드 원클릭 복사**: 관찰 노트 + 브랜드 + 시리즈/No + 장소 + 촬영 연도 + 카메라 정보 + 전용 해시태그(`#linesintransit #{series}`)

---

## 🔒 프라이버시 중심 로컬 GPS 분석 & 역지오코딩

1. **100% 브라우저 로컬 EXIF 분석**: 사진 선택 시 내장 파서(`vendor/exifr.mini.umd.js`)를 통해 클라이언트 메모리에서만 GPS 좌표를 추출합니다. 사진 파일이 외부 서버로 전송되지 않습니다.
2. **명시적 온디맨드 주소 조회**: 사용자가 `[🔍 주소 자동 찾기]` 버튼을 클릭할 때만 좌표가 지오코딩 서비스로 전달되어 도시·지역명 중심 주소로 자동 완성됩니다.
3. **메타데이터 자동 스트리핑**: 캔버스 재렌더링 과정을 거쳐 내보내므로, 최종 다운로드 파일에서는 사용자의 사생활 좌표 메타데이터가 완전히 제거되어 안전합니다.

---

## ⚡ 가변 품질 자동 감축 인코딩 (Adaptive Quality Engine)

- 모바일 고속 업로드 및 메신저 전송에 최적화된 **1.4MB 권장 밸런스** 기본 적용.
- 렌더링 후 Blob 용량을 확인하여 1.4MB 초과 시 화질 저하를 최소화하면서 0.94~0.78 범위 내에서 품질을 미세 감축합니다.
- 고화질 모드(0.95), 일반 최적화(0.92), 무손실 PNG 모드도 지원합니다.

---

## 📂 프로젝트 구조

```text
lines-in-transit-studio/
├── index.html              # 시맨틱 마크업, 줌 툴바, 3개 포맷 선택 UI
├── css/
│   └── style.css           # 다크 에디토리얼 테마, CSS 가이드 오버레이, 폰트 정의
├── js/
│   ├── presets.js          # 시리즈 프리셋(5선+직접입력), 3개 장르 샘플, 브랜드 타이포
│   ├── image-loader.js     # 이미지 디코딩, 메모리 안전 다운스케일
│   ├── canvas-engine.js    # PHOTO/CHAPTER/PANORAMA 렌더러, fitText 오토스케일
│   ├── export-engine.js    # 가변 품질 JPEG/PNG 인코딩, Web Share, ZIP 생성
│   └── app.js              # RAF 렌더 루프, 핀치 줌, EXIF GPS, 캡션 복사
├── api/
│   └── geocode.js          # Vercel Serverless 역지오코딩 프록시 (Nominatim)
├── assets/
│   ├── fonts/              # Archivo, Pretendard, IBM Plex Mono 로컬 서체
│   └── samples/            # 공간·건축, 자연 풍경, 물길·여행 장르별 샘플 사진
├── vendor/
│   ├── jszip.min.js        # 로컬 번들 ZIP 라이브러리
│   └── exifr.mini.umd.js   # 로컬 번들 EXIF 파서
├── tests/
│   ├── verify_v1.py        # 정적 코드 & DOM & 서체 무결성 검증
│   ├── test_functional.py  # DMS 좌표, 용량 클램프, 파일명 알고리즘 테스트
│   └── test_browser.py     # Playwright 기반 MS Edge E2E 브라우저 테스트
├── vercel.json             # Vercel 배포 및 캐싱 헤더 설정
└── README.md
```

---

## 🧪 테스트 실행 방법

```bash
# 1. 정적 코드 및 DOM 구조 검증
python -X utf8 tests/verify_v1.py

# 2. 핵심 알고리즘 단위 테스트 (DMS, 파일명, 용량 클램프)
python -X utf8 tests/test_functional.py

# 3. Playwright 실제 브라우저 E2E 테스트 (포맷 전환, GPS 분석, 캡션)
python -X utf8 tests/test_browser.py
```

---

## 🚀 로컬 실행 & Vercel 배포

별도의 번들러나 패키지 설치 없이 브라우저에서 바로 동작합니다:

```bash
# 로컬 개발 서버 실행
python -m http.server 3000
```

브라우저에서 `http://localhost:3000` 접속!

Vercel 배포 시 `main` 브랜치에 푸시하면 별도 빌드 단계 없이 즉시 글로벌 CDN으로 배포됩니다.

---

## 📜 오픈소스 라이선스 안내

- **Archivo**: SIL Open Font License 1.1 by Omnibus-Type
- **Pretendard**: SIL Open Font License 1.1 by Kil Hyung-jin
- **IBM Plex Mono**: SIL Open Font License 1.1 by IBM Corp.
- **exifr**: MIT License by Mike Kovařík
- **JSZip**: Dual MIT / GPLv3 License
- **Address Data**: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL)
