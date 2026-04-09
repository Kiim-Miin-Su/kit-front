# AI Edu LMS Frontend

프론트 운영/연동 문서입니다. 상세 계약과 인수인계는 `progress/` 문서를 기준으로 관리합니다.

## 현재 핵심 기능
1. 학생
- 강의 탐색/강의 상세/학습 허브
- 출석 및 일정 확인
- 과제 제출 및 제출 이력 확인

2. 강사
- 과제 등록
- 템플릿 작성/저장
- 제출 상세 리뷰(상태/피드백/코드)

3. 관리자
- 수업 등록/삭제
- 수업 검색/선택
- 사용자 검증 후 멤버 권한 배치(STUDENT/ASSISTANT/INSTRUCTOR)
- 일정 CRUD(반복 등록 포함)
- 수업별 출석 scope 정책 관리
- 수업별 감사 로그 조회

## 실행
1. 설치
```bash
npm install
```

2. 개발 서버
```bash
npm run dev
```

3. 테스트
```bash
npm test -- --runInBand
```

4. 빌드
```bash
npm run build
```

## 주요 라우트
- `/` 홈
- `/courses` 강의 탐색
- `/courses/[courseSlug]` 강의 상세
- `/learn` 학습 허브
- `/student` 학생 대시보드
- `/instructor` 강사 콘솔
- `/submissions/[submissionId]` 제출 상세
- `/admin` 관리자 운영
- `/admin/courses/[courseId]` 관리자 수업 상세
- `/admin/courses/[courseId]/audit` 관리자 수업 감사 로그

## 문서
- 프론트 구조/정책: `progress/INFO.md`
- 프론트 진행 로그: `progress/progress_08.md`
- 백엔드 인수인계 아키텍처: `progress/architecture.md`
- 백엔드 상세 계약: `../back/progress/FRONT_HANDOFF_2026-04-09.md`
- 백엔드 기준 문서: `../back/INFO.md`
