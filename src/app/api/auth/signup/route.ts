import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { MemberRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      orgName?: string;
      programName?: string;
    };

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const orgName = body.orgName?.trim() ?? "";
    const programName = body.programName?.trim() || "Research Cohort";

    if (name.length < 2) {
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
    }
    if (!email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }
    if (orgName.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Lab / organization name is required" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    let slug = slugify(orgName);
    const clash = await prisma.organization.findUnique({ where: { slug } });
    if (clash) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName, slug },
      });
      const program = await tx.program.create({
        data: {
          organizationId: org.id,
          name: programName,
        },
      });
      const user = await tx.user.create({
        data: { email, name, passwordHash },
      });
      const member = await tx.member.create({
        data: {
          organizationId: org.id,
          programId: program.id,
          userId: user.id,
          role: MemberRole.ADMIN,
        },
      });
      return { org, program, user, member };
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
      },
      program: {
        id: result.program.id,
        name: result.program.name,
      },
    });
  } catch (error) {
    console.error("[signup]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Signup failed",
      },
      { status: 503 },
    );
  }
}
