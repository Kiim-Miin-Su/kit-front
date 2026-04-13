#!/usr/bin/env bash
# =============================================================
# AI Edu LMS — Frontend 최초 설정 스크립트
#
# 사용법:
#   ./setup.sh             # Docker 확인 + .env 생성 + 개발 서버 시작
#   ./setup.sh --install   # 누락된 도구 자동 설치 (macOS Homebrew / Linux apt)
#
# 사전 조건:
#   back 레포가 실행 중이면 API 연동이 됩니다.
#   (백엔드 없이도 mock fallback으로 UI 확인 가능)
# =============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# ── 옵션 파싱 ─────────────────────────────────────────────
INSTALL_FLAG=""
for arg in "$@"; do
  case $arg in
    --install) INSTALL_FLAG="--install" ;;
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
API_URL=$(grep -E "^NEXT_PUBLIC_API_BASE_URL=" .env 2>/dev/null | cut -d'=' -f2 || echo "http://localhost:4000")
info "백엔드 API 주소: $API_URL"

if command -v curl &>/dev/null; then
  if curl -sf "${API_URL}/healthz" >/dev/null 2>&1; then
    success "백엔드 연결 확인됨"
  else
    warn "백엔드(${API_URL})에 연결할 수 없습니다."
    warn "back 레포의 setup.sh를 먼저 실행하지 않으면 API 연동이 안 됩니다."
    warn "mock fallback으로 UI는 확인 가능합니다."
  fi
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
echo "    프론트엔드 → http://localhost:3000"
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
