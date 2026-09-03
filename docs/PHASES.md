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

### Structured data A-D (done)

- **A** Collect -> **B** Clean -> **C** Visualize -> **D** Monday Brief (Clerk)
- ADR: [adr/001-structured-data-submissions.md](./adr/001-structured-data-submissions.md)
- Verify: `npm run verify:phase-b|c|d` and `verify:brief-privacy` (Brief means gated below n=3)

### Phase 6 draft -- System design docs (superseded by finalize)

- Index: [SYSTEM.md](./SYSTEM.md) — originally draft tables/index; Brief-privacy hotfix callout kept honest.

### Phase 4 ∥ 5 — Flutter offline companion + Adaptive Coach

- Conflict policy: server baseline; never silent discard of offline draft; user chooses keep mine / view theirs
- Flutter in monorepo `apps/mobile`
- **Adaptive Coach Phase A (engagement score):** lab-scoped per-student per-week heuristic; director Analytics only. ADR: [adr/002-adaptive-coach.md](./adr/002-adaptive-coach.md). Verify: `npm run verify:phase-5a`
- **Phase B (nudge personalization):** Coach reads score trend → warmer/earlier vs reinforce drafts in Approvals. Verify: `npm run verify:phase-5b`
- **Phase C (resources):** Semantic Scholar → arXiv retrieval; LLM selects only from hits; Approvals gate; `Milestone.coachResources` on approve. Verify: `npm run verify:phase-5c`
- **Phase D (persuasive UI):** Student home pace + approved nudge; assignment suggested reading. Verify: `npm run verify:phase-5d`

### Phase 6 finalize (done)

- Mermaid in [SYSTEM.md](./SYSTEM.md): C4 context, C4 container, weekly-ops sequence, structured-data privacy sequence.
- Status line on SYSTEM.md set to **Finalized**; Brief-privacy hotfix callout retained.

### Phase 7 — Usability study (human track, parallel)
