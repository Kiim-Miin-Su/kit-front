# Progress 09 — 프론트엔드 구현 계획서 (2026-04-12)

## 목적
- 프론트엔드의 부족한 영역을 식별하고 구현 계획을 고정한다.
- 백엔드 Phase 1~3 구현과 동시에 진행할 수 있는 프론트 작업을 정리한다.
- 기존 fallback mock 패턴이 있으므로 백엔드가 완성되면 별도 수정 없이 연동된다.

## 현재 완료 상태 (2026-04-12 코드 대조)
- 페이지/라우트: marketing, sign-in(플레이스홀더), courses, learn, student, instructor, admin, submissions — 전부 구현
- Feature 모듈: home(7), course(7), learn(6), attendance(12), submission, admin — 전부 구현
- Service 계층: api, auth, course, submission, admin, attendance + 로컬 저장소 — 전부 구현
- 인프라: Zustand 세션, Tailwind, Monaco, Docker, 테스트 3개 — 완료

## 코드 대조 결과
1. 현재 비어 있는 프론트 영역
- `src/features/learn/player-stage.tsx`: `Mock Lesson` 단계
- 제출 파일 업로드 UI 부재

2. 현재 막혀 있는 백엔드 의존
- `POST /auth/sign-in`, `GET /auth/me`, `POST /auth/refresh`
- `GET /courses`, `GET /courses/:slug`, `GET /me/courses`
- `POST /enrollments`
- `GET /me/attendance/workspace`, `POST /attendance/check-in`

3. 실행 원칙
- fallback이 있으므로 화면은 유지한다.
- 다음 작업은 "실연동이 막히는 순서"대로 진행한다.

---

## Phase 1 (P0): 로그인 페이지 실구현

> 완료. `/sign-in`은 로컬 auth API와 연결되며 access token + refresh cookie 기반으로 동작한다.

> 후속 보완은 `fetchMe()/refreshAccessToken()`을 활용한 초기 세션 복구와 middleware 보호다.

### 수정 파일

- `src/app/(auth)/sign-in/page.tsx` (기존 플레이스홀더 → 로그인 폼)

### 구현 명세

**UI 구조**: 기존 2컬럼 레이아웃을 유지하되, 우측 패널을 로그인 폼으로 교체.

```
┌─────────────────────────────────────────────┐
│  ┌──────────────────┬──────────────────────┐ │
│  │  브랜드 패널      │  로그인 폼           │ │
│  │  (기존 좌측 유지) │  - 이메일 입력       │ │
│  │                   │  - 비밀번호 입력     │ │
│  │  "코리아 IT      │  - 에러 메시지       │ │
│  │   아카데미"       │  - 로그인 버튼       │ │
│  │                   │  - 회원가입 링크     │ │
│  └──────────────────┴──────────────────────┘ │
└─────────────────────────────────────────────┘
```

**컴포넌트 동작**:

1. `"use client"` 클라이언트 컴포넌트로 전환 (상태 관리 필요)
2. 상태:
   - `email: string` — 이메일 입력값
   - `password: string` — 비밀번호 입력값
   - `error: string | null` — 에러 메시지
   - `loading: boolean` — 로딩 상태
3. 제출 핸들러:
   ```ts
   async function handleSubmit(e: FormEvent) {
     e.preventDefault();
     setLoading(true);
     setError(null);
     try {
       const session = await signIn({ email, password });
       useAuthStore.getState().setSession(session);
       router.push("/learn");
     } catch (err) {
       // axios 에러에서 메시지 추출
       setError(에러메시지);
     } finally {
       setLoading(false);
     }
   }
   ```
4. 이미 로그인 상태면 `/learn`으로 리다이렉트
5. 테스트 계정 안내 텍스트 표시 (개발 편의):
   - `student-demo-01@koreait.academy / password123`

**에러 처리**:
- `USER_NOT_FOUND` → "입력한 이메일로 가입된 계정을 찾을 수 없습니다."
- `INVALID_PASSWORD` → "비밀번호가 올바르지 않습니다."
- 네트워크 에러 → "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요."

**스타일**: 기존 Tailwind 디자인 시스템(ink, sand, brand 팔레트) 활용.

**의존 관계**: `services/auth.ts`의 `signIn()`, `store/auth-store.ts`의 `setSession()`

**백엔드 연동**: `POST /auth/sign-in`, `GET /auth/me`, `POST /auth/refresh`

---

## Phase 2 (P1): 백엔드 연동 후 보완 작업

> 백엔드 `Auth + Users + Courses + Enrollments + Attendance` 완료 후 수행.

### 2-1. 수강 신청 CTA 연결

