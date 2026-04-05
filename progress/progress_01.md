# Progress 01

## 작업 범위
`INFO.md`의 추천 개발 순서 중 1단계를 진행했다.

대상 범위:
- 공통 레이아웃
- 라우팅 구조
- API 클라이언트
- 인증 상태 저장

## 진행 내용
### 1. 공통 레이아웃 정리
- 루트 레이아웃에 전역 프로바이더를 연결했다.
- 전역 스타일을 정리하고 앱 공통 배경 톤을 맞췄다.
- 상단 공통 네비게이션을 추가했다.
- 플랫폼 영역에서는 좌측 사이드바를 포함한 앱 셸을 사용하도록 구성했다.

관련 파일:
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/components/providers/app-providers.tsx`
- `src/components/navigation/top-navigation.tsx`
- `src/components/navigation/section-sidebar.tsx`

### 2. 라우팅 구조 정리
- App Router를 라우트 그룹 기준으로 재구성했다.
- `(marketing)`, `(auth)`, `(platform)` 구조를 나눠 역할별 레이아웃을 분리했다.
- 기존 최상위 플레이스홀더 페이지들은 플랫폼 그룹 아래로 이동했다.
- 로그인 시작용 `/sign-in` 페이지를 추가했다.

현재 라우트:
- `/`
- `/courses`
- `/learn`
- `/student`
- `/instructor`
- `/admin`
- `/sign-in`

관련 파일:
- `src/app/(marketing)/layout.tsx`
- `src/app/(marketing)/page.tsx`
- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/sign-in/page.tsx`
- `src/app/(platform)/layout.tsx`
- `src/app/(platform)/courses/page.tsx`
- `src/app/(platform)/learn/page.tsx`
- `src/app/(platform)/student/page.tsx`
- `src/app/(platform)/instructor/page.tsx`
- `src/app/(platform)/admin/page.tsx`

### 3. API 클라이언트 정리
- `axios` 인스턴스에 공통 설정을 추가했다.
- 요청 시 로컬 스토리지에 저장된 access token을 Authorization 헤더에 주입하도록 구성했다.
- 401 응답 시 저장된 인증 정보를 비우는 공통 처리 기반을 넣었다.
- 인증 관련 API 함수 모듈을 분리했다.

관련 파일:
- `src/services/api.ts`
- `src/services/auth.ts`
- `src/lib/auth-storage.ts`

### 4. 인증 상태 저장 추가
- `zustand` + `persist` 기반 인증 스토어를 추가했다.
- 사용자 정보와 access token을 브라우저 로컬 스토리지에 유지하도록 구성했다.
- 인증 여부와 역할 조회를 위한 최소 셀렉터를 스토어에 포함했다.

관련 파일:
- `src/store/auth-store.ts`
- `src/types/auth.ts`

### 5. 공통 UI 베이스 컴포넌트 추가
- 페이지 상단 설명용 `PageIntro`
- 상태 요약 카드용 `StatusPanel`

관련 파일:
- `src/components/layout/page-intro.tsx`
- `src/components/layout/status-panel.tsx`

## 검증 결과
실행한 검증:
- `npm install`
- `npx tsc --noEmit`
- `npm run build`

결과:
- 타입체크 통과
- Next.js 프로덕션 빌드 통과

비고:
- 빌드 중 workspace root 경고가 있었다.
- 원인은 상위 경로의 `package-lock.json`도 함께 감지되기 때문이며 현재 빌드 실패 원인은 아니다.

## 작업 중 수정한 이슈
- `tsconfig.json`에서 `@/*` 경로 별칭이 빠져 있어 모듈 해석 오류가 발생했다.
- 경로 별칭을 복구한 뒤 타입체크와 빌드가 정상 통과했다.
- Next.js가 빌드 과정에서 `tsconfig.json`에 `next` plugin과 `.next/types/**/*.ts` include를 자동 추가했다.

## 현재 상태
1단계 목표는 최소 기반 수준에서 완료됐다.

정리된 상태:
- 공통 앱 셸 존재
- 역할별 라우트 그룹 존재
- 인증 스토어 존재
- 인증 API 모듈 존재
- 공통 axios 클라이언트 존재

아직 남은 것:
- 실제 로그인 폼 연결
- 토큰 재발급 흐름 고도화
- 권한별 라우트 보호
- 기능별 API 모듈 세분화

## 다음 작업 제안
다음은 `INFO.md` 기준 2단계로 넘어가면 된다.

우선순위:
1. 강의 목록 페이지 데이터 구조 설계
2. 강의 상세 페이지 라우트 추가
3. 수강 권한 상태 배지 설계
4. `course` 도메인 타입 및 API 모듈 분리
