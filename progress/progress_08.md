# Progress 08 (2026-04-09)

## 목적
- 관리자 신규 기능(수업/멤버/일정/출석 scope/감사로그) 완료
- 검증(테스트/빌드) 및 문서 동기화 완료

## 신규 기능 구현 결과
1. 관리자 수업/멤버 운영 UI 개편
- 수업 추가(좌측) / 수업 검색·선택·멤버 배치(우측)로 분리
- 수업 상세 라우트 및 수업 삭제 기능 추가
- 사용자 검증 기반 멤버 배치(`이름 + 생년월일 + 아이디`) 적용

2. 수업 생성/검증 강화
- `classScope` 입력 제거(자동 생성 정책)
- 수업 기간/모집기간/정원/진행방식 입력 구조 정리
- 학생 정원(capacity) 초과 방지 검증(강사/조교 제외)

3. 일정 운영 고도화
- 휴일 관리 제거, 일정 CRUD 중심으로 통합
- 반복 등록(매일/매주/횟수) 지원
- 일정 템플릿 저장/재사용(프론트 저장소)

4. 출석 scope 정책 관리
- 수업별 `allowedScheduleScopes` 편집/저장
- 학생 화면과 관리자 화면이 동일 정책 저장소 공유
- `global + classScope` 고정 정책 반영

5. 수업 감사 로그
- `/admin/courses/[courseId]/audit` 화면 신설
- 수업 단위 과제/제출/리뷰 이벤트 조회

## 안정화/검증
1. 관리자 입력 검증 하드닝
- 엄격 날짜 검증(`YYYY-MM-DD`, 존재하지 않는 날짜 차단)
- 일정 입력 검증(가시성 scope, 출석 시간창)

2. 테스트
- `npm test -- --runInBand` 통과 (20 passed)

3. 빌드
- `npm run build` 통과

## 백엔드 구조 착수 (이번 턴 추가)
1. 백엔드 의존성 정리
- `npm -C ../back install`
- DTO 검증 패키지 추가:
  - `class-validator`
  - `class-transformer`

2. Nest 관리자 API 골격 구현
- `../back/src/admin` 신설
  - `admin.module.ts`
  - `admin.service.ts`
  - `admin-users.controller.ts`
  - `admin-courses.controller.ts`
  - `admin-schedules.controller.ts`
  - `admin-attendance-scopes.controller.ts`
  - `dto/*`
  - `admin.types.ts`, `admin.validation.ts`
- 서버 규칙 골격 반영:
  - classScope 자동 생성
  - 수업 날짜 윈도우 검증
  - 학생 정원(capacity) 검증
  - 일정 scope/출석시간 검증
  - attendance scope(`global + classScope`) 강제

3. 감사로그 API 골격 연결
- `GET /courses/:courseId/assignment-audit`
- 파일:
  - `../back/src/courses/course-assignment-audit.controller.ts`
  - `../back/src/courses/courses.module.ts`

4. 백엔드 컴파일 검증
- `npm -C ../back run build` 통과

## 문서화
1. 신규 문서
- `progress/architecture.md`
  - 다음 백엔드 개발자용 아키텍처/우선 API/파일 업로드/영상 업로드/플레이어 가이드

2. 동기화 문서
- `README.md`
- `progress/INFO.md`
- `../back/README.md`
- `../back/INFO.md`
- `../back/progress/INFO.md`
