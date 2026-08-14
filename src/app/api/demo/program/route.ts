import { NextResponse } from "next/server";
import { MemberRole, MilestoneStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { requireAuth } from "@/server/auth/api-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await requireAuth();
    if ("error" in gate) return gate.error;

    const prisma = getPrisma();
    const program = await prisma.program.findUnique({
      where: { id: gate.session.membership.programId },
      include: {
        organization: true,
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
