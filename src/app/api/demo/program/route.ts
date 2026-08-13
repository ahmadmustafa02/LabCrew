import { NextResponse } from "next/server";
import { MemberRole, MilestoneStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const prisma = getPrisma();
    const program = await prisma.program.findFirst({
      where: { organization: { slug: "northwater" } },
      include: {
        organization: true,
        milestones: {
          where: { status: MilestoneStatus.ACTIVE },
          take: 1,
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!program) {
      return NextResponse.json(
        {
          ok: false,
          error: "Demo program not seeded. Run: npm run db:push && npm run db:seed",
        },
        { status: 404 },
      );
    }

    const students = await prisma.member.count({
      where: { programId: program.id, role: MemberRole.STUDENT },
    });

    return NextResponse.json({
      ok: true,
      program: {
        id: program.id,
        name: program.name,
        org: program.organization.name,
        students,
        activeMilestone: program.milestones[0]?.title ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Database unavailable. Is Docker running?",
      },
      { status: 503 },
    );
  }
}
