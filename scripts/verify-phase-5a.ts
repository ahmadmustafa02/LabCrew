/**
 * Adaptive Coach Phase A acceptance — heuristic engagement from existing signals.
 * Run: npx tsx scripts/verify-phase-5a.ts
 */
import {
  ReviewStatus,
  RsvpStatus,
  SubmissionStatus,
} from "@prisma/client";
import {
  finalizeScore,
  scoreMemberFromSignals,
  weekStartUtc,
  type EngagementComponents,
} from "../src/server/coach/engagement-score";

console.log("=== Phase 5A engagement score verification ===\n");

const now = new Date("2026-08-19T12:00:00.000Z");
const week = weekStartUtc(now);
console.log("weekStartUtc:", week.toISOString());
if (week.toISOString() !== "2026-08-17T00:00:00.000Z") {
  console.error("FAIL: expected Monday 2026-08-17 UTC");
  process.exit(1);
}
console.log("PASS weekStartUtc\n");

// Strong student: on-time, RSVP yes, replied to director
const strong = scoreMemberFromSignals({
  memberId: "strong",
  now,
  submissions: [
    {
      status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date("2026-08-16T10:00:00.000Z"),
      reviewStatus: ReviewStatus.APPROVED,
      dueAt: new Date("2026-08-18T00:00:00.000Z"),
    },
  ],
  invites: [{ rsvp: RsvpStatus.YES }],
  threadMessages: [
    { senderIsStudent: false, createdAt: new Date("2026-08-18T09:00:00.000Z") },
    { senderIsStudent: true, createdAt: new Date("2026-08-18T11:00:00.000Z") },
  ],
});

// Weak student: overdue silence, no RSVP, no reply
const weak = scoreMemberFromSignals({
  memberId: "weak",
  now,
  submissions: [
    {
      status: SubmissionStatus.DRAFT,
      submittedAt: null,
      reviewStatus: null,
      dueAt: new Date("2026-08-10T00:00:00.000Z"),
    },
  ],
  invites: [{ rsvp: null }],
  threadMessages: [
    { senderIsStudent: false, createdAt: new Date("2026-08-18T09:00:00.000Z") },
  ],
});

console.log("--- Strong vs weak ---");
console.log(
  JSON.stringify(
    {
      strong: { score: strong.score, components: strong.components },
      weak: { score: weak.score, components: weak.components },
    },
    null,
    2,
  ),
);

if (!(strong.score > weak.score + 20)) {
  console.error(
    `FAIL: expected strong (${strong.score}) >> weak (${weak.score})`,
  );
  process.exit(1);
}
if (weak.components.overdue.score !== 0) {
  console.error("FAIL: weak should be overdue flagged (score 0)");
  process.exit(1);
}
if (strong.components.overdue.score !== 1) {
  console.error("FAIL: strong should not be overdue");
  process.exit(1);
}
console.log("PASS strong >> weak; overdue flag present on weak\n");

// N/A components renormalize (no meetings / no messages)
const bare: EngagementComponents = {
  timeliness: { weight: 30, score: 1, detail: "ok" },
  overdue: { weight: 20, score: 1, detail: "ok" },
  revision: { weight: 15, score: 1, cycles: 0, detail: "ok" },
  meeting: {
    weight: 20,
    score: null,
    invited: 0,
    yes: 0,
    detail: "none",
  },
  messaging: {
    weight: 15,
    score: null,
    directorMessages: 0,
    studentReplies: 0,
    detail: "none",
  },
};
const bareScore = finalizeScore(bare);
console.log("--- Renormalize when meeting/messaging N/A ---");
console.log({ bareScore });
if (bareScore !== 100) {
  console.error("FAIL: all applicable 1.0 should yield 100");
  process.exit(1);
}
console.log("PASS renormalize\n");

console.log("All Phase 5A checks passed.");
