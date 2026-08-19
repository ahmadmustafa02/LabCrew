import { MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AppRole } from "@/auth.config";
import { getPrisma } from "@/lib/db";
import {
  bearerTokenHashForLimit,
  checkBearerRateLimit,
  resolveBearerToken,
} from "@/server/auth/api-tokens";

/**
 * Lab tenancy — canonical enforcement (repository / helper layer only).
 *
 * Decisions (Phase 1a):
 * - Tenant = organizationId, aliased as labId. No table rename to Lab.
 * - No Prisma middleware/extensions for tenant injection (same as CodePulse).
 * - Auth: cookie session (web) OR Authorization: Bearer (mobile/API).
 *   requireLabScope supports both from day one so Phase 4 does not redesign this.
 */

export type LabMembership = {
  id: string;
  role: MemberRole;
  programId: string;
  organizationId: string;
  programName: string;
  organizationSlug: string;
};

export type LabContext = {
  userId: string;
  email: string;
  name: string;
  appRole: AppRole;
  /** How the principal was authenticated */
  authMethod: "session" | "bearer";
  /** Canonical tenant id (= organizationId) */
  labId: string;
  membership: LabMembership;
};

function unauthorized(message = "Sign in required") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

function forbidden(message = "Not allowed") {
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

function toAppRole(role: MemberRole): AppRole {
  return role === MemberRole.STUDENT ? "student" : "director";
}

async function loadMembershipForUser(userId: string): Promise<{
  user: { id: string; email: string; name: string };
  membership: LabMembership;
} | null> {
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

  return {
    user: { id: user.id, email: user.email, name: user.name },
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

async function loadMembershipById(
  memberId: string,
  expectedLabId: string,
  expectedProgramId: string,
): Promise<{
  user: { id: string; email: string; name: string };
  membership: LabMembership;
} | null> {
  const prisma = getPrisma();
  const membership = await prisma.member.findFirst({
    where: {
      id: memberId,
      organizationId: expectedLabId,
      programId: expectedProgramId,
    },
    include: {
      user: true,
      program: { include: { organization: true } },
    },
  });
  if (!membership) return null;

  return {
    user: {
      id: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
    },
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

function toLabContext(
  loaded: {
    user: { id: string; email: string; name: string };
    membership: LabMembership;
  },
  authMethod: "session" | "bearer",
): LabContext {
  return {
    userId: loaded.user.id,
    email: loaded.user.email,
    name: loaded.user.name,
    appRole: toAppRole(loaded.membership.role),
    authMethod,
    labId: loaded.membership.organizationId,
    membership: loaded.membership,
  };
}

/**
 * Resolve lab context from Bearer token (preferred when present) or cookie session.
 * Pass the Request so mobile clients can authenticate without cookies.
 */
export async function resolveLabContext(
  request?: Request,
): Promise<LabContext | null> {
  const header = request?.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const plain = header.slice(7).trim();
    const bearer = await resolveBearerToken(plain);
    if (!bearer) return null;
    const loaded = await loadMembershipById(
      bearer.memberId,
      bearer.organizationId,
      bearer.programId,
    );
    if (!loaded || loaded.user.id !== bearer.userId) return null;
    return toLabContext(loaded, "bearer");
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const loaded = await loadMembershipForUser(userId);
  if (!loaded) return null;
  return toLabContext(loaded, "session");
}

export async function requireLabScope(
  request?: Request,
): Promise<{ ctx: LabContext } | { error: NextResponse }> {
  const header = request?.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const plain = header.slice(7).trim();
    const limited = checkBearerRateLimit(bearerTokenHashForLimit(plain));
    if (limited) return { error: limited };
  }

  const ctx = await resolveLabContext(request);
  if (!ctx) return { error: unauthorized() };
  // labId always comes from the token/membership row — never from the client body.
  return { ctx };
}

export async function requireLabDirector(
  request?: Request,
): Promise<{ ctx: LabContext } | { error: NextResponse }> {
  const result = await requireLabScope(request);
  if ("error" in result) return result;
  if (result.ctx.appRole !== "director") {
    return { error: forbidden("Director access required") };
  }
  return result;
}

export async function requireLabStudent(
  request?: Request,
): Promise<{ ctx: LabContext } | { error: NextResponse }> {
  const result = await requireLabScope(request);
  if ("error" in result) return result;
  if (result.ctx.appRole !== "student") {
    return { error: forbidden("Student access required") };
  }
  return result;
}

/** Resource must belong to the caller's lab. Prefer 404 over 403 to avoid IDOR probes. */
export function assertLabMatch(
  ctx: LabContext,
  organizationId: string | null | undefined,
): NextResponse | null {
  if (!organizationId || organizationId !== ctx.labId) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  return null;
}

/**
 * Program id must match the caller's membership program (and therefore their lab).
 * Do not accept arbitrary programId from the client for writes.
 */
export function assertSameProgram(
  ctx: LabContext,
  programId: string,
): NextResponse | null {
  if (ctx.membership.programId !== programId) {
    return forbidden("Wrong program");
  }
  return null;
}

/** Always inject labId into Prisma where clauses for tenant lists. */
export function inLab(labId: string) {
  return { organizationId: labId } as const;
}

/** Compatibility shim: LabContext shaped like legacy ApiSession. */
export function asApiSession(ctx: LabContext) {
  return {
    userId: ctx.userId,
    email: ctx.email,
    name: ctx.name,
    appRole: ctx.appRole,
    membership: ctx.membership,
  };
}
