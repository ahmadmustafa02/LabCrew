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

### Phase 4 — Flutter offline companion (done — Field kit v1)

- Conflict policy: server baseline; never silent discard of offline draft; user chooses keep mine / view theirs
- Flutter in monorepo `apps/mobile` (Home / Collect / Insights / You)
- Bearer issue: `POST /api/auth/mobile/login` and `POST /api/auth/tokens`

### Phase 5 — Adaptive Coach
- **Adaptive Coach Phase A (engagement score):** lab-scoped per-student per-week heuristic; director Analytics only. ADR: [adr/002-adaptive-coach.md](./adr/002-adaptive-coach.md). Verify: `npm run verify:phase-5a`
- **Phase B (nudge personalization):** Coach reads score trend → warmer/earlier vs reinforce drafts in Approvals. Verify: `npm run verify:phase-5b`
- **Phase C (resources):** Semantic Scholar → arXiv retrieval; LLM selects only from hits; Approvals gate; `Milestone.coachResources` on approve. Verify: `npm run verify:phase-5c`
- **Phase D (persuasive UI):** Student home pace + approved nudge; assignment suggested reading. Verify: `npm run verify:phase-5d`
- **Next step (not a coding ITS):** deterministic pick — empty collect, then writeup, then held catalog fields. Web Home + Field Home. Tests: `npx tsx --test tests/data/recommend.test.ts`

### Who has what — starter homework + gear list (ResOps)

- Director adds three Week 0 assignments (account, safety, practice collect). Next step prefers them.
- Sign-out list: on the shelf / someone took it / broken. Not a purchase or repair shop.
- Web: `/app/desk`

### Research plan (director) — topic → draft → add

- Manual assignment create stays. **Plan from a topic** drafts collect / catalog / writeup / review weeks.
- Heuristic without `LLM_API_KEY`; model draft if set. Citations and URLs are stripped.
- Commit writes real milestones. Student **Do this next** then follows that roster.
- Similar papers (Semantic Scholar → arXiv → OpenAlex) and datasets (Hugging Face) on **Plan → Find sources**. Rate-limit misses are retried, not cached as empty. Attach as materials. Dataset Catalog rows hold unsourced fields. No invented titles.
- Tests: `npx tsx --test tests/research/roadmap.test.ts`

### Catalog — paper → checked record (done)

- D4ED-shaped fields; quote must appear in the source; unsupported values are held
- Web: `/app/catalog` search + compare; human approve/reject on held fields
- Not a chatbot. Verifier is deterministic.

### Phase 6 finalize (done)

- Mermaid in [SYSTEM.md](./SYSTEM.md): C4 context, C4 container, weekly-ops sequence, structured-data privacy sequence.
- Status line on SYSTEM.md set to **Finalized**; Brief-privacy hotfix callout retained.

### Phase 7 — Director + student walkthrough

- Notes: [PHASE7-WALKTHROUGH.md](./PHASE7-WALKTHROUGH.md) (Dr Basit Raza, Ahmad Mustafa).
- Do **not** claim a measured time-to-competence number from this file.
