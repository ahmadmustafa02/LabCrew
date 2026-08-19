import { DataValueType } from "@prisma/client";
import { iqrOutlierIndexes } from "@/server/data/submission-data";

/** IQR needs ≥4 finite values; below this we skip flags and surface insufficient_sample. */
export const IQR_MIN_SAMPLE = 4;

/**
 * Student-facing cohort aggregates (mean/median) require ≥3 submissions with data.
 * With n=2, mean + own value trivially recovers the other student's value.
 */
export const STUDENT_AGGREGATE_MIN_N = 3;

export type OutlierCheckStatus =
  | "insufficient_sample"
  | "checked_clean"
  | "checked_with_flags";

export type HistBin = {
  from: number;
  to: number;
  count: number;
  label: string;
};

export type NumericColumnCohort = {
  columnName: string;
  sampleSize: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  outlierCheck: {
    status: OutlierCheckStatus;
    minRequired: number;
    flaggedCount: number;
  };
  /** Director-only histogram bins */
  bins?: HistBin[];
};

export type CohortRow = {
  submissionId: string;
  memberId: string;
  studentName: string;
  rowIndex: number;
  values: Record<string, string>;
  flagged: boolean;
  flagReasons: string[];
};

type CellIn = {
  id: string;
  submissionId: string;
  rowIndex: number;
  columnName: string;
  value: string;
  valueType: DataValueType | string;
  flagged: boolean;
  flagReason: string | null;
};

type SubmissionMeta = {
  id: string;
  memberId: string;
  studentName: string;
};

function medianOf(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function meanOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function buildHistogram(values: number[], binCount = 8): HistBin[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return [{ from: min, to: max, count: values.length, label: String(min) }];
  }
  const width = (max - min) / binCount;
  const bins: HistBin[] = Array.from({ length: binCount }, (_, i) => {
    const from = min + i * width;
    const to = i === binCount - 1 ? max : min + (i + 1) * width;
    return {
      from,
      to,
      count: 0,
      label: `${from.toFixed(2)}–${to.toFixed(2)}`,
    };
  });
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  }
  return bins;
}

export function outlierCheckForColumn(
  values: number[],
  flaggedCount: number,
): NumericColumnCohort["outlierCheck"] {
  if (values.length < IQR_MIN_SAMPLE) {
    return {
      status: "insufficient_sample",
      minRequired: IQR_MIN_SAMPLE,
      flaggedCount: 0,
    };
  }
  return {
    status: flaggedCount > 0 ? "checked_with_flags" : "checked_clean",
    minRequired: IQR_MIN_SAMPLE,
    flaggedCount,
  };
}

export function buildNumericColumnStats(
  columnName: string,
  cells: CellIn[],
  opts: { includeBins: boolean },
): NumericColumnCohort {
  const nums = cells
    .map((c) => Number(c.value))
    .filter((n) => Number.isFinite(n));
  const sorted = [...nums].sort((a, b) => a - b);
  const iqrFlaggedCount = cells.filter((c) =>
    (c.flagReason ?? "").split(",").some((r) => r.trim() === "iqr_outlier"),
  ).length;
  const computedFlags =
    iqrFlaggedCount > 0
      ? iqrFlaggedCount
      : iqrOutlierIndexes(nums).size;

  return {
    columnName,
    sampleSize: nums.length,
    mean: meanOf(nums),
    median: medianOf(sorted),
    min: sorted.length ? sorted[0] : null,
    max: sorted.length ? sorted[sorted.length - 1] : null,
    outlierCheck: outlierCheckForColumn(nums, computedFlags),
    bins: opts.includeBins ? buildHistogram(nums) : undefined,
  };
}

export function buildDirectorCohortTable(
  cells: CellIn[],
  submissions: SubmissionMeta[],
): CohortRow[] {
  const bySub = new Map(submissions.map((s) => [s.id, s]));
  const rowKeys = new Map<string, CohortRow>();

  for (const cell of cells) {
    const key = `${cell.submissionId}:${cell.rowIndex}`;
    const meta = bySub.get(cell.submissionId);
    if (!meta) continue;
    const row =
      rowKeys.get(key) ??
      ({
        submissionId: cell.submissionId,
        memberId: meta.memberId,
        studentName: meta.studentName,
        rowIndex: cell.rowIndex,
        values: {},
        flagged: false,
        flagReasons: [],
      } satisfies CohortRow);
    row.values[cell.columnName] = cell.value;
    if (cell.flagged) {
      row.flagged = true;
      if (cell.flagReason) {
        for (const r of cell.flagReason.split(",")) {
          const t = r.trim();
          if (t && !row.flagReasons.includes(t)) row.flagReasons.push(t);
        }
      }
    }
    rowKeys.set(key, row);
  }

  return Array.from(rowKeys.values()).sort((a, b) => {
    const name = a.studentName.localeCompare(b.studentName);
    if (name !== 0) return name;
    return a.rowIndex - b.rowIndex;
  });
}

export function studentOwnNumericSummary(
  cells: CellIn[],
  columnName: string,
): { values: number[]; mean: number | null; median: number | null } {
  const nums = cells
    .filter((c) => c.columnName === columnName)
    .map((c) => Number(c.value))
    .filter((n) => Number.isFinite(n));
  const sorted = [...nums].sort((a, b) => a - b);
  return {
    values: nums,
    mean: meanOf(nums),
    median: medianOf(sorted),
  };
}

export function shapeStudentAggregate(
  column: NumericColumnCohort,
  contributorCount: number,
):
  | {
      status: "ok";
      sampleSize: number;
      contributorCount: number;
      mean: number;
      median: number;
      outlierCheck: NumericColumnCohort["outlierCheck"];
    }
  | {
      status: "insufficient_cohort";
      sampleSize: number;
      contributorCount: number;
      minRequired: number;
      outlierCheck: NumericColumnCohort["outlierCheck"];
      message: string;
    } {
  // Privacy: hide mean/median until enough distinct contributors
  if (contributorCount < STUDENT_AGGREGATE_MIN_N) {
    return {
      status: "insufficient_cohort",
      sampleSize: column.sampleSize,
      contributorCount,
      minRequired: STUDENT_AGGREGATE_MIN_N,
      outlierCheck: column.outlierCheck,
      message: `Cohort stats hidden until at least ${STUDENT_AGGREGATE_MIN_N} students submit data (n=${contributorCount}). With fewer contributors, aggregates can reveal classmates' values.`,
    };
  }
  return {
    status: "ok",
    sampleSize: column.sampleSize,
    contributorCount,
    mean: column.mean ?? 0,
    median: column.median ?? 0,
    outlierCheck: column.outlierCheck,
  };
}
