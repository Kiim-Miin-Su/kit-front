# Submission Architecture (2026-04-09)

## 1. 목표
- 강사/학생 제출 UX를 유지하면서 코드 길이에 따른 렌더 부담을 줄인다.
- 리스트 화면과 상세 리뷰 화면의 책임을 분리한다.

## 2. 화면 책임 분리

### 리스트 화면
- 학생: `/student` 내 `StudentSubmissionWorkspace`
- 강사: `/instructor` 내 `InstructorConsoleWorkspace`
- 역할:
  - 제출 메타(과제/학생/상태/첨부수/피드백수) 표시
  - 필터/정렬/선택/요약 확인
  - 상세 리뷰 페이지로 이동

### 상세 리뷰 화면
- 경로: `/submissions/[submissionId]`
- 컴포넌트: `SubmissionDetailWorkspace`
- 역할:
  - 제출 리비전 전체
  - 피드백 전체
  - 타임라인 전체
  - 코드 다운로드

## 3. 강사 콘솔 모드

### NEW_ASSIGNMENT
- 과정/제목/마감/설명/허용옵션 입력
- `POST /instructor/assignments`
- 템플릿 자동 저장 없음
- `초안으로 템플릿 작성` 버튼으로 템플릿 모드 전환 가능

### TEMPLATE_AUTHORING
- 템플릿 작성/저장은 명시적 `템플릿 저장하기` 버튼으로만 반영
- 기존 과제 대상 선택은 우측 최근 과제 카드에서 수행
- IDE/NOTE + 언어 + 제목 + 본문 편집
- `PUT /instructor/assignments/{assignmentId}/template`

## 3-1. 상세 리뷰 액션
- 상세 화면에서 강사는 아래를 한 번에 제출한다.
  - 상태: `완료(REVIEWED) | 보완 필요(NEEDS_REVISION) | 재검토(SUBMITTED)`
  - 리뷰 제목/메시지/코드/첨부
- 저장 엔드포인트: `POST /instructor/assignments/submissions/{submissionId}/feedback`
- `reviewStatus`를 payload로 함께 전달해 상태/피드백을 단일 액션으로 처리.

## 3-2. 리비전 비교 UX
- 위치: 상세 화면 `리뷰 라운드 히스토리` 패널.
- 동작:
  - 기준 라운드/비교 라운드 선택
  - 메시지 비교(동일/변경)
  - 첨부 비교(추가/삭제)
  - 코드 줄 단위 diff(유지/추가/삭제)
- 데이터 소스:
  - `GET /submissions/{submissionId}`의 `revisionHistory[]`만 사용
  - 타임라인 클릭 시 선택 라운드와 비교 라운드를 동기화

## 4. 상태 모델
- enum 값은 기존 유지:
  - `SUBMITTED`
  - `REVIEWED`
  - `NEEDS_REVISION`
- UI 라벨:
  - `SUBMITTED` -> `재검토`

## 5. 데이터 계층
- 서비스: `src/services/submission.ts`
- 동작:
  - API 우선 호출
  - 실패 시 localStorage fallback
- 저장 키:
  - `ai-edu-submission-db-v1`
  - `ai-edu-submission-drafts-v1`

## 6. 다음 백엔드 체크포인트
1. `/submissions/{id}` 응답에 `submission/revisionHistory/timeline` 완전 제공.
1-1. `revisionHistory[]` 각 항목에 `message/code/attachments[]` 누락 없이 제공(프론트 리비전 비교 계산에 사용).
2. 템플릿 upsert를 `assignmentId + editorType + codeLanguage` 기준으로 보장.
3. 리뷰 상태 변경/피드백 저장 시 타임라인 동시 기록(트랜잭션).
4. 관리자 강사-과정 매핑 API 제공:
   - `GET /admin/instructor-courses/workspace`
   - `PUT /admin/instructors/{instructorId}/courses`

## 7. 관리자 운영 확장 (260409)
- 관리자 페이지는 단순 강사-과정 체크에서 수업/멤버 권한 운영 중심으로 확장됨.
- 수업 운영:
  - 학원 전체 수업 조회/추가
  - 수업별 멤버(강사/조교/학생) 권한 등록/변경/해제
- 일정 운영:
  - 휴일 관리 대신 학원 전체 일정 등록/조회
  - 학생 캘린더와 동일한 이벤트 스키마 사용
  - 필수 출석 일정은 인증 윈도우(start/end)까지 함께 등록
  - 반복 일정 등록(매일/매주) + 일정 템플릿 저장/재사용 지원
- 추가 운영 화면:
  - 수업별 감사 로그(`/admin/courses/[courseId]/audit`)
  - 수업별 출석 scope 정책 편집(`/admin/courses/[courseId]`)
