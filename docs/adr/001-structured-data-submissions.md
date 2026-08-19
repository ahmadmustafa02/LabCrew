# ADR: Structured data submissions (generic key-value rows)

## Status

Accepted — Phase A (Collect) + Phase B (Clean)

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

Optional director schema lives on **`Milestone.dataSchema`**:

```json
{ "columns": [{ "name": "od600", "type": "number" }, { "name": "sample_id", "type": "text" }] }
```

Rubric flags: `acceptData`, `requireData`.

### Schema / typing behavior

| Mode | Columns | `valueType` | Phase B validation |
| ---- | ------- | ----------- | ------------------ |
| **Director `dataSchema` set** | Schema columns only (extras ignored) | Declared type after coerce | Reject missing headers / type mismatches |
| **No schema (freeform)** | All CSV/form keys | **Inferred per cell** (`true`/`false`→boolean, numeric string→number, else text) — not from the first row as a column schema | No column/type reject; IQR still uses cells stored as `NUMBER` |

### Alternatives rejected

1. **Per-assignment typed SQL tables** — migration explosion, Prisma complexity, weak fit for ad-hoc student columns.
2. **JSON blob only on Submission** — hard to query/index for cohort charts (Phase C) and isolation tests on row-level access.
3. **Wide fixed columns** — cannot support arbitrary experiments.

## Clean (Phase B)

1. **Schema validation** — only when director schema is present; clear 400 errors.
2. **Duplicates** — identical rows within a payload → `duplicate_row`; exact resubmit of prior row set → `duplicate_resubmission` (flag, still store).
3. **IQR outliers** — per numeric column within the assignment cohort in-lab (`Q1 − 1.5×IQR` … `Q3 + 1.5×IQR`), requires ≥4 finite values. Flag, do not reject. Rationale: robust to small-n cohorts and skewed lab metrics.

## Consequences

- Phase C charts aggregate from `SubmissionDataPoint` filtered by `organizationId`.
- Student privacy: APIs must never return another student’s raw cells to a student principal (isolation test in Phase C; Phase A/B only expose own rows + lab tenancy; IQR recomputation is lab+milestone scoped).
- Phase D Brief summaries can `GROUP BY` / aggregate without parsing files.
