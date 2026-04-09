# Architecture Handoff (2026-04-09)

## 1. 목적
- 다음 백엔드 개발자가 프론트 요구사항과 현재 Nest 구조를 바로 연결해 구현할 수 있도록 기준을 고정한다.
- 구현 우선순위: **관리자 도메인(API 계약 안정화) -> 제출/피드백 영속화 -> 파일/영상 파이프라인**.

## 2. 현재 시스템 구조
1. Frontend (`../front`)
- Next.js App Router + TypeScript + Tailwind.
- 관리자 화면 핵심 플로우:
  - 수업 추가
  - 수업 검색/선택
  - 사용자 검증(이름+생년월일+아이디)
  - 멤버 권한 등록(STUDENT/ASSISTANT/INSTRUCTOR)
  - 일정 CRUD 및 출석 scope 정책 운영

2. Backend (`../back`)
- NestJS + Prisma(스키마 초안 존재).
- 현재 코드 구조(실행 가능 골격):
  - `src/admin/`:
    - `admin.module.ts`
    - `admin.service.ts`
    - `admin-users.controller.ts`
    - `admin-courses.controller.ts`
    - `admin-schedules.controller.ts`
    - `admin-attendance-scopes.controller.ts`
    - `dto/*`
    - `admin.types.ts`, `admin.validation.ts`
  - `src/courses/course-assignment-audit.controller.ts`
- `main.ts` 전역 `ValidationPipe` 적용 완료.

## 3. 현재 구현된 API(골격)
1. 관리자 사용자
- `GET /admin/users/workspace`
- `GET /admin/users/search?query=`

2. 관리자 수업/멤버
- `POST /admin/courses`
- `DELETE /admin/courses/:courseId`
- `PUT /admin/courses/:courseId/members/:userId/role`
- `DELETE /admin/courses/:courseId/members/:userId`

3. 관리자 일정
- `GET /admin/schedules/workspace`
- `POST /admin/schedules`
- `PUT /admin/schedules/:scheduleId`
- `DELETE /admin/schedules/:scheduleId`

4. 출석 scope 정책
- `GET /admin/courses/:courseId/attendance-scope-workspace`
- `PUT /admin/courses/:courseId/attendance-scopes`

5. 수업 감사로그
- `GET /courses/:courseId/assignment-audit`

## 4. 서버 검증 규칙(이미 코드 반영)
1. 수업
- `classScope` 자동 생성(클라이언트 입력 없음).
- 날짜 윈도우 검증:
  - `startDate <= endDate`
  - `enrollmentStartDate <= enrollmentEndDate <= endDate`

2. 멤버 권한
- 정원(capacity)은 `STUDENT`만 카운트.
- `ASSISTANT`, `INSTRUCTOR`는 정원 계산 제외.

3. 일정
- `dateKey`는 `YYYY-MM-DD` strict.
- `visibilityType=global`이면 `visibilityScope=global` 강제.
- `visibilityType=class`면 등록된 class scope만 허용.
- `requiresAttendanceCheck=true`면 `attendanceWindowEndAt` 필수.

4. 출석 scope 정책
- 저장 시 `global + classScope` 자동 포함.

## 5. 앞으로 추가 구현할 API (우선순위)
1. 제출/리뷰 영속화 (P0)
- `GET /me/assignments/workspace`
- `POST /me/assignments/submissions`
- `GET /instructor/assignments/workspace`
- `POST /instructor/assignments`
- `PUT /instructor/assignments/{assignmentId}/template`
- `PATCH /instructor/assignments/submissions/{submissionId}`
- `POST /instructor/assignments/submissions/{submissionId}/feedback`
- `GET /submissions/{submissionId}`
- `GET /instructor/assignments/{assignmentId}/timeline`

2. 파일 업로드 (P0)
- `POST /files/presign` (업로드용 presigned URL 발급)
- `POST /files/complete` (업로드 완료 커밋)
- `GET /files/:fileId` (메타/다운로드 URL)
- 권장 필드:
  - `fileId`, `ownerId`, `bucketKey`, `contentType`, `size`, `checksum`, `status`, `createdAt`
- 검증:
  - MIME allowlist
  - 최대 용량
  - checksum 검증

3. 강의 영상 업로드/처리 (P1)
- `POST /instructor/videos/upload-init`
- `POST /instructor/videos/upload-part`
- `POST /instructor/videos/upload-complete`
- `GET /instructor/videos/:videoId/status`
- `PATCH /instructor/videos/:videoId/publish`
- 백그라운드 작업:
  - 트랜스코딩(HLS: 1080/720/480)
  - 썸네일 추출
  - 자막/메타 생성

4. 강의 영상 플레이어 API (P1)
- `GET /lessons/:lessonId/playback-token`
- `GET /lessons/:lessonId/stream-manifest`
- `POST /lessons/:lessonId/watch-events`
- `PATCH /enrollments/:enrollmentId/last-position`
- 플레이어 기능 요구:
  - 이어보기(lastPosition)
  - 배속/해상도
  - 자막 on/off
  - heartbeat(예: 15~30초) 기반 진도 반영

## 6. DB/스토리지 권장 확장
1. 핵심 테이블
- `users`
- `courses`
- `course_member_bindings`
- `schedules`
- `attendance_scope_policies`
- `assignment_submissions`
- `submission_feedback`
- `course_assignment_audit_events`
- `files`
- `video_assets`
- `video_transcode_jobs`

2. 제약
- `course_member_bindings`: `(course_id, user_id)` unique
- `attendance_scope_policies`: `course_id` unique
- `video_assets`: `lesson_id` unique(현재 단일 영상 정책이라면)

## 7. 백엔드 구현 체크리스트
1. Prisma 모델과 Nest DTO 1:1 매핑
2. DTO + Service 이중 검증(형식 + 도메인 규칙)
3. 에러코드 표준화(`USER_NOT_FOUND`, `COURSE_CAPACITY_EXCEEDED` 등)
4. role-scope 기반 인가 가드 적용
5. 감사 로그는 쓰기 시점 append-only로 유지

## 8. 참고 문서
- 프론트 구조/정책: `progress/INFO.md`
- 프론트 진행 로그: `progress/progress_08.md`
- 백엔드 상위 기준: `../back/INFO.md`
- 백엔드 핸드오프 상세: `../back/progress/FRONT_HANDOFF_2026-04-09.md`
