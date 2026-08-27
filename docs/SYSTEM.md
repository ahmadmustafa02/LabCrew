# LabCrew system design (Phase 6)

Short map of how the running system fits together. Deep dives live in linked docs -- this file is the index.

## 1. Processes

| Process | Role | Entry |
| ------- | ---- | ----- |
| **web** | Next.js App Router -- marketing, `/app`, API routes | `npm run dev` / Compose `web` |
| **worker** | BullMQ consumer -- weekly ops agents + Redis heartbeat | `npm run worker` / Compose `worker` |
| **postgres** | Source of truth (incl. file blobs) | Compose `postgres` |
| **redis** | Ops queue + worker heartbeat | Compose `redis` |

Day-2 ops: [ADMIN.md](../ADMIN.md).

### C4 context (L1)

Actors and external systems LabCrew talks to in the **shipped** product (Adaptive Coach Phase C retrieval + nudge SMTP included).

```mermaid
flowchart TB
  subgraph People
    director["Director<br/>Runs weekly ops, Approvals, assignments"]
    student["Student<br/>Submits work; sees pace + approved reading/nudges"]
  end

  labcrew["LabCrew<br/>Research-lab OS: tenancy, Mission Control,<br/>Approvals, structured data, Adaptive Coach"]

  subgraph Externals
    smtp["SMTP<br/>Approved nudge delivery<br/>(console fallback)"]
    s2["Semantic Scholar<br/>Primary paper search"]
    arxiv["arXiv API<br/>Fallback paper search"]
    llm["LLM API optional<br/>Groq/OpenAI-compatible<br/>Referee + Coach when LLM_API_KEY set"]
  end

  director -->|cookie / bearer| labcrew
  student -->|cookie / bearer| labcrew
  labcrew -->|deliverNudge on approve| smtp
  labcrew -->|search on assignment create/edit| s2
  labcrew -->|fallback search| arxiv
  labcrew -->|optional score/draft| llm
```

### C4 container (L2)

Matches the process table above. Auth: **web sessions (Auth.js cookies)** and **mobile/API bearers (`ApiAccessToken` / `lc_...`)** both enter through `web` → `requireLabScope`.

```mermaid
flowchart LR
  director["Director"]
  student["Student"]
  mobile["Mobile / API client"]

  subgraph LabCrew["LabCrew"]
    web["web<br/>Next.js 16<br/>UI + API<br/>requireLabScope"]
    worker["worker<br/>BullMQ consumer<br/>Dispatcher→Pulse→Referee→Coach→Clerk<br/>Redis heartbeat"]
    postgres[("Postgres 16<br/>tenancy, submissions,<br/>AgentRun/Step, Approvals,<br/>EngagementScore, StoredFile,<br/>ApiAccessToken")]
    redis[("Redis 7<br/>labcrew-ops queue<br/>+ worker heartbeat")]
  end

  smtp["SMTP"]
  search["Semantic Scholar / arXiv"]
  llm["LLM API optional"]

  director -->|"Auth.js cookie session"| web
  student -->|"Auth.js cookie session"| web
  mobile -->|"Bearer lc_... ApiAccessToken"| web
  web --> postgres
  web --> redis
  web --> smtp
  web --> search
  web -.-> llm
  worker --> redis
  worker --> postgres
  worker -.-> llm
```

## 2. Auth & API surface

- **Web:** Auth.js session cookies (`src/auth.ts`, `src/auth.config.ts`).
- **Mobile / API:** Bearer tokens `lc_...` (`src/server/auth/api-tokens.ts`) -- lab-scoped, expiring, revocable.
- API routes resolve a lab via `requireLabScope` / `requireLabDirector` / `requireLabStudent` (`src/server/tenancy/lab-scope.ts`).

## 3. Tenancy

**Tenant key:** `organizationId`, aliased as **`labId`** in application code.

**Enforcement:** repository / helper layer only (`find*InLab`, `inLab`). **No Prisma middleware** for tenant injection.

