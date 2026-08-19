# Build phases

## Product v1 (done)

- Platform shell, agent runtime, director loop, Auth.js, Docker Compose

## Upgrade track

### Phase 1 — Multi-tenancy hardening (done)

- `organizationId` (= labId); `requireLabScope` + `find*InLab` (no middleware); bearer tokens; isolation suite + required CI on `master`
- Meetings / messages / invites on lab scope; invite accept by join-token only

### Phase 2 — Pipeline degraded (done)

- Redis unreachable → block dispatch, show **degraded**
- Worker down but Redis up → allow enqueue, show **delayed**
- No silent mock replay; approvals load failure ≠ empty inbox

### Phase 3 — Installation blueprint (done)

- Hardened Compose + **ADMIN.md** + install scripts

### Structured data A–D (done)

- **A** Collect → **B** Clean → **C** Visualize → **D** Monday Brief (Clerk)
- ADR: [adr/001-structured-data-submissions.md](./adr/001-structured-data-submissions.md)
- Verify: `npm run verify:phase-b|c|d`

### Phase 6 draft — System design docs (in progress)

- Index: [SYSTEM.md](./SYSTEM.md) (tenancy + ops + data pipeline)
- Finalize after Phase 4/5 land

### Phase 4 ∥ 5 — Flutter offline companion + recommender / persuasive UI

- Conflict policy: server baseline; never silent discard of offline draft; user chooses keep mine / view theirs
- Flutter in monorepo `apps/mobile`

### Phase 6 finalize

### Phase 7 — Usability study (human track, parallel)
