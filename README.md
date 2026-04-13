# AI Edu LMS — Frontend

Next.js 15 App Router 기반 AI 교육 LMS 프론트엔드입니다.

---

## 시작하기

**사전 요구사항:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치

```bash
git clone <repo-url>
cd front
./setup.sh
```

> **Windows 사용자:** Git Bash / WSL2 터미널에서 실행하세요.  
> PowerShell: `scripts/setup-dev.ps1` → `docker compose up -d`

`setup.sh`가 자동으로 처리합니다:

1. Docker 설치 및 실행 여부 확인 (미설치 시 OS별 설치 가이드 출력)
2. `.env` 파일 자동 생성 (없을 경우 개발 기본값으로 생성)
3. Next.js 개발 서버 컨테이너 시작
4. 컨테이너 내부: `npm install` → `next dev` 시작
5. 서버 준비 완료 대기 후 접속 정보 출력

브라우저에서 http://localhost:3000 접속

> 백엔드 없이도 mock 데이터로 UI 확인 가능합니다.  
> 실 API 연동은 [back 레포](../back/)를 먼저 `./setup.sh`로 실행하세요.

```bash
./setup.sh --install    # Docker 자동 설치 포함 (macOS Homebrew / Linux apt)
```

---

## 이후 실행

```bash
make dev        # 서버 재시작 (docker compose up)
make logs       # 로그 스트리밍
make stop       # 서버 중지
```

전체 명령어: `make help`

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
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000` | 백엔드 API 주소 |
| `NEXT_PUBLIC_DEV_ROLE_BYPASS` | `false` | 개발 중 역할 bypass (UI 확인용) |

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
│   ├── features/                   # 페이지별 UI 컴포넌트
│   ├── components/                 # 공통 UI 컴포넌트
│   ├── services/                   # API 호출 레이어 (axios + fallback)
│   ├── store/auth-store.ts         # Zustand 인증 상태
│   ├── lib/auth-storage.ts         # localStorage + 역할 쿠키 관리
│   ├── types/                      # TypeScript 타입 정의
│   ├── config/                     # 네비게이션 설정
│   └── middleware.ts               # 역할 기반 라우팅 보호
├── tests/                          # 단위 테스트
├── setup.sh                        # 최초 설정 스크립트
├── Makefile                        # 자주 쓰는 명령어 단축키
├── Dockerfile                      # 멀티스테이지 빌드
├── docker-compose.yml              # 개발 환경 (핫 리로드)
└── .env.example                    # 환경 변수 템플릿
```

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
| [`progress/INFO.md`](./progress/INFO.md) | 아키텍처 기준 및 구현 공백 |
| [`progress/progress_10.md`](./progress/progress_10.md) | 최신 진행 상황 (2026-04-13) |
| [`progress/architecture.md`](./progress/architecture.md) | 백엔드 연동 아키텍처 |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 기여 가이드 |
