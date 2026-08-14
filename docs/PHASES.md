# Build phases

## Phase 0 — Lock (done)

- Product positioning, design tokens, phase plan
- Explicit non-goals (no PR review, no fake agents in prod path)

## Phase 1 — Platform shell (current)

**In**

- Next.js app + design system
- Marketing landing (brand-first)
- App shell: Mission Control, Approvals, Analytics routes
- Mission Control **UI with mock run data** + step replay
- Prisma schema (models only; DB connect next)
- `docker compose` for Postgres + Redis

**Out**

- Real BullMQ workers
- LLM calls
- Auth (stub “Director” session for UI)

## Phase 2 — Agent runtime

- Redis + BullMQ worker process
- Dispatcher -> Pulse -> Referee -> Coach -> Clerk *(persists AgentRun/AgentStep)*
- Enqueue from Mission Control "Run weekly ops" + poll run status
- Approvals API reads Coach drafts
- SSE stream into Mission Control *(optional next polish)*

## Phase 3 — Director + analytics + real internship loop

- Approval board (edit / approve / reject)
- Cohort analytics from DB + recent ops runs
- **Assignments**: professor creates tasks + materials; student submits evidence
- Demo Director / Student role switch (auth later)

## Phase 4 — Ship

- Docker Compose (web, worker, postgres, redis)
- Production deploy
- Seed demo + 2-min walkthrough
