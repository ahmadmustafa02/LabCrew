/**
 * Adaptive Coach Phase A — heuristic engagement score (no ML).
 * Pure signal math lives here so verify scripts can run without Postgres.
 */
import {
  MemberRole,
  ReviewStatus,
  RsvpStatus,
  SubmissionStatus,
  type Prisma,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { inLab } from "@/server/tenancy/lab-scope";

export const WEIGHTS = {
  timeliness: 30,
  overdue: 20,
  revision: 15,
  meeting: 20,
  messaging: 15,
} as const;

export type SignalComponent = {
  weight: number;
  /** 0–1 contribution; null = not applicable this week (weight dropped) */
  score: number | null;
  detail: string;
};

export type EngagementComponents = {
  timeliness: SignalComponent;
  overdue: SignalComponent;
  revision: SignalComponent & { cycles: number };
  meeting: SignalComponent & { invited: number; yes: number };
  messaging: SignalComponent & {
    directorMessages: number;
    studentReplies: number;
  };
};

export type ScoredMember = {
  memberId: string;
  score: number;
  components: EngagementComponents;
};

/** Monday 00:00:00.000 UTC for the ISO week containing `date`. */
export function weekStartUtc(date: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // getUTCDay: 0 Sun … 6 Sat → shift so Monday = 0
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function weekEndUtc(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 7);
  return end;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** Weighted mean of applicable components → 0–100. */
export function finalizeScore(components: EngagementComponents): number {
  const parts: SignalComponent[] = [
    components.timeliness,
    components.overdue,
    components.revision,
    components.meeting,
    components.messaging,
  ];
  let wSum = 0;
  let sSum = 0;
  for (const p of parts) {
    if (p.score == null) continue;
    wSum += p.weight;
    sSum += p.score * p.weight;
  }
  if (wSum === 0) return 50;
  return Math.round((sSum / wSum) * 1000) / 10;
}

export type MemberSignalInput = {
  memberId: string;
  submissions: Array<{
    status: SubmissionStatus;
    submittedAt: Date | null;
    reviewStatus: ReviewStatus | null;
    dueAt: Date | null;
  }>;
  invites: Array<{ rsvp: RsvpStatus | null }>;
  /** Messages in the student’s thread during the week, chronologically */
  threadMessages: Array<{
    senderIsStudent: boolean;
    createdAt: Date;
  }>;
  now: Date;
};

/**
 * Score one student from already-loaded signals (unit-testable).
 */
export function scoreMemberFromSignals(input: MemberSignalInput): ScoredMember {
  const { submissions, invites, threadMessages, now } = input;

  // --- Timeliness + overdue (Pulse-style silence vs dueAt) ---
  const withDue = submissions.filter((s) => s.dueAt != null);
  let timelinessScore: number | null = null;
  let overdue = false;
  let overdueDetail = "No due dates in scope";

  if (withDue.length > 0) {
    let tSum = 0;
    for (const s of withDue) {
      const due = s.dueAt!;
      const turnedIn =
        s.status === SubmissionStatus.SUBMITTED ||
        s.status === SubmissionStatus.SCORED;
      if (turnedIn && s.submittedAt) {
        tSum += s.submittedAt.getTime() <= due.getTime() ? 1 : 0.4;
      } else if (due.getTime() < now.getTime()) {
        overdue = true;
        tSum += 0;
      } else if (s.status === SubmissionStatus.DRAFT) {
        tSum += 0.25;
      } else {
        tSum += 0.5; // upcoming, nothing yet
      }
    }
    timelinessScore = clamp01(tSum / withDue.length);
    overdueDetail = overdue
      ? `${withDue.filter((s) => {
          const turnedIn =
            s.status === SubmissionStatus.SUBMITTED ||
            s.status === SubmissionStatus.SCORED;
          return !turnedIn && s.dueAt!.getTime() < now.getTime();
        }).length} overdue milestone(s)`
      : "No overdue milestones";
  } else if (submissions.length > 0) {
    // Active milestone without dueAt — reward turn-in
    const turnedIn = submissions.filter(
      (s) =>
        s.status === SubmissionStatus.SUBMITTED ||
        s.status === SubmissionStatus.SCORED,
    ).length;
    timelinessScore = clamp01(turnedIn / submissions.length);
    overdueDetail = "No dueAt; scored on turn-in only";
  }

  // --- Revision cycles (proxy: NEEDS_REVISION on current rows) ---
  const cycles = submissions.filter(
    (s) => s.reviewStatus === ReviewStatus.NEEDS_REVISION,
  ).length;
  let revisionScore = 0.5;
  let revisionDetail = "No review activity";
  if (submissions.some((s) => s.reviewStatus != null)) {
    const approved = submissions.filter(
      (s) =>
        s.reviewStatus === ReviewStatus.APPROVED ||
        s.reviewStatus === ReviewStatus.DONE,
    ).length;
    if (cycles === 0 && approved > 0) {
      revisionScore = 1;
      revisionDetail = "Approved / done — no open revision cycles";
    } else if (cycles > 0) {
      // In a revision loop counts as engaged (not silent), but not as strong as clean approve
      revisionScore = clamp01(0.55 + 0.1 * Math.min(cycles, 3));
      revisionDetail = `${cycles} open revision cycle(s)`;
    } else {
      revisionScore = 0.7;
      revisionDetail = "Pending review";
    }
  } else if (
    submissions.some(
      (s) =>
        s.status === SubmissionStatus.SUBMITTED ||
        s.status === SubmissionStatus.SCORED,
    )
  ) {
    revisionScore = 0.75;
    revisionDetail = "Turned in; not yet reviewed";
  } else {
    revisionScore = 0.35;
    revisionDetail = "No turn-in / review yet";
  }

  // --- Meeting RSVP ---
  let meetingScore: number | null = null;
  let yes = 0;
  if (invites.length === 0) {
    meetingScore = null;
  } else {
    let mSum = 0;
    for (const inv of invites) {
      if (inv.rsvp === RsvpStatus.YES) {
        yes += 1;
        mSum += 1;
      } else if (inv.rsvp === RsvpStatus.MAYBE) {
        mSum += 0.5;
      } else if (inv.rsvp === RsvpStatus.NO) {
        mSum += 0.2;
      } else {
        mSum += 0;
      }
    }
    meetingScore = clamp01(mSum / invites.length);
  }

  // --- Message responsiveness ---
  let messagingScore: number | null = null;
  let directorMessages = 0;
  let studentReplies = 0;
  if (threadMessages.length === 0) {
    messagingScore = null;
  } else {
    let pendingDirector = false;
    for (const msg of threadMessages) {
      if (!msg.senderIsStudent) {
        directorMessages += 1;
        pendingDirector = true;
      } else if (pendingDirector) {
        studentReplies += 1;
        pendingDirector = false;
      }
    }
    if (directorMessages === 0) {
      messagingScore = 0.8; // student-initiated activity
    } else {
      messagingScore = clamp01(studentReplies / directorMessages);
    }
  }

  const components: EngagementComponents = {
    timeliness: {
      weight: WEIGHTS.timeliness,
      score: timelinessScore,
      detail:
        timelinessScore == null
          ? "No milestone submissions in scope"
          : `Timeliness ${Math.round(timelinessScore * 100)}%`,
    },
    overdue: {
      weight: WEIGHTS.overdue,
      score: withDue.length === 0 ? null : overdue ? 0 : 1,
      detail: overdueDetail,
    },
    revision: {
      weight: WEIGHTS.revision,
      score: revisionScore,
      cycles,
      detail: revisionDetail,
    },
    meeting: {
      weight: WEIGHTS.meeting,
      score: meetingScore,
      invited: invites.length,
      yes,
      detail:
        meetingScore == null
          ? "No meeting invites this week"
          : `${yes}/${invites.length} RSVP yes`,
    },
    messaging: {
      weight: WEIGHTS.messaging,
      score: messagingScore,
      directorMessages,
      studentReplies,
      detail:
        messagingScore == null
          ? "No thread activity this week"
          : `${studentReplies} replies to ${directorMessages} director message(s)`,
    },
  };

  return {
    memberId: input.memberId,
    score: finalizeScore(components),
    components,
  };
}

export type ComputeEngagementInput = {
  labId: string;
  programId: string;
  weekStart?: Date;
  runId?: string;
  now?: Date;
};

/**
 * Load lab-scoped signals and upsert EngagementScore rows for all students.
 */
export async function computeAndStoreEngagementScores(
  input: ComputeEngagementInput,
): Promise<{ weekStart: Date; scored: ScoredMember[] }> {
  const prisma = getPrisma();
  const weekStart = weekStartUtc(input.weekStart ?? new Date());
  const weekEnd = weekEndUtc(weekStart);
  const now = input.now ?? new Date();
  const labId = input.labId;

  const students = await prisma.member.findMany({
    where: {
      programId: input.programId,
      role: MemberRole.STUDENT,
      ...inLab(labId),
    },
    select: { id: true },
  });

  const milestones = await prisma.milestone.findMany({
    where: {
      programId: input.programId,
      ...inLab(labId),
      OR: [
        { status: "ACTIVE" },
        {
          dueAt: { gte: weekStart, lt: weekEnd },
        },
      ],
    },
    select: { id: true, dueAt: true },
  });
  const milestoneIds = milestones.map((m) => m.id);
  const dueByMilestone = new Map(milestones.map((m) => [m.id, m.dueAt]));

  const submissions =
    milestoneIds.length === 0
      ? []
      : await prisma.submission.findMany({
          where: {
            ...inLab(labId),
            milestoneId: { in: milestoneIds },
            memberId: { in: students.map((s) => s.id) },
          },
          select: {
            memberId: true,
            milestoneId: true,
            status: true,
            submittedAt: true,
            reviewStatus: true,
          },
        });

  const invites = await prisma.meetingInvite.findMany({
    where: {
      ...inLab(labId),
      memberId: { in: students.map((s) => s.id) },
      meeting: {
        programId: input.programId,
        startsAt: { gte: weekStart, lt: weekEnd },
      },
    },
    select: { memberId: true, rsvp: true },
  });

  const conversations = await prisma.conversation.findMany({
    where: {
      programId: input.programId,
      ...inLab(labId),
      studentMemberId: { in: students.map((s) => s.id) },
    },
    select: {
      studentMemberId: true,
      messages: {
        where: { createdAt: { gte: weekStart, lt: weekEnd } },
        orderBy: { createdAt: "asc" },
        select: {
          senderMemberId: true,
          createdAt: true,
        },
      },
    },
  });

  const scored: ScoredMember[] = [];

  for (const student of students) {
    const memberSubs = submissions
      .filter((s) => s.memberId === student.id)
      .map((s) => ({
        status: s.status,
        submittedAt: s.submittedAt,
        reviewStatus: s.reviewStatus,
        dueAt: dueByMilestone.get(s.milestoneId) ?? null,
      }));

    // Include due milestones with no submission row as missing
    for (const m of milestones) {
      if (!submissions.some((s) => s.memberId === student.id && s.milestoneId === m.id)) {
        memberSubs.push({
          status: SubmissionStatus.DRAFT,
          submittedAt: null,
          reviewStatus: null,
          dueAt: m.dueAt,
        });
      }
    }

    const memberInvites = invites
      .filter((i) => i.memberId === student.id)
      .map((i) => ({ rsvp: i.rsvp }));

    const conv = conversations.find((c) => c.studentMemberId === student.id);
    const threadMessages =
      conv?.messages.map((msg) => ({
        senderIsStudent: msg.senderMemberId === student.id,
        createdAt: msg.createdAt,
      })) ?? [];

    const result = scoreMemberFromSignals({
      memberId: student.id,
      submissions: memberSubs,
      invites: memberInvites,
      threadMessages,
      now,
    });
    scored.push(result);

    const componentsJson = result.components as unknown as Prisma.InputJsonValue;
    await prisma.engagementScore.upsert({
      where: {
        memberId_weekStart: {
          memberId: student.id,
          weekStart,
        },
      },
      create: {
        organizationId: labId,
        programId: input.programId,
        memberId: student.id,
        weekStart,
        score: result.score,
        components: componentsJson,
        computedAt: now,
        runId: input.runId,
      },
      update: {
        score: result.score,
        components: componentsJson,
        computedAt: now,
        runId: input.runId ?? undefined,
      },
    });
  }

  return { weekStart, scored };
}
