# AI Edu LMS — Frontend

Next.js 15 App Router 기반 AI 교육 LMS 프론트엔드입니다.

---

## 시작하기

**사전 요구사항:** 가능한 경우 `./setup.sh`가 Docker 설치/실행을 우선 시도합니다.

### 먼저 알아둘 점

완전히 아무것도 없는 새 PC에서 `git clone` 직후 100% 무설치 자동 실행까지는 아닙니다. 아래 항목은 사용자가 직접 준비하거나 최초 1회 승인해야 할 수 있습니다.

1. `Git` 또는 `Git Bash`
2. 인터넷 연결
3. Docker Desktop 최초 실행/권한 승인
4. 회사 보안 정책 때문에 `brew`, `winget` 자동 설치가 막힌 경우의 수동 설치
5. 실 API 연동을 원하면 sibling `back` 저장소

### 최소 설치물

macOS:

1. `Git`
2. `Docker Desktop`
3. `Homebrew`는 자동 설치를 쓰고 싶을 때만 필요

Windows:

1. `Git for Windows` (Git Bash 포함)
2. `Docker Desktop`
3. `winget`은 자동 설치를 쓰고 싶을 때만 필요

`front/setup.sh`는 Docker가 없거나 꺼져 있으면 자동 설치/실행을 시도합니다. 기본 실행은 실 API 연동 기준이며, mock 모드는 `--allow-mock`을 명시했을 때만 허용합니다.

### 자동 설치가 안 되는 경우 직접 설치해야 하는 것

macOS:

1. `Git`이 없어서 저장소 clone 자체를 못 하는 경우
2. `Homebrew`가 없고, 앱 설치를 CLI로 하고 싶지 않은 경우
3. Docker Desktop 첫 실행에서 macOS 보안 승인/로그인이 필요한 경우

Windows:

1. `Git Bash`가 없어서 `./setup.sh`를 실행할 셸이 없는 경우
2. `winget` 사용이 차단된 회사 PC
3. Docker Desktop 첫 실행에서 관리자 권한 또는 WSL 연동 승인이 필요한 경우
4. 실 API 연동을 위한 sibling `back` 저장소가 없는 경우

### 수동 설치 명령

macOS:

```bash
brew install git
brew install --cask docker
```

Windows PowerShell:

```powershell
winget install -e --id Git.Git
winget install -e --id Docker.DockerDesktop
```

```bash
git clone <repo-url>
cd front
./setup.sh
```

같은 부모 디렉터리에 `back` 저장소가 함께 있으면 `front/setup.sh`가 back을 먼저 기동한 뒤 front를 올립니다.

예시:

```text
workspace/
├── back/
└── front/
```

> **Windows 사용자:** Git Bash / WSL2 터미널에서 실행하세요.  
> PowerShell: `scripts/setup-dev.ps1` → `docker compose up -d`

### 운영자 빠른 실행

macOS:

1. `back`, `front` 저장소를 같은 부모 디렉터리에 둡니다.
2. `Terminal`에서 `cd front && ./setup.sh` 실행
3. 완료 메시지에 나온 `프론트엔드`, `로그인`, `관리자`, `백엔드 API` 주소 확인

Windows:

1. `back`, `front` 저장소를 같은 부모 디렉터리에 둡니다.
2. `Git Bash`에서 `cd front && ./setup.sh` 실행
3. `winget` 사용이 가능한 PC면 Docker Desktop 설치를 자동 시도합니다.
4. 회사 정책으로 자동 설치가 막히면 README 하단 설치 명령을 수동 실행한 뒤 다시 `./setup.sh`

`setup.sh`가 자동으로 처리합니다:

1. Docker 설치 및 실행 여부 확인
2. `.env` 파일 자동 생성 (없을 경우 개발 기본값으로 생성)
3. 포트 충돌 자동 해결:
   - **Docker 컨테이너**가 `3000`을 점유 중이면 해당 컨테이너를 강제 제거하고 `3000` 사용
   - **다른 프로세스**가 점유 중이면 빈 포트를 자동으로 탐색해 사용
4. sibling `back` 저장소가 있으면 백엔드 먼저 실행
5. Next.js 개발 서버 컨테이너 시작
6. 컨테이너 내부: `npm install` → `next dev` 시작
7. 서버 준비 완료 대기 후 접속 정보 출력

기본 실행은 실 API 연동입니다. 백엔드 없이 UI만 확인하려는 경우에만 `--allow-mock`를 사용합니다.

| 접속 대상 | 기본 URL |
|-----------|----------|
| 프론트 홈 | http://localhost:3000 |
| 로그인 | http://localhost:3000/sign-in |
| 관리자 | http://localhost:3000/admin |
| 학습 허브 | http://localhost:3000/learn |

