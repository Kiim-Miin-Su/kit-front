# AI Edu LMS — Frontend

Next.js 15 App Router 기반 AI 교육 LMS 프론트엔드입니다.

---

## 시작하기

**사전 요구사항:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치

```bash
git clone <repo-url>
cd front
docker compose up
```

브라우저에서 http://localhost:3000 접속

처음 실행 시 `npm install` → 개발 서버 시작이 자동으로 진행됩니다.

> 백엔드 API 기본 주소는 `http://localhost:4000`입니다.  
> 백엔드가 없어도 API 실패 시 mock 데이터로 자동 전환되어 UI를 확인할 수 있습니다.

---

## 자주 쓰는 명령어

```bash
make dev        # 개발 서버 실행 (= docker compose up)
make logs       # 로그 스트리밍
make test       # 단위 테스트 실행
make shell      # 컨테이너 내부 쉘 진입
make build      # 프로덕션 이미지 빌드
make clean      # 컨테이너 + node_modules 볼륨 삭제
make help       # 전체 명령어 목록
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

`.env` 파일이 없어도 개발 서버가 실행됩니다. 백엔드 주소를 바꾸고 싶을 때만 설정하세요.

```bash
cp .env.example .env
```

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000` | 백엔드 API 주소 |
| `NEXT_PUBLIC_DEV_ROLE_BYPASS` | `false` | 개발 중 역할 bypass 허용 (`true` \| `false`) |

> `NEXT_PUBLIC_*` 값은 프로덕션 Docker 이미지에서 빌드 시점에 번들에 포함됩니다.

---

## 로컬 직접 실행 (Node.js 20+)

```bash
npm install
cp .env.example .env   # (선택)
npm run dev            # 개발 서버 → http://localhost:3000
npm run build          # 프로덕션 빌드
npm run start          # 프로덕션 서버
npm test               # 단위 테스트
```

---

## 프로젝트 구조

```
front/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # 인증 레이아웃 그룹
│   │   │   └── sign-in/            # 로그인 페이지
│   │   ├── (marketing)/            # 비로그인 공개 페이지
│   │   │   └── page.tsx            # 홈 (강좌 탐색)
│   │   └── (platform)/             # 로그인 필요 페이지
│   │       ├── courses/            # 강좌 목록/상세
│   │       ├── learn/              # 학습 허브
│   │       ├── student/            # 학생 대시보드
│   │       ├── instructor/         # 강사 콘솔
│   │       ├── submissions/        # 제출 상세
│   │       └── admin/              # 관리자 운영
│   ├── features/                   # 페이지별 UI 컴포넌트 묶음
│   │   ├── admin/                  # 수업·일정·출석scope·감사로그
│   │   ├── attendance/             # 출석 캘린더·체크
│   │   ├── course/                 # 강좌 카드·카탈로그·상세
│   │   ├── home/                   # 홈 히어로·필터·그리드
│   │   ├── learn/                  # 학습 플레이어·커리큘럼
│   │   └── submission/             # 제출 워크스페이스·IDE·첨부
│   ├── components/                 # 공통 UI 컴포넌트
│   │   ├── auth/                   # RoleGate
│   │   ├── layout/                 # PageIntro, StatusPanel
│   │   ├── navigation/             # TopNavigation, SectionSidebar
│   │   └── providers/              # AppProviders (Zustand 등)
│   ├── services/                   # API 호출 레이어 (axios + fallback)
│   │   ├── api.ts                  # axios 인스턴스
│   │   ├── auth.ts                 # 인증 API
│   │   ├── course.ts               # 강좌/수강 API
│   │   ├── attendance.ts           # 출석 API
│   │   ├── submission.ts           # 과제/제출 API
│   │   └── admin.ts                # 관리자 API
│   ├── store/                      # Zustand 전역 상태
│   │   └── auth-store.ts           # 인증 상태 (user, token)
│   ├── types/                      # TypeScript 타입 정의
│   ├── config/                     # 네비게이션 설정, 런타임 기본값
│   ├── lib/                        # auth-storage 등 유틸
│   └── middleware.ts               # Next.js 미들웨어
├── tests/                          # 단위 테스트 (Node test runner)
├── Dockerfile                      # 멀티스테이지 빌드
├── docker-compose.yml              # 개발 환경 (핫 리로드)
├── docker-compose.prod.yml         # 프로덕션 환경 (빌드 이미지)
├── Makefile                        # 자주 쓰는 명령어 단축키
└── .env.example                    # 환경 변수 템플릿
```

