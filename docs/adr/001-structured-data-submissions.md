# ADR: Structured data submissions (generic key-value rows)

## Status

Accepted — Phase A (Collect) + Phase B (Clean) + Phase C (Visualize) + Phase D (Analyze / Monday Brief)

## Context

Directors need cohort-level numbers without opening every file. Assignments vary wildly (assays, surveys, latency benches), so a fixed typed table per domain does not fit LabCrew.

## Decision

Store structured submission cells in **`SubmissionDataPoint`**:

| Field | Role |
| ----- | ---- |
| `submissionId` + `organizationId` | Extends existing Submission; lab-scoped |
| `rowIndex` | Logical CSV/form row |
| `columnName` + `value` + `valueType` | Generic cell |
| `flagged` / `flagReason` | Phase B quality flags (duplicates, IQR) |

Optional director schema lives on **`Milestone.dataSchema`**. Rubric: `acceptData`, `requireData`.

### Schema / typing behavior

| Mode | Columns | `valueType` | Validation |
| ---- | ------- | ----------- | ---------- |
| **Director `dataSchema` set** | Schema columns only | Declared type after coerce | Reject missing headers / type mismatches |
| **No schema (freeform)** | All keys | Inferred **per cell** | No column reject; IQR uses `NUMBER` cells |

## Clean (Phase B)

1. Schema validation when director schema present.
2. Duplicate flags (`duplicate_row`, `duplicate_resubmission`) — flag, still store.
3. IQR Tukey fences — flag, do not reject. **`IQR_MIN_SAMPLE = 4`**. Below that: **no IQR flags**; Phase C surfaces `outlierCheck.status = insufficient_sample` in the UI (not silent / not identical to “checked clean”).

## Visualize (Phase C)

- Endpoint: `GET /api/assignments/[id]/cohort-data` (lab-scoped).
- **Director:** histogram bins + cohort table with flags.
- **Student:** own values + cohort mean/median only; `peerRawRows` always `null`.

### Small-cohort privacy

**`STUDENT_AGGREGATE_MIN_N = 3`** — deliberate privacy floor, **independent of** `IQR_MIN_SAMPLE = 4`.

- At **n=2**, mean + own value recovers the other student’s exact value → hide aggregates.
- At **n=3**, mean is no longer a trivial 1:1 recovery of a single peer, but a student can still narrow the other two (especially if values cluster). That residual risk is **accepted** as a product tradeoff so small real labs still see cohort context once a third contributor appears — not “IQR−1”. Raising the floor later (e.g. 5) is an option if labs complain.

## Analyze (Phase D)

Clerk (weekly-ops agent) appends a **data-summary line** to the Monday Brief when the active milestone has `SubmissionDataPoint` rows: contributor count, cell count, flagged count, per-numeric-column mean + IQR status. Propagated to brief UI + Markdown/HTML export. No raw peer rows in the brief.

## Consequences

- Isolation: Lab A ↛ Lab B cells; student filter ↛ peer raw rows (same lab).
- Monday Brief Clerk step includes data summary when structured cells exist.
