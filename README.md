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

See [docs/DEPLOY-FREE.md](./docs/DEPLOY-FREE.md) for **$0 self-host** (Docker), free Gmail SMTP, and free Google OAuth.

## Free product features

- Signup / invites / Google (optional)
- Password reset (on-page link if no SMTP)
- Files stored in Postgres (no S3)
- Nudges email students when SMTP is set; otherwise console

## Develop (host Node)

```bash
npm install
cp .env.example .env
docker compose up -d postgres redis
npx prisma migrate deploy || npm run db:push
npm run worker
npm run dev
```

Then open `/signup`.


## Product rules

- Hero moment: **Run weekly ops** → Brief / Approvals
- Never market as “project management”
- No GitHub PR review features (CodePulse owns that lane)
- LLMs only where scoring/copy needs them; orchestration stays deterministic
