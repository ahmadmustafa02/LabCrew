/**
 * Adaptive Coach Phase D — progress copy + student resource shaping.
 * Run: npx tsx scripts/verify-phase-5d.ts
 */
import { MilestoneStatus } from "@prisma/client";
import {
  coachResourcesForStudent,
  computeStreakFromRows,
  progressCopy,
} from "../src/server/coach/student-coach";

console.log("=== Phase 5D persuasive UI verification ===\n");

const streak = computeStreakFromRows([
  { status: MilestoneStatus.ACTIVE, submitted: true },
  { status: MilestoneStatus.CLOSED, submitted: true },
  { status: MilestoneStatus.CLOSED, submitted: true },
  { status: MilestoneStatus.CLOSED, submitted: false },
]);
console.log("streak consecutive from newest:", streak);
if (streak !== 3) {
  console.error("FAIL expected streak 3");
  process.exit(1);
}
console.log("PASS streak\n");

const copy = progressCopy({
  streak: 3,
  submittedCount: 3,
  milestoneCount: 5,
  openCount: 2,
});
console.log(copy);
if (!/in a row/i.test(copy.headline)) {
  console.error("FAIL motivation headline");
  process.exit(1);
}
if (/fail|behind|punish|lose points|don't break/i.test(copy.detail)) {
  console.error("FAIL dark-pattern copy");
  process.exit(1);
}
console.log("PASS non-dark progress copy\n");

const hidden = coachResourcesForStudent({
  status: "found",
  query: "x",
  items: [{ title: "T", url: "https://example.com", rationale: "" }],
  // no approvedAt → not student-visible
});
if (hidden != null) {
  console.error("FAIL unapproved resources must be null for students");
  process.exit(1);
}

const shown = coachResourcesForStudent({
  status: "found",
  query: "CRISPR",
  note: "ok",
  approvedAt: "2026-08-19T00:00:00.000Z",
  items: [
    {
      title: "Real paper",
      url: "https://arxiv.org/abs/1234.5678",
      year: 2024,
      venue: "arXiv",
      rationale: "From search",
    },
  ],
});
if (!shown || shown.items.length !== 1) {
  console.error("FAIL approved found list should surface");
  process.exit(1);
}
const invent = coachResourcesForStudent({
  status: "found",
  approvedAt: "2026-08-19T00:00:00.000Z",
  items: [{ title: "Fake", url: "not-a-url", rationale: "" }],
});
if (invent != null) {
  console.error("FAIL invalid urls must drop the list");
  process.exit(1);
}
console.log("PASS student coachResources gate\n");
console.log("All Phase 5D checks passed.");
