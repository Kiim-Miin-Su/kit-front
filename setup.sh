#!/usr/bin/env bash
# =============================================================
# AI Edu LMS — Frontend 최초 설정 스크립트
#
# 사용법:
#   ./setup.sh             # Docker 자동 설치/실행 확인 + .env 생성 + 개발 서버 시작
#   ./setup.sh --no-install  # 자동 설치 비활성화
#   ./setup.sh --allow-mock  # 백엔드 없이 프론트만 실행
#   ./setup.sh --skip-back-bootstrap  # back 자동 기동 없이 front만 이어서 실행
#
# 사전 조건:
#   back 레포가 실행 중이면 API 연동이 됩니다.
#   (백엔드 없이도 mock fallback으로 UI 확인 가능)
# =============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACK_DIR_DEFAULT="$(cd "${ROOT_DIR}/.." && pwd)/back"
BACK_DIR="${BACK_DIR:-${BACK_DIR_DEFAULT}}"

# ── 색상 출력 ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
step()    { echo -e "\n${BOLD}▶ $*${RESET}"; }

check_backend_health() {
  if command -v curl &>/dev/null; then
    curl -sf "${1}/healthz" >/dev/null 2>&1
    return $?
  fi

  if command -v python3 &>/dev/null; then
    python3 - "${1}/healthz" <<'PY' >/dev/null 2>&1
import sys
from urllib.request import urlopen

url = sys.argv[1]
with urlopen(url, timeout=5) as response:
    raise SystemExit(0 if response.status == 200 else 1)
PY
    return $?
  fi

  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "\$response = Invoke-WebRequest -UseBasicParsing -Uri '${1}/healthz' -TimeoutSec 5 -ErrorAction SilentlyContinue; if (\$response -and \$response.StatusCode -eq 200) { exit 0 } else { exit 1 }" >/dev/null 2>&1
    return $?
  fi

  return 1
}

read_env_var() {
  local file="$1"
  local key="$2"
  local value
  value=$(grep -E "^${key}=" "${file}" 2>/dev/null | tail -n 1 | cut -d'=' -f2- || true)
  printf "%s" "${value}"
}

set_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp)"

  awk -v k="${key}" -v v="${value}" '
    BEGIN { found = 0 }
    index($0, k "=") == 1 {
      print k "=" v
      found = 1
      next
    }
    { print }
    END {
      if (!found) {
        print k "=" v
      }
    }
  ' "${file}" > "${tmp}"

  mv "${tmp}" "${file}"
}

is_port_in_use() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi

  if command -v nc >/dev/null 2>&1; then
    nc -z localhost "${port}" >/dev/null 2>&1
    return $?
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - "${port}" <<'PY' >/dev/null 2>&1
import socket
import sys

port = int(sys.argv[1])
sock = socket.socket()
sock.settimeout(0.5)
result = sock.connect_ex(("127.0.0.1", port))
sock.close()
raise SystemExit(0 if result == 0 else 1)
PY
    return $?
  fi

  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "\$connections = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue; if (\$connections) { exit 0 } else { exit 1 }" >/dev/null 2>&1
    return $?
  fi

  return 1
}

# 해당 포트를 점유 중인 Docker 컨테이너 이름을 반환 (없으면 빈 문자열)
get_docker_container_on_port() {
  local port="$1"
  docker ps --format '{{.Names}}\t{{.Ports}}' 2>/dev/null \
    | awk -v p="${port}" '$0 ~ ":" p "->" { match($0, /^[^\t]+/); print substr($0, RSTART, RLENGTH) }' \
    | head -n 1
}