**CI gate:** `npm run test:isolation` -- Lab A cannot read Lab B (including bearer path, structured data, peer raw rows, and Phase D student coach reads). Required on `master`.

Deep dive: [TENANCY.md](./TENANCY.md).

## 4. Weekly ops pipeline

```text
POST /api/ops/runs  ->  BullMQ  ->  worker
                                   |
         Dispatcher -> Pulse -> Referee -> Coach -> Clerk
                                   |
                                Postgres (AgentRun / AgentStep / ApprovalItem)
```

- Queue: `src/server/queue/ops-queue.ts`
- Worker: `src/server/workers/ops-worker.ts`
- Agents: `src/server/agents/weekly-ops.ts` (Pulse also upserts `EngagementScore`; Coach personalizes from trends)
- Detail: [WORKERS.md](./WORKERS.md)

### Sequence — weekly ops

```mermaid
sequenceDiagram
  autonumber
  actor Director
  participant Web as web Next.js
  participant Redis as Redis BullMQ
  participant Worker as worker
  participant PG as Postgres

  Director->>Web: POST /api/ops/runs requireLabDirector
  Web->>Web: probeOpsHealth

  alt Redis down - degraded
    Web-->>Director: 503 degraded - enqueue blocked
  else Redis up, worker heartbeat stale/missing - delayed
    Web->>PG: create AgentRun QUEUED
    Web->>Redis: enqueue weekly-ops job
    Web-->>Director: 200 delayed - job waiting for worker
    Note over Redis,Worker: Job sits until worker recovers / heartbeat fresh
    Worker->>Redis: claim job when back online
  else Redis up, worker heartbeat fresh - ok
    Web->>PG: create AgentRun QUEUED
    Web->>Redis: enqueue weekly-ops job
    Web-->>Director: 200 ok
    Worker->>Redis: claim job
  end

  opt job claimed by worker
    Worker->>PG: AgentRun RUNNING
    Worker->>PG: AgentStep DISPATCHER
    Worker->>PG: AgentStep PULSE signals + EngagementScore upsert
    Worker->>PG: AgentStep REFEREE score submissions to exceptions
    Worker->>PG: AgentStep COACH draft ApprovalItem nudges PENDING
    Worker->>PG: AgentStep CLERK briefing + data-summary line
    Worker->>PG: AgentRun SUCCEEDED + summary JSON
    Note over Director,PG: Director later approves nudges in Approvals, deliverNudge to SMTP or console
  end
```

## 5. Ops health / degraded modes

`GET /api/ops/health` (`src/server/ops/health.ts`):

| Redis | Worker heartbeat | Mode |
| ----- | ---------------- | ---- |
| down | -- | **degraded** -- dispatch blocked |
| up | stale / missing | **delayed** -- enqueue OK; processing waits |
| up | fresh (< 90s) | **ok** |

Mission Control surfaces these banners; approvals load failure is not an empty inbox.

## 6. Structured data pipeline (Collect -> Analyze)

Canonical ADR: [adr/001-structured-data-submissions.md](./adr/001-structured-data-submissions.md).

| Phase | What | Key paths |
| ----- | ---- | --------- |
| **A Collect** | `SubmissionDataPoint` cells; optional `Milestone.dataSchema`; rubric `acceptData` | `prisma/schema.prisma`, `src/server/data/submission-data.ts`, `POST .../assignments/[id]/submit` |
| **B Clean** | Schema validation (director schema only); duplicate flags; IQR outliers (**flag, do not reject**); `IQR_MIN_SAMPLE = 4` | `src/server/data/data-quality.ts`, `scripts/verify-phase-b.ts` |
| **C Visualize** | Director histograms + flagged table; student own vs aggregates; `STUDENT_AGGREGATE_MIN_N = 3` (privacy floor, independent of IQR) | `GET .../cohort-data`, `src/server/data/cohort-stats.ts`, `scripts/verify-phase-c.ts` |
| **D Analyze** | Clerk appends data-summary line to Monday Brief (means, flagged counts; **no peer raw rows**) | `src/server/data/brief-data-summary.ts`, Clerk step in `weekly-ops.ts`, `scripts/verify-phase-d.ts` |

