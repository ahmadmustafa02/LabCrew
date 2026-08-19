import { NextResponse } from "next/server";
import { ReviewStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { requireLabDirector } from "@/server/tenancy/lab-scope";
import {
  findMilestoneInLab,
  findSubmissionInLab,
} from "@/server/tenancy/lab-repo";
import { createNotifications } from "@/server/notifications/create";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; submissionId: string }> };

const ALLOWED: ReviewStatus[] = [
  ReviewStatus.PENDING_REVIEW,
  ReviewStatus.NEEDS_REVISION,
  ReviewStatus.APPROVED,
  ReviewStatus.DONE,
];

export async function PATCH(request: Request, { params }: Params) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const { id: milestoneId, submissionId } = await params;
    const body = (await request.json()) as {
      reviewStatus?: string;
      reviewComment?: string;
    };

    const statusRaw = body.reviewStatus?.toUpperCase();
    if (!statusRaw || !ALLOWED.includes(statusRaw as ReviewStatus)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "reviewStatus must be PENDING_REVIEW | NEEDS_REVISION | APPROVED | DONE",
        },
        { status: 400 },
      );
    }
    const reviewStatus = statusRaw as ReviewStatus;

    const milestone = await findMilestoneInLab(gate.ctx.labId, milestoneId);
    const submission = await findSubmissionInLab(gate.ctx.labId, submissionId);

    if (!milestone || !submission || submission.milestoneId !== milestoneId) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const prisma = getPrisma();
    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        reviewStatus,
        reviewComment:
          typeof body.reviewComment === "string"
            ? body.reviewComment.trim() || null
            : undefined,
        reviewedAt: new Date(),
        reviewedById: gate.ctx.membership.id,
      },
    });

    const label =
      reviewStatus === "NEEDS_REVISION"
        ? "Needs revision"
        : reviewStatus === "APPROVED"
          ? "Approved"
          : reviewStatus === "DONE"
            ? "Marked done"
            : "Pending review";

    await createNotifications([
      {
        organizationId: gate.ctx.labId,
        programId: milestone.programId,
        memberId: submission.memberId,
        kind: "REVIEW",
        title: `${label}: ${milestone.title}`,
        body:
          updated.reviewComment?.slice(0, 160) ||
          `Your submission was marked ${label.toLowerCase()}.`,
        href: `/app/assignments/${milestoneId}`,
      },
    ]);

    return NextResponse.json({
      ok: true,
      submission: {
        id: updated.id,
        reviewStatus: updated.reviewStatus,
        reviewComment: updated.reviewComment,
        reviewedAt: updated.reviewedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Review failed",
      },
      { status: 503 },
    );
  }
}
