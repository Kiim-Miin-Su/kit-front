# Frontend Progress — 2026-04-13

## 이번 세션 요약

모노레포에서 독립 레포로 전환하면서 로컬 Docker Compose 기반 개발 환경으로 재정비했습니다.  
이후 전체 보안/코드 점검을 수행하고 발견된 버그 및 보안 이슈를 수정했습니다.

---

## 변경 사항

### 구조 정리
- Azure 배포 파일 전체 제거 (`.github/workflows/`, `infra/azure/`, `AZURE_DEPLOY.md`)
- 독립 레포로 분리 (`front/` 단독 레포)

### Docker Compose 환경 정비
- `docker compose up` 한 줄로 개발 서버 실행
- `.env` 파일 없이도 동작 (기본값 내장)

### 파일 추가
- `Makefile` — `make dev`, `make test`, `make shell` 등 단축 명령어
- `.env.example` — 환경 변수 템플릿 (컨텍스트 주석 포함)

### 버그 수정 (2026-04-13 보안/코드 점검)

#### CRITICAL — middleware 역할 쿠키 미설정 버그

**문제:** `middleware.ts`는 라우팅 보호를 위해 `ai_edu_role` 쿠키를 읽지만,  
로그인 성공 후 이 쿠키를 설정하는 코드가 없었습니다.  
→ 모든 인증된 사용자가 `student`로 취급되어 `/admin`, `/instructor` 접근이 차단됨.

**원인:** Next.js 미들웨어는 Edge Runtime에서 실행되어 localStorage에 접근 불가.  
인증 상태는 `auth-store.ts` (Zustand + localStorage)에 저장되지만, 미들웨어는 이를 읽을 수 없음.

**해결 방법:**

```
auth-storage.ts ← setRoleCookie(role), clearRoleCookie() 추가
auth-store.ts   ← setSession 에서 setRoleCookie 호출
                ← clearSession 에서 clearRoleCookie 호출
sign-in/page.tsx ← 로그인 성공 후 setRoleCookie(session.user.role) 호출
api.ts interceptor ← 이미 clearStoredAuthSession 호출 → 쿠키도 자동 제거
```

**보안 참고:** `ai_edu_role` 쿠키는 UX 라우팅(redirect) 전용입니다.  
실제 권한 검증은 반드시 back API 서버에서 수행합니다.

#### SECURITY — .dockerignore .env 패턴 누락

**문제:** `.dockerignore`에 `.env` / `.env.*`가 없어서  
로컬에 `.env` 파일이 있을 경우 Docker 이미지에 포함될 수 있었습니다.

**해결:** `.env`, `.env.*`, `!.env.example` 추가.

#### SECURITY — .gitignore .env.* 패턴 부족

**문제:** `.env.local`만 무시하고 `.env.production`, `.env.development` 등이 커밋될 수 있었습니다.

**해결:** `.env.*` + `!.env.example` 패턴으로 변경.

---

## 인증/미들웨어 설계 요약

```
로그인 흐름:
  POST /auth/sign-in (back)
  → response: { accessToken, user }
  → httpOnly cookie: ai_edu_refresh_token (back이 Set-Cookie)
  → client: Zustand store + localStorage에 user 저장 (accessToken 제외)
  → client: document.cookie에 ai_edu_role=<role> 저장 (미들웨어용)

미들웨어 흐름 (Edge Runtime):
  요청 → ai_edu_refresh_token 쿠키 확인 (인증 여부)
  → ai_edu_role 쿠키 확인 (역할 기반 redirect)
  → 권한 없으면 → /sign-in 또는 역할 홈으로 redirect

토큰 갱신 (api.ts interceptor):
  401 응답 → POST /auth/refresh (refresh cookie 자동 전송)
  → 새 accessToken 발급 → Zustand store 업데이트
  → 원래 요청 재시도
  실패 시 → clearStoredAuthSession() + clearRoleCookie()
```

### accessToken을 localStorage에 저장하지 않는 이유

XSS 공격으로 localStorage가 탈취되어도 accessToken이 노출되지 않습니다.  
페이지 새로고침 후에는 `/auth/refresh` (httpOnly cookie)로 accessToken을 재발급받습니다.

---

## 현재 구현 상태 (2026-04-13)

| 기능 | 상태 |
|------|------|
| 강좌 탐색/상세/수강 신청 | ✅ 완료 |
| 로그인/인증 (HMAC 토큰) | ✅ 완료 |
| 미들웨어 역할 기반 라우팅 | ✅ 완료 (쿠키 버그 수정) |
| 출석 캘린더/체크 | ✅ 완료 |
| 과제 제출 워크스페이스 (Monaco IDE) | ✅ 완료 |
| 강사 콘솔 (리뷰/피드백) | ✅ 완료 |
| 관리자 운영 (수업·일정·멤버·출석scope) | ✅ 완료 |
| 강의 영상 플레이어 | 🚧 mock 단계 |
| 파일 업로드 위젯 | 🚧 미구현 |

---

## 다음 구현 우선순위

### P1 — 공통 에러/로딩 패턴 정립

각 feature에서 `try/catch → fallback`이 중복됩니다.  
`src/lib/use-api.ts` 형태의 공통 훅으로 통합을 권장합니다.

### P1 — 파일 업로드 위젯

과제 제출 시 실제 파일 첨부 기능. back API는 이미 구현되어 있습니다.

```
POST /files/presign  → presign URL 발급
PUT <presignUrl>     → 파일 직접 업로드
POST /files/complete → 메타데이터 등록
```

### P2 — 강의 영상 플레이어

백엔드 HLS 파이프라인 완성 후 `playback-token → stream-manifest` 흐름으로 교체.

### P2 — 서버 사이드 렌더링 최적화

공개 페이지(강좌 목록, 상세)를 Next.js `fetch` 기반 SSR/ISR으로 전환.

---

## 참고 문서

| 문서 | 내용 |
|------|------|
| [`INFO.md`](./INFO.md) | 아키텍처 기준 및 API 계약 요약 |
| [`architecture.md`](./architecture.md) | 백엔드 연동 아키텍처 상세 |
| [`progress_09.md`](./progress_09.md) | 이전 세션 진행 기록 |
