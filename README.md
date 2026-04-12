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

- 기본 API 주소는 `http://localhost:4000`
- 다른 백엔드를 쓰면 `NEXT_PUBLIC_API_BASE_URL`로 덮어쓴다.

3. 테스트
```bash
npm test
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

## 현재 확인된 공백
- 강의/출석/관리자 서비스는 API 실패 시 fallback mock/localStorage로 계속 동작한다.
- 파일 업로드 UI와 학습 플레이어는 아직 실사용 단계가 아니다.

## 로컬 로그인
- `student-demo-01@koreait.academy / password123`
- `instructor-dev-01@koreait.academy / password123`
- `admin-root@koreait.academy / password123`

## 문서
- 프론트 구조/정책: `progress/INFO.md`
- 프론트 최신 계획: `progress/progress_09.md`
- 백엔드 인수인계 아키텍처: `progress/architecture.md`
- 백엔드 상세 계약: `../back/progress/FRONT_HANDOFF_2026-04-09.md`
- 백엔드 기준 문서: `../back/INFO.md`
- Azure 배포 문서: `AZURE_DEPLOY.md`