```bash
./setup.sh --no-install # Docker 자동 설치 비활성화
./setup.sh --allow-mock # back 없이 front만 확인
```

---

## 이후 실행

```bash
make dev        # 서버 재시작 (docker compose up)
make logs       # 로그 스트리밍
make stop       # 서버 중지
```

전체 명령어: `make help`

문제가 있으면 먼저 아래 순서로 확인하세요.

```bash
docker compose ps
make logs
curl http://localhost:3000
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 15, React 19, TypeScript |
| 스타일 | Tailwind CSS |
| 상태 관리 | Zustand |
| 코드 에디터 | Monaco Editor |
| HTTP | Axios |

---

## 환경 변수

`setup.sh`가 `.env.example`을 자동으로 복사합니다. 백엔드 주소가 다를 때만 `.env`를 편집하세요.

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `HOST_PORT` | `3000` | 호스트에 노출할 프론트엔드 포트 |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000` | 백엔드 API 주소 |
| `NEXT_PUBLIC_DEV_ROLE_BYPASS` | `false` | 개발 중 역할 bypass (UI 확인용) |

---

## 운영자 접속 정보

기본 seed 기준 로그인 계정:

| 역할 | URL | 계정 |
|------|-----|------|
| 학생 | `/sign-in` 후 `/learn`, `/student` | `student-demo-01@koreait.academy / password123` |
| 강사 | `/sign-in` 후 `/instructor` | `instructor-dev-01@koreait.academy / password123` |
| 관리자 | `/sign-in` 후 `/admin` | `admin-root@koreait.academy / password123` |

운영자가 자주 확인하는 값:

| 항목 | 기본값 | 확인 방법 |
|------|--------|-----------|
| 프론트 포트 | `3000` | `.env`의 `HOST_PORT` |
| 백엔드 API | `http://localhost:4000` | `.env`의 `NEXT_PUBLIC_API_BASE_URL` |
| 역할 bypass | `false` | `.env`의 `NEXT_PUBLIC_DEV_ROLE_BYPASS` |

---

## 로컬 직접 실행 (Node.js 20+)

```bash
npm install
cp .env.example .env   # (선택)
npm run dev            # → http://localhost:3000
npm run build && npm run start  # 프로덕션 빌드 후 실행
npm test               # 단위 테스트
```

---

## 프로젝트 구조

```
front/
├── public/                      # 정적 에셋
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/sign-in/         # 로그인 페이지
│   │   ├── (marketing)/            # 공개 홈 페이지
│   │   └── (platform)/             # 인증 필요 페이지
│   │       ├── courses/            # 강좌 목록/상세
│   │       ├── learn/              # 학습 허브
│   │       ├── student/            # 학생 대시보드
│   │       ├── instructor/         # 강사 콘솔
│   │       ├── submissions/        # 제출 상세
│   │       └── admin/              # 관리자 운영
│   ├── features/                   # 도메인별 화면 조합 로직
│   │   ├── admin/                  # 관리자 대시보드/운영 화면
│   │   ├── attendance/             # 출석 이벤트, 체크인 상태, 상세 패널
│   │   ├── course/                 # 강좌 카드, 상세 표시
│   │   ├── home/                   # 공개 홈 섹션
│   │   ├── learn/                  # 학습 허브 위젯
│   │   └── submission/             # 제출 상세, 피드백, 첨부파일 UI
│   ├── components/                 # 공통 UI 컴포넌트
│   │   ├── auth/                   # 보호 라우트, 세션 관련 UI
│   │   ├── layout/                 # 페이지 레이아웃 프레임
│   │   ├── navigation/             # 헤더/사이드바/탭 이동
│   │   └── providers/              # 전역 provider 래퍼
│   ├── services/                   # API 호출 레이어 (axios + fallback)
│   ├── lib/                        # 브라우저 저장소/유틸
│   ├── store/auth-store.ts         # Zustand 인증 상태
│   ├── config/                     # 네비게이션, 런타임 기본값
│   ├── types/                      # TypeScript 타입 정의
│   └── middleware.ts               # 역할 기반 라우팅 보호
├── scripts/                        # 개발 환경 보조 스크립트
├── progress/                       # 작업 기록/진행 메모
├── tests/                          # 단위 테스트
├── setup.sh                        # 최초 설정 스크립트
├── Makefile                        # 자주 쓰는 명령어 단축키
├── Dockerfile                      # 멀티스테이지 빌드
├── docker-compose.yml              # 개발 환경 (핫 리로드)
└── .env.example                    # 환경 변수 템플릿
```

### 폴더별 역할 요약

