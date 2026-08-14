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

## 2-minute demo walkthrough

1. **Start stack** (pick one)
   - Local: `docker compose up -d postgres redis` → `npm run db:push` → `npm run db:seed` → `npm run worker` → `npm run dev`
   - Full Docker: `docker compose up --build`
2. Open [http://localhost:3000/login](http://localhost:3000/login)
3. Sign in as **Director Reed** (`director@northwater.lab` / `labcrew`)
4. Open **Monday Brief** (home) → empty or last packet
5. **Mission Control** → **Run weekly ops** → watch Pulse → Referee → Coach → Clerk
6. **Approvals** → edit/approve a nudge (check terminal for simulated email)
7. Sign out → sign in as **Ayesha** → **My tasks** → submit evidence URL + writeup
8. Back as Director → run weekly ops again → Brief shows updated on-track / exceptions

## Develop (host Node)

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
docker compose up -d postgres redis
npm run db:generate
npm run db:push
npm run db:seed
npm run worker         # separate terminal
npm run dev
```

## Full Docker (web + worker + DB)

```bash
cp .env.example .env
docker compose up --build
```

App: [http://localhost:3000](http://localhost:3000)  
Migrate+seed runs once via the `migrate` service.

### Demo accounts

| Role | Email | Password |
| ---- | ----- | -------- |
| Director | `director@northwater.lab` | `labcrew` |
| Student | `ayesha.rahman@students.northwater.lab` | `labcrew` |

All seeded students use password `labcrew`.

### Optional email

Set `RESEND_API_KEY`, `EMAIL_FROM`, and `NUDGE_TEST_TO` to send approved nudges for real. Without them, Approve logs to the server console.

## Product rules

- Hero moment: **Run weekly ops** → Brief / Approvals
- Never market as “project management”
- No GitHub PR review features (CodePulse owns that lane)
- LLMs only where scoring/copy needs them; orchestration stays deterministic
