# AI Edu LMS Frontend

Next.js App Router 기반 LMS 프론트엔드 초안입니다.  
현재 목표는 “제품 흐름이 보이는 프론트 골격”을 빠르게 만드는 것이고, 일부 화면은 실제 서비스 흐름에 가깝게 정리되어 있지만 아직 상당수 데이터는 목데이터로 동작합니다.

## 현재 구현 범위

### 홈

- 공개 홈/강의 탐색 화면
- 검색 input
- 상단 필터와 카테고리 토글
- 자동 슬라이드 배너
- 전체 강의 카드 그리드
- 페이지네이션
- 로그인 시에만 `이어서 학습하기`
- 우하단 고정형 `문의하기`

관련 파일:

- `src/app/(marketing)/page.tsx`
- `src/features/home/marketing-home.tsx`

### 강의 상세

- 강의 히어로/개요
- 학습 포인트
- 수강 상태 표시
- 커리큘럼 아코디언
- 미리보기 레슨 클릭 시 `/learn` 이동

관련 파일:

- `src/app/(platform)/courses/[courseSlug]/page.tsx`
- `src/features/course/course-detail-view.tsx`
- `src/features/course/course-curriculum-accordion.tsx`

### 학습 탭

- `My Courses` 목록
- 큰 플레이어 mock 카드
- 현재 강의/현재 레슨/수강 상태 메트릭
- 커리큘럼 카드
- 출석 탭 진입 CTA

관련 파일:

- `src/app/(platform)/learn/page.tsx`
- `src/features/course/learn-player-view.tsx`

### 학생 탭

- 출석 탭
- 캘린더 탭
- 캘린더 `달력형 / 일정형` 토글
- 필수 출석 일정과 출석 카드 연동
- 일정 클릭 시 상세 패널 표시

관련 파일:

- `src/app/(platform)/student/page.tsx`
- `src/features/attendance/student-attendance-workspace.tsx`
- `src/features/attendance/attendance-check-card.tsx`

## 현재 데이터 상태

현재 프로젝트는 실제 API 연동 전 단계입니다.

- 강의 목록/상세/학습/출석은 대부분 목데이터 기반
- 인증은 `zustand + persist`로 로컬 세션 형태만 구성
- 학생 출석은 `강의별`이 아니라 `학생에게 부여된 scope 기반 일정` 구조로 프론트 모델링 완료

출석/캘린더 핵심 개념:

- `global`: 학원 전체 행사
- `class scope`: 특정 반/과정 일정
- 학생은 본인에게 허용된 scope의 일정만 봄
- 그중 `requiresAttendanceCheck = true` 일정만 출석 탭에 연결

관련 타입/목데이터:

- `src/types/attendance.ts`
- `src/features/attendance/mock-attendance-data.ts`
- `src/types/course.ts`
- `src/features/course/mock-course-data.ts`

## 아직 구현되지 않은 부분

이 저장소는 아직 프로덕션 준비 상태가 아닙니다. 아래 항목은 미구현 또는 목업 상태입니다.

### 공통

- 실제 백엔드 API 연동
- 에러/로딩/빈 상태 정교화
- 테스트 코드
- 접근성 검토
- 반응형 디테일 마감

### 인증

- 실제 로그인 폼
- 토큰 갱신
- 권한별 접근 제어
- 로그아웃 UX 마감

### 강의 도메인

- 서버 기반 검색/필터/정렬
- 실제 섹션/레슨 구조
- 학습 진도 저장
- 실제 비디오 플레이어
- 403/권한 없음 시나리오

### 출석/캘린더

- 실제 출석 코드 입력
- 출석 체크 API 연동
- 출석 이력 조회
- 관리자용 학생 scope 부여 UI
- 관리자용 스케줄 생성 UI
- 반복 규칙(`커스텀`, `매일`, `매주`) 설정 UI
- 색상 선택 UI

중요:

- 관리자용 정책 설명이나 설정 문구는 학생 대시보드에서 제거한 상태입니다.
- 향후 권한 부여, 스케줄 생성, 반복 설정, 색상 설정은 `admin` 탭에서 따로 구현해야 합니다.

## 기술 스택

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Zustand
- Axios

## 프로젝트 구조

```text
src/
  app/
    (marketing)/
    (platform)/
    (auth)/
  components/
  features/
    attendance/
    course/
    home/
  services/
  store/
  types/
progress/
```

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

### 3. 프로덕션 빌드

```bash
npm run build
```

## 타입 체크 주의사항

이 프로젝트의 `tsconfig.json`은 `.next/types/**/*.ts`를 포함합니다.
따라서 `.next`가 없는 상태에서 바로 `npx tsc --noEmit`를 실행하면 실패할 수 있습니다.

권장 순서:

```bash
npm run build
npx tsc --noEmit
```

## 네비게이션 요약

- `/`: 홈
- `/courses`: 강의 탐색
- `/courses/[courseSlug]`: 강의 상세
- `/learn`: 학습 허브
- `/student`: 학생 대시보드
- `/instructor`: 강사용 영역 초안
- `/admin`: 관리자용 영역 초안
- `/sign-in`: 로그인 진입점 초안

## 문서

진행 정리 문서는 아래 파일에 있습니다.

- `progress/progress_01.md`
- `progress/progress_02.md`
- `progress/progress_03.md`

특히 `progress/progress_03.md`에는 현재 아키텍처, 다음 프론트 작업 방향, 백엔드 협업용 데이터 계약 초안이 정리되어 있습니다.
