# Progress 02

## 작업 범위
`INFO.md`의 추천 개발 순서 중 2단계를 진행했다.

대상 범위:
- 강의 목록 페이지
- 강의 상세 페이지
- 수강 권한 상태 표시

## 진행 내용
### 1. 강의 도메인 타입 확장
- 목록 전용 데이터에서 한 단계 확장해 상세 화면용 학습 포인트와 커리큘럼 미리보기 타입을 추가했다.
- 카탈로그와 상세가 같은 도메인 모델을 공유하도록 정리했다.

관련 파일:
- `src/types/course.ts`

### 2. 수강 상태 메타 공통화
- 수강 상태별 라벨, 색상, 설명 문구, CTA 가능 여부를 한 곳에서 관리하도록 분리했다.
- 목록 카드와 상세 페이지가 동일한 정책으로 렌더링되도록 맞췄다.
- `ACTIVE`가 아닐 때는 플레이어 이동 버튼이 비활성화되도록 상세 페이지 정책을 반영했다.

관련 파일:
- `src/features/course/enrollment-status.ts`
- `src/features/course/enrollment-status-badge.tsx`
- `src/features/course/course-card.tsx`

### 3. 강의 상세 화면 고도화
- 상세 페이지 UI를 `features` 컴포넌트로 분리했다.
- 개요, 학습 포인트, 커리큘럼 미리보기, 수강 상태 패널을 한 화면에서 보이도록 구성했다.
- 수강 상태에 따라 플레이어 CTA가 활성/비활성되도록 연결했다.

관련 파일:
- `src/features/course/course-detail-view.tsx`
- `src/app/(platform)/courses/[courseSlug]/page.tsx`

### 4. 목데이터와 서비스 계층 정리
- 모든 강의 목데이터에 상세 정보 필드를 추가했다.
- 상세 조회 서비스가 확장된 상세 타입을 반환하도록 맞췄다.

관련 파일:
- `src/features/course/mock-course-data.ts`
- `src/services/course.ts`

## 검증 결과
실행한 검증:
- `npm run build`
- `npx tsc --noEmit`

결과:
- Next.js 프로덕션 빌드 통과
- 타입체크 통과

비고:
- `npx tsc --noEmit`는 현재 `tsconfig.json`에 `.next/types/**/*.ts`가 포함되어 있어, 빌드 전에 실행하면 실패할 수 있다.
- 이번 검증은 먼저 `npm run build`를 실행해 `.next/types`를 생성한 뒤 진행했다.

## 현재 상태
2단계 목표는 목데이터 기준으로 동작하는 수준까지 완료됐다.

정리된 상태:
- 강의 목록 페이지 존재
- 강의 상세 라우트 존재
- 수강 상태 배지 및 설명 문구 존재
- 상세 페이지 CTA가 수강 상태 정책과 연결됨
- 커리큘럼 미리보기와 학습 포인트가 상세 화면에 반영됨

아직 남은 것:
- 실제 백엔드 응답 스키마에 맞춘 상세 API 연동
- 플레이어 진입 시 403 응답 처리
- 수강 플레이어 내부 커리큘럼/진도 UI 구현

## 다음 작업 제안
다음은 `INFO.md` 기준 3단계로 넘어가면 된다.

우선순위:
1. `/learn` 플레이어 레이아웃을 실제 패널 구조로 교체
2. 플레이어 조회 API와 403 처리 흐름 연결
3. 커리큘럼 패널과 현재 레슨 선택 상태 추가
4. 진도 저장 UI와 서버 연동 기반 마련
