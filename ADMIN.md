# LabCrew administrator documentation

This is the day-2 ops bible for installing and running LabCrew.  
Quickstart only: [README.md](./README.md) · free-host notes: [docs/DEPLOY-FREE.md](./docs/DEPLOY-FREE.md) · tenancy: [docs/TENANCY.md](./docs/TENANCY.md) · system design: [docs/SYSTEM.md](./docs/SYSTEM.md)

---

## Architecture

| Process | Role |
| ------- | ---- |
| **web** | Next.js App Router (marketing + `/app` + API routes) |
| **worker** | BullMQ consumer — Pulse → Referee → Coach → Clerk; writes Redis heartbeat |
| **postgres** | Source of truth (includes file blobs — no S3 required) |
| **redis** | Job queue + worker heartbeat |

```text
Director UI ──POST /api/ops/runs──► Redis (BullMQ)
                                      │
                                      ▼
                                   worker
                                      │
                                      ▼
                                   Postgres
```

**Pipeline health** (`GET /api/ops/health`):

| Redis | Worker heartbeat | UI / API behavior |
| ----- | ---------------- | ----------------- |
| down | — | **degraded** — dispatch blocked |
| up | stale / missing | **delayed** — enqueue allowed; jobs wait |
| up | fresh (&lt; 90s) | **ok** |

---

## One-command install

**Requirements:** Docker Desktop (or Docker Engine + Compose v2), ~2 GB free RAM.

```bash
git clone https://github.com/ahmadmustafa02/LabCrew.git
cd LabCrew
cp .env.example .env
# Edit .env — set a strong AUTH_SECRET before any shared/public host
docker compose up --build
```

Or use the helper scripts:

```bash
# macOS / Linux
chmod +x scripts/install.sh && ./scripts/install.sh

# Windows PowerShell
.\scripts\install.ps1
```

Then open **http://localhost:3000/signup**

| Host port | Service |
| --------- | ------- |
| 3000 | Web |
| 5434 | Postgres |
| 6380 | Redis |

Default DB credentials (dev only): user/password/db `labcrew` / `labcrew` / `labcrew`.

---

## Environment reference

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `AUTH_SECRET` | **Yes** | Session signing. Generate with `openssl rand -base64 32`. Default in `.env.example` is **dev-only**. |
| `AUTH_URL` | Yes | Public base URL (no trailing slash), e.g. `http://localhost:3000` |
| `DATABASE_URL` | Yes (local Node) | Host port **5434** when using Compose-published Postgres |
| `REDIS_URL` | Yes (local Node) | Host port **6380** |
| `POSTGRES_*` | Compose | Override user/password/db/ports |
| `AUTH_GOOGLE_*` | No | Google OAuth |
| `SMTP_*` / `EMAIL_FROM` | No | Real mail; else console |
| `LLM_*` | No | Groq-compatible OpenAI API; else heuristics |

Compose injects `DATABASE_URL` / `REDIS_URL` inside the network (`postgres:5432`, `redis:6379`). Host `.env` URLs are for `npm run dev` / `npm run worker` on the machine.

---

## Security checklist (before exposing beyond localhost)

1. Set a unique strong **`AUTH_SECRET`**
2. Change **`POSTGRES_PASSWORD`** (and matching URLs if you run Node on the host)
3. Do not commit `.env`
4. Prefer HTTPS + real DNS for `AUTH_URL` in production
5. Restrict published Postgres/Redis ports with a firewall (or bind to localhost only)
6. Confirm branch protection: **Lab A/B isolation suite** required on `master`
7. Invite join tokens are high-entropy (`randomBytes(24)` hex ≈ 192 bits); accept endpoints are rate-limited

---

## Day-2 operations

### Status

```bash
docker compose ps
docker compose logs -f web worker
curl -s http://localhost:3000/api/ops/health   # requires signed-in session cookie / bearer
```

Mission Control also surfaces **degraded** / **delayed** banners from the same health model.

### Migrations

Compose `migrate` service runs `prisma migrate deploy` (falls back to `db push`) then seed on first up.

For host-side:

```bash
npx prisma migrate deploy
npm run db:seed   # optional demo cohort — password labcrew
```

### Backup / restore (Postgres)

```bash
# Backup
docker compose exec -T postgres pg_dump -U labcrew labcrew > labcrew-backup.sql

# Restore (destructive to current DB contents)
docker compose exec -T postgres psql -U labcrew labcrew < labcrew-backup.sql
```

Volumes: `labcrew_pg_data`, `labcrew_redis_data`.

### Upgrades

```bash
git pull
docker compose up --build -d
# migrate container runs once per compose up when recreate is needed;
# or: docker compose run --rm migrate
```

### SMTP

Without SMTP: password-reset links appear on the forgot-password page and in server logs; nudge delivery may use console channel.  
With Gmail App Password: set `SMTP_*` as in [docs/DEPLOY-FREE.md](./docs/DEPLOY-FREE.md).

### LLM

Set `LLM_API_KEY` (and optional `LLM_BASE_URL` / `LLM_MODEL`) on **web** and **worker**. Without a key, Referee/Coach use heuristics.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Mission Control **degraded**, dispatch disabled | Redis down / wrong `REDIS_URL` | `docker compose up -d redis`; check health |
| **Queued — processing delayed** | Worker not running or heartbeat stale | `docker compose up -d worker`; `docker compose logs worker` |
| Isolation / signup fails | Migrate didn’t finish | `docker compose logs migrate`; ensure Postgres healthy |
| Auth loops / invalid session | Weak or rotated `AUTH_SECRET` / wrong `AUTH_URL` | Align secret + URL; clear cookies |
| Approvals shows **unavailable** (not empty) | API/DB error | Check web logs + `DATABASE_URL` — empty inbox is a different, successful state |
| Cross-lab data worries | — | Isolation suite + `requireLabScope`; see [docs/TENANCY.md](./docs/TENANCY.md) |

---

## Multi-tenancy (admin summary)

- Tenant = **`organizationId`** (labId). No Prisma middleware — repository helpers only.
- Web: cookie session. Mobile/API: `Authorization: Bearer lc_…` (lab-scoped, default 90-day expiry, revocable via `/api/auth/tokens`).
- CI: `npm run test:isolation` must pass on PRs (**Lab A/B isolation suite**).

---

## Related docs

- [docs/PHASES.md](./docs/PHASES.md) — build / upgrade phases  
- [docs/WORKERS.md](./docs/WORKERS.md) — agent pipeline  
- [docs/DATA.md](./docs/DATA.md) — Prisma / data layer  
- [docs/DEPLOY-FREE.md](./docs/DEPLOY-FREE.md) — $0 self-host tips  
