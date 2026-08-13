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
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Product rules

- Hero product moment: **Run weekly ops** → live Mission Control → approval board
- Never market as “project management”
- No GitHub PR review features (CodePulse owns that lane)
- LLMs only in Referee (writeups) and Coach (nudges); orchestration stays deterministic
