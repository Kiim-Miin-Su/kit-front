# Frontend Extension Guide

이 문서는 `front/` 기준으로 화면 확장, API 연동 확장, 배포 설정 변경 시 확인해야 할 항목을 정리한다.

---

## 1. 확장 기본 원칙

- `app/`은 라우트와 레이아웃만 두고, 실제 화면 조합은 `features/`로 보낸다.
- API 호출은 `services/`에 모은다.
- 인증이 필요한 데이터는 서버 컴포넌트에서 바로 호출하지 않는다.
- 현재 구조에서는 브라우저 쪽 access token + refresh 흐름이 기준이므로 보호 데이터는 클라이언트 로딩으로 붙이는 쪽이 안전하다.
- 역할 제어는 프론트 UX용일 뿐이고, 최종 권한은 백엔드가 검증해야 한다.

---

## 2. 새 화면 추가 체크리스트

1. `src/app/...`에 라우트를 추가한다.
2. 실제 화면 로직은 `src/features/<domain>/`으로 분리한다.
3. 보호 화면이면 `RoleGate` 또는 명시적 에러 UI를 둔다.
4. 필요한 타입은 `src/types/`에 먼저 만든다.
5. API 호출은 `src/services/`에 추가한다.
6. 테스트 또는 최소한 mock fallback 동작을 같이 확인한다.

---

## 3. 인증/권한 확장 시 주의점

현재 구조:

- access token: Zustand 메모리 상태
- persisted state: `user`만 localStorage 저장
- refresh token: 백엔드가 설정한 httpOnly cookie
- middleware role cookie: 라우팅 UX 보조용

주의점:

- `ai_edu_role` 쿠키는 신뢰 가능한 권한 정보가 아니다.
- 프론트에서 관리자 화면을 감추는 것과 백엔드 권한 검사는 별개다.
- 보호 API를 서버 컴포넌트에서 호출하면 access token을 붙일 수 없어서 의도치 않은 fallback으로 떨어질 수 있다.
- 보호 화면은 클라이언트 컴포넌트에서 로딩하거나, 별도 서버 측 토큰 브리지 전략을 먼저 설계한 뒤 붙인다.

---

## 4. API 서비스 확장 시 주의점

새 API를 추가할 때는 아래를 같이 본다.

- `src/services/api.ts`
- `src/services/<domain>.ts`
- `src/types/<domain>.ts`
- 대응되는 `features/` 컴포넌트

중요한 규칙:

- 공개 API와 보호 API를 같은 fallback 정책으로 다루지 않는다.
- 401/403을 무조건 mock으로 삼키면 권한 문제를 숨긴다.
- 보호 화면용 fetch는 최소한 인증/인가 실패를 구분할 수 있게 만든다.

추천 패턴:

- 공개 페이지: 네트워크 실패 시 읽기 전용 mock fallback 허용
- 보호 페이지: 401/403은 명시적 에러 처리, 네트워크/백엔드 장애만 제한적으로 fallback

---

## 5. 서버 컴포넌트 확장 시 주의점

현재 기준으로 서버 컴포넌트에서 안전한 것:

- 공개 강좌 상세처럼 인증이 필요 없는 데이터
- 정적 UI 조합

현재 기준으로 주의해야 하는 것:

- `/learn`, `/student`, `/admin` 같은 보호 페이지의 실데이터 호출
- access token이 필요한 백엔드 API

새 보호 페이지를 만들면 먼저 결정한다.

1. 클라이언트 로딩으로 처리할지
2. Route Handler / BFF 계층을 둘지
3. 서버 측 토큰 전달 전략을 설계할지

이 결정 없이 서버 컴포넌트에서 바로 호출하면 인증이 깨질 가능성이 높다.

---

## 6. 환경 변수 추가 시 순서

새 환경 변수를 추가할 때는 아래 파일을 같이 수정한다.

