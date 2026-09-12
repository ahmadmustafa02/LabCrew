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

<img width="1539" height="956" alt="LabCrew" src="https://github.com/user-attachments/assets/bbf07ebb-1d43-4a01-95e6-6ceec6b6f80a" />
<img width="1694" height="953" alt="LabCrew" src="https://github.com/user-attachments/assets/5f9c581d-c665-4df8-851e-2210030d6686" />
<img width="1553" height="955" alt="LabCrew" src="https://github.com/user-attachments/assets/81125dfc-5ddb-4cbb-a46a-53496e234284" />
<img width="1624" height="950" alt="LabCrew" src="https://github.com/user-attachments/assets/ba89f290-b263-4bb5-9cb3-d5196e03b4af" />
<img width="1662" height="949" alt="LabCrew" src="https://github.com/user-attachments/assets/4121ed60-707d-42d1-be0c-c0f0b426eccb" />
<img width="1696" height="952" alt="LabCrew" src="https://github.com/user-attachments/assets/adfaa1f1-7d0a-4906-b635-6763c8a564a0" />
<img width="1664" height="950" alt="LabCrew" src="https://github.com/user-attachments/assets/08dd0061-6bfe-4aa6-9ee3-1aae47201d74" />

<br/>

LabCrew is the operating system for **research labs and internship cohorts**. A director plans the term. Students always see one next step. Papers and datasets come from live APIs — empty is honest, nothing is invented.

| For directors | For students |
| ------------- | ------------ |
| Plan a topic → draft weeks → assign only when you click add | **Do this next** — one recommended action, not a task dump |
| Find papers and datasets, attach only what students should see | Turn in files, links, writeups, and optional structured rows |
| Catalog a paper into checked fields (unsourced values stay held) | Read trusted catalog rows; held fields stay held |
| Who has what — Week 0 homework + sign-out list | Take / return lab things; Week 0 on day one |
| Review on a work-log thread (pending → revision → approved → done) | Track comments and resubmit as a new post |
| Run weekly ops, approve nudges, export the Monday Brief | Meetings, RSVP, announcements, one message thread |
| Switch labs when you belong to more than one | See only the active lab’s work |

---

## What ships today

| Capability | What it does |
| ---------- | ------------ |
| **Next-step recommender** | Student Home **Do this next**. Fixed order: Week 0 → empty collect → started collect → writeup → overdue sign-out → held catalog field. |
| **Find papers** | Plan → **Find papers**. Semantic Scholar, then arXiv, then OpenAlex. Titles and URLs come from those APIs. A rate-limit miss is retried — it is not cached as “no papers.” |
| **Find datasets** | Plan → **Find datasets**. Hugging Face hub search. Attach as material, or attach + Catalog hold (licence stays held until a quote exists). |
| **Plan from a topic** | Director types a topic. LabCrew drafts weeks. Nothing is assigned until they add it. No invented citations. |
| **Catalog** | Paste or upload a paper. A field is trusted only when the cited sentence is **in the source and supports the value**. The rest stay **held**. Search and compare at `/app/catalog`. |
| **Who has what + Week 0** | Starter homework (account, safety, practice collect) plus a sign-out list: on the shelf / someone took it / you have it / broken. |
| **Field kit** | Flutter companion in [`apps/mobile`](./apps/mobile): sign in, collect rows offline, chart the series. |
| **Walkthrough** | Director + student path (Dr Basit Raza, Ahmad Mustafa) with 10 friction notes: [docs/PHASE7-WALKTHROUGH.md](./docs/PHASE7-WALKTHROUGH.md). That file does not report a measured time-to-competence number. |

Demo stories on the same host: `/demo` · `/demo/resops` · `/demo/dataforge` · `/demo/catalog` · `/demo/next-step` · `/demo/plan`

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
- **Retrieved sources, not invented ones** — Find papers / Find datasets call live APIs; Catalog refuses unsourced fields
- **Next step, not a pile of overdue tasks** — Coach picks one action from the real roster
- **Lab-scoped tenancy** — every query is tied to the active organization
- **One workspace** — plan, assign, collect, catalog, sign-out, meetings, messages, brief

