# Workers

## Why a separate process

Next.js handles HTTP. Long agent runs belong in a **BullMQ worker** so they can retry, survive timeouts, and scale independently (ResOps-style platform engineering).

## Local

```bash
docker compose up -d
npm run worker
```

You should see: `listening on queue "labcrew-ops"`.

Enqueue API + DB-backed agent steps come in the next Phase 2 commits.