# 포트를 점유한 Docker 컨테이너가 있으면 강제 제거 후 0 반환, 없으면 1 반환
free_port_if_docker() {
  local port="$1"
  local container
  container="$(get_docker_container_on_port "${port}")"
  if [ -n "${container}" ]; then
    warn "포트 ${port}를 사용 중인 Docker 컨테이너: ${container}"
    info "컨테이너를 강제 제거합니다: ${container}"
    docker rm -f "${container}" >/dev/null 2>&1
    success "컨테이너 제거 완료 → 포트 ${port} 확보"
    return 0
  fi
  return 1
}

# 포트 확보: Docker 컨테이너이면 제거 후 원래 포트 사용, 아니면 다음 빈 포트 탐색
resolve_port() {
  local port="$1"
  if ! is_port_in_use "${port}"; then
    printf "%s" "${port}"
    return
  fi
  if free_port_if_docker "${port}"; then
    printf "%s" "${port}"
    return
  fi
  # 비-Docker 프로세스 점유 → 다음 빈 포트 탐색
  local next="${port}"
  while is_port_in_use "${next}"; do
    next=$((next + 1))
  done
  printf "%s" "${next}"
}

# ── 옵션 파싱 ─────────────────────────────────────────────
INSTALL_FLAG=""
ALLOW_MOCK=false
SKIP_BACK_BOOTSTRAP=false
for arg in "$@"; do
  case $arg in
    --install) INSTALL_FLAG="--install" ;;
    --no-install) INSTALL_FLAG="--no-install" ;;
    --allow-mock) ALLOW_MOCK=true ;;
    --skip-back-bootstrap) SKIP_BACK_BOOTSTRAP=true ;;
    *) warn "알 수 없는 옵션: $arg" ;;
  esac
done

echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║    AI Edu LMS — Frontend Setup       ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${RESET}"

# ══════════════════════════════════════════════════════════
# STEP 1. 사전 요구사항 점검 + .env 생성
# ══════════════════════════════════════════════════════════
step "사전 요구사항 점검"
bash "${ROOT_DIR}/scripts/setup-dev.sh" ${INSTALL_FLAG}
success "사전 요구사항 확인 완료"

step "호스트 포트 점검"
ENV_FILE="${ROOT_DIR}/.env"
FRONT_HOST_PORT="$(read_env_var "${ENV_FILE}" "HOST_PORT")"
[ -n "${FRONT_HOST_PORT}" ] || FRONT_HOST_PORT=3000
RESOLVED_FRONT_HOST_PORT="$(resolve_port "${FRONT_HOST_PORT}")"

if [ "${RESOLVED_FRONT_HOST_PORT}" != "${FRONT_HOST_PORT}" ]; then
  warn "HOST_PORT ${FRONT_HOST_PORT} 사용 중 (비-Docker 프로세스) → ${RESOLVED_FRONT_HOST_PORT}로 변경"
fi

set_env_var "${ENV_FILE}" "HOST_PORT" "${RESOLVED_FRONT_HOST_PORT}"
success "호스트 포트 확인 완료 (front=${RESOLVED_FRONT_HOST_PORT})"

# compose 커맨드 선택
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

# ══════════════════════════════════════════════════════════
# STEP 2. 백엔드 연결 상태 확인 (선택적)
# ══════════════════════════════════════════════════════════
step "백엔드 연결 확인"
BACK_HOST_PORT=4000
if [ -f "${BACK_DIR}/.env" ]; then
  SIBLING_BACK_HOST_PORT="$(read_env_var "${BACK_DIR}/.env" "HOST_PORT")"
  if [ -n "${SIBLING_BACK_HOST_PORT}" ]; then
    BACK_HOST_PORT="${SIBLING_BACK_HOST_PORT}"
  fi
fi
API_URL="http://localhost:${BACK_HOST_PORT}"
set_env_var "${ENV_FILE}" "NEXT_PUBLIC_API_BASE_URL" "${API_URL}"
info "백엔드 API 주소: $API_URL"

BACK_HEALTHY=false
if check_backend_health "${API_URL}"; then
  BACK_HEALTHY=true
  success "백엔드 연결 확인됨"
