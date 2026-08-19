/**
 * Phase D acceptance — actual Brief/Clerk output with structured cells present.
 * Run: npx tsx scripts/verify-phase-d.ts
 */
import {
  appendDataLineToBriefing,
  type BriefDataSummary,
} from "../src/server/data/brief-data-summary";
import { briefToMarkdown } from "../src/server/ops/brief-export";

const dataSummary: BriefDataSummary = {
  milestoneId: "ms_growth",
  milestoneTitle: "Week 6 — Growth assay results",
  contributorCount: 4,
  cellCount: 12,
  flaggedCellCount: 1,
  columns: [
    {
      columnName: "od600",
      sampleSize: 12,
      mean: 0.451,
      median: 0.44,
      outlierCheck: {
        status: "checked_with_flags",
        minRequired: 4,
        flaggedCount: 1,
      },
    },
    {
      columnName: "hours",
      sampleSize: 12,
      mean: 24,
      median: 24,
      outlierCheck: {
        status: "checked_clean",
        minRequired: 4,
        flaggedCount: 0,
      },
    },
  ],
  line: "Data (Week 6 — Growth assay results): 4 contributors · 12 cells · 1 flagged · od600 mean=0.451 (1 flagged) · hours mean=24 (clean)",
};

const baseBriefing =
  "3 on track, 1 weak, 0 missing. Focus Monday on Ayesha. 1 Coach draft waits in Approvals.";

const briefing = appendDataLineToBriefing(baseBriefing, dataSummary);

const markdown = briefToMarkdown({
  programName: "SynBio Lab Cohort",
  milestone: "Week 6 — Growth assay results",
  students: 10,
  turnedIn: 4,
  submissionRate: 40,
  briefing,
  agenda: [
    "Unblock Ayesha first",
    "Approve or edit pending nudges",
    "Review flagged structured-data outliers on the assignment",
  ],
  dataSummary: {
    line: dataSummary.line,
    columns: dataSummary.columns.map((c) => ({
      columnName: c.columnName,
      sampleSize: c.sampleSize,
      mean: c.mean,
      outlierCheck: c.outlierCheck,
    })),
  },
  stats: { onTrack: 3, students: 10, exceptions: 1, draftNudges: 1 },
  exceptions: [
    { name: "Ayesha Khan", reason: "Missing writeup", severity: "medium" },
  ],
  pendingApprovals: [],
  runFinishedAt: "2026-08-19T11:00:00.000Z",
});

// What MondayBriefView shows in the Clerk summary + Cohort data section
const uiRender = {
  clerkSummary: briefing,
  cohortDataSection: {
    heading: "Cohort data",
    line: dataSummary.line,
    columns: dataSummary.columns.map((c) => ({
      label: `${c.columnName} · n=${c.sampleSize} · mean ${c.mean} · ${
        c.outlierCheck.flaggedCount > 0
          ? `${c.outlierCheck.flaggedCount} flagged`
          : "no IQR flags"
      }`,
    })),
  },
};

console.log("=== Phase D acceptance: rendered Brief with structured data ===\n");
console.log("--- UI: Clerk summary (brief.briefing) ---");
console.log(uiRender.clerkSummary);
console.log("\n--- UI: Cohort data section ---");
console.log(uiRender.cohortDataSection.heading);
console.log(uiRender.cohortDataSection.line);
for (const c of uiRender.cohortDataSection.columns) {
  console.log(`  - ${c.label}`);
}
console.log("\n--- Export: Markdown ---");
console.log(markdown);

if (!briefing.includes("Data (Week 6")) {
  console.error("FAIL: briefing missing data line");
  process.exit(1);
}
if (!markdown.includes("## Cohort data")) {
  console.error("FAIL: markdown missing Cohort data section");
  process.exit(1);
}
if (!markdown.includes("od600")) {
  console.error("FAIL: markdown missing column stats");
  process.exit(1);
}
console.log("\n=== PASS: Brief includes data-summary when structured cells present ===");
