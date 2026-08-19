#!/usr/bin/env bash
# LabCrew one-command local install (Docker Compose).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Desktop / Engine, then re-run."
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
  echo "IMPORTANT: set a strong AUTH_SECRET before exposing this beyond localhost."
fi

echo "Starting LabCrew (postgres + redis + migrate + web + worker)…"
docker compose up --build -d

echo ""
echo "Waiting for web…"
for i in $(seq 1 60); do
  if curl -sf "http://localhost:3000" >/dev/null 2>&1; then
    echo "LabCrew is up → http://localhost:3000/signup"
    echo "Admin guide: ADMIN.md"
    exit 0
  fi
  sleep 2
done

echo "Web did not become ready in time. Check: docker compose logs web migrate"
exit 1
