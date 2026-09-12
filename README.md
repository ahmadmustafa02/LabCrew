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
<img width="1694" height="953" alt="image" src="https://github.com/user-attachments/assets/5f9c581d-c665-4df8-851e-2210030d6686" />
<img width="1553" height="955" alt="image" src="https://github.com/user-attachments/assets/81125dfc-5ddb-4cbb-a46a-53496e234284" />
<img width="1624" height="950" alt="image" src="https://github.com/user-attachments/assets/ba89f290-b263-4bb5-9cb3-d5196e03b4af" />
<img width="1662" height="949" alt="image" src="https://github.com/user-attachments/assets/4121ed60-707d-42d1-be0c-c0f0b426eccb" />
<img width="1696" height="952" alt="image" src="https://github.com/user-attachments/assets/adfaa1f1-7d0a-4906-b635-6763c8a564a0" />
<img width="1664" height="950" alt="image" src="https://github.com/user-attachments/assets/08dd0061-6bfe-4aa6-9ee3-1aae47201d74" />





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
- **Approvals** — edit / approve / reject **nudge** drafts (email + in-app note when approved; SMTP when configured)  
- **Meetings · Messages · Announcements · Analytics · Team** (invites, roles, revoke)

### Student

- **Home** — upcoming meetings, tasks, unseen inbox, notes from Coach  
- **Assignments** — turn in evidence; each attempt is a **work-log post** (edit a post, or turn in again after feedback)  
- **Meetings · Messages · Announcements**

### Collaboration on submissions

Students and directors share a per-submission **work feed**: posts for each turn-in, comments, and light reactions — so review history stays on the assignment instead of disappearing into chat.

### Structured cohort data (optional)

Assignments can collect CSV / form rows as lab-scoped data cells (validate → flag outliers → summarize on the Brief with privacy floors). Details: [docs/DATA.md](./docs/DATA.md).

### Marketing site

Polished SaaS pages with light/dark mode: `/` · `/product` · `/how-it-works` · `/pricing`

---

## Stack

| Layer | Choice |
| ----- | ------ |
| App | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 |
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
| `LLM_MODEL` | Default `llama-3.1-8b-instant` |

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
