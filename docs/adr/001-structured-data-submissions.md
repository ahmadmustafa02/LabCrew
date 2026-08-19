# ADR: Structured data submissions (generic key-value rows)

## Status

Accepted — Phase A (Collect)

## Context

Directors need cohort-level numbers without opening every file. Assignments vary wildly (assays, surveys, latency benches), so a fixed typed table per domain does not fit LabCrew.

## Decision

Store structured submission cells in **`SubmissionDataPoint`**:

| Field | Role |
| ----- | ---- |
| `submissionId` + `organizationId` | Extends existing Submission; lab-scoped |
| `rowIndex` | Logical CSV/form row |
| `columnName` + `value` + `valueType` | Generic cell |

Optional director schema lives on **`Milestone.dataSchema`**:

```json
{ "columns": [{ "name": "od600", "type": "number" }, { "name": "sample_id", "type": "text" }] }
```

Rubric flags: `acceptData`, `requireData` (Phase A uses `acceptData`).

### Alternatives rejected

1. **Per-assignment typed SQL tables** — migration explosion, Prisma complexity, weak fit for ad-hoc student columns.
2. **JSON blob only on Submission** — hard to query/index for cohort charts (Phase C) and isolation tests on row-level access.
3. **Wide fixed columns** — cannot support arbitrary experiments.

## Outlier flagging (Phase B — chosen method, not implemented yet)

**IQR fences** per numeric column within the assignment cohort so far (`Q1 − 1.5×IQR` … `Q3 + 1.5×IQR`). Flag, do not reject. Rationale: robust to small-n cohorts and skewed lab metrics; z-score needs more stable variance.

## Consequences

- Phase C charts aggregate from `SubmissionDataPoint` filtered by `organizationId`.
- Student privacy: APIs must never return another student’s raw cells to a student principal (isolation test in Phase C; Phase A only exposes own rows + lab tenancy).
- Phase D Brief summaries can `GROUP BY` / aggregate without parsing files.
