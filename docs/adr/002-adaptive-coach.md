# ADR: Adaptive Coach (engagement score + retrieval-grounded resources)

## Status

Accepted — Phase A (Engagement signal + score) + Phase B (nudge personalization) + Phase C (resource suggestions). Phase D planned.

## Context

LabCrew’s Coach drafts human-approved nudges from Pulse silence and Referee exceptions. That is blunt: two quiet students get the same tone, and Coach invents no reading list. Phase 5 extends Coach toward personalized interventions and real paper suggestions — **not** a difficulty / gamification recommender (there are no leveled exercises).

## Decision

### Engagement score (Phase A)

Store a **lab-scoped, per-student, per-week** row `EngagementScore`:

| Field | Role |
| ----- | ---- |
| `organizationId` (= labId) | Tenancy; always filtered via `requireLabScope` / `find*InLab` |
| `programId` + `memberId` | Cohort + student |
| `weekStart` | Monday 00:00 UTC of the ISO week |
| `score` | Heuristic 0–100 (no ML yet) |
| `components` | JSON breakdown of weighted signals |
| `runId?` | Optional weekly-ops run that wrote the row |

**Signals (existing data only):** timeliness (30), overdue (20), revision cycles (15), meeting RSVP (20), message responsiveness (15). Missing components renormalize. Directors only.

### Nudge personalization (Phase B)

Coach loads the last two weekly scores and classifies **declining / strong / stable / unknown**:

| Trend | Approvals label | Behavior |
| ----- | --------------- | -------- |
| Declining (≥12pt drop) | `warm · send earlier` | Warmer copy; suggest a small step today |
| Strong (≥75, sustained) | `encourage · reinforce` | Positive reinforcement even without a Referee exception |
| Stable / unknown | `steady/unknown · standard timing` | Standard kind nudge |

Still **draft-only** → existing Approvals queue. No send bypass.

### Resource suggestions (Phase C)

On assignment **create** and **edit** (title/description change):

1. Query **Semantic Scholar** (`/graph/v1/paper/search`); if empty/error → **arXiv** Atom API.
2. Groq (if configured) may only **select indices + one-line rationale** from the returned catalog — never invent title/URL.
3. Draft `ApprovalItem` with `kind: "resources"` (JSON body). Empty search → `status: "empty"` with an honest note (no fake success).
4. On director approve → write `Milestone.coachResources`. No email delivery for resource drafts.
5. **Student visibility:** `coachResources` is returned on assignment GET for **directors only** until Phase D student UI ships (no student surface yet).
6. **Rate limiting:** in-process search cache (30 min / query) + reuse pending Approvals draft when title/description query is unchanged (repeat edits do not re-hit S2/arXiv).

## Consequences

- Isolation suite covers `EngagementScore` Lab A ↛ Lab B.
- Phase B must not bypass Approvals.
- Phase C must not ship LLM-fabricated citations; empty search is explicit.
- Phase D will surface approved `coachResources` + streaks in student UI.
