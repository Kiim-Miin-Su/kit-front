# Frontend Progress — 2026-04-13 (세션 2)

## 이번 세션 요약

back 서버 쪽에서 수정된 데이터 공유 버그가 프론트엔드에 올바르게 반영되도록  
UI/UX 관련 기능을 점검하고, 주요 변경 사항을 정리했습니다.

이번 세션에서 프론트엔드 코드 변경은 없으나,  
백엔드 수정으로 프론트엔드 동작에 영향을 주는 항목들을 문서화합니다.

---

## 백엔드 수정이 프론트엔드에 미치는 영향

### 1. 관리자 커스텀 일정 — 학생 출석 워크스페이스

**이전:** `GET /me/attendance/workspace` 응답에 관리자가 등록한 커스텀 일정이 포함되지 않음.  
**이후:** 백엔드 `AttendanceService`가 `AdminService`의 커스텀 일정을 병합하여 반환.

프론트엔드 `attendance-calendar.tsx`는 응답의 `schedules` 배열을 그대로 렌더링하므로,  
추가 FE 수정 없이 관리자 일정이 학생 캘린더에 표시됩니다.

**단, 주의사항:**

- 커스텀 일정은 `supportsCodeCheckIn: false`이므로 QR 체크인 버튼이 표시되지 않습니다.
- `requiresAttendanceCheck: true`인 커스텀 일정의 초기 상태는 `NOT_CHECKED_IN`입니다.
- 현재 관리자 커스텀 일정은 **서버 in-memory** 저장이므로, 서버 재시작 시 소멸합니다.

### 2. `GET /auth/me` 응답 `id` 필드 수정

**이전:** 백엔드가 `userId`를 반환 → FE `AuthUser` 타입의 `id`와 불일치.  
**이후:** 백엔드가 `id: user.userId`로 명시적 매핑.

`fetchMe()` 호출 코드가 올바르게 작동하게 됩니다.

### 3. 과제 워크스페이스 — ACTIVE 수강만 포함

**이전:** PENDING, COMPLETED 수강도 과제 워크스페이스에 포함될 수 있음.  
**이후:** ACTIVE 상태인 수강만 포함.

프론트엔드 과제 워크스페이스 UI는 백엔드가 반환한 과목 목록만 렌더링하므로,  
추가 FE 수정 없이 일관성이 개선됩니다.

---

## 이전 세션 주요 변경 사항 (누적)

| 기능 | 상태 |
|------|------|
| 강좌 탐색/상세/수강 신청 | ✅ 완료 |
| 로그인/인증 (HMAC 토큰) | ✅ 완료 |
| 미들웨어 역할 기반 라우팅 | ✅ 완료 (쿠키 버그 수정) |
| 권한 없음 페이지 (`/unauthorized`) | ✅ 완료 |
| 상단 내비게이션 로그아웃 버튼 | ✅ 완료 |
| React 하이드레이션 오류 수정 | ✅ 완료 |
| 출석 캘린더/체크 | ✅ 완료 |
| 과제 제출 워크스페이스 (Monaco IDE) | ✅ 완료 |
| 강사 콘솔 (리뷰/피드백) | ✅ 완료 |
| 관리자 운영 (수업·일정·멤버·출석scope) | ✅ 완료 |
| 관리자 일정 관리 (스크롤 + 캘린더 탭) | ✅ 완료 |
| 강의 영상 플레이어 | 🚧 mock 단계 |
| 파일 업로드 위젯 | 🚧 미구현 |

---

## 알려진 미해결 버그

### 로그인 버튼 클릭 후 화면 미이동

`TopNavigation`의 "로그인" 버튼을 눌렀을 때 `/sign-in`으로 이동하지 않는 문제.  
`sign-in/page.tsx`에서 `useSearchParams()` 사용 시 Next.js 15 기준으로  
`Suspense` 경계가 필요할 수 있습니다.

**임시 회피:** 주소창에 직접 `http://localhost:3000/sign-in` 입력.

---

## 다음 구현 우선순위

### P0 — 로그인 버튼 미이동 버그 수정

`TopNavigation` 또는 `sign-in/page.tsx` 내 라우팅 문제 원인 파악 및 수정.

### P1 — 파일 업로드 위젯

과제 제출 시 실제 파일 첨부 기능. 백엔드 API는 이미 구현되어 있습니다.

```
POST /files/presign  → presign URL 발급
PUT <presignUrl>     → 파일 직접 업로드
POST /files/complete → 메타데이터 등록
```

### P1 — 공통 에러/로딩 패턴 정립

각 feature에서 `try/catch → fallback` 중복 제거.  
`src/lib/use-api.ts` 형태의 공통 훅으로 통합 권장.

### P2 — 강의 영상 플레이어

백엔드 HLS 파이프라인 완성 후 `playback-token → stream-manifest` 흐름으로 교체.

---

## 참고 문서

| 문서 | 내용 |
|------|------|
| [`INFO.md`](./INFO.md) | 아키텍처 기준 및 API 계약 요약 |
| [`architecture.md`](./architecture.md) | 백엔드 연동 아키텍처 상세 |
| [`progress_10.md`](./progress_10.md) | 이전 세션 진행 기록 |
