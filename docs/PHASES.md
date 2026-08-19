# Build phases

## Product v1 (done)

- Platform shell, agent runtime, director loop, Auth.js, Docker Compose

## Upgrade track (approved)

### Phase 1 — Multi-tenancy hardening (in progress)

- **1a:** `organizationId` (= labId); `requireLabScope` + `find*InLab` (no middleware); bearer tokens; high-risk ID routes; isolation suite + CI workflow
- **1b (blocking before Phase 2):** meetings / messages / invites / portal on `requireLabScope`; invite accept by join-token only (no id lookup); bearer rate limit + revoke API; verbose A/B + bearer cross-lab isolation tests
- Follow-up: mark **Isolation** as a **required** status check on `master` (workflow present ≠ merge-blocking). Same CI gate for CodePulse.

### Phase 2 — Pipeline degraded (not silent demo)

- Redis unreachable → block dispatch, show degraded
- Worker down but Redis up → allow enqueue, show “queued, processing delayed”
- No silent mock replay for authenticated ops

### Phase 3 — Installation blueprint

- Harden one-command Compose + **ADMIN.md**

### Phase 6 draft — System design docs (after 1–3)

### Phase 4 ∥ 5 — Flutter offline companion + recommender / persuasive UI

- Conflict policy: server baseline; never silent discard of offline draft; user chooses keep mine / view theirs
- Flutter in monorepo `apps/mobile`

### Phase 6 finalize

### Phase 7 — Usability study (human track, parallel)
