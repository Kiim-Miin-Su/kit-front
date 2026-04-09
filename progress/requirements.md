# Front Progress Info

## 목적
- 프론트 현재 상태를 빠르게 공유하는 인덱스 문서.
- 상세 로그는 `progress/progress_08.md`, 구조는 `INFO.md`를 본다.

## 현재 우선 영역
1. 학생 출석/캘린더
2. 제출/강사 콘솔
3. 관리자 수업 운영(멤버/일정/감사로그/scope)

## 제출 도메인 한줄 요약
- 학생(`/student`): 과제 선택, IDE/NOTE 제출, 임시저장, 제출 이력 요약.
- 강사(`/instructor`): 제출 현황, 과제 업로드, 템플릿 작성/저장, 영상 업로드.
- 상세(`/submissions/[submissionId]`): 전체 리비전/피드백/타임라인 + 단일 `리뷰하기` 액션.
- 관리자(`/admin`): 수업/멤버 권한 운영 + 학원 일정 운영.
- 관리자 상세(`/admin/courses/[courseId]`): 수업별 멤버/정원 + 출석 scope 정책 운영.
- 관리자 감사로그(`/admin/courses/[courseId]/audit`): 과정별 과제/제출/리뷰 이력 조회.

## 구현 기준
- 서비스: `src/services/submission.ts`
- 정책: API 우선, 실패 시 localStorage fallback
  - `ai-edu-submission-db-v1`
  - `ai-edu-submission-drafts-v1`
- 상태 표시: `SUBMITTED` -> `재검토`

## 문서 맵
- 진행 로그: `progress/progress_08.md`
- 프론트 구조: `INFO.md`
- 제출 도메인 메모: `progress/submission_architecture_2026-04-09.md`

---
## Additional (260409)
### 철저한 변수화
- 모든 에러 메시지 등 string은 변수화하여 따로 .ts로 관리한다
- 모든 데이터 구조 [back <-> front | input | output(DTO)]는 따로 record, map, class 형태등 전부 .ts로 따로 관리한다

### 책임 분리
- 프론트와 백엔드는 따로 개발이 가능할 정도로 DTO 분리 후 책임이 분리되어 있어야 한다
- 각 도메인 별로 따로 개발이 가능할 정도로 컴포넌트, 데이터 타입, 변수화 등이 철저히 되어있어야 한다.

### 운영 및 Error 대응
- 철저한 Log 기록이 필요하다
- front에서도 보안이 중요하다 (front <-> back DTO, injection 대응, 배포시 파일 구조 유출 등)
