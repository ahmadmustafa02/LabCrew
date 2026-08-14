# Build phases

## Phase 0 — Lock (done)

- Product positioning, design tokens, phase plan
- Explicit non-goals (no PR review, no fake agents in prod path)

## Phase 1 — Platform shell (done)

- Next.js app + design system
- Marketing landing + app shell
- Mission Control UI
- Prisma schema + docker compose Postgres/Redis

## Phase 2 — Agent runtime (done)

- Redis + BullMQ worker
- Dispatcher → Pulse → Referee → Coach → Clerk
- Mission Control enqueue + poll

## Phase 3 — Director loop (done)

- Approvals (edit / approve / reject)
- Analytics
- Assignments + student submit
- Monday Brief as director home

## Phase 4 — Ship (done)

- Auth.js credentials login
- Docker Compose: postgres, redis, migrate, web, worker
- Optional Resend on approve
- README 2-minute walkthrough

## Optional next (post-v1)

- Production host (Fly / Railway / VPS) with managed Postgres+Redis
- Real LLM Referee/Coach prompts
- PDF/repo deep evidence briefs
- SSE live step stream
