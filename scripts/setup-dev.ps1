param(
  [switch]$Install,
  [switch]$ForceEnv
)

$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvPath = Join-Path $RootDir ".env"

function Test-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Ensure-EnvFile($Overwrite) {
  if ((Test-Path $EnvPath) -and -not $Overwrite) {
    Write-Host "[env] .env already exists"
    return
  }

  $Content = @"
# Generated for frontend development
HOST_PORT=3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_DEV_ROLE_BYPASS=false
"@

  Set-Content -Path $EnvPath -Value $Content -Encoding UTF8
  Write-Host "[env] created $EnvPath"
}

$Missing = @()

if (-not (Test-Command "wsl")) {
  $Missing += "wsl"
}

if (-not (Test-Command "docker")) {
  $Missing += "docker"
}

if (-not (Test-Command "node") -or -not (Test-Command "npm")) {
  Write-Host "[optional] local node/npm이 없으면 Docker Compose 경로만 사용 가능합니다."
}

if ($Install) {
  if ($Missing -contains "wsl") {
    Write-Host "[install] wsl"
    wsl --install -d Ubuntu
  }

  if ($Missing -contains "docker") {
    Write-Host "[install] docker desktop"
    winget install -e --id Docker.DockerDesktop
  }

  if ($Missing -contains "node" -or $Missing -contains "npm") {
    Write-Host "[install] node"
    winget install -e --id OpenJS.NodeJS.LTS
  }
} elseif ($Missing.Count -gt 0) {
  Write-Host "[missing] $($Missing -join ', ')"
  Write-Host "PowerShell 예시:"
  if ($Missing -contains "wsl") {
    Write-Host "  wsl --install -d Ubuntu"
  }
  if ($Missing -contains "docker") {
    Write-Host "  winget install -e --id Docker.DockerDesktop"
  }
  if ($Missing -contains "node" -or $Missing -contains "npm") {
    Write-Host "  winget install -e --id OpenJS.NodeJS.LTS"
  }
}

Ensure-EnvFile -Overwrite $ForceEnv

Write-Host ""
Write-Host "[next]"
Write-Host "  1. Docker Desktop를 실행하고 WSL integration을 켭니다."
Write-Host "  2. docker compose up"
Write-Host "  3. http://localhost:3000 확인"

if ($Missing.Count -gt 0) {
  exit 1
}
