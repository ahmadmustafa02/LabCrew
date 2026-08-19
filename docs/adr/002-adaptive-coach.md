# ADR: Adaptive Coach (engagement score + retrieval-grounded resources)

## Status

Accepted — Phase A (Engagement signal + score). Phases B–D planned.

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

**Signals (existing data only):**

| Component | Weight | Source |
| --------- | ------ | ------ |
| Timeliness | 30 | Active / due milestones: on-time turn-in vs late vs missing |
| Overdue flag | 20 | `dueAt < now` and not SUBMITTED/SCORED (Pulse-style silence + deadline) |
| Revision cycles | 15 | `ReviewStatus.NEEDS_REVISION` count proxy on current submissions |
| Meeting RSVP | 20 | `MeetingInvite.rsvp` for meetings in the week (YES > MAYBE > NO/null) |
| Message responsiveness | 15 | Student reply after a director message in-thread during the week |

Missing components (e.g. no meetings that week) are **dropped and weights renormalized**. Attendance beyond RSVP does not exist yet — do not invent check-ins.

**Visibility:** directors only (Analytics + API). Peers never see another student’s score.

**Compute site:** end of Pulse in `executeWeeklyOps` (upsert for current week). Directors may also trigger recompute via API.

### Resource suggestions (Phase C — planned)

Query **Semantic Scholar** first; fallback **arXiv API**. Groq may only **select + rationalize** from returned hits — never invent titles/links. Drafts use the same Approvals gate as nudges. Empty search → explicit “nothing relevant found.”

### Personalization + persuasive UI (Phases B / D — planned)

Coach reads score trend before drafting (Phase B). Student UI follows Fogg Motivation / Ability / Trigger with non-dark-pattern copy (Phase D).

## Consequences

- Isolation suite must cover `EngagementScore` Lab A ↛ Lab B.
- Phase B must not bypass Approvals.
- Phase C must not ship LLM-fabricated citations.
