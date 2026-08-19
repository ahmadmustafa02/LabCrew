# ADR: Structured data submissions (generic key-value rows)

## Status

Accepted — Phase A (Collect) + Phase B (Clean) + Phase C (Visualize)

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

**`STUDENT_AGGREGATE_MIN_N = 3`**. With 1–2 contributors, mean + own value can recover a classmate’s exact value. Below that threshold, student payload returns `status: insufficient_cohort` and **hides** mean/median (with an explicit message). Directors still see full cohort.

## Consequences

- Isolation: Lab A ↛ Lab B cells; student filter ↛ peer raw rows (same lab).
- Phase D Brief can aggregate without parsing files.
