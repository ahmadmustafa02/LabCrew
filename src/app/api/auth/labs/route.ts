import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import {
  listMembershipsForUser,
  profileFromActiveMembership,
  resolveActiveMembership,
} from "@/server/auth/active-membership";

export const runtime = "nodejs";

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return { session, userId };
}

export async function GET() {
  try {
    const authz = await requireUserId();
    if (!authz) {
      return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
    }

    const labs = await listMembershipsForUser(authz.userId);
    const activeMemberId = authz.session.user?.memberId ?? labs[0]?.id ?? null;

    return NextResponse.json({
      ok: true,
      activeMemberId,
      labs: labs.map((l) => ({
        memberId: l.id,
        role: l.role === MemberRole.STUDENT ? "student" : "director",
        memberRole: l.role,
        programName: l.programName,
        organizationName: l.organizationName,
        organizationSlug: l.organizationSlug,
        active: l.id === activeMemberId,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to list labs",
      },
      { status: 503 },
    );
  }
}

/** Create an additional lab (or first lab) as director/admin. */
export async function POST(request: Request) {
  try {
    const authz = await requireUserId();
    if (!authz) {
      return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
    }

    const body = (await request.json()) as {
      action?: "create" | "switch";
      orgName?: string;
      programName?: string;
      memberId?: string;
    };

    const action = body.action ?? "create";
    const prisma = getPrisma();

    if (action === "switch") {
      const memberId = body.memberId?.trim() ?? "";
      if (!memberId) {
        return NextResponse.json(
          { ok: false, error: "memberId required" },
          { status: 400 },
        );
      }
      const active = await resolveActiveMembership(authz.userId, memberId);
      if (!active || active.membership.id !== memberId) {
        return NextResponse.json({ ok: false, error: "Lab not found" }, { status: 404 });
      }
      const profile = profileFromActiveMembership({
        userId: active.user.id,
        email: active.user.email,
        name: active.user.name,
        membership: active.membership,
      });
      return NextResponse.json({ ok: true, profile });
    }

    const orgName = body.orgName?.trim() ?? "";
    const programName = body.programName?.trim() || "Research Cohort";
    if (orgName.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Lab / organization name is required" },
        { status: 400 },
      );
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
          userId: authz.userId,
          role: MemberRole.ADMIN,
        },
      });
      return { org, program, member };
    });

    const active = await resolveActiveMembership(
      authz.userId,
      result.member.id,
    );
    const profile = profileFromActiveMembership({
      userId: authz.userId,
      email: active?.user.email ?? authz.session.user?.email ?? "",
      name: active?.user.name ?? authz.session.user?.name ?? "User",
      membership: active?.membership ?? null,
    });

    return NextResponse.json({
      ok: true,
      profile,
      lab: {
        memberId: result.member.id,
        organizationName: result.org.name,
        programName: result.program.name,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Lab action failed",
      },
      { status: 503 },
    );
  }
}
