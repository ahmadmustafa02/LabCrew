# Workers

## Why a separate process

Next.js handles HTTP. Long agent runs belong in a **BullMQ worker** so they can retry, survive timeouts, and scale independently (ResOps-style platform engineering).

## Local

```bash
docker compose up -d
npm run db:push
npm run db:seed
npm run worker
```

In another terminal: `npm run dev`

You should see: `listening on queue "labcrew-ops"`.

Then open Mission Control → **Run weekly ops** (live mode when seed is present).

## Flow

1. `POST /api/ops/runs` creates `AgentRun` + enqueues BullMQ job  
2. Worker runs Pulse → Referee → Coach → Clerk and writes `AgentStep` rows  
3. UI polls `GET /api/ops/runs/:id` until succeeded  
4. Coach writes pending `ApprovalItem` rows for the Director board

Clerk may append a **structured data** summary to the Monday Brief when the active milestone has `SubmissionDataPoint` rows — see [SYSTEM.md §6](./SYSTEM.md).