**현재**: 수업 상세 페이지(`courses/[courseSlug]/page.tsx`)에 CTA 버튼이 있으나 API 미연결.
**계획**: `POST /enrollments` 호출 → 성공 시 enrollmentStatus 갱신 → UI 반영.
**수정 파일**: `src/features/course/course-detail-view.tsx`

### 2-2. Mock/Fallback 전환 스위치

**현재**: 모든 서비스가 API 실패 시 로컬 mock으로 fallback.
**계획**: 환경변수 `NEXT_PUBLIC_USE_MOCK=true|false`로 fallback on/off 제어.
**수정 파일**: 각 서비스 파일 (`course.ts`, `attendance.ts`, `submission.ts`, `admin.ts`)

### 2-3. 에러 코드 → 사용자 메시지 매핑표 완성

**현재**: 일부 에러 코드만 매핑됨.
**계획**: 백엔드 에러 코드 사전이 고정되면 전체 매핑표를 작성.
**신규 파일**: `src/lib/error-messages.ts`

---

## Phase 3 (P2): 품질/UX 보완

### 3-1. 인증 미들웨어 (라우트 보호)

**현재**: `components/auth/role-gate.tsx`가 있지만, Next.js middleware 레벨 보호 없음.
**계획**: `middleware.ts`에서 `/admin/*`, `/instructor/*`, `/student/*`, `/learn/*` 접근 시 토큰 확인 → 미인증 시 `/sign-in` 리다이렉트.
**신규 파일**: `src/middleware.ts`

### 3-2. 파일 업로드 UI

**현재**: 제출 워크스페이스에서 첨부 개념은 있으나 실제 업로드 플로우 없음.
**계획**:
1. 파일 선택 컴포넌트
2. `POST /files/presign` → 로컬/S3 업로드 → `POST /files/complete` 플로우
3. 업로드 진행률 UI
**신규 파일**: `src/features/submission/file-upload-widget.tsx`
**선행 조건**: 백엔드 `files` owner 검증/권한 정책 확정

### 3-3. 에러/로딩 일관성

**현재**: 개별 feature에서 각자 로딩/에러 처리.
**계획**: 공통 에러 바운더리 + 로딩 스켈레톤 패턴 도입.
**신규 파일**: `src/components/layout/error-boundary.tsx`, `src/components/layout/loading-skeleton.tsx`

### 3-4. 영상 플레이어

**현재**: `features/learn/player-stage.tsx`가 "Mock Lesson" 텍스트만 표시.
**계획**: 백엔드 영상 업로드/스트리밍 API 완성 후 HLS 플레이어 도입.
- `hls.js` 또는 `react-player` 라이브러리
- 이어보기(lastPosition), 배속/해상도, 자막
- heartbeat 기반 진도 전송
**수정 파일**: `src/features/learn/player-stage.tsx`

---

## 실행 순서 (2026-04-12 재정렬)

| 순서 | 프론트 작업 | 백엔드 의존 | 시점 |
| --- | --- | --- | --- |
| 1 | 인증 미들웨어 | Auth 모듈 | 로그인 완료 후 |
| 2 | 수강 신청 CTA 연결 | Courses + Enrollments | 공개/내 강의 API 완료 후 |
| 3 | 학생 출석 실연동 검증 | Attendance | attendance API 완료 후 |
| 4 | Mock/Fallback 스위치 | 전체 API 안정화 후 | 실연동 범위가 충분해진 뒤 |
| 5 | 파일 업로드 UI | Files owner 검증 반영 후 | files 정책 확정 후 |
| 6 | 에러 매핑표 완성 | 에러 코드 사전 합의 | 각 모듈 완료 직후 병행 |
| 7 | 영상 플레이어 | 영상 API (별도 계획) | 장기 |

## 보류 항목 (이번 계획 범위 밖)
- 회원가입 페이지 → 백엔드 `POST /users/register` 구현 후 별도 작업
- 반응형/모바일 최적화 → QA 단계에서 수행
- 접근성(a11y) 감사 → QA 단계에서 수행
- E2E 테스트(Playwright) → 백엔드 실연동 안정화 후 도입
- 알림/실시간 기능 → Notifications 모듈 구현 후 WebSocket 연동

## 참고 문서
- 이전 안정화 로그: `progress/progress_08.md`
- 프론트 구조: `progress/INFO.md`
- 프론트 아키텍처: `progress/architecture.md`
- 백엔드 구현 계획: `../back/progress/progress_02.md`
- 백엔드 API 계약: `../back/progress/FRONT_HANDOFF_2026-04-09.md`
- 프론트 타입 정의: `src/types/auth.ts`, `src/types/course.ts`, `src/types/attendance.ts`
- 프론트 서비스 계약: `src/services/auth.ts`, `src/services/course.ts`, `src/services/attendance.ts`