| 경로 | 역할 |
|------|------|
| `src/app` | 라우트 엔트리와 페이지 조합 |
| `src/features` | 도메인 단위 화면 기능 묶음 |
| `src/components` | 여러 페이지에서 재사용하는 UI |
| `src/services` | 백엔드 API 요청과 fallback 처리 |
| `src/store` | 전역 상태 관리 |
| `src/lib` | 브라우저 저장소/유틸리티 |
| `src/config` | 라우트/메뉴/런타임 기본 설정 |
| `src/types` | API 응답 및 화면 모델 타입 |
| `public` | 이미지, 아이콘 등 정적 파일 |
| `scripts` | 개발/초기화 스크립트 |
| `progress` | 구현 진행 메모와 변경 기록 |
| `tests` | 프론트 단위 테스트 |

---

## 주요 라우트

| 경로 | 대상 | 설명 |
|------|------|------|
| `/` | 전체 | 강좌 탐색 홈 |
| `/sign-in` | 전체 | 로그인 |
| `/courses/[slug]` | 전체 | 강좌 상세 |
| `/learn` | 학생 | 학습 허브 |
| `/student` | 학생 | 학생 대시보드 |
| `/instructor` | 강사 | 강사 콘솔 |
| `/submissions/[id]` | 강사/학생 | 제출 상세 |
| `/admin` | 관리자 | 운영 대시보드 |
| `/admin/courses/[id]` | 관리자 | 수업 상세/멤버 관리 |
| `/admin/courses/[id]/audit` | 관리자 | 수업 감사 로그 |

---

## 인증 / 미들웨어 구조

```
로그인 성공
  → Zustand store: { accessToken, user } 저장
  → localStorage: user 정보 저장 (accessToken 제외 — XSS 방어)
  → Cookie: ai_edu_role=<role>  (미들웨어 라우팅용)
  → Cookie: ai_edu_refresh_token (httpOnly, back API가 설정)

미들웨어 (Edge Runtime)
  → ai_edu_refresh_token 쿠키로 인증 여부 확인
  → ai_edu_role 쿠키로 역할 기반 redirect
  → 미인증 → /sign-in?redirect=...
  → 권한 없는 역할 → 역할별 홈으로

accessToken 만료 시 (api.ts interceptor)
  → POST /auth/refresh 자동 호출 (httpOnly cookie 사용)
  → 새 accessToken 발급 → 원래 요청 재시도
```

---

## API 연동

`src/services/` 레이어가 백엔드 API를 호출합니다.  
API 실패 시 `fallback` mock 데이터로 자동 전환 → 백엔드 없이 UI 확인 가능.

```
services/api.ts       # axios 인스턴스 (baseURL = NEXT_PUBLIC_API_BASE_URL)
services/auth.ts      # 인증 API
services/course.ts    # 강좌/수강 API
services/attendance.ts  # 출석 API
services/submission.ts  # 과제/제출 API
services/admin.ts     # 관리자 API
```

---

## 테스트

```bash
make test       # 컨테이너에서 실행
npm test        # 직접 실행 (tests/*.test.ts)
```

---

## 프로덕션 빌드

```bash
docker build -t ai-edu-front \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com \
  .
docker run -p 3000:3000 ai-edu-front
```

---

## 개발 테스트 계정

back 레포에서 `./setup.sh` 실행 후 사용 가능합니다.

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 학생 | `student-demo-01@koreait.academy` | `password123` |
| 강사 | `instructor-dev-01@koreait.academy` | `password123` |
| 관리자 | `admin-root@koreait.academy` | `password123` |

---

## 현재 구현 현황

| 기능 | 상태 |
|------|------|
| 강좌 탐색/상세/수강 신청 | ✅ |
| 로그인/인증 + 역할 기반 라우팅 | ✅ |
| 출석 캘린더/체크 | ✅ |
| 과제 제출 (Monaco IDE) | ✅ |
| 강사 콘솔 (리뷰/피드백) | ✅ |
| 관리자 운영 전체 | ✅ |
| 강의 영상 플레이어 | 🚧 mock 단계 |
| 파일 업로드 위젯 | 🚧 미구현 |

---

## 상세 문서

| 문서 | 설명 |
|------|------|
| [`EXTENSION_GUIDE.md`](./EXTENSION_GUIDE.md) | 확장 전략, `.env`, 배포, CORS, 보호 페이지 주의사항 |
| [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) | 운영 배포 전후 점검 체크리스트 |
| [`progress/INFO.md`](./progress/INFO.md) | 아키텍처 기준 및 구현 공백 |
| [`progress/progress_10.md`](./progress/progress_10.md) | 최신 진행 상황 (2026-04-13) |
| [`progress/architecture.md`](./progress/architecture.md) | 백엔드 연동 아키텍처 |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 기여 가이드 |
