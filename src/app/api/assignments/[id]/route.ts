import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const prisma = getPrisma();
    const assignment = await prisma.milestone.findUnique({
      where: { id },
      include: {
        submissions: {
          include: {
            member: { include: { user: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      assignment: {
        id: assignment.id,
        programId: assignment.programId,
        title: assignment.title,
        description: assignment.description,
        instructions: assignment.instructions,
        materials: assignment.materials,
        rubric: assignment.rubric,
        dueAt: assignment.dueAt,
        status: assignment.status,
        submissions: assignment.submissions.map((s) => ({
          id: s.id,
          memberId: s.memberId,
          studentName: s.member.user.name,
          status: s.status,
          evidenceUrl: s.evidenceUrl,
          repoUrl: s.repoUrl,
          writeup: s.writeup,
          checklist: s.checklist,
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
