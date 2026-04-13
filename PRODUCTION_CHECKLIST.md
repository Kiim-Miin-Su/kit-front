# Frontend Production Checklist

배포 직전과 배포 직후에 `front/`에서 확인할 항목을 정리한다.

---

## 배포 전

- `.env` 또는 배포 변수의 `NEXT_PUBLIC_API_BASE_URL`이 실제 백엔드 주소인지 확인
- `NEXT_PUBLIC_DEV_ROLE_BYPASS=false`인지 확인
- 빌드 시점에 들어가는 `NEXT_PUBLIC_*` 값이 운영용인지 확인
- `docker-compose.prod.yml`과 `Dockerfile`의 build arg가 같은 값을 쓰는지 확인

---

## 인증/권한

- 보호 페이지가 서버 컴포넌트에서 access token 의존 API를 직접 호출하지 않는지 확인
- 관리자 화면은 `RoleGate` 또는 명시적 권한 UI로 한 번 더 막히는지 확인
- 로그인 후 `redirect` 쿼리 복귀가 정상 동작하는지 확인
- 개발용 bypass가 운영 번들에 열려 있지 않은지 확인

---

## CORS / API 연동

- 백엔드 `CORS_ORIGIN`과 프론트 실제 URL이 맞는지 확인
- 브라우저에서 로그인 후 refresh 흐름이 정상인지 확인
- `withCredentials` 요청이 실제 배포 도메인 조합에서 쿠키를 주고받는지 확인
- mixed content(`https` 프론트 + `http` API)가 없는지 확인

---

## 배포 파일

필수 확인 파일:

- `Dockerfile`
- `docker-compose.prod.yml`
- `.env`
- `README.md`

확인 항목:

- `NEXT_PUBLIC_API_BASE_URL`이 build arg와 runtime env 모두에서 일관되는지
- healthcheck가 실제 서비스 응답과 맞는지
- production build 후 `/sign-in`, `/learn`, `/student`, `/admin` 라우트가 정상 생성되는지

---

## 배포 직후

- 메인 페이지 로딩 확인
- 로그인 페이지 진입 및 로그인 성공 확인
- 새로고침 후 refresh cookie 기반 세션 복구 확인
- 학생 계정으로 `/learn`, `/student` 확인
- 관리자 계정으로 `/admin` 확인
- 권한 없는 계정에서 `/admin` 접근 시 차단되는지 확인
- 네트워크 탭에서 401/403이 mock fallback으로 숨겨지지 않는지 확인

---

## 장애 시 우선 확인 순서

1. `NEXT_PUBLIC_API_BASE_URL` 오설정 여부
2. 백엔드 `CORS_ORIGIN` 불일치 여부
3. refresh cookie 미전달 여부
4. build 시점 env와 런타임 env 불일치 여부
5. 보호 페이지가 서버 컴포넌트에서 잘못된 fetch를 하고 있지 않은지
