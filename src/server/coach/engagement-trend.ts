/**
 * Adaptive Coach Phase B — engagement trend for nudge tone/timing.
 */
import { getPrisma } from "@/lib/db";
import { inLab } from "@/server/tenancy/lab-scope";
import { weekStartUtc } from "@/server/coach/engagement-score";

export type EngagementTrend =
  | "declining"
  | "strong"
  | "stable"
  | "unknown";

export type EngagementProfile = {
  memberId: string;
  trend: EngagementTrend;
  /** Latest week score, if any */
  latestScore: number | null;
  /** Prior week score, if any */
  previousScore: number | null;
  /** Human label for Approvals title */
  label: string;
  /** Prompt guidance for Coach */
  coachHint: string;
};

const STRONG_FLOOR = 75;
const DECLINE_DELTA = 12;

export function classifyTrend(
  latest: number | null,
  previous: number | null,
): EngagementTrend {
  if (latest == null) return "unknown";
  if (previous != null && latest <= previous - DECLINE_DELTA) {
    return "declining";
  }
  if (
    latest >= STRONG_FLOOR &&
    (previous == null || previous >= STRONG_FLOOR - 5)
  ) {
    return "strong";
  }
  if (previous != null) return "stable";
  return latest >= STRONG_FLOOR ? "strong" : "stable";
}

export function profileFromScores(
  memberId: string,
  latest: number | null,
  previous: number | null,
): EngagementProfile {
  const trend = classifyTrend(latest, previous);
  switch (trend) {
    case "declining":
      return {
        memberId,
        trend,
        latestScore: latest,
        previousScore: previous,
        label: "warm · send earlier",
        coachHint:
          "Engagement is trending down. Write a warmer, supportive nudge. Suggest a small next step today (earlier contact). Do not guilt or shame.",
      };
    case "strong":
      return {
        memberId,
        trend,
        latestScore: latest,
        previousScore: previous,
        label: "encourage · reinforce",
        coachHint:
          "Engagement is consistently strong. Write brief positive reinforcement — name what is going well and invite them to keep the cadence. Not a rescue nudge.",
      };
    case "stable":
      return {
        memberId,
        trend,
        latestScore: latest,
        previousScore: previous,
        label: "steady · standard timing",
        coachHint:
          "Engagement is steady. Write a clear, kind, specific nudge at normal cadence.",
      };
    default:
      return {
        memberId,
        trend,
        latestScore: latest,
        previousScore: previous,
        label: "unknown · standard timing",
        coachHint:
          "Engagement history is thin. Write a clear, kind, specific nudge at normal cadence.",
      };
  }
}

/** Load last two ISO-week scores for many members (lab-scoped). */
export async function loadEngagementProfiles(input: {
  labId: string;
  programId: string;
  memberIds: string[];
  now?: Date;
}): Promise<Map<string, EngagementProfile>> {
  const map = new Map<string, EngagementProfile>();
  for (const id of input.memberIds) {
    map.set(id, profileFromScores(id, null, null));
  }
  if (input.memberIds.length === 0) return map;

  const thisWeek = weekStartUtc(input.now ?? new Date());
  const lastWeek = new Date(thisWeek);
  lastWeek.setUTCDate(lastWeek.getUTCDate() - 7);

  const rows = await getPrisma().engagementScore.findMany({
    where: {
      programId: input.programId,
      memberId: { in: input.memberIds },
      weekStart: { in: [thisWeek, lastWeek] },
      ...inLab(input.labId),
    },
    select: { memberId: true, weekStart: true, score: true },
  });

  const byMember = new Map<string, { latest: number | null; prev: number | null }>();
  for (const id of input.memberIds) {
    byMember.set(id, { latest: null, prev: null });
  }
  for (const row of rows) {
    const slot = byMember.get(row.memberId);
    if (!slot) continue;
    if (row.weekStart.getTime() === thisWeek.getTime()) slot.latest = row.score;
    else if (row.weekStart.getTime() === lastWeek.getTime()) slot.prev = row.score;
  }

  for (const [id, scores] of byMember) {
    map.set(id, profileFromScores(id, scores.latest, scores.prev));
  }
  return map;
}
