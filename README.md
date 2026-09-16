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
6. **모바일 다운로드 편의성 (개별 저장, Web Share, ZIP)**:
   - 슬라이드 1 / 슬라이드 2 개별 저장
   - `navigator.canShare` 지원 환경에서 Web Share API 모바일 다중 사진 앱 저장 / AirDrop 공유
   - 오프라인에서도 작동하는 로컬 `vendor/jszip.min.js` 기반 ZIP 일괄 다운로드
7. **구조화된 카메라 & 필름 시뮬레이션 프리셋**:
   - `FUJIFILM X-T30 II · CLASSIC CHROME SOOC`
   - `FUJIFILM X-T30 II · CLASSIC NEG SOOC`
   - `APPLE IPOD TOUCH 7 · VINTAGE DIGITAL`
   - 직접 입력 커스텀 모드 (슬라이드 2에도 동적 반영)
8. **100% 클라이언트 렌더링 & 프라이버시**:
   - 모든 이미지와 텍스트는 브라우저 내부 캔버스에서만 처리되며, 사진이 외부 서버로 전송되지 않습니다.
   - `localStorage`에는 편집 텍스트 설정값만 저장되며, 고용량 바이너리 사진 데이터는 저장하지 않아 용량 한도를 초과하지 않습니다.

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
│   └── app.js              # RAF 루프, 핀치 줌, 터치/마우스 조작, 안전한 상태 관리
├── assets/
│   ├── fonts/              # 로컬 번들링 Cormorant Garamond woff2 서체
│   └── samples/            # EXIF/위치정보가 안전하게 제거된 기본 테스트 샘플
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
git remote add origin https://github.com/Jeongmingz/lines-in-transit-studio.git
git push -u origin main
```

1. [Vercel Dashboard](https://vercel.com/new)에서 해당 GitHub 레포지토리를 **Import**합니다.
2. **Framework Preset**: `Other` (또는 비워둠)
3. **Deploy** 버튼 클릭 ➔ 즉시 전 세계 어디서나 접속 가능한 나만의 배포 URL 생성 완료!
