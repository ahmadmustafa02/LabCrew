import { MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AppRole } from "@/auth.config";

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

/** Load authenticated user + active lab membership from DB (respects JWT memberId). */
export async function getApiSession(): Promise<ApiSession | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { resolveActiveMembership } = await import(
    "@/server/auth/active-membership"
  );
  const active = await resolveActiveMembership(
    userId,
    session.user?.memberId ?? null,
  );
  if (!active) return null;

  return {
    userId: active.user.id,
    email: active.user.email,
    name: active.user.name,
    appRole: active.appRole,
    membership: {
      id: active.membership.id,
      role: active.membership.role,
      programId: active.membership.programId,
      organizationId: active.membership.organizationId,
      programName: active.membership.programName,
      organizationSlug: active.membership.organizationSlug,
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
