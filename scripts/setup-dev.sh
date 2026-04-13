#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTO_INSTALL=1

for arg in "$@"; do
  case "$arg" in
    --install)
      AUTO_INSTALL=1
      ;;
    --no-install)
      AUTO_INSTALL=0
      ;;
  esac
done

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

is_windows_shell() {
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_wsl() {
  grep -qi microsoft /proc/version 2>/dev/null
}

run_powershell() {
  local script="$1"

  if ! has_cmd powershell.exe; then
    return 1
  fi

  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${script}"
}

print_install_help() {
  local missing="$1"
  local os_name
  os_name="$(uname -s)"

  echo ""
  echo "[install guide] missing: ${missing}"

  case "${os_name}" in
    Darwin)
      case "${missing}" in
        docker)
          echo "  brew install --cask docker"
          ;;
        node)
          echo "  brew install node"
          ;;
      esac
      ;;
    Linux)
      if is_wsl; then
        case "${missing}" in
          docker)
            echo "  Windows host에서 Docker Desktop 설치 후 WSL integration을 켜세요."
            echo "  PowerShell 예시: winget install -e --id Docker.DockerDesktop"
            ;;
          node)
            echo "  sudo apt-get update && sudo apt-get install -y nodejs npm"
            ;;
        esac
      else
        case "${missing}" in
          docker)
            echo "  https://docs.docker.com/engine/install/ 참고 후 docker compose plugin까지 설치하세요."
            ;;
          node)
            echo "  sudo apt-get update && sudo apt-get install -y nodejs npm"
            ;;
        esac
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*)
      case "${missing}" in
        docker)
          echo "  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"winget install -e --id Docker.DockerDesktop\""
          ;;
        node)
          echo "  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"winget install -e --id OpenJS.NodeJS.LTS\""
          ;;
      esac
      ;;
    *)
      echo "  README.md의 setup 섹션을 참고하세요."
      ;;
  esac
}

try_install() {
  local target="$1"
  local os_name
  os_name="$(uname -s)"

  case "${os_name}" in
    Darwin)
      if ! has_cmd brew; then
        echo "[install] Homebrew가 없어 자동 설치를 건너뜁니다."
        return
      fi
      case "${target}" in
        docker)
          brew install --cask docker
          ;;
        node)
          brew install node
          ;;
      esac
      ;;
    Linux)
      if is_wsl && [[ "${target}" == "docker" ]]; then
        echo "[install] WSL에서는 Docker Desktop을 Windows에 설치해야 합니다."
        return
      fi

      if ! has_cmd apt-get; then
        echo "[install] apt-get이 없어 자동 설치를 건너뜁니다."
        return
      fi

      sudo apt-get update

      case "${target}" in
        docker)
          sudo apt-get install -y docker.io docker-compose-v2 docker-compose-plugin
          ;;
        node)
          sudo apt-get install -y nodejs npm
          ;;
      esac
      ;;
    MINGW*|MSYS*|CYGWIN*)
      if ! has_cmd powershell.exe; then
        echo "[install] powershell.exe가 없어 자동 설치를 건너뜁니다."
        return
      fi

      case "${target}" in
        docker)
          run_powershell "winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements"
          ;;
        node)
          run_powershell "winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements"
          ;;
      esac
      ;;
  esac
}

wait_for_docker_ready() {
  local max_wait="${1:-120}"
  local waited=0

  while (( waited < max_wait )); do
    if docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
    waited=$((waited + 2))
  done

  return 1
}

ensure_docker_running() {
  if ! has_cmd docker; then
    return 1
  fi

  if docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    return 0
  fi

  local os_name
  os_name="$(uname -s)"

  case "${os_name}" in
    Darwin)
      if has_cmd open; then
        echo "[docker] Docker Desktop 실행 시도"
        open -a Docker >/dev/null 2>&1 || true
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*)
      if has_cmd powershell.exe; then
        echo "[docker] Docker Desktop 실행 시도"
        run_powershell "\$dockerDesktop = Join-Path \$Env:ProgramFiles 'Docker\\Docker\\Docker Desktop.exe'; if (Test-Path \$dockerDesktop) { Start-Process \$dockerDesktop }" >/dev/null 2>&1 || true
      fi
      ;;
    Linux)
      if is_wsl; then
        echo "[docker] WSL에서는 Windows host의 Docker Desktop이 필요합니다."
      else
        if has_cmd systemctl; then
          echo "[docker] systemctl로 docker 서비스 시작 시도"
          sudo systemctl start docker >/dev/null 2>&1 || true
        elif has_cmd service; then
          echo "[docker] service로 docker 서비스 시작 시도"
          sudo service docker start >/dev/null 2>&1 || true
        fi
      fi
      ;;
  esac

  wait_for_docker_ready 120
}

MISSING=0

if ! has_cmd docker; then
  echo "[missing] docker"
  if [[ "${AUTO_INSTALL}" -eq 1 ]]; then
    try_install docker
  fi
  print_install_help docker
  if ! has_cmd docker; then
    MISSING=1
  fi
fi

if has_cmd docker && ! docker compose version >/dev/null 2>&1; then
  echo "[missing] docker compose plugin"
  if [[ "${AUTO_INSTALL}" -eq 1 ]]; then
    try_install docker
  fi
  print_install_help docker
  if ! docker compose version >/dev/null 2>&1; then
    MISSING=1
  fi
fi

if has_cmd docker; then
  if ! ensure_docker_running; then
    echo "[missing] running docker daemon"
    print_install_help docker
    MISSING=1
  fi
fi

if ! has_cmd node || ! has_cmd npm; then
  echo "[optional] local node/npm이 없으면 Docker Compose 경로만 사용 가능합니다."
fi

if [[ ! -f "${ROOT_DIR}/.env" ]]; then
  if has_cmd node; then
    node "${ROOT_DIR}/scripts/init-env.mjs"
  else
    cp "${ROOT_DIR}/.env.example" "${ROOT_DIR}/.env"
    echo "[env] created .env from .env.example"
  fi
else
  echo "[env] .env already exists"
fi

echo ""
echo "[next]"
echo "  1. docker compose up"
echo "  2. open http://localhost:3000"

exit "${MISSING}"
