import { NextResponse } from "next/server";
import { MilestoneStatus, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import type { AssignmentRubric, MaterialItem } from "@/lib/assignment-types";
import { requireAuth, requireDirector } from "@/server/auth/api-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await requireAuth();
    if ("error" in gate) return gate.error;

    const { membership } = gate.session;
    const prisma = getPrisma();

    const assignments = await prisma.milestone.findMany({
      where: { programId: membership.programId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        submissions: {
          where: { status: { in: ["SUBMITTED", "SCORED"] } },
          select: { id: true },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      programId: membership.programId,
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        instructions: a.instructions,
        materials: a.materials,
        rubric: a.rubric,
        dueAt: a.dueAt,
        status: a.status,
        sortOrder: a.sortOrder,
        submissionCount: a.submissions.length,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to list assignments",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireDirector();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      instructions?: string;
      dueAt?: string | null;
      status?: MilestoneStatus;
      materials?: MaterialItem[];
      rubric?: AssignmentRubric;
      sortOrder?: number;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
    }

    const programId = gate.session.membership.programId;
    const prisma = getPrisma();

    const maxSort = await prisma.milestone.aggregate({
      where: { programId },
      _max: { sortOrder: true },
    });

    const assignment = await prisma.milestone.create({
      data: {
        programId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        instructions: body.instructions?.trim() || null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        status: body.status ?? MilestoneStatus.ACTIVE,
        sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
        materials: (body.materials ?? []) as Prisma.InputJsonValue,
        rubric: (body.rubric ?? {
          requireEvidenceUrl: true,
          requireWriteup: true,
          minWriteupLength: 40,
          checklist: [],
        }) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true, assignment });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create assignment",
      },
      { status: 503 },
    );
  }
}