elif [ "${SKIP_BACK_BOOTSTRAP}" = false ] && [ -d "${BACK_DIR}" ] && [ -f "${BACK_DIR}/setup.sh" ]; then
  warn "백엔드(${API_URL})에 연결할 수 없습니다. sibling back을 먼저 시작합니다."
  (
    cd "${BACK_DIR}" &&
    bash setup.sh --no-front ${INSTALL_FLAG}
  )

  if check_backend_health "${API_URL}"; then
    BACK_HEALTHY=true
    success "백엔드 연결 확인됨"
  fi
else
  if [ "${ALLOW_MOCK}" = true ]; then
    warn "백엔드(${API_URL})에 연결할 수 없습니다."
    warn "--allow-mock 모드로 프론트만 실행합니다."
  else
    error "백엔드(${API_URL})에 연결할 수 없습니다."
    echo ""
    echo "  실서비스와 유사한 실행을 위해 백엔드가 먼저 떠 있어야 합니다."
    echo "  다음 중 하나를 실행하세요:"
    echo "    1. sibling back 저장소가 있으면 front/setup.sh를 다시 실행"
    echo "    2. back/setup.sh 실행 후 front/setup.sh"
    echo "    3. 프론트만 확인하려면 front/setup.sh --allow-mock"
    exit 1
  fi
fi

if [ "${ALLOW_MOCK}" = false ] && [ "${BACK_HEALTHY}" = false ]; then
  error "백엔드 헬스체크를 통과하지 못해 front 실행을 중단합니다."
  exit 1
fi

# ══════════════════════════════════════════════════════════
# STEP 3. 컨테이너 시작
# ══════════════════════════════════════════════════════════
step "개발 서버 시작"
info "최초 실행 시 node:20-alpine 이미지 다운로드로 수 분 소요될 수 있습니다."
$COMPOSE up -d

# ══════════════════════════════════════════════════════════
# STEP 4. Next.js 개발 서버 준비 대기
# ══════════════════════════════════════════════════════════
step "Next.js 개발 서버 준비 대기 (최대 3분)"
info "npm install → next dev 시작 중..."

MAX_WAIT=180
ELAPSED=0
SPIN=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
SPIN_IDX=0

while true; do
  if $COMPOSE exec -T front node -e \
    "require('http').get('http://localhost:3000',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))" \
    >/dev/null 2>&1; then
    echo ""
    success "개발 서버가 준비됐습니다!"
    break
  fi

  if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo ""
    error "서버 시작 시간 초과 (${MAX_WAIT}초)"
    echo ""
    echo "  로그를 확인하세요:  $COMPOSE logs front"
    exit 1
  fi

  printf "\r  ${SPIN[$SPIN_IDX]} 대기 중... (${ELAPSED}s / ${MAX_WAIT}s)"
  SPIN_IDX=$(( (SPIN_IDX + 1) % ${#SPIN[@]} ))
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

# ══════════════════════════════════════════════════════════
# 완료
# ══════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}✓ 설정 완료!${RESET}"
echo ""
echo "  서비스 주소:"
echo "    프론트엔드 → http://localhost:${RESOLVED_FRONT_HOST_PORT}"
echo "    로그인     → http://localhost:${RESOLVED_FRONT_HOST_PORT}/sign-in"
echo "    관리자     → http://localhost:${RESOLVED_FRONT_HOST_PORT}/admin"
echo "    백엔드 API → ${API_URL}"
echo ""
echo "  테스트 계정 (back seed 적재 후 사용):"
echo "    학생     → student-demo-01@koreait.academy / password123"
echo "    강사     → instructor-dev-01@koreait.academy / password123"
echo "    관리자   → admin-root@koreait.academy / password123"
echo ""
echo "  이후 실행:"
echo "    make dev     # 서버 재시작"
echo "    make logs    # 로그 보기"
echo "    make help    # 전체 명령어 목록"
echo ""
