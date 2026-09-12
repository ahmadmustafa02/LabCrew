/**
 * Adaptive Coach Phase D — student-facing progress + approved Coach artifacts.
 * Real data only; never invent streaks or citations.
 */
import {
  ApprovalStatus,
  MilestoneStatus,
  SubmissionStatus,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { studentMilestoneWhere } from "@/server/assignments/audience";
import { inLab } from "@/server/tenancy/lab-scope";

export type StudentProgress = {
  /** Consecutive turned-in milestones counting back from the latest due/sorted */
  streak: number;
  submittedCount: number;
  milestoneCount: number;
  openCount: number;
  /** Calm, non-coercive framing */
  headline: string;
  detail: string;
};

export type ApprovedNudge = {
  id: string;
  title: string;
  body: string;
  decidedAt: string | null;
  deliveryStatus: string | null;
};

export type StudentCoachResources = {
  status: "found" | "empty";
  query: string;
  note: string;
  items: Array<{
    title: string;
    url: string;
    year: number | null;
    venue: string | null;
    rationale: string;
  }>;
  approvedAt: string | null;
};

function isTurnedIn(status: SubmissionStatus) {
  return (
    status === SubmissionStatus.SUBMITTED || status === SubmissionStatus.SCORED
  );
}

/**
 * Streak = consecutive submitted milestones walking newest → oldest
 * among ACTIVE/CLOSED (and UPCOMING only if already submitted).
 */
export function computeStreakFromRows(
  rows: Array<{
    status: MilestoneStatus;
    submitted: boolean;
  }>,
): number {
  // rows must be newest-first
  let streak = 0;
  for (const row of rows) {
    if (row.status === MilestoneStatus.UPCOMING && !row.submitted) {
      continue; // skip future not-yet-started
    }
    if (row.submitted) streak += 1;
    else break;
  }
  return streak;
}

export function progressCopy(input: {
  streak: number;
  submittedCount: number;
  milestoneCount: number;
  openCount: number;
}): Pick<StudentProgress, "headline" | "detail"> {
  const { streak, submittedCount, milestoneCount, openCount } = input;
  if (milestoneCount === 0) {
    return {
      headline: "Your lab pace will show up here",
      detail: "When assignments open, progress is counted from real turn-ins only.",
    };
  }
  if (streak >= 2) {
    return {
      headline: `${streak} in a row turned in`,
      detail: `${submittedCount} of ${milestoneCount} assignments submitted. Steady work — no points to lose, just keep the rhythm that works for you.`,
    };
  }
  if (submittedCount > 0) {
    return {
      headline: `${submittedCount} of ${milestoneCount} submitted`,
      detail:
        openCount > 0
          ? `${openCount} still open. A small next step on the active one is enough.`
          : "Nice work catching up on what's assigned.",
    };
  }
  return {
    headline: "A clear next step beats a perfect start",
    detail:
      openCount > 0
        ? `${openCount} open assignment${openCount === 1 ? "" : "s"}. Open one and note where you are — that's progress.`
        : "No open assignments right now.",
  };
}

export async function loadStudentProgress(input: {
  labId: string;
  programId: string;
  memberId: string;
}): Promise<StudentProgress> {
  const milestones = await getPrisma().milestone.findMany({
    where: {
      programId: input.programId,
      ...inLab(input.labId),
      ...studentMilestoneWhere(input.memberId),
      status: {
        in: [
          MilestoneStatus.ACTIVE,
          MilestoneStatus.CLOSED,
          MilestoneStatus.UPCOMING,
        ],
      },
    },
    include: {
      submissions: {
        where: { memberId: input.memberId, ...inLab(input.labId) },
        select: { status: true },
        take: 1,
      },
    },
    orderBy: [{ sortOrder: "desc" }, { dueAt: "desc" }, { createdAt: "desc" }],
  });

  const rows = milestones.map((m) => ({
    status: m.status,
    submitted: Boolean(
      m.submissions[0] && isTurnedIn(m.submissions[0].status),
    ),
  }));

  const streak = computeStreakFromRows(rows);
  const submittedCount = rows.filter((r) => r.submitted).length;
  const openCount = milestones.filter(
    (m) =>
      (m.status === MilestoneStatus.ACTIVE ||
        m.status === MilestoneStatus.UPCOMING) &&
      !(m.submissions[0] && isTurnedIn(m.submissions[0].status)),
  ).length;
  const copy = progressCopy({
    streak,
    submittedCount,
    milestoneCount: milestones.length,
    openCount,
  });

  return {
    streak,
    submittedCount,
    milestoneCount: milestones.length,
    openCount,
    headline: copy.headline,
    detail: copy.detail,
  };
}

/**
 * Latest approved/edited nudge for this student only.
 * PENDING / REJECTED are structurally excluded from the query (not filtered in JS).
 */
export async function loadApprovedNudgeForStudent(input: {
  labId: string;
  programId: string;
  email: string;
  name: string;
}): Promise<ApprovedNudge | null> {
  const email = input.email.trim().toLowerCase();
  const items = await getPrisma().approvalItem.findMany({
    where: {
      programId: input.programId,
      ...inLab(input.labId),
      kind: "nudge",
      status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.EDITED] },
      OR: [
        { targetEmail: { equals: email, mode: "insensitive" } },
        { targetName: input.name },
      ],
    },
    orderBy: { decidedAt: "desc" },
    take: 5,
  });

  // Defense in depth — never return a non-approved row even if query drifts
  const match = items.find(
    (i) =>
      (i.status === ApprovalStatus.APPROVED ||
        i.status === ApprovalStatus.EDITED) &&
      (i.deliveryStatus === "sent" ||
        i.deliveryStatus === "console" ||
        i.deliveryStatus == null),
  );
  if (!match) return null;
  if (
    match.status !== ApprovalStatus.APPROVED &&
    match.status !== ApprovalStatus.EDITED
  ) {
    return null;
  }

  return {
    id: match.id,
    title: match.title,
    body: match.body,
    decidedAt: match.decidedAt?.toISOString() ?? null,
    deliveryStatus: match.deliveryStatus,
  };
}

export function coachResourcesForStudent(
  raw: unknown,
): StudentCoachResources | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as {
    status?: string;
    query?: string;
    note?: string;
    items?: unknown;
    approvedAt?: string;
  };
  if (obj.status !== "found" && obj.status !== "empty") return null;
  if (!obj.approvedAt) return null; // only after director approve
  const items = Array.isArray(obj.items)
    ? obj.items
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const title = typeof row.title === "string" ? row.title : "";
          const url = typeof row.url === "string" ? row.url : "";
          if (!title || !/^https?:\/\//i.test(url)) return null;
          return {
            title,
            url,
            year: typeof row.year === "number" ? row.year : null,
            venue: typeof row.venue === "string" ? row.venue : null,
            rationale: typeof row.rationale === "string" ? row.rationale : "",
          };
        })
        .filter(Boolean)
    : [];

  if (obj.status === "found" && items.length === 0) return null;

  return {
    status: obj.status,
    query: typeof obj.query === "string" ? obj.query : "",
    note: typeof obj.note === "string" ? obj.note : "",
    items: items as StudentCoachResources["items"],
    approvedAt: obj.approvedAt,
  };
}
