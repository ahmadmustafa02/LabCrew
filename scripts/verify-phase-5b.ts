/**
 * Adaptive Coach Phase B — trend → visibly different nudge tone/timing.
 * Run: npx tsx scripts/verify-phase-5b.ts
 */
import {
  classifyTrend,
  profileFromScores,
} from "../src/server/coach/engagement-trend";
import { draftNudge } from "../src/server/agents/llm-scoring";

async function main() {
  console.log("=== Phase 5B Coach personalization verification ===\n");

  const declining = classifyTrend(40, 70);
  const strong = classifyTrend(92, 88);
  const stable = classifyTrend(60, 58);
  console.log({ declining, strong, stable });
  if (declining !== "declining" || strong !== "strong" || stable !== "stable") {
    console.error("FAIL classifyTrend");
    process.exit(1);
  }
  console.log("PASS classifyTrend\n");

  const down = profileFromScores("a", 40, 70);
  const up = profileFromScores("b", 92, 88);
  console.log("labels:", down.label, "|", up.label);
  if (!down.label.includes("warm") || !down.label.includes("earlier")) {
    console.error("FAIL declining label");
    process.exit(1);
  }
  if (!up.label.includes("encourage")) {
    console.error("FAIL strong label");
    process.exit(1);
  }
  console.log("PASS Approvals labels differ\n");

  const downDraft = await draftNudge({
    studentName: "Ayesha Rahman",
    reason: "Missing active milestone turn-in",
    severity: "high",
    milestoneTitle: "Lit review checkpoint",
    trend: down.trend,
    coachHint: down.coachHint,
    latestScore: down.latestScore,
  });
  const strongDraft = await draftNudge({
    studentName: "Mei Chen",
    reason: "Writeup too thin vs rubric",
    severity: "medium",
    milestoneTitle: "Lit review checkpoint",
    trend: up.trend,
    coachHint: up.coachHint,
    latestScore: up.latestScore,
  });

  console.log("--- Declining draft ---");
  console.log(downDraft.body);
  console.log("--- Strong draft ---");
  console.log(strongDraft.body);

  if (downDraft.body === strongDraft.body) {
    console.error("FAIL drafts must differ");
    process.exit(1);
  }
  if (!/early|today|heavier|together|checking in/i.test(downDraft.body)) {
    console.error("FAIL declining draft should sound earlier/warmer");
    process.exit(1);
  }
  if (!/steady|cadence|keep|progress|consistently/i.test(strongDraft.body)) {
    console.error("FAIL strong draft should reinforce");
    process.exit(1);
  }
  console.log("PASS drafts differ by trend (tone/timing)\n");
  console.log("All Phase 5B checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
