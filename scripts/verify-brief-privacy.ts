/**
 * Prove Brief privacy floors for small cohorts / insufficient IQR sample.
 * Run: npx tsx scripts/verify-brief-privacy.ts
 */
import { DataValueType } from "@prisma/client";
import {
  formatBriefDataLine,
  type BriefDataColumnSummary,
} from "../src/server/data/brief-data-summary";
import {
  buildNumericColumnStats,
  IQR_MIN_SAMPLE,
  STUDENT_AGGREGATE_MIN_N,
} from "../src/server/data/cohort-stats";
import { briefToMarkdown } from "../src/server/ops/brief-export";

function cellsFor(
  pairs: Array<{ member: string; value: string }>,
) {
  return pairs.map((p, i) => ({
    id: String(i),
    submissionId: p.member,
    rowIndex: 0,
    columnName: "od600",
    value: p.value,
    valueType: DataValueType.NUMBER,
    flagged: false,
    flagReason: null as string | null,
  }));
}

console.log("=== Brief privacy floors ===\n");
console.log(
  `STUDENT_AGGREGATE_MIN_N=${STUDENT_AGGREGATE_MIN_N} · IQR_MIN_SAMPLE=${IQR_MIN_SAMPLE}\n`,
);

// Case: 2 contributors — must NOT print mean
{
  const cells = cellsFor([
    { member: "a", value: "0.40" },
    { member: "b", value: "0.60" },
  ]);
  const stats = buildNumericColumnStats("od600", cells, { includeBins: false });
      const columns: BriefDataColumnSummary[] = [
    {
      columnName: stats.columnName,
      sampleSize: stats.sampleSize,
      mean: stats.mean,
      median: stats.median,
      outlierCheck: stats.outlierCheck,
      aggregatesHidden: true,
    },
  ];
  const line = formatBriefDataLine({
    milestoneTitle: "Week 6 — Growth assay",
    contributorCount: 2,
    cellCount: 2,
    flaggedCellCount: 0,
    columns,
  });
  console.log("--- n=2 contributors → Brief line ---");
  console.log(line);
  const md = briefToMarkdown({
    programName: "SynBio Lab",
    milestone: "Week 6 — Growth assay",
    students: 10,
    turnedIn: 2,
    submissionRate: 20,
    briefing: `3 on track. ${line}`,
    agenda: [],
    dataSummary: {
      line,
      columns: columns.map((c) => ({
        columnName: c.columnName,
        sampleSize: c.sampleSize,
        mean: null, // gated
        outlierCheck: c.outlierCheck,
      })),
    },
    stats: null,
    exceptions: [],
    pendingApprovals: [],
    runFinishedAt: null,
  });
  console.log("\n--- Markdown Cohort data ---");
  const cohortSection = md.split("## Cohort data")[1]?.split("##")[0] ?? md;
  console.log(cohortSection.trim());

  if (/mean=/i.test(line)) {
    console.error("\nFAIL: Brief line still prints mean at n=2 (privacy leak)");
    process.exit(1);
  }
  if (!/insufficient|2 of 3|hidden/i.test(line)) {
    console.error("\nFAIL: expected insufficient-cohort wording in Brief line");
    process.exit(1);
  }
  console.log("\nPASS: n=2 does not print mean\n");
}

// Case: 3 values from 1 contributor — IQR insufficient_sample, means OK if contributors>=3? 
// Here 1 contributor — also below cohort floor
{
  const cells = cellsFor([
    { member: "a", value: "0.4" },
    { member: "a", value: "0.42" },
    { member: "a", value: "9.99" },
  ]);
  // fix row indexes
  cells.forEach((c, i) => {
    c.rowIndex = i;
    c.submissionId = "a";
  });
  const stats = buildNumericColumnStats("od600", cells, { includeBins: false });
  const line = formatBriefDataLine({
    milestoneTitle: "Assay",
    contributorCount: 1,
    cellCount: 3,
    flaggedCellCount: 0,
    columns: [
      {
        columnName: "od600",
        sampleSize: stats.sampleSize,
        mean: stats.mean,
        outlierCheck: stats.outlierCheck,
      },
    ],
  });
  console.log("--- 1 contributor, 3 cells (IQR insufficient_sample) ---");
  console.log(JSON.stringify({ outlierCheck: stats.outlierCheck, line }, null, 2));
  if (/mean=/i.test(line)) {
    console.error("FAIL: mean leaked at 1 contributor");
    process.exit(1);
  }
  console.log("PASS\n");
}

console.log("=== All Brief privacy checks passed ===");
