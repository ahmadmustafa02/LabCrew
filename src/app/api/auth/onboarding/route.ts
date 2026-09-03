import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    let userId = session?.user?.id;
    const email = session?.user?.email?.trim().toLowerCase();
    if (!userId && !email) {
      return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
    }

    const body = (await request.json()) as {
      orgName?: string;
      programName?: string;
    };
    const orgName = body.orgName?.trim() ?? "";
    const programName = body.programName?.trim() || "Research Cohort";

    if (orgName.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Lab / organization name is required" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    // Resolve the real User row (JWT sub can be a Google subject briefly)
    if (userId) {
      const byId = await prisma.user.findUnique({ where: { id: userId } });
      if (!byId && email) {
        const byEmail = await prisma.user.findUnique({ where: { email } });
        userId = byEmail?.id;
      }
    } else if (email) {
      const byEmail = await prisma.user.findUnique({ where: { email } });
      userId = byEmail?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "User record missing — sign out and try Google again" },
        { status: 401 },
      );
    }

    const existingMember = await prisma.member.findFirst({
      where: { userId },
      include: {
        organization: true,
        program: true,
      },
    });
    // Idempotent: first click often succeeds but soft-nav races the session
    // cookie and leaves the user on this page — treat as success so retry works.
    if (existingMember) {
      return NextResponse.json({
        ok: true,
        alreadyOnboarded: true,
        organization: existingMember.organization,
        program: existingMember.program,
        memberId: existingMember.id,
      });
    }

    let slug = slugify(orgName);
    const clash = await prisma.organization.findUnique({ where: { slug } });
    if (clash) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName, slug },
      });
      const program = await tx.program.create({
        data: { organizationId: org.id, name: programName },
      });
      const member = await tx.member.create({
        data: {
          organizationId: org.id,
          programId: program.id,
          userId,
          role: MemberRole.ADMIN,
        },
      });
      return { org, program, member };
    });

    return NextResponse.json({
      ok: true,
      alreadyOnboarded: false,
      organization: result.org,
      program: result.program,
      memberId: result.member.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Onboarding failed",
      },
      { status: 503 },
    );
  }
}