- `.env.example`
- `Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `README.md`

분류 규칙:

- 브라우저에 노출되어도 되는 값만 `NEXT_PUBLIC_*`
- 비밀값은 프론트에 두지 않는다

예시:

- `NEXT_PUBLIC_API_BASE_URL`: 공개 가능
- 백엔드 시크릿, 외부 API 시크릿: 프론트에 두면 안 됨

---

## 7. CORS / 쿠키 / 배포 주의점

현재 프론트는 `axios`에서 `withCredentials: true`를 사용한다.

확인 항목:

- 백엔드 `CORS_ORIGIN`이 실제 프론트 주소와 일치하는지
- 프론트 도메인이 바뀌면 `NEXT_PUBLIC_API_BASE_URL`도 같이 바꾸는지
- HTTP/HTTPS가 섞이지 않는지
- 프록시/로드밸런서를 거칠 때 cookie 전달이 깨지지 않는지

중요:

- 프론트만 배포 주소를 바꾸고 백엔드 `CORS_ORIGIN`을 안 바꾸면 refresh 흐름이 깨질 수 있다.
- 로컬에서는 `localhost`가 맞아도 운영에서는 `www`, `app`, `api` 서브도메인 분리 여부를 정확히 맞춰야 한다.

---

## 8. Docker / 배포 파일 수정 시 주의점

수정 대상:

- `Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `setup.sh`

확인 항목:

- 빌드 타임 변수와 런타임 변수를 구분했는지
- `NEXT_PUBLIC_*` 값이 build arg와 runtime env에서 일관되는지
- healthcheck 경로가 실제 서비스와 맞는지

특히 주의:

- `NEXT_PUBLIC_API_BASE_URL`은 보통 빌드 타임에 번들에 들어간다.
- 배포 환경마다 값이 다르면 이미지 재빌드가 필요한지 먼저 판단해야 한다.
- 운영에서 런타임 교체만으로 끝낼 수 있다고 가정하면 주소가 엇갈릴 수 있다.

---

## 9. 미들웨어/RoleGate 확장 시 주의점

현재 구조:

- middleware: 경로 레벨 라우팅 보조
- `RoleGate`: 클라이언트 렌더 레벨 제어

주의점:

- middleware는 UX 최적화용이다. 보안 경계로 생각하면 안 된다.
- `RoleGate`에 개발 우회가 필요하면 반드시 환경 변수로만 열고 기본값은 `false` 유지
- 관리자 화면은 middleware만 믿지 말고 `RoleGate` 또는 에러 상태를 함께 둔다

---

## 10. mock 데이터 확장 시 주의점

현재 프론트는 일부 기능에서 mock fallback을 사용한다.

주의점:

- mock 타입과 실제 API 응답 타입이 어긋나면 UI는 되는데 연동 때 바로 깨진다.
- 보호 화면에서 mock fallback이 권한 오류를 가리면 운영 장애를 늦게 발견한다.
- 백엔드 계약이 바뀌면 `features/*/mock-*.ts`와 `services/*.ts` 정규화 로직을 같이 갱신한다.

---

## 11. 테스트 확장 기준

새 화면이나 유틸을 추가하면 최소 하나는 남긴다.

- 순수 함수면 `tests/*.test.ts`
- 라우팅/권한이면 middleware 또는 gate 기준 검증
- API 정규화면 응답 shape 검증

권장:

- 날짜/반복 일정/정원 계산처럼 규칙이 있는 유틸은 테스트 우선
- auth redirect, protected fetch, fallback 분기 같은 통합 포인트도 최소 한 번은 점검

---

## 12. 확장 전에 권장하는 확인 순서

1. 이 화면이 공개 페이지인지 보호 페이지인지 먼저 정한다.
2. 서버 컴포넌트로 둘지 클라이언트 로딩으로 둘지 먼저 정한다.
3. 필요한 API와 타입을 먼저 적는다.
4. `.env.example`과 배포 파일 변경 여부를 먼저 체크한다.
5. mock fallback이 필요한지, 있으면 어디까지 허용할지 정한다.
6. README와 이 문서를 같이 갱신한다.
