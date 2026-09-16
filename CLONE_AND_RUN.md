# 🚀 Clone & Run Guide (멀티 환경 실행 가이드)

어떤 OS(macOS, Windows, Linux)나 다른 개발 환경에서도 `git clone` 후 5초 만에 실행하고 편집할 수 있는 가이드입니다.

---

## 1. 레포지토리 클론 (Git Clone)

```bash
git clone https://github.com/[YOUR_GITHUB_USERNAME]/lines-in-transit-studio.git
cd lines-in-transit-studio
```

---

## 2. 로컬 실행 (환경별 1-Line 실행)

본 프로젝트는 별도의 `npm install`이나 복잡한 빌드 과정이 없는 **순수 Vanilla HTML5/CSS/ES Modules** 구조입니다.

### 방법 A. Python이 있는 경우 (가장 간단)
```bash
npm start
# 또는
python -m http.server 3000
```
브라우저에서 `http://localhost:3000` 접속

### 방법 B. Node.js가 있는 경우
```bash
npm run serve
# 또는
npx serve .
```

### 방법 C. VS Code를 사용하는 경우
- 확장 프로그램 `Live Server` 설치 후 `index.html` 우클릭 ➔ **"Open with Live Server"** 클릭

---

## 3. Vercel 배포 (Vercel Deployment)

1. [vercel.com](https://vercel.com/new)에 접속하여 GitHub 계정으로 로그인합니다.
2. `lines-in-transit-studio` 레포지토리를 **Import**합니다.
3. 설정 변경 없이 **Deploy** 버튼을 누르면 끝납니다.
4. 이후 GitHub `main` 브랜치에 코드를 `git push`할 때마다 Vercel이 자동으로 최신 버전을 배포합니다.
