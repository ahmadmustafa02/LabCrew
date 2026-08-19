# Tenancy (Phase 1)

## Decisions (locked)

| Decision | Choice |
| -------- | ------ |
| Tenant key | `organizationId`, aliased as **`labId`** in code. No rename of `Organization` → `Lab`. |
| Enforcement | **Repository / helper layer only** (`requireLabScope`, `find*InLab`, `inLab`). **No Prisma middleware or client extensions** for tenant injection (same verified choice as CodePulse Phase 2 — middleware cannot cleanly scope models with different keying; LabCrew’s model list is longer and messier). |
| Auth for helpers | **Cookie session (web) OR `Authorization: Bearer` (mobile/API)** from day one. Phase 4 Flutter must not redesign `requireLabScope`. |
| Offline sync conflicts (Phase 4) | Server is authoritative baseline; never silently discard a queued offline draft. On conflict, student chooses **keep mine / view theirs**. |
| Flutter layout | Monorepo `apps/mobile`. |
| CI | Isolation suite **must pass on every PR** (`npm run test:isolation`). Same gate should be added to CodePulse once LabCrew Phase 1 lands. |

## Canonical helpers

- `src/server/tenancy/lab-scope.ts` — `requireLabScope` / `requireLabDirector` / `requireLabStudent` / `inLab` / `assertLabMatch`
- `src/server/tenancy/lab-repo.ts` — lab-scoped finders by id
- `src/server/auth/api-tokens.ts` — issue / resolve / revoke bearer tokens (`lc_…`, sha256 stored)

## Rules for new code

1. Every tenant-owned row carries `organizationId` (set on create from `ctx.labId`).
2. Load-by-id goes through `find*InLab(labId, id)` or an equivalent `where: { id, organizationId: labId }`.
3. Never trust client-supplied `programId` / `organizationId` for authorization.
4. Worker jobs carry `organizationId` and re-validate before running.
5. Do not introduce Prisma middleware for tenancy.

## ApiAccessToken (bearer) answers

| Question | Answer |
| -------- | ------ |
| Scoped to a single lab? | **Yes.** Token row stores `organizationId`. `resolveLabContext` reloads membership with `organizationId: expectedLabId` — mismatch → null. `labId` always comes from the token/membership, never the client body. |
| Expire? | **Yes.** Default **90 days**. Tests may pass `expiresAt: null`. Expired / revoked → resolve fails. |
| Revoke path? | **Yes.** `revokeApiAccessToken(id, labId)` + `DELETE /api/auth/tokens/[id]` (lab + user scoped). `GET /api/auth/tokens` lists metadata only (no plaintext). |
| Rate limit? | **Yes, bearer-only.** Sliding window in `requireLabScope` via `checkBearerRateLimit` (120 req / 60s per token hash). Session cookies are not covered by this limiter. |

Isolation suite includes **bearer-authenticated** Lab A tokens attempting Lab B resource IDs (separate from session path).

## Phase status

- **1a done:** schema + helpers + high-risk ID routes + isolation scaffold
- **1b done (blocking):** meetings / messages / invites / portal on `requireLabScope`; invite accept by join-token only; bearer rate limit + revoke; verbose A/B + bearer cross-lab tests
- **Still open:** mark GitHub **required status check** for workflow job `Lab A/B isolation suite` on `master` (workflow file alone does not block merges); remaining demos/analytics/announcements audit; CodePulse CI gate follow-up
