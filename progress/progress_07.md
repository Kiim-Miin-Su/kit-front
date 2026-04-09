# Progress 07 (2026-04-09)

## 목적
- 관리자 페이지를 `강사-과정 체크박스 + 휴일 관리`에서 `수업/멤버 운영 + 일정 운영` 구조로 개편한다.
- 강사가 관리자 화면에서 누락되는 문제를 fallback 데이터 계층에서 보정한다.

## 핵심 반영
1. 관리자 수업/멤버 워크스페이스 신설
- 새 컴포넌트: `AdminAcademyWorkspaceManager`
- 기능:
  - 학원 전체 수업 목록 조회/검색
  - 수업 추가
  - 사용자(강사/조교/학원생) 등록
  - 수업별 멤버 권한 등록/변경/해제
- 강사 누락 보정:
  - 강의 카탈로그 instructor + 제출 피드백 리뷰어 이력을 함께 병합해 사용자 풀을 생성
  - `민수 김` 같은 리뷰어 기반 강사도 관리자 화면에서 노출

2. 관리자 일정 운영 화면 신설 (휴일 관리 대체)
- 새 컴포넌트: `AdminScheduleManager`
- 기능:
  - 학원 전체 일정 목록/검색
  - 일정 등록(학원 전체/수업 scope)
  - 필수 출석 일정 등록(인증 윈도우 포함)
  - 커스텀 일정 삭제
- 기존 휴일 관리 컴포넌트는 관리자 메인에서 제거.

3. 서비스/타입 계층 확장 (백엔드 친화)
- `src/types/admin.ts` 확장:
  - course workspace / member binding / schedule workspace DTO 추가
- `src/services/admin.ts` 확장:
  - `fetchAdminCourseWorkspace`
  - `createAdminCourse`
  - `createAdminCourseMemberUser`
  - `upsertAdminCourseMemberBinding`
  - `deleteAdminCourseMemberBinding`
  - `fetchAdminScheduleWorkspace`
  - `createAdminSchedule`
  - `deleteAdminSchedule`
- fallback은 localStorage 기반으로 유지하여 API 연결 전에도 동작.

4. 페이지 라우트 구성 변경
- `src/app/(platform)/admin/page.tsx`
  - 기존: 강사 매핑 + 휴일
  - 변경: 수업/멤버 운영 + 일정 운영

5. 출석 페이지와 mock 데이터 정합
- `src/services/attendance.ts`
  - 학생 출석 워크스페이스 조회 시 관리자 커스텀 일정을 병합
- `src/services/attendance-schedule-storage.ts` 신설
  - 관리자 등록 일정의 저장/조회/삭제 유틸 제공

## 검증
1. 변경 파일 lint
- `npx eslint ...` (관리자/서비스/타입 변경 파일 대상)
- 결과: 통과

2. 전체 build
- `npm run build`: 실패(기존 타 도메인 lint 규칙 이슈)
- 실패 원인(이번 변경 외):
  - `src/features/attendance/attendance-check-card.tsx`
  - `src/features/home/marketing-home.tsx`
  - `src/features/submission/submission-attachment-preview.tsx`

## 백엔드 연동 포인트
- 관리자 수업/멤버:
  - `GET /admin/users/workspace`
  - `POST /admin/courses`
  - `POST /admin/users`
  - `PUT /admin/courses/{courseId}/members/{userId}/role`
  - `DELETE /admin/courses/{courseId}/members/{userId}`
- 관리자 일정:
  - `GET /admin/schedules/workspace`
  - `POST /admin/schedules`
  - `DELETE /admin/schedules/{scheduleId}`

