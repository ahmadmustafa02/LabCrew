import { NextResponse } from "next/server";
import { Prisma, ReviewStatus, SubmissionStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import {
  assertSameProgram,
  requireStudent,
} from "@/server/auth/api-session";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type Attachment = {
  id: string;
  title: string;
  kind: string;
  url: string;
  originalName?: string;
  size?: number;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const gate = await requireStudent();
    if ("error" in gate) return gate.error;

    const { id: milestoneId } = await params;
    const memberId = gate.session.membership.id;
    const prisma = getPrisma();

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    });
    if (!milestone) {
      return NextResponse.json({ ok: false, error: "Assignment not found" }, { status: 404 });
    }
    const wrong = assertSameProgram(gate.session, milestone.programId);
    if (wrong) return wrong;

    const submission = await prisma.submission.findUnique({
      where: {
        milestoneId_memberId: { milestoneId, memberId },
      },
    });

    return NextResponse.json({ ok: true, submission });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load submission",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const gate = await requireStudent();
    if ("error" in gate) return gate.error;

    const { id: milestoneId } = await params;
    const memberId = gate.session.membership.id;
    const body = (await request.json()) as {
      evidenceUrl?: string;
      repoUrl?: string;
      writeup?: string;
      checklist?: string[];
      attachments?: Attachment[];
      status?: "DRAFT" | "SUBMITTED";
    };

    const prisma = getPrisma();
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      return NextResponse.json({ ok: false, error: "Assignment not found" }, { status: 404 });
    }
    const wrong = assertSameProgram(gate.session, milestone.programId);
    if (wrong) return wrong;

    const status =
      body.status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED;

    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    const data = {
      evidenceUrl: body.evidenceUrl?.trim() || null,
      repoUrl: body.repoUrl?.trim() || null,
      writeup: body.writeup?.trim() || null,
      checklist: (body.checklist ?? []) as Prisma.InputJsonValue,
      attachments: attachments as Prisma.InputJsonValue,
      status,
      submittedAt: status === SubmissionStatus.SUBMITTED ? new Date() : null,
      reviewStatus:
        status === SubmissionStatus.SUBMITTED
          ? ReviewStatus.PENDING_REVIEW
          : null,
      // clear prior review when resubmitting
      reviewComment:
        status === SubmissionStatus.SUBMITTED ? null : undefined,
      reviewedAt: status === SubmissionStatus.SUBMITTED ? null : undefined,
      reviewedById: status === SubmissionStatus.SUBMITTED ? null : undefined,
    };

    const submission = await prisma.submission.upsert({
      where: {
        milestoneId_memberId: { milestoneId, memberId },
      },
      create: {
        milestoneId,
        memberId,
        evidenceUrl: data.evidenceUrl,
        repoUrl: data.repoUrl,
        writeup: data.writeup,
        checklist: data.checklist,
        attachments: data.attachments,
        status: data.status,
        submittedAt: data.submittedAt,
        reviewStatus: data.reviewStatus,
      },
      update: {
        evidenceUrl: data.evidenceUrl,
        repoUrl: data.repoUrl,
        writeup: data.writeup,
        checklist: data.checklist,
        attachments: data.attachments,
        status: data.status,
        submittedAt: data.submittedAt,
        reviewStatus: data.reviewStatus,
        reviewComment: data.reviewComment,
        reviewedAt: data.reviewedAt,
        reviewedById: data.reviewedById,
        score: status === SubmissionStatus.SUBMITTED ? Prisma.DbNull : undefined,
      },
    });

    return NextResponse.json({ ok: true, submission });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to submit",
      },
      { status: 503 },
    );
  }
}
