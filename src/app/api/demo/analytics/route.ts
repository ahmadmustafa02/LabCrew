import { NextResponse } from "next/server";
import {
  ApprovalStatus,
  MemberRole,
  MilestoneStatus,
  SubmissionStatus,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const prisma = getPrisma();
    const program = await prisma.program.findFirst({
      where: { organization: { slug: "northwater" } },
      include: {
        milestones: {
          where: { status: MilestoneStatus.ACTIVE },
          take: 1,
        },
      },
    });

    if (!program) {
      return NextResponse.json(
        { ok: false, error: "Demo program not seeded" },
        { status: 404 },
      );
    }

    const activeMilestone = program.milestones[0];
    const students = await prisma.member.count({
      where: { programId: program.id, role: MemberRole.STUDENT },
    });

    const submissions = activeMilestone
      ? await prisma.submission.findMany({
          where: { milestoneId: activeMilestone.id },
        })
      : [];

    const turnedIn = submissions.filter(
      (s) =>
        s.status === SubmissionStatus.SUBMITTED ||
        s.status === SubmissionStatus.SCORED,
    ).length;

    const atRisk = submissions.filter((s) => {
      if (s.status === SubmissionStatus.DRAFT) return true;
      const score = s.score as { complete?: boolean } | null;
      if (score && score.complete === false) return true;
      if (!s.evidenceUrl) return true;
      if ((s.writeup ?? "").trim().length < 40) return true;
      return false;
    }).length;

    const [approved, rejected, pending, runs] = await Promise.all([
      prisma.approvalItem.count({
        where: {
          programId: program.id,
          status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.EDITED] },
        },
      }),
      prisma.approvalItem.count({
        where: { programId: program.id, status: ApprovalStatus.REJECTED },
      }),
      prisma.approvalItem.count({
        where: { programId: program.id, status: ApprovalStatus.PENDING },
      }),
      prisma.agentRun.findMany({
        where: { programId: program.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          createdAt: true,
          finishedAt: true,
          startedAt: true,
        },
      }),
    ]);

    const submissionRate =
      students === 0 ? 0 : Math.round((turnedIn / students) * 100);

    return NextResponse.json({
      ok: true,
      analytics: {
        programId: program.id,
        programName: program.name,
        milestone: activeMilestone?.title ?? null,
        submissionRate,
        turnedIn,
        students,
        atRisk,
        nudgesApproved: approved,
        nudgesRejected: rejected,
        nudgesPending: pending,
        recentRuns: runs.map((run) => ({
          id: run.id,
          status: run.status,
          createdAt: run.createdAt,
          durationSec:
            run.startedAt && run.finishedAt
              ? Math.max(
                  1,
                  Math.round(
                    (run.finishedAt.getTime() - run.startedAt.getTime()) / 1000,
                  ),
                )
              : null,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Analytics unavailable",
      },
      { status: 503 },
    );
  }
}
