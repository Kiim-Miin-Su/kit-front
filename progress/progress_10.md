# Frontend Progress — 2026-04-13

## 이번 세션 요약

모노레포에서 독립 레포로 전환하면서 로컬 Docker Compose 기반 개발 환경으로 재정비했습니다.

---

## 변경 사항

### 구조 정리
- Azure 배포 파일 전체 제거
  - `.github/workflows/azure-*.yml` 삭제
  - `infra/azure/` 스크립트 삭제
  - `AZURE_DEPLOY.md` 삭제
- 독립 레포로 분리 (`front/` 단독 레포)

### Docker Compose 환경 정비
| 파일 | 설명 |
|------|------|
| `docker-compose.yml` | Next.js 핫 리로드 개발 환경 |

- `docker compose up` 한 줄로 개발 서버 실행
- `.env` 파일 없이도 동작 (`NEXT_PUBLIC_API_BASE_URL` 기본값 내장)

### 파일 추가
- `Makefile` — `make dev`, `make test`, `make shell` 등 단축 명령어
- `.env.example` — 환경 변수 템플릿
- `.gitignore` — 불필요한 항목 정리

### 문서 개편
- `README.md` — "clone → docker compose up" 30초 시작 가이드로 전면 개편
- `progress/progress_10.md` — 이 파일

---

## 현재 구현 상태 (2026-04-13)

### 완료된 항목

**인증**
- `/sign-in` 로그인 폼 → 백엔드 `POST /auth/sign-in` 연동
- Zustand `auth-store` — user, accessToken 관리
- `lib/auth-storage.ts` — localStorage 기반 토큰 영속화

**강좌**
- 홈 히어로 캐러셀, 필터바, 강좌 그리드, 페이지네이션
- 강좌 상세 (커리큘럼 아코디언, 수강 신청 버튼)
- `services/course.ts` — API 실패 시 mock fallback 자동 전환

**학습**
- 학습 허브 (`/learn`) — 내 수강 강좌 목록
- 커리큘럼 그리드, 플레이어 스테이지 (현재 mock 영상)
- 학습 지표 컴포넌트

**출석**
- 출석 캘린더 (월별 일정 시각화)
- 출석 이벤트 상세, 출석 체크 버튼
- 일정 scope 정책 기반 가시성 필터

**과제/제출**
- 학생 과제 워크스페이스 — Monaco IDE 에디터, 파일 첨부 프리뷰
- 강사 콘솔 — 제출 목록, 리뷰 상태 변경, 피드백 작성
- 제출 상세 (`/submissions/[submissionId]`) — 코드 diff 뷰, 피드백 이력
- `submission-draft-storage.ts` — localStorage 임시 저장

**관리자**
- 수업 생성/삭제, 사용자 검색/배치, 멤버 역할 관리
- 일정 CRUD (단건/반복 등록)
- 출석 scope 정책 관리 UI
- 수업 감사 로그 조회

### 현재 한계 / 알려진 공백

| 항목 | 상태 | 비고 |
|------|------|------|
| 강의 영상 플레이어 | mock 단계 | 실제 HLS 스트리밍 미연결 |
| 파일 업로드 위젯 | 미구현 | presign URL API는 back에 존재 |
| 미들웨어 라우트 보호 | 미적용 | `middleware.ts`는 있으나 role check 없음 |
| 에러/로딩 공통 패턴 | 미정리 | 각 feature마다 개별 처리 중 |
| 실시간 알림 | 스텁 | `NotificationsModule` back에 스텁 상태 |

---

## 다음 구현 우선순위

### P1 — 미들웨어 기반 라우트 보호

현재 `middleware.ts`가 있지만 role 기반 redirect가 없습니다.

```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const { pathname } = request.nextUrl

  if (!token && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }
  // role 검증 추가 필요
}
```

### P1 — 공통 에러/로딩 패턴 정립

각 feature에서 `try/catch → fallback`이 중복됩니다.

```typescript
// 제안: src/lib/use-api.ts
function useApi<T>(fetcher: () => Promise<T>, fallback: T) {
  // loading, error, data 통합 관리
}
```

### P1 — 파일 업로드 위젯

과제 제출 시 실제 파일을 첨부할 수 있는 위젯입니다.

```
1. POST /files/presign  → S3 presign URL 발급
2. PUT <presignUrl>     → 파일 직접 업로드
3. POST /files/complete → 메타데이터 등록
```

백엔드 API는 이미 구현되어 있어 프론트 연동만 필요합니다.

### P2 — 강의 영상 플레이어

현재 `player-stage.tsx`가 mock 영상을 보여줍니다.  
백엔드 영상 업로드/HLS 파이프라인이 완성되면 `playback-token → stream-manifest` 흐름으로 교체합니다.

```typescript
// 예정 흐름
const token = await api.get(`/lessons/${lessonId}/playback-token`)
const manifest = await api.get(`/lessons/${lessonId}/stream-manifest`, {
  headers: { Authorization: `Bearer ${token}` }
})
// HLS.js or Video.js로 재생
```

### P2 — 서버 사이드 렌더링 최적화

현재 대부분의 데이터 페칭이 클라이언트에서 일어납니다.  
강좌 목록, 강좌 상세 등 공개 페이지는 Next.js `fetch`를 사용하여 SSR/ISR로 전환하면 SEO와 초기 로딩이 개선됩니다.

### P3 — 실시간 알림

백엔드 `NotificationsModule`이 스텁 상태입니다.  
백엔드 SSE 또는 WebSocket 구현 후 프론트 `EventSource` 연동이 필요합니다.

---

## 참고 문서

| 문서 | 내용 |
|------|------|
| [`INFO.md`](./INFO.md) | 아키텍처 기준 및 API 계약 요약 |
| [`architecture.md`](./architecture.md) | 백엔드 연동 아키텍처 상세 |
| [`progress_09.md`](./progress_09.md) | 이전 세션 진행 기록 |
