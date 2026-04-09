# Progress 06 (2026-04-09)

## 목적
- 관리자 페이지의 실제 운영 이슈 4건을 해결한다.
1. 테스트코드 구현/검증
2. 일정 미노출 원인 수정
3. 수업 등록 후 배정 목록 미노출 문제 수정
4. 수업 등록 필드(기간 등) 확장 + 문서화

## 이슈 원인과 조치
1. 일정이 안 보이는 문제
- 원인:
  - 학생 일정 가시성 판단이 `allowedScheduleScopes.includes(visibilityScope)` 단일 조건이라,
  - API가 `global` scope를 누락하면 학원 전체 일정이 숨겨질 수 있었음.
- 조치:
  - `src/features/attendance/attendance-schedule-visibility.ts` 신설.
  - `global` 일정은 항상 가시 처리.
  - `allowedScheduleScopes`는 `global + classScope`를 항상 포함하도록 정규화.
  - 적용 파일:
    - `src/features/attendance/mock-attendance-data.ts`
    - `src/services/attendance.ts`

2. 수업 등록 후 배정 시 사용자 안 뜨는 문제
- 원인:
  - 배정 드롭다운이 “미배정 사용자만” 보여주도록 제한되어, 기존 배정자 재할당/권한변경 탐색이 어려웠음.
- 조치:
  - 배정 목록을 “전체 사용자”로 확장.
  - 이미 등록된 사용자도 동일 드롭다운에서 즉시 역할 변경 가능.
  - 이름/아이디 검색 필터 + 자동완성 입력 + 최근 사용자 퀵칩 추가.
  - 적용 파일:
    - `src/features/admin/admin-academy-workspace-utils.ts`
    - `src/features/admin/admin-academy-workspace-manager.tsx`

3. 수업 등록 필드 확장 (기간/모집기간/진행방식/정원/분반/강의실)
- 조치:
  - 타입 확장:
    - `src/types/admin.ts`
      - `startDate`, `endDate`
      - `enrollmentStartDate`, `enrollmentEndDate`
      - `pacingType(INSTRUCTOR_PACED|SELF_PACED)`
      - `sectionLabel`, `roomLabel`, `capacity`
  - 서비스 확장:
    - `src/services/admin.ts`
      - create/normalize/fallback/seed 전 경로에서 새 필드 보장
  - UI 확장:
    - `src/features/admin/admin-academy-workspace-manager.tsx`
      - 수업 등록 폼에 신규 필드 반영
      - 날짜 윈도우 검증 추가
  - 정책:
    - `scope`는 수동 입력 제거, 수업명 기반 자동 생성으로 통일

4. 사용자 등록 정책 변경
- 기존: 이름 + 직책
- 변경: 이름 + 아이디(+기본 역할)
- 적용:
  - `CreateAdminCourseMemberUserInput`을 `userId + userName + defaultRole`로 변경
  - 등록 시 아이디 유효성 검사(영문 소문자/숫자/._-) 적용
- 후속 변경:
  - 관리자 사용자 등록 UI는 제거하고, 멤버 배정 시 `이름+생년월일+아이디` 검증 방식으로 전환

## 테스트코드
1. 추가 파일
- `tests/admin-academy-workspace-utils.test.ts`
  - 수업 기간 검증 로직
  - 배정 사용자 목록 생성 로직
- `tests/attendance-schedule-visibility.test.ts`
  - global/class 일정 가시성 규칙
- `package.json`
  - `npm test` 스크립트 추가
- `tsconfig.json`
  - Node TS 테스트 import 지원을 위한 `allowImportingTsExtensions: true` 추가

2. 실행 결과
- `npx tsc --noEmit` 통과
- `npm test` 통과 (7 tests, 7 pass)
- `npm run build` 실패(기존 타 도메인 lint 이슈, 이번 변경 외)
  - `src/features/attendance/attendance-check-card.tsx`
  - `src/features/home/marketing-home.tsx`
  - `src/features/submission/submission-attachment-preview.tsx`

## 참고 레퍼런스 (필드 설계 근거)
- Open edX (진행 방식): 기본 instructor-paced, self-paced 지원  
  https://docs.openedx.org/en/latest/site_ops/install_configure_run_guide/configuration/enable_pacing.html
- Moodle Self enrolment (모집기간/정원): enrolment duration, enrolment period, max enrolled users  
  https://docs.moodle.org/28/en/Self_enrolment
- Moodle Course settings (수업 시작일): course start date 운용  
  https://docs.moodle.org/22/en/Course_settings
- Blackboard Learn (수업 기간): course duration을 날짜 구간/등록기준으로 운용  
  https://help.blackboard.com/Learn/Instructor/Ultra/Getting_Started/Find_Your_Courses

위 레퍼런스들을 바탕으로, 본 프로젝트 관리자 수업 등록에 `수업 기간 + 모집 기간 + 진행 방식 + 정원 + 분반/장소` 필드를 채택했다.

## 추가 반영 파일
- `src/features/admin/admin-ui-config.ts`
- `src/features/admin/admin-schedule-manager.tsx`
  - 수업 워크스페이스 변경 이벤트 수신 후 일정 scope 자동 갱신

## 추가 완료 (2026-04-09, 마감 반영)
1. 반복/템플릿 일정 등록
- 일정 등록 폼에 반복 패턴(없음/매일/매주) + 반복 횟수 추가
- 일정 템플릿 저장/불러오기 추가
- 파일:
  - `src/features/admin/admin-schedule-manager.tsx`
  - `src/features/admin/admin-schedule-utils.ts`

2. 사용자 대량 등록/초대
- 초기 구현 후 사용자 요청으로 UI를 제거하고 단건 등록 중심으로 복귀.
- 대신 멤버 검색/목록에서 생년월일+아이디를 함께 노출하도록 개선.

3. 관리자 수업 감사 로그 화면
- 신규 라우트: `/admin/courses/[courseId]/audit`
- 수업 단위 과제/제출/리뷰 이벤트 표시
- 파일:
  - `src/app/(platform)/admin/courses/[courseId]/audit/page.tsx`
  - `src/features/admin/admin-course-audit-log.tsx`

4. 관리자 사용자 검색 서버 연동
- 배정 검색 입력에서 `GET /admin/users/search` 연동(실패 시 fallback)
- debounce + 검색중 상태 노출
- 파일:
  - `src/features/admin/admin-academy-workspace-manager.tsx`
  - `src/services/admin.ts`

5. 출석 scope 관리 UI
- 수업 상세 페이지에서 allowed scope 편집/저장
- 저장 정책을 공용 스토리지로 분리해 학생 출석 화면과 동기화
- 파일:
  - `src/features/admin/admin-attendance-scope-manager.tsx`
  - `src/services/attendance-scope-policy-storage.ts`
  - `src/services/admin.ts`
  - `src/services/attendance.ts`
  - `src/app/(platform)/admin/courses/[courseId]/page.tsx`

## 최종 검증 (마감 기준)
- `npx tsc --noEmit` 통과
- `npm test` 통과 (14 passed)
- `npm run build` 통과