**Privacy rules:**

- Students: never return classmates' raw cells; hide cohort mean/median when contributor count < 3.
- **Monday Brief / exports** use the **same** floors (hotfix after Phase D): below 3 contributors the line is `aggregates hidden -- insufficient data (N of 3 min contributors)` and does **not** print means. Lock: `npm run verify:brief-privacy`.

**Verify scripts:** `npm run verify:phase-b` | `verify:phase-c` | `verify:phase-d` | `verify:brief-privacy`.

### Sequence — structured data submit → visualize (privacy branches)

```mermaid
sequenceDiagram
  autonumber
  actor Student
  actor Director
  participant Web as web API
  participant PG as Postgres
  participant Clean as data-quality / cohort-stats

  Student->>Web: POST /api/assignments/id/submit CSV or cells
  Web->>Web: requireLabStudent + lab-scoped milestone

  alt director dataSchema present AND headers/types invalid
    Web-->>Student: 400 reject clear error
  else valid or freeform
    Web->>PG: upsert Submission + SubmissionDataPoint rows

    Web->>Clean: duplicate detection row fingerprint / resubmit
    alt duplicate_row or duplicate_resubmission
      Clean-->>Web: flag duplicate_* still store, do not reject
    else unique rows
      Clean-->>Web: no duplicate flags
    end

    Web->>Clean: IQR Tukey fences
    alt numeric sample size less than IQR_MIN_SAMPLE 4
      Clean-->>Web: outlierCheck insufficient_sample no IQR flags
    else sample at least 4
      Clean-->>Web: flag outliers still accepted
    end

    Web->>PG: persist flags
    Web-->>Student: 200 submission + dataTable
  end

  Note over Student,Director: Later reads

  Director->>Web: GET cohort-data
  Web->>PG: all lab cells for milestone
  Web-->>Director: bins + flagged table + peer rows

  Student->>Web: GET cohort-data
  Web->>PG: lab cells then filter
  Web->>Clean: contributorCount vs STUDENT_AGGREGATE_MIN_N 3
  alt contributors less than 3
    Web-->>Student: own values only, aggregates insufficient_cohort, peerRawRows null
  else contributors at least 3
    Web-->>Student: own values + mean/median, peerRawRows null
  end

  Note over Web,PG: Monday Brief Clerk uses the same floors - never prints means when n less than 3
```

## 7. Data store

- Prisma 7 + Postgres adapter (`src/lib/db.ts`, `prisma/schema.prisma`).
- Local setup: [DATA.md](./DATA.md).
- Files stored as `StoredFile` blobs in Postgres (no S3 required for v1).

## 8. UI system

Product look-and-feel (not architecture): [DESIGN.md](./DESIGN.md). Adaptive Coach student tone: same file § Adaptive Coach tone.

## 9. Doc map

| Doc | Role |
| --- | ---- |
| [PHASES.md](./PHASES.md) | Build / upgrade track |
| [TENANCY.md](./TENANCY.md) | Lab isolation rules |
| [DATA.md](./DATA.md) | Prisma / local DB |
| [WORKERS.md](./WORKERS.md) | BullMQ worker |
| [DESIGN.md](./DESIGN.md) | Visual design system |
| [adr/001-...](./adr/001-structured-data-submissions.md) | Structured data decisions |
| [adr/002-...](./adr/002-adaptive-coach.md) | Adaptive Coach (engagement + resources) |
| [ADMIN.md](../ADMIN.md) | Install + ops bible |
| **This file** | System design index + C4 / sequence diagrams |

## Status

**Finalized (Phase 6)** -- index/table shape plus Mermaid C4 context, C4 container, weekly-ops sequence, and structured-data privacy sequence. Diagrams match the shipped tree (post Adaptive Coach A–D on `master`).

Keep the §6 Brief-privacy hotfix note honest (caught after structured-data Phase D); do not scrub it for tidiness.
