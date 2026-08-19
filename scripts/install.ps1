# LabCrew one-command local install (Docker Compose) — Windows PowerShell
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker is required. Install Docker Desktop, then re-run."
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example"
  Write-Host "IMPORTANT: set a strong AUTH_SECRET before exposing this beyond localhost."
}

Write-Host "Starting LabCrew (postgres + redis + migrate + web + worker)..."
docker compose up --build -d

Write-Host ""
Write-Host "Waiting for web..."
for ($i = 1; $i -le 60; $i++) {
  try {
    $null = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3
    Write-Host "LabCrew is up -> http://localhost:3000/signup"
    Write-Host "Admin guide: ADMIN.md"
    exit 0
  } catch {
    Start-Sleep -Seconds 2
  }
}

Write-Error "Web did not become ready in time. Check: docker compose logs web migrate"
