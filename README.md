# LabCrew

AI operations crew for research labs and project cohorts.  
Humans direct. Agents run the weekly ops loop.

**Pillar 2** of the portfolio (with [CodePulse](https://getcodepulse.vercel.app) as AI-for-SE).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- PostgreSQL + Prisma (schema in Phase 1; wired in later phase)
- BullMQ + Redis (Phase 2 — agent workers)
- Auth.js (Phase 1b/2)

## Phases

See [docs/PHASES.md](./docs/PHASES.md) and [docs/DESIGN.md](./docs/DESIGN.md).

| Phase | Status | Focus |
| ----- | ------ | ----- |
| 0 | Done | Design system, product rules |
| 1 | In progress | Platform shell + Mission Control mock (no real agents yet) |
| 2 | Not started | BullMQ workers + real agent crew |
| 3 | Not started | Approval board + analytics |
| 4 | Not started | Docker + production deploy |

## Develop

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
docker compose up -d   # Postgres + Redis
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Phase 1 UI runs with mock data even if Docker is down.

Once Docker is running:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

See [docs/DATA.md](./docs/DATA.md). BullMQ workers come in Phase 2.

## Product rules

- Hero product moment: **Run weekly ops** → live Mission Control → approval board
- Never market as “project management”
- No GitHub PR review features (CodePulse owns that lane)
- LLMs only in Referee (writeups) and Coach (nudges); orchestration stays deterministic
