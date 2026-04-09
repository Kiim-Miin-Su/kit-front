# Frontend Architecture Info (2026-04-09)

## 문서 범위
- 프론트 기술/구조 기준 문서.
- 백엔드는 프론트가 기대하는 API 계약/스키마 중심으로 기록한다.

## 스택
- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Zustand
- Monaco Editor

## 구조
1. App Layer (`src/app`)
- 라우팅/페이지 진입점.
- 제출 상세: `/submissions/[submissionId]`
- 관리자 메인: `/admin`
- 관리자 수업 상세: `/admin/courses/[courseId]`
- 관리자 감사로그: `/admin/courses/[courseId]/audit`

2. Feature Layer (`src/features`)
- 제출:
  - `student-submission-workspace.tsx`
  - `instructor-console-workspace.tsx`
  - `submission-detail-workspace.tsx`
  - `submission-attachment-preview.tsx`
- 관리자:
  - `admin-academy-workspace-manager.tsx`
  - `admin-schedule-manager.tsx`
  - `admin-attendance-scope-manager.tsx`
  - `admin-course-audit-log.tsx`
  - `admin-academy-workspace-utils.ts`
  - `admin-schedule-utils.ts`

3. Service Layer (`src/services`)
- `submission.ts`: 제출/리뷰 API + fallback
- `admin.ts`: 관리자 수업/멤버/일정/출석 scope API + fallback
- `attendance-scope-policy-storage.ts`: 관리자/학생 공유 출석 scope 저장소
- `attendance-schedule-storage.ts`: 커스텀 일정 저장소

4. Type Layer (`src/types`)
- `submission.ts`
- `admin.ts`
- `attendance.ts`

## 관리자 운영 정책
1. 수업 운영
- 수업 추가(좌측) / 수업 검색·선택·멤버 배치(우측) 분리 UI.
- `classScope`는 관리자 입력이 아니라 서버 자동 생성 정책.

2. 멤버 배치
- 관리자 사용자 신규 생성 UI 없음.
- `이름 + 생년월일(YYYY-MM-DD) + 아이디` 검증 성공 사용자만 배치.

3. 정원 정책
- 정원(capacity)은 `STUDENT`만 카운트.
- `INSTRUCTOR`, `ASSISTANT`는 정원 계산 제외.

4. 일정 운영
- 휴일 관리 대신 일정 CRUD.
- 반복 등록은 프론트가 반복 규칙을 전개해 다건 create 호출.

5. 출석 scope 정책
- `global` 일정은 항상 노출.
- class 일정은 `allowedScheduleScopes` 기준으로 노출.
- 서버 저장 시 `global + classScope` 강제 포함.

## 프론트가 요구하는 최소 API
1. 제출 도메인
- `GET /me/assignments/workspace`
- `POST /me/assignments/submissions`
- `GET /instructor/assignments/workspace`
- `POST /instructor/assignments`
- `PUT /instructor/assignments/{assignmentId}/template`
- `PATCH /instructor/assignments/submissions/{submissionId}`
- `POST /instructor/assignments/submissions/{submissionId}/feedback`
- `POST /instructor/videos/upload`
- `GET /submissions/{submissionId}`
- `GET /instructor/assignments/{assignmentId}/timeline`

2. 관리자 도메인
- `GET /admin/users/workspace`
- `GET /admin/users/search`
- `POST /admin/courses`
- `DELETE /admin/courses/{courseId}`
- `PUT /admin/courses/{courseId}/members/{userId}/role`
- `DELETE /admin/courses/{courseId}/members/{userId}`
- `GET /admin/schedules/workspace`
- `POST /admin/schedules`
- `PUT /admin/schedules/{scheduleId}`
- `DELETE /admin/schedules/{scheduleId}`
- `GET /admin/courses/{courseId}/attendance-scope-workspace`
- `PUT /admin/courses/{courseId}/attendance-scopes`
- `GET /courses/{courseId}/assignment-audit`

## 참고 문서
- 프론트 진행 로그: `progress/progress_08.md`
- 백엔드 인수인계 아키텍처: `progress/architecture.md`
- 백엔드 상세 계약: `../back/progress/FRONT_HANDOFF_2026-04-09.md`
- 백엔드 기준 문서: `../back/INFO.md`
