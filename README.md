# LabCrew

**Your lab’s AI operations crew.**  
Humans direct. Agents collect signals, score evidence, draft nudges, and prepare the Monday briefing — nothing reaches students until you approve.

<br/>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=nextdotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img alt="Redis" src="https://img.shields.io/badge/Redis_BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma_7-2D3748?style=flat-square&logo=prisma&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-Private-6e6e73?style=flat-square" />
</p>

<img width="1539" height="956" alt="image" src="https://github.com/user-attachments/assets/bbf07ebb-1d43-4a01-95e6-6ceec6b6f80a" />

<br/>

LabCrew is the operating system for **research labs and internship cohorts** — not a generic project manager, and not a GitHub PR bot ([CodePulse](https://getcodepulse.vercel.app) owns that lane).

| For directors | For students |
| ------------- | ------------ |
| Run weekly ops from Mission Control | Submit work with files, links, and writeups |
| Review submissions (pending → revision → approved → done) | Track review status and professor comments |
| Approve or edit nudges before email | Join meetings, RSVP, read announcements |
| Read / export the Monday Brief | Message directors in one thread |

---

## Why LabCrew

Research cohorts drown in Slack threads, missing demos, and silent students. LabCrew closes a weekly loop:

```text
  Signals  →  Evidence  →  Drafts  →  Human approval  →  Brief
   Pulse      Referee     Coach         You            Clerk
```

- **Deterministic orchestration** — agents run in a fixed pipeline (BullMQ worker)
- **LLMs only where language/scoring helps** — optional; heuristics work without a key
- **Human-in-the-loop** — nudges never auto-send
- **One workspace** — assignments, meetings, messages, announcements, analytics

---

## Product surface

### Director

- **Monday Brief** — compiled briefing + Markdown / print export  
- **Mission Control** — dispatch Pulse → Referee → Coach → Clerk  
- **Assignments** — materials, rubrics, ClickUp-style review workflow  
- **Approvals** — edit / approve / reject nudge drafts (SMTP when configured)  
- **Meetings · Messages · Announcements · Analytics · Team**

### Student

- **Home** — upcoming meetings, tasks, unseen inbox  
- **My tasks** — submit evidence, attachments, repos, writeups  
- **Meetings · Messages · Announcements**

### Marketing site

Polished SaaS pages with light/dark mode: `/` · `/product` · `/how-it-works` · `/pricing`

---

## Stack

| Layer | Choice |
| ----- | ------ |
| App | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 |
| Data | PostgreSQL · Prisma 7 · files stored in Postgres (no S3 required) |
| Jobs | Redis · BullMQ worker (`npm run worker`) |
| Auth | Auth.js — credentials, invites, optional Google OAuth |
| Email | Optional SMTP (e.g. free Gmail App Password); else console |
| LLM | Optional OpenAI-compatible API (defaults to Groq) |

---

## Quick start

### Option A — full Docker stack

```bash
cp .env.example .env
docker compose up --build
# or: ./scripts/install.sh   ·   .\scripts\install.ps1
```

Open **http://localhost:3000/signup** · Admin guide: **[ADMIN.md](./ADMIN.md)**

### Option B — local Node + Docker infra

```bash
# 1) Infra
docker compose up -d postgres redis

# 2) App
npm install
cp .env.example .env
npx prisma migrate deploy
npm run db:seed          # optional demo cohort

# 3) Two terminals
npm run worker           # required for live weekly ops
npm run dev              # http://localhost:3000
```

> **Important:** Mission Control live dispatch needs Postgres, Redis, **and** the worker. If Redis is down, the UI shows **pipeline degraded** and blocks dispatch. If Redis is up but the worker is offline, jobs still enqueue and the UI shows **queued — processing delayed**. See [ADMIN.md](./ADMIN.md).

---

## Environment

Copy `.env.example` → `.env`. Minimum for local:

```bash
DATABASE_URL="postgresql://labcrew:labcrew@localhost:5434/labcrew?schema=public"
REDIS_URL="redis://localhost:6380"
AUTH_SECRET="labcrew-dev-secret-change-me"
AUTH_URL="http://localhost:3000"
```

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | Postgres (host port **5434** in compose) |
| `REDIS_URL` | Redis (host port **6380** in compose) |
| `AUTH_SECRET` / `AUTH_URL` | Auth.js session |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional Google login |
| `SMTP_*` / `EMAIL_FROM` | Optional real email for nudges & resets |
| `LLM_API_KEY` | Optional — enables LLM Referee / Coach |
| `LLM_BASE_URL` | Default `https://api.groq.com/openai/v1` |
| `LLM_MODEL` | Default `llama-3.1-8b-instant` |

Without `LLM_API_KEY`, scoring and nudge copy use heuristics. Without SMTP, reset links and nudge delivery land in the **server console**.

Full free-host notes: [docs/DEPLOY-FREE.md](./docs/DEPLOY-FREE.md) · Administrator guide: [ADMIN.md](./ADMIN.md)

---

## Two-minute walkthrough

1. **Sign up** at `/signup` → creates your organization + program  
2. **Invite a student** from Team (copy invite link) · or use a second browser / account  
3. **Create an assignment** with materials + rubric  
4. As student: **submit** writeup / links / attachments  
5. As director: **review** → Pending / Needs revision / Approved / Done  
6. **Run weekly ops** in Mission Control (worker running)  
7. **Approvals** → edit & approve a nudge · open **Monday Brief**

Seeded demo password (if you ran `npm run db:seed`): `labcrew`

---

## Scripts

```bash
npm run dev          # Next.js
npm run worker       # BullMQ ops worker
npm run build        # Production build
npm run db:migrate   # Prisma migrate (dev)
npm run db:seed      # Demo cohort
npm run db:studio    # Prisma Studio
```

---

## Architecture (ops loop)

```text
┌─────────────┐     enqueue      ┌─────────────┐
│  Next.js    │ ───────────────► │   Redis     │
│  Mission    │                  │   BullMQ    │
│  Control    │ ◄── poll status ─│             │
└─────────────┘                  └──────┬──────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │   Worker    │
                                 │ Dispatcher  │
                                 │ → Pulse     │
                                 │ → Referee   │
                                 │ → Coach     │
                                 │ → Clerk     │
                                 └──────┬──────┘
                                        │
                                        ▼
                                 PostgreSQL
                          (runs, approvals, brief)
```

---

## Product rules

- Hero moment: **Run weekly ops → Brief / Approvals**
- Never market as “project management”
- No GitHub PR review features (CodePulse)
- LLMs assist scoring/copy; orchestration stays deterministic
- Prefer honest empty states over silent fake success in production demos

---

## Docs

| Doc | Contents |
| --- | -------- |
| [docs/PHASES.md](./docs/PHASES.md) | Build phases 0–4 |
| [docs/DESIGN.md](./docs/DESIGN.md) | Design system · light/dark tokens |
| [docs/DEPLOY-FREE.md](./docs/DEPLOY-FREE.md) | $0 self-host, Gmail SMTP, Google OAuth |

---

## Portfolio

**Pillar 2** — AI operations for research labs  
Alongside [CodePulse](https://getcodepulse.vercel.app) — AI for software engineering / PR review

---

<p align="center">
  <strong>LabCrew</strong> · Humans approve. Agents execute.
</p>
