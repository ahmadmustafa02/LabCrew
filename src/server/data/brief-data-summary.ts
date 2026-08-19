import { DataValueType } from "@prisma/client";
import {
  buildNumericColumnStats,
  IQR_MIN_SAMPLE,
  STUDENT_AGGREGATE_MIN_N,
  type NumericColumnCohort,
} from "@/server/data/cohort-stats";
import { findDataPointsForMilestoneInLab } from "@/server/tenancy/lab-repo";

export type BriefDataColumnSummary = {
  columnName: string;
  sampleSize: number;
  /** null when contributorCount < STUDENT_AGGREGATE_MIN_N */
  mean: number | null;
  median: number | null;
  outlierCheck: NumericColumnCohort["outlierCheck"];
  aggregatesHidden?: boolean;
};

export type BriefDataSummary = {
  milestoneId: string;
  milestoneTitle: string;
  contributorCount: number;
  cellCount: number;
  flaggedCellCount: number;
  columns: BriefDataColumnSummary[];
  /** One-line string for the Clerk briefing / export */
  line: string;
};

function fmt(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

/**
 * Build the circulatable Brief data line.
 * Applies the same privacy floors as the student cohort UI:
 * - contributorCount < STUDENT_AGGREGATE_MIN_N → no means (reversible otherwise)
 * - outlierCheck.insufficient_sample → say IQR pending, never "clean"
 */
export function formatBriefDataLine(opts: {
  milestoneTitle: string;
  contributorCount: number;
  cellCount: number;
  flaggedCellCount: number;
  columns: Array<{
    columnName: string;
    sampleSize: number;
    mean: number | null;
    outlierCheck: NumericColumnCohort["outlierCheck"];
  }>;
}): string {
  const aggregatesOk = opts.contributorCount >= STUDENT_AGGREGATE_MIN_N;

  const colBits = aggregatesOk
    ? opts.columns
        .slice(0, 3)
        .map((c) => {
          const flagBit =
            c.outlierCheck.status === "insufficient_sample"
              ? `IQR pending (need ${c.outlierCheck.minRequired}+, have ${c.sampleSize})`
              : c.outlierCheck.flaggedCount > 0
                ? `${c.outlierCheck.flaggedCount} flagged`
                : "no IQR flags";
          return `${c.columnName} mean=${fmt(c.mean)} (${flagBit})`;
        })
        .join(" · ")
    : `aggregates hidden — insufficient data (${opts.contributorCount} of ${STUDENT_AGGREGATE_MIN_N} min contributors)`;

  // Even when aggregates are shown, surface IQR-pending if every numeric col is short
  const iqrNote =
    aggregatesOk &&
    opts.columns.length > 0 &&
    opts.columns.every((c) => c.outlierCheck.status === "insufficient_sample")
      ? `IQR pending (need ${IQR_MIN_SAMPLE}+ values per column)`
      : null;

  return [
    `Data (${opts.milestoneTitle}): ${opts.contributorCount} contributor${opts.contributorCount === 1 ? "" : "s"}`,
    `${opts.cellCount} cells`,
    opts.flaggedCellCount > 0 ? `${opts.flaggedCellCount} flagged` : null,
    colBits || null,
    !aggregatesOk ? null : iqrNote,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Lightweight per-assignment stats for Monday Brief (Clerk).
 * Lab-scoped. Means omitted below STUDENT_AGGREGATE_MIN_N so exported Briefs
 * cannot circulate a reversible 1–2 person mean.
 */
export async function buildBriefDataSummary(opts: {
  labId: string;
  milestoneId: string;
  milestoneTitle: string;
}): Promise<BriefDataSummary | null> {
  const cells = await findDataPointsForMilestoneInLab(
    opts.labId,
    opts.milestoneId,
  );
  if (cells.length === 0) return null;

  const contributors = new Set(cells.map((c) => c.submission.memberId));
  const contributorCount = contributors.size;
  const aggregatesHidden = contributorCount < STUDENT_AGGREGATE_MIN_N;
  const flaggedCellCount = cells.filter((c) => c.flagged).length;

  const numericNames = new Set<string>();
  for (const c of cells) {
    if (c.valueType === DataValueType.NUMBER) numericNames.add(c.columnName);
  }

  const columns: BriefDataColumnSummary[] = Array.from(numericNames).map(
    (columnName) => {
      const colCells = cells.filter((c) => c.columnName === columnName);
      const stats = buildNumericColumnStats(columnName, colCells, {
        includeBins: false,
      });
      return {
        columnName: stats.columnName,
        sampleSize: stats.sampleSize,
        mean: aggregatesHidden ? null : stats.mean,
        median: aggregatesHidden ? null : stats.median,
        outlierCheck: stats.outlierCheck,
        aggregatesHidden,
      };
    },
  );

  const line = formatBriefDataLine({
    milestoneTitle: opts.milestoneTitle,
    contributorCount,
    cellCount: cells.length,
    flaggedCellCount,
    columns,
  });

  return {
    milestoneId: opts.milestoneId,
    milestoneTitle: opts.milestoneTitle,
    contributorCount,
    cellCount: cells.length,
    flaggedCellCount,
    columns,
    line,
  };
}

/** Append data line to Clerk briefing when present. */
export function appendDataLineToBriefing(
  briefing: string,
  dataSummary: BriefDataSummary | null,
): string {
  if (!dataSummary?.line) return briefing;
  if (briefing.includes(dataSummary.line)) return briefing;
  return `${briefing} ${dataSummary.line}`;
}
