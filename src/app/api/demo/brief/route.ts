import { NextResponse } from "next/server";
import {
  ApprovalStatus,
  MemberRole,
  MilestoneStatus,
  SubmissionStatus,
} from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { requireDirector } from "@/server/auth/api-session";
import { serializeAgentRun } from "@/server/ops/serialize-run";

export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await requireDirector();
    if ("error" in gate) return gate.error;

    const prisma = getPrisma();
    const program = await prisma.program.findUnique({
      where: { id: gate.session.membership.programId },
      include: {
        milestones: {
          where: { status: MilestoneStatus.ACTIVE },
          take: 1,
        },
      },
    });

    if (!program) {
      return NextResponse.json(
        { ok: false, error: "Program not found" },
        { status: 404 },
      );
    }

    const activeMilestone = program.milestones[0] ?? null;
    const students = await prisma.member.count({
      where: { programId: program.id, role: MemberRole.STUDENT },
    });

    const turnedIn = activeMilestone
      ? await prisma.submission.count({
          where: {
            milestoneId: activeMilestone.id,
            status: {
              in: [SubmissionStatus.SUBMITTED, SubmissionStatus.SCORED],
            },
          },
        })
      : 0;

    const pendingApprovals = await prisma.approvalItem.findMany({
      where: { programId: program.id, status: ApprovalStatus.PENDING },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        title: true,
        body: true,
        targetName: true,
      },
    });

    const latestRun = await prisma.agentRun.findFirst({
      where: { programId: program.id },
      orderBy: { createdAt: "desc" },
      include: {
        steps: { orderBy: { sortOrder: "asc" } },
        approvals: {
          where: { status: ApprovalStatus.PENDING },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const serialized = latestRun ? serializeAgentRun(latestRun) : null;
    const hasSucceeded =
      latestRun?.status === "SUCCEEDED" || Boolean(serialized?.briefing);

    return NextResponse.json({
      ok: true,
      brief: {
        programName: program.name,
        milestone: activeMilestone?.title ?? null,
        students,
        turnedIn,
        submissionRate:
          students === 0 ? 0 : Math.round((turnedIn / students) * 100),
        hasRun: Boolean(latestRun),
        runStatus: latestRun?.status ?? null,
        runId: latestRun?.id ?? null,
        runFinishedAt: latestRun?.finishedAt ?? latestRun?.createdAt ?? null,
        briefing: serialized?.briefing ?? null,
        agenda: serialized?.agenda ?? [],
        stats: serialized?.stats ?? null,
        exceptions: (serialized?.exceptions ?? []).slice(0, 5),
        pendingApprovals,
        emptyHint:
          !latestRun
            ? "No weekly ops yet. Run the crew once to generate this Monday packet."
            : !hasSucceeded
              ? "Latest run is still in progress or failed. Open Mission Control to finish or re-run."
              : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Brief unavailable",
      },
      { status: 503 },
    );
  }
}
