# 🏛️ Lines in Transit Studio

> **후지필름 X-T30 II & 애플 아이팟 터치 7**로 촬영한 도시·건축 사진을 《매거진 B》 감성의 **4:5 세로 매거진 커버(타입 A)** 및 **2분할 심리스 파노라마(Seamless Swipe)**로 10초 만에 인스타그램 규격 이미지로 생성/출력하는 개인용 웹 스튜디오입니다.

---

## ✨ 핵심 기능

1. **인스타그램 규격 고화질 렌더링**:
   - 세로 4:5 매거진 커버 (`1080 × 1350 px`)
   - 가로 2분할 심리스 파노라마 (`2160 × 1350 px` ➔ 슬라이드 1, 2 자동 분할)
   - 가로 3:2 시네마스코프 스프레드 (`1080 × 1350 px`)
2. **Blob 용량 기반 가변 품질 인코딩 (Adaptive Quality)**:
   - 초기 품질 0.94로 생성한 뒤 사용자가 설정한 목표 용량(~1.4MB)을 초과하면 품질을 단계적으로 조정합니다.
   - *목표 용량은 전송 편의성과 화질의 균형을 위한 앱 내부 기준이며, 인스타그램의 공식 재압축 기준을 의미하지 않습니다.*
3. **모바일 Safari 완벽 지원 (다중 다운로드 & 공유)**:
   - 슬라이드 1 / 슬라이드 2 개별 저장
   - `navigator.canShare` 정밀 기능 감지를 통한 Web Share API 모바일 다중 사진 앱 저장 / AirDrop 공유
   - 오프라인에서도 작동하는 로컬 `vendor/jszip.min.js` 기반 ZIP 일괄 다운로드
4. **책임이 분리된 모듈형 아키텍처**:
   - `image-loader.js`: HEIC/RAW 검사, 이미지 디코딩, `OffscreenCanvas` (fallback 포함) 메모리 안전 축소
   - `canvas-engine.js`: 1080×1350 캔버스 렌더러 및 동적 텍스트 자동 축소
   - `export-engine.js`: 가변 품질 인코딩 및 모바일 공유
5. **구조화된 카메라 & 필름 시뮬레이션 프리셋**:
   - `FUJIFILM X-T30 II · CLASSIC CHROME SOOC`
   - `FUJIFILM X-T30 II · CLASSIC NEG SOOC`
   - `APPLE IPOD TOUCH 7 · VINTAGE DIGITAL`
   - 직접 입력 커스텀 모드
6. **100% 클라이언트 렌더링 & 프라이버시**:
   - 모든 이미지와 텍스트는 브라우저 내부 캔버스에서만 처리되며, 사진이 외부 서버로 전송되지 않습니다.
   - `localStorage`에는 편집 텍스트 설정값만 저장되며, 고용량 바이너리 사진 데이터는 저장하지 않아 용량 한도를 초과하지 않습니다.

---

## 📂 프로젝트 구조

```text
lines-in-transit-studio/
├── index.html              # 시맨틱 구조 & 반응형 스튜디오 UI
├── css/
│   └── style.css           # 에디토리얼 다크 테마 및 슬라이더 스타일
├── js/
│   ├── presets.js          # 구조화된 장비 프리셋 & 샘플 메타데이터
│   ├── image-loader.js     # HEIC/RAW 검증, 디코딩, 메모리 안전 다운스케일
│   ├── canvas-engine.js    # 고화질 리샘플링, 타이포 오토스케일, 2분할 렌더러
│   ├── export-engine.js    # 가변 품질 Blob 인코딩, Web Share API, ZIP 내보내기
│   └── app.js              # 이벤트 리스너, 터치/마우스 조작, 안전한 상태 관리
├── assets/
│   └── samples/            # EXIF/위치정보가 안전하게 제거된 기본 테스트 샘플
│       ├── sample-01.jpg
│       ├── sample-02.jpg
│       └── sample-03.jpg
├── vendor/
│   └── jszip.min.js        # 오프라인 독립 번들 ZIP 라이브러리
├── vercel.json             # Vercel 보안 및 정적 캐싱 헤더
└── README.md
```

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

본 프로젝트는 별도 번들러와 빌드 도구 없이 동작하는 Vanilla Web Stack이며, ZIP 생성 기능에 한해 로컬 JSZip을 사용합니다.

```bash
cd lines-in-transit-studio
git init
git add .
git commit -m "feat: Initial release Lines in Transit Studio"
git branch -M main
git remote add origin https://github.com/[사용자계정]/lines-in-transit-studio.git
git push -u origin main
```

1. [Vercel Dashboard](https://vercel.com/new)에서 해당 GitHub 레포지토리를 **Import**합니다.
2. **Framework Preset**: `Other` (또는 비워둠)
3. **Deploy** 버튼 클릭 ➔ 즉시 전 세계 어디서나 접속 가능한 나만의 배포 URL 생성 완료!
