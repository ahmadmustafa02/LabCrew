import { NextResponse } from "next/server";
import { requireLabScope } from "@/server/tenancy/lab-scope";
import { findMilestoneDetailInLab } from "@/server/tenancy/lab-repo";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function asAttachments(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export async function GET(request: Request, { params }: Params) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const { id } = await params;
    const assignment = await findMilestoneDetailInLab(gate.ctx.labId, id);

    if (!assignment) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const isDirector = gate.ctx.appRole === "director";
    const myMemberId = gate.ctx.membership.id;

    const submissions = isDirector
      ? assignment.submissions
      : assignment.submissions.filter((s) => s.memberId === myMemberId);

    const studentCount = assignment.program.members.length;
    const turnedIn = assignment.submissions.filter((s) =>
      ["SUBMITTED", "SCORED"].includes(s.status),
    ).length;
    const pendingReview = assignment.submissions.filter(
      (s) => s.reviewStatus === "PENDING_REVIEW",
    ).length;
    const needsRevision = assignment.submissions.filter(
      (s) => s.reviewStatus === "NEEDS_REVISION",
    ).length;
    const approved = assignment.submissions.filter(
      (s) =>
        s.reviewStatus === "APPROVED" || s.reviewStatus === "DONE",
    ).length;

    return NextResponse.json({
      ok: true,
      assignment: {
        id: assignment.id,
        programId: assignment.programId,
        organizationId: assignment.organizationId,
        title: assignment.title,
        description: assignment.description,
        instructions: assignment.instructions,
        materials: assignment.materials,
        rubric: assignment.rubric,
        dueAt: assignment.dueAt,
        status: assignment.status,
        stats: {
          studentCount,
          turnedIn,
          pendingReview,
          needsRevision,
          approved,
        },
        submissions: submissions.map((s) => ({
          id: s.id,
          memberId: s.memberId,
          studentName: s.member.user.name,
          studentEmail: s.member.user.email,
          status: s.status,
          evidenceUrl: s.evidenceUrl,
          repoUrl: s.repoUrl,
          writeup: s.writeup,
          checklist: s.checklist,
          attachments: asAttachments(s.attachments),
          score: s.score,
          reviewStatus: s.reviewStatus,
          reviewComment: s.reviewComment,
          reviewedAt: s.reviewedAt,
          submittedAt: s.submittedAt,
          updatedAt: s.updatedAt,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load assignment",
      },
      { status: 503 },
    );
  }
}
