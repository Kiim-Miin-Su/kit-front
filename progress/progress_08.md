# Progress 08 (2026-04-09)

## 목적
- `progress_08`의 신규 기능 5개를 모두 구현하고, 테스트/빌드/문서 동기화까지 완료한다.

## 신규 기능 구현 결과
1. 반복 일정/템플릿 일정 등록 (완료)
- `AdminScheduleManager`에 반복 등록 추가:
  - 반복 없음 / 매일 / 매주
  - 반복 횟수(최대 24회)
- 일정 템플릿 저장/불러오기 추가:
  - 일정 폼 값을 템플릿으로 저장
  - 저장 템플릿 재적용으로 빠른 일정 등록
- 파일:
  - `src/features/admin/admin-schedule-manager.tsx`
  - `src/features/admin/admin-schedule-utils.ts`

2. 사용자 등록/자동완성/대량등록 (요청에 따라 제거)
- 후속 요청으로 관리자 사용자 등록 UI, 자동완성, 최근 사용자, 대량등록 UI/유틸을 제거.
- 멤버 배치는 `이름 + 생년월일 + 아이디` 입력 후 DB 사용자 검증 성공 시에만 허용하도록 변경.
- 생년월일 입력은 달력 입력이 아닌 텍스트(`YYYY-MM-DD`)로 전환하고 형식 검증을 적용.
- 검증 입력 그리드는 카드 내부 반응형 12컬럼으로 재배치해 overflow를 제거.

3. 수업별 감사 로그 화면 (완료)
- 신규 라우트:
  - `/admin/courses/[courseId]/audit`
- 기능:
  - 과정별 과제/제출/리뷰 이벤트 조회
  - 과제 단위 그룹 + 이벤트 타임라인 표시
- 파일:
  - `src/app/(platform)/admin/courses/[courseId]/audit/page.tsx`
  - `src/features/admin/admin-course-audit-log.tsx`
  - `src/features/admin/admin-ui-config.ts`

4. 관리자 사용자 검색 서버 연동 (완료)
- 사용자 검증 입력에 서버 검색 연동:
  - `searchAdminUsers(query)` 호출
  - 아이디 exact match 후 이름/생년월일 일치 검증
- 파일:
  - `src/features/admin/admin-academy-workspace-manager.tsx`
  - `src/services/admin.ts`

5. 출석 scope 관리 UI (완료)
- 수업 상세 페이지에 출석 scope 관리 섹션 추가:
  - 허용 scope 선택/저장
  - `global` + 본인 classScope는 필수 고정
- 저장 정책 공용 스토리지 분리:
  - 관리자에서 저장한 정책을 학생 출석 워크스페이스에서도 동일 사용
- 파일:
  - `src/features/admin/admin-attendance-scope-manager.tsx`
  - `src/services/attendance-scope-policy-storage.ts`
  - `src/services/admin.ts`
  - `src/services/attendance.ts`
  - `src/app/(platform)/admin/courses/[courseId]/page.tsx`

## 남은 신규 기능 체크
- `progress_08` 기준 신규 기능 5개 항목: **전부 완료**

## 안정화 완료 (신규 기능 외)
1. build 경고 2건 해소 완료
- `src/features/submission/instructor-console-workspace.tsx`
  - `useEffect` 의존성 정리(`selectedAssignmentTemplate` 참조 일치)
- `src/features/submission/submission-attachment-preview.tsx`
  - `<img>`를 `next/image`로 전환 (`unoptimized` 유지)

2. 관리자 UI 흐름 재배치 (요구 반영)
- 수업 추가와 수업 검색을 분리:
  - 왼쪽: 수업 추가 카드만 유지
  - 오른쪽: 수업 검색/선택 + 멤버 권한 등록 통합
- 운영 플로우를 `수업 검색 → 수업 선택 → 멤버 등록(권한 부여)`로 고정
- 역할 권한 가이드 문구 추가:
  - 학원생(STUDENT): 조회 전용
  - 조교(ASSISTANT): 수업 멤버 운영 + 당일 일정 변경
  - 강사(INSTRUCTOR): 수업 등록/수정 + 일정 운영
- 파일:
  - `src/features/admin/admin-academy-workspace-manager.tsx`

3. 백엔드 인수인계 문서화 완료
- 프론트 요구사항 기준 API/DTO/검증/에러코드/DB 제약을 백엔드 문서로 고정:
  - `../back/progress/FRONT_HANDOFF_2026-04-09.md`
  - `../back/progress/INFO.md`
  - `../back/INFO.md`

4. 관리자 입력 검증 하드닝
- 말도 안 되는 날짜/시간 값이 통과하지 않도록 검증 강화:
  - 수업 기간 검증: `YYYY-MM-DD` 엄격 파싱 + 존재하지 않는 날짜 차단
  - 일정 등록 검증: 날짜/출석시간 형식, 시간 역전, global scope 정합성 검증
- `CreateAdminCourseInput`에서 `classScope` 입력 필드 제거(자동 생성 정책 강제)
- 관리자 사용자 생성 레거시 코드 제거(회원가입+검증 기반 플로우 일원화)
- 파일:
  - `src/features/admin/admin-academy-workspace-utils.ts`
  - `src/features/admin/admin-schedule-utils.ts`
  - `src/features/admin/admin-schedule-manager.tsx`
  - `src/services/admin.ts`
  - `src/types/admin.ts`

## 검증
1. 타입 검사
- `npx tsc --noEmit` 통과

2. 테스트
- `npm test` 통과 (20 passed)
- 신규 테스트 추가:
  - `tests/admin-schedule-utils.test.ts`
  - `tests/admin-academy-workspace-utils.test.ts` (엄격 날짜 검증 케이스 추가)

3. 전체 build
- `npm run build` 통과
- 경고 없이 통과

## 라우트/화면 요약
- 관리자 메인: `/admin`
  - 수업/멤버 운영
  - 일정 운영(반복 등록 + 템플릿)
- 관리자 수업 상세: `/admin/courses/[courseId]`
  - 수업 멤버/정원 운영
  - 출석 scope 정책 관리
- 관리자 감사 로그: `/admin/courses/[courseId]/audit`
  - 수업별 과제/제출/리뷰 감사 이력