---

## 주요 라우트

| 경로 | 대상 | 설명 |
|------|------|------|
| `/` | 전체 | 강좌 탐색 홈 |
| `/sign-in` | 전체 | 로그인 |
| `/courses` | 전체 | 강좌 목록 |
| `/courses/[courseSlug]` | 전체 | 강좌 상세 |
| `/learn` | 학생 | 학습 허브 |
| `/student` | 학생 | 학생 대시보드 |
| `/instructor` | 강사 | 강사 콘솔 |
| `/submissions/[submissionId]` | 강사/학생 | 제출 상세 |
| `/admin` | 관리자 | 운영 대시보드 |
| `/admin/courses/[courseId]` | 관리자 | 수업 상세/멤버 관리 |
| `/admin/courses/[courseId]/audit` | 관리자 | 수업 감사 로그 |

---

## 주요 기능

### 학생
- 강좌 탐색 · 검색 · 수강 신청
- 학습 허브 (커리큘럼 목록, 강의 플레이어)
- 출석 캘린더 및 출석 체크
- 과제 제출 (Monaco IDE 에디터 + 파일 첨부)
- 제출 이력 및 피드백 확인

### 강사
- 과제 등록 · 수정 · 템플릿 관리
- 제출 목록 조회 및 상태 변경
- 코드 리뷰 및 피드백 작성
- 과제 타임라인 조회

### 관리자
- 수업 생성 · 삭제
- 사용자 검색 후 멤버 역할 배치 (STUDENT / ASSISTANT / INSTRUCTOR)
- 일정 CRUD (반복 등록 포함)
- 수업별 출석 scope 정책 관리
- 수업별 감사 로그 조회

---

## API 연동 구조

```
services/api.ts       # axios 인스턴스 (baseURL = NEXT_PUBLIC_API_BASE_URL)
```

각 서비스는 API 실패 시 `fallback` mock 데이터로 자동 전환됩니다.  
백엔드(`back` 레포) 없이도 UI 전체를 확인할 수 있습니다.

백엔드와 함께 사용하려면 `back` 레포를 먼저 실행하세요:

```bash
# back 레포에서
docker compose up   # → http://localhost:4000
```

---

## 테스트

```bash
# Docker 환경에서
make test

# 직접 실행
npm test
```

테스트 파일: `tests/*.test.ts` (Node test runner + TypeScript strip)

---

## 프로덕션 빌드

```bash
# .env에서 NEXT_PUBLIC_API_BASE_URL 값을 먼저 설정하거나 build-arg로 넘깁니다.
docker build -t ai-edu-front \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com \
  .

docker run -p 3000:3000 ai-edu-front
```

또는:

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

---

## 개발 테스트 계정

`back` 레포에서 `make seed` 실행 후 사용 가능합니다.

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 학생 | `student-demo-01@koreait.academy` | `password123` |
| 강사 | `instructor-dev-01@koreait.academy` | `password123` |
| 관리자 | `admin-root@koreait.academy` | `password123` |

---

## 현재 구현 현황

| 기능 | 상태 |
|------|------|
| 강좌 탐색/상세/수강 신청 | ✅ 완료 |
| 로그인/인증 (HMAC 토큰) | ✅ 완료 |
| 출석 캘린더/체크 | ✅ 완료 |
| 과제 제출 워크스페이스 (Monaco IDE) | ✅ 완료 |
| 강사 콘솔 (리뷰/피드백) | ✅ 완료 |
| 관리자 운영 (수업·일정·멤버·출석scope) | ✅ 완료 |
| 강의 영상 플레이어 | 🚧 mock 단계 |
| 파일 업로드 위젯 | 🚧 미구현 |
| 미들웨어 기반 라우트 보호 | 🚧 미적용 |

---

## 상세 문서

| 문서 | 설명 |
|------|------|
| [`progress/INFO.md`](./progress/INFO.md) | 아키텍처 기준 및 구현 공백 정리 |
| [`progress/progress_09.md`](./progress/progress_09.md) | 최신 진행 상황 (2026-04-13) |
| [`progress/architecture.md`](./progress/architecture.md) | 백엔드 연동 아키텍처 |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 기여 가이드 |
