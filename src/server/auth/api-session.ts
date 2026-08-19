import { MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AppRole } from "@/auth.config";
import { getPrisma } from "@/lib/db";

/**
 * Legacy session helpers for routes not yet migrated to lab-scope.
 * New / audited routes must use `requireLabScope` from `@/server/tenancy/lab-scope`
 * (supports cookie session + Bearer tokens; injects labId).
 */

export type ApiMembership = {
  id: string;
  role: MemberRole;
  programId: string;
  organizationId: string;
  programName: string;
  organizationSlug: string;
};

export type ApiSession = {
  userId: string;
  email: string;
  name: string;
  appRole: AppRole;
  membership: ApiMembership;
};

function unauthorized(message = "Sign in required") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

function forbidden(message = "Not allowed") {
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

/** Load authenticated user + primary program membership from DB (not JWT alone). */
export async function getApiSession(): Promise<ApiSession | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      members: {
        include: {
          program: { include: { organization: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  const membership = user?.members[0];
  if (!user || !membership) return null;

  const appRole: AppRole =
    membership.role === MemberRole.STUDENT ? "student" : "director";

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    appRole,
    membership: {
      id: membership.id,
      role: membership.role,
      programId: membership.programId,
      organizationId: membership.organizationId,
      programName: membership.program.name,
      organizationSlug: membership.program.organization.slug,
    },
  };
}

export async function requireAuth(): Promise<
  { session: ApiSession } | { error: NextResponse }
> {
  const session = await getApiSession();
  if (!session) return { error: unauthorized() };
  return { session };
}

export async function requireDirector(): Promise<
  { session: ApiSession } | { error: NextResponse }
> {
  const result = await requireAuth();
  if ("error" in result) return result;
  if (result.session.appRole !== "director") {
    return { error: forbidden("Director access required") };
  }
  return result;
}

export async function requireStudent(): Promise<
  { session: ApiSession } | { error: NextResponse }
> {
  const result = await requireAuth();
  if ("error" in result) return result;
  if (result.session.appRole !== "student") {
    return { error: forbidden("Student access required") };
  }
  return result;
}

export function assertSameProgram(
  session: ApiSession,
  programId: string,
): NextResponse | null {
  if (session.membership.programId !== programId) {
    return forbidden("Wrong program");
  }
  return null;
}