---

## Product surface

### Director

- **Monday Brief** — compiled briefing, standup agenda, cohort data summary, Markdown / print export
- **Mission Control** — dispatch Pulse → Referee → Coach → Clerk
- **Plan** — topic → draft roadmap → add assignments. **Find sources** on the plan.
- **Assignments** — materials, rubrics, structured data schemas, open/close/reopen
- **Who has what** — Week 0 starter tasks + sign-out list
- **Catalog** — paper → checked record
- **Approvals** — edit / approve / reject nudge drafts
- **Meetings · Messages · Announcements · Analytics · Team**

### Student

- **Home** — **Do this next**, upcoming meetings, tasks, inbox
- **Who has what** — take or return lab things
- **Assignments** — each turn-in is a work-log post
- **Catalog** — trusted rows only
- **Meetings · Messages · Announcements**

### Collaboration on submissions

Students and directors share a per-submission **work feed**: posts for each turn-in, comments, and light reactions.

### Structured cohort data (optional)

Assignments can collect CSV / form rows as lab-scoped data cells (validate → flag outliers → summarize on the Brief with privacy floors). Details: [docs/DATA.md](./docs/DATA.md).

### Marketing site

`/` · `/product` · `/how-it-works` · `/pricing` · `/demo`

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

Do **not** run a full `docker compose up` on a machine that already has demo data — that re-seeds and can wipe catalog / gear.

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
| `SEMANTIC_SCHOLAR_API_KEY` | Optional — higher Find-papers quota |
| `LLM_API_KEY` | Optional — enables LLM Referee / Coach |
| `LLM_BASE_URL` | Default `https://api.groq.com/openai/v1` |
| `LLM_MODEL` | Default `openai/gpt-oss-20b` |

Without `LLM_API_KEY`, scoring and nudge copy use heuristics. Without SMTP, reset links and nudge delivery land in the **server console**.

Full free-host notes: [docs/DEPLOY-FREE.md](./docs/DEPLOY-FREE.md) · Administrator guide: [ADMIN.md](./ADMIN.md)

---

## Two-minute walkthrough

1. **Sign up** at `/signup` → creates your organization + program
2. **Invite a student** from Team (copy invite link) · or use a second browser / account
3. **Plan** a topic → add the drafted assignments · or create one by hand
4. **Find papers / Find datasets** and attach what students should see
5. As student: **Do this next** → turn in a work-log post
6. As director: **review** on the thread → Pending / Needs revision / Approved / Done
7. **Run weekly ops** in Mission Control (worker running)
8. **Approvals** → edit & approve a nudge · open **Monday Brief**

Seeded demo password (if you ran `npm run db:seed`): `labcrew`

Walkthrough accounts (same password): `basit.raza@faculty.comsats.lab` (Dr Basit Raza, director), `ahmad.mustafa@students.comsats.lab` (Ahmad Mustafa, student).

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
                                 └─────────────┘
                                        │
                                        ▼
                                 PostgreSQL
                          (runs, approvals, brief)
```

Approving a **nudge** delivers it to the named student (SMTP or console) and creates an in-app notification. It does not change assignment or submission status.

---

## Product rules

- Hero moment: plan → find sources → next step → brief
- Never market as “project management”
- LLMs assist scoring/copy; orchestration stays deterministic
- Prefer honest empty states over silent fake success
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
| [docs/PHASE7-WALKTHROUGH.md](./docs/PHASE7-WALKTHROUGH.md) | Director + student walkthrough · 10 friction notes |
| [docs/DESIGN.md](./docs/DESIGN.md) | Design system · light/dark tokens |
| [docs/DEPLOY-FREE.md](./docs/DEPLOY-FREE.md) | $0 self-host, Gmail SMTP, Google OAuth |
| [docs/diagrams/](./docs/diagrams/) | C4 / ops Mermaid diagrams |

---

<p align="center">
  <strong>LabCrew</strong> · Humans approve. Agents execute.
</p>
