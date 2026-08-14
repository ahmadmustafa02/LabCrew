import { NextResponse } from "next/server";
import { MemberRole, Prisma, SubmissionStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { id: milestoneId } = await params;
    const memberId = new URL(request.url).searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json({ ok: false, error: "memberId required" }, { status: 400 });
    }

    const prisma = getPrisma();
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
    const { id: milestoneId } = await params;
    const body = (await request.json()) as {
      memberId?: string;
      evidenceUrl?: string;
      repoUrl?: string;
      writeup?: string;
      checklist?: string[];
      status?: "DRAFT" | "SUBMITTED";
    };

    if (!body.memberId) {
      return NextResponse.json({ ok: false, error: "memberId required" }, { status: 400 });
    }

    const prisma = getPrisma();
    const [milestone, member] = await Promise.all([
      prisma.milestone.findUnique({ where: { id: milestoneId } }),
      prisma.member.findUnique({ where: { id: body.memberId } }),
    ]);

    if (!milestone) {
      return NextResponse.json({ ok: false, error: "Assignment not found" }, { status: 404 });
    }
    if (!member || member.role !== MemberRole.STUDENT) {
      return NextResponse.json({ ok: false, error: "Invalid student member" }, { status: 400 });
    }
    if (member.programId !== milestone.programId) {
      return NextResponse.json({ ok: false, error: "Student not in this program" }, { status: 400 });
    }

    const status =
      body.status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED;

    const data = {
      evidenceUrl: body.evidenceUrl?.trim() || null,
      repoUrl: body.repoUrl?.trim() || null,
      writeup: body.writeup?.trim() || null,
      checklist: (body.checklist ?? []) as Prisma.InputJsonValue,
      status,
      submittedAt: status === SubmissionStatus.SUBMITTED ? new Date() : null,
      score: status === SubmissionStatus.SUBMITTED ? Prisma.DbNull : undefined,
    };

    const submission = await prisma.submission.upsert({
      where: {
        milestoneId_memberId: {
          milestoneId,
          memberId: body.memberId,
        },
      },
      create: {
        milestoneId,
        memberId: body.memberId,
        evidenceUrl: data.evidenceUrl,
        repoUrl: data.repoUrl,
        writeup: data.writeup,
        checklist: data.checklist,
        status: data.status,
        submittedAt: data.submittedAt,
      },
      update: {
        evidenceUrl: data.evidenceUrl,
        repoUrl: data.repoUrl,
        writeup: data.writeup,
        checklist: data.checklist,
        status: data.status,
        submittedAt: data.submittedAt,
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
