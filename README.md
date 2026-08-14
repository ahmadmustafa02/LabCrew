# LabCrew

AI operations crew for research labs and project cohorts.  
Humans direct. Agents run the weekly ops loop.

**Pillar 2** of the portfolio (with [CodePulse](https://getcodepulse.vercel.app) as AI-for-SE).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- PostgreSQL + Prisma + BullMQ/Redis
- Auth.js (credentials) · optional Resend for approved nudges

## Phases

| Phase | Status | Focus |
| ----- | ------ | ----- |
| 0 | Done | Design system, product rules |
| 1 | Done | Platform shell + Mission Control |
| 2 | Done | BullMQ weekly ops crew |
| 3 | Done | Approvals, analytics, assignments, Monday Brief |
| 4 | Done | Auth, Docker full stack, walkthrough |

See [docs/PHASES.md](./docs/PHASES.md) and [docs/DESIGN.md](./docs/DESIGN.md).

## Real product flow

1. **Create lab** — [http://localhost:3000/signup](http://localhost:3000/signup) (org + director in Postgres)
2. **Invite students** — Team → create invite → copy join link
3. **Student joins** — `/join?token=…` sets their own password
4. Assignments → submit → weekly ops → approvals → Monday Brief

All APIs require a signed-in session and are scoped to **your** program.

### Optional Northwater demo seed

```bash
npm run db:seed   # demo lab only; password labcrew
```

| Role | Email | Password |
| ---- | ----- | -------- |
| Director | `director@northwater.lab` | `labcrew` |
| Student | `ayesha.rahman@students.northwater.lab` | `labcrew` |

## Develop (host Node)

```bash
npm install
cp .env.example .env
docker compose up -d postgres redis
npm run db:generate
npm run db:push
npm run worker
npm run dev
```

Then open `/signup` for a real lab, or seed + `/login` for the Northwater walkthrough.


## Product rules

- Hero moment: **Run weekly ops** → Brief / Approvals
- Never market as “project management”
- No GitHub PR review features (CodePulse owns that lane)
- LLMs only where scoring/copy needs them; orchestration stays deterministic
