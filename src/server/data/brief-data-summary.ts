import { DataValueType } from "@prisma/client";
import {
  buildNumericColumnStats,
  type NumericColumnCohort,
} from "@/server/data/cohort-stats";
import { findDataPointsForMilestoneInLab } from "@/server/tenancy/lab-repo";

export type BriefDataColumnSummary = {
  columnName: string;
  sampleSize: number;
  mean: number | null;
  median: number | null;
  outlierCheck: NumericColumnCohort["outlierCheck"];
};

export type BriefDataSummary = {
  milestoneId: string;
  milestoneTitle: string;
  contributorCount: number;
  cellCount: number;
  flaggedCellCount: number;
  columns: BriefDataColumnSummary[];
  /** One-line string for the Clerk briefing */
  line: string;
};

function fmt(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

/**
 * Lightweight per-assignment stats for Monday Brief (Clerk).
 * Lab-scoped; aggregates only — no raw peer rows.
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
        mean: stats.mean,
        median: stats.median,
        outlierCheck: stats.outlierCheck,
      };
    },
  );

  const colBits = columns
    .slice(0, 3)
    .map((c) => {
      const flagBit =
        c.outlierCheck.status === "insufficient_sample"
          ? "IQR pending"
          : c.outlierCheck.flaggedCount > 0
            ? `${c.outlierCheck.flaggedCount} flagged`
            : "clean";
      return `${c.columnName} mean=${fmt(c.mean)} (${flagBit})`;
    })
    .join(" · ");

  const line = [
    `Data (${opts.milestoneTitle}): ${contributors.size} contributor${contributors.size === 1 ? "" : "s"}`,
    `${cells.length} cells`,
    flaggedCellCount > 0 ? `${flaggedCellCount} flagged` : null,
    colBits || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    milestoneId: opts.milestoneId,
    milestoneTitle: opts.milestoneTitle,
    contributorCount: contributors.size,
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
