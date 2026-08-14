import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { requireDirector } from "@/server/auth/api-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await requireDirector();
    if ("error" in gate) return gate.error;

    const prisma = getPrisma();
    const program = await prisma.program.findUnique({
      where: { id: gate.session.membership.programId },
      include: {
        organization: true,
        members: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ ok: false, error: "Program not found" }, { status: 404 });
    }

    const directors = program.members.filter(
      (m) => m.role === MemberRole.MENTOR || m.role === MemberRole.ADMIN,
    );
    const students = program.members.filter((m) => m.role === MemberRole.STUDENT);

    return NextResponse.json({
      ok: true,
      program: {
        id: program.id,
        name: program.name,
        org: program.organization.name,
      },
      directors: directors.map((m) => ({
        memberId: m.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
      students: students.map((m) => ({
        memberId: m.id,
        name: m.user.name,
        email: m.user.email,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load members",
      },
      { status: 503 },
    );
  }
}
