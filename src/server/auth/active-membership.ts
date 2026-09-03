import { MemberRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import type { AppRole } from "@/auth.config";

export type MembershipRow = {
  id: string;
  role: MemberRole;
  programId: string;
  organizationId: string;
  programName: string;
  organizationName: string;
  organizationSlug: string;
  createdAt: Date;
};

function toAppRole(role: MemberRole): AppRole {
  return role === MemberRole.STUDENT ? "student" : "director";
}

function mapMembership(m: {
  id: string;
  role: MemberRole;
  programId: string;
  organizationId: string;
  createdAt: Date;
  program: { name: string; organization: { name: string; slug: string } };
}): MembershipRow {
  return {
    id: m.id,
    role: m.role,
    programId: m.programId,
    organizationId: m.organizationId,
    programName: m.program.name,
    organizationName: m.program.organization.name,
    organizationSlug: m.program.organization.slug,
    createdAt: m.createdAt,
  };
}

/** List every lab membership for a user (newest first). */
export async function listMembershipsForUser(userId: string) {
  const prisma = getPrisma();
  const rows = await prisma.member.findMany({
    where: { userId },
    include: {
      program: { include: { organization: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapMembership);
}

/**
 * Resolve active membership: preferred id if still owned, else newest.
 */
export async function resolveActiveMembership(
  userId: string,
  preferredMemberId?: string | null,
) {
  const prisma = getPrisma();

  if (preferredMemberId) {
    const preferred = await prisma.member.findFirst({
      where: { id: preferredMemberId, userId },
      include: {
        program: { include: { organization: true } },
        user: true,
      },
    });
    if (preferred) {
      return {
        user: {
          id: preferred.user.id,
          email: preferred.user.email,
          name: preferred.user.name,
        },
        membership: mapMembership(preferred),
        appRole: toAppRole(preferred.role),
      };
    }
  }

  const newest = await prisma.member.findFirst({
    where: { userId },
    include: {
      program: { include: { organization: true } },
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!newest) return null;

  return {
    user: {
      id: newest.user.id,
      email: newest.user.email,
      name: newest.user.name,
    },
    membership: mapMembership(newest),
    appRole: toAppRole(newest.role),
  };
}

export function profileFromActiveMembership(input: {
  userId: string;
  email: string;
  name: string;
  membership: MembershipRow | null;
}) {
  if (!input.membership) {
    return {
      id: input.userId,
      email: input.email,
      name: input.name,
      role: "director" as AppRole,
      needsOnboarding: true as const,
    };
  }
  return {
    id: input.userId,
    email: input.email,
    name: input.name,
    role: toAppRole(input.membership.role),
    memberId: input.membership.id,
    programName: input.membership.programName,
    organizationName: input.membership.organizationName,
    needsOnboarding: false as const,
  };
}
