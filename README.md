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
| Run weekly ops from Mission Control | Submit work with files, links, writeups, and optional structured data |
| Review submissions on a work-log thread (pending → revision → approved → done) | Track review status, professor comments, and resubmit as new posts |
| Approve or edit nudges before email | Join meetings, RSVP, read announcements |
| Read / export the Monday Brief | Message directors in one thread |
| Switch across labs when you belong to more than one | See only the active lab’s work |

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
- **Lab-scoped tenancy** — every query is tied to the active organization; multi-lab users switch memberships in the shell
- **One workspace** — assignments, meetings, messages, announcements, analytics

---

## Product surface

### Director

- **Monday Brief** — compiled briefing, standup agenda, cohort data summary, Markdown / print export  
- **Mission Control** — dispatch Pulse → Referee → Coach → Clerk  
- **Assignments** — materials, rubrics, structured data schemas, open/close/reopen, Teams-style list + detail  
- **Plan** — director types a research topic; LabCrew drafts milestones; nothing is assigned until they add it. **Find sources** on a plan: similar papers (Semantic Scholar → arXiv → OpenAlex) and hub datasets (Hugging Face). Rate-limit misses are retried, not cached as “no papers.” Attach as materials; Catalog fields stay held without a quote.  
- **Who has what** — starter homework for a new student, plus who took which lab thing and when it is due back.  
- **Approvals** — edit / approve / reject **nudge** drafts (email + in-app note when approved; SMTP when configured)  
- **Meetings · Messages · Announcements · Analytics · Team** (invites, roles, revoke)

### Student

- **Home** — upcoming meetings, tasks, unseen inbox, notes from Coach, and a **Do this next** card (Week 0 first, then collect, writeup, overdue sign-out, catalog hold)  
- **Assignments** — turn in evidence; each attempt is a **work-log post** (edit a post, or turn in again after feedback)  
- **Meetings · Messages · Announcements**

### Collaboration on submissions

Students and directors share a per-submission **work feed**: posts for each turn-in, comments, and light reactions — so review history stays on the assignment instead of disappearing into chat.

### Structured cohort data (optional)

Assignments can collect CSV / form rows as lab-scoped data cells (validate → flag outliers → summarize on the Brief with privacy floors). Details: [docs/DATA.md](./docs/DATA.md).

### Catalog (paper → checked record)

Paste a paper excerpt or upload a PDF. LabCrew fills dataset fields only when a cited sentence is **in the paper and supports the value**. The rest stay held for a human. Search and compare trusted rows at `/app/catalog`.

### Field kit (Flutter)

Companion app in [`apps/mobile`](./apps/mobile) — sign in, collect rows offline, chart your series. Not a chat clone of the website. Run notes in that folder.

### Marketing site

Polished SaaS pages with light/dark mode: `/` · `/product` · `/how-it-works` · `/pricing`

---

## Stack

| Layer | Choice |
| ----- | ------ |
| App | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 |
| Mobile | Flutter companion (`apps/mobile`) · bearer tokens |
| Data | PostgreSQL · Prisma 7 · files stored in Postgres (no S3 required) |
| Jobs | Redis · BullMQ worker (`npm run worker`) |
| Auth | Auth.js — credentials, invites, optional Google OAuth · active lab via membership |
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
| `LLM_MODEL` | Default `openai/gpt-oss-20b` (Groq retired `llama-3.1-8b-instant`) |

Without `LLM_API_KEY`, scoring and nudge copy use heuristics. Without SMTP, reset links and nudge delivery land in the **server console**.

Full free-host notes: [docs/DEPLOY-FREE.md](./docs/DEPLOY-FREE.md) · Administrator guide: [ADMIN.md](./ADMIN.md)

---

## Two-minute walkthrough

1. **Sign up** at `/signup` → creates your organization + program  
2. **Invite a student** from Team (copy invite link) · or use a second browser / account  
3. **Create an assignment** with materials + rubric (optional data schema)  
4. As student: **submit** writeup / links / attachments → appears as a work-log post  
5. As director: **review** on the thread → Pending / Needs revision / Approved / Done  
6. **Run weekly ops** in Mission Control (worker running)  
7. **Approvals** → edit & approve a nudge (email + in-app) · open **Monday Brief**  
8. If you join another lab, use the **lab switcher** in the shell — lists and reviews stay scoped to the active lab  

Seeded demo password (if you ran `npm run db:seed`): `labcrew`

Walkthrough accounts (same password): `basit.raza@faculty.comsats.lab` (Dr Basit Raza, director), `ahmad.mustafa@students.comsats.lab` (Ahmad Mustafa, student). Notes: [docs/PHASE7-WALKTHROUGH.md](./docs/PHASE7-WALKTHROUGH.md).

Per-professor demo stories (same host as the app):

- `/demo` — index
- `/demo/resops` — Who has what (#1 Manai)
- `/demo/dataforge` — collect (#2 Cao)
- `/demo/catalog` — paper → record (#7 Livingstone)
- `/demo/next-step` — student Home (#4 honest)
- `/demo/plan` — topic + Find sources

On this machine: `http://localhost:3000/demo`. A public URL needs a deploy of this app + Postgres.

---

## Scripts

```bash
npm run dev              # Next.js
npm run worker           # BullMQ ops worker
npm run build            # Production build
npm run db:migrate       # Prisma migrate (dev)
npm run db:seed          # Demo cohort
npm run db:studio        # Prisma Studio
npm run test             # Isolation + data tests
npm run test:isolation   # Lab tenancy isolation suite
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

Approving a **nudge** delivers it to the named student (SMTP or console) and creates an in-app notification. It does not change assignment or submission status.

---

## Product rules

- Hero moment: **Run weekly ops → Brief / Approvals**
- Never market as “project management”
- No GitHub PR review features (CodePulse)
- LLMs assist scoring/copy; orchestration stays deterministic
- Prefer honest empty states over silent fake success in production demos
- Tenancy is enforced in helpers (`requireLabScope` / `find*InLab`) — never trust client-supplied lab IDs

---

## Docs

| Doc | Contents |
| --- | -------- |
| [ADMIN.md](./ADMIN.md) | Install, worker health, day-2 ops |
| [docs/SYSTEM.md](./docs/SYSTEM.md) | System design overview |
| [docs/TENANCY.md](./docs/TENANCY.md) | Lab scope, bearer tokens, isolation rules |
| [docs/DATA.md](./docs/DATA.md) | Structured submissions pipeline |
| [docs/WORKERS.md](./docs/WORKERS.md) | BullMQ worker notes |
| [docs/PHASES.md](./docs/PHASES.md) | Build phases |
| [docs/DESIGN.md](./docs/DESIGN.md) | Design system · light/dark tokens |
| [docs/DEPLOY-FREE.md](./docs/DEPLOY-FREE.md) | $0 self-host, Gmail SMTP, Google OAuth |
| [docs/diagrams/](./docs/diagrams/) | C4 / ops Mermaid diagrams |

---

## Portfolio

**Pillar 2** — AI operations for research labs  
Alongside [CodePulse](https://getcodepulse.vercel.app) — AI for software engineering / PR review

---

<p align="center">
  <strong>LabCrew</strong> · Humans approve. Agents execute.
</p>
