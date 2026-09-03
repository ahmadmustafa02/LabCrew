import { MemberRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import type { AppRole } from "@/auth.config";

/** Newest membership wins — invite join after a solo lab must become active. */
const primaryMembershipInclude = {
  members: {
    include: {
      program: { include: { organization: true } },
    },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
};

export async function loadAuthProfile(email: string) {
  const prisma = getPrisma();
  const normalized = email.trim().toLowerCase();
  return prisma.user.findUnique({
    where: { email: normalized },
    include: primaryMembershipInclude,
  });
}

export async function ensureGoogleUser(input: {
  email: string;
  name?: string | null;
}) {
  const prisma = getPrisma();
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    include: primaryMembershipInclude,
  });

  if (existing) {
    if (input.name && input.name !== existing.name) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { name: input.name },
        include: primaryMembershipInclude,
      });
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      email,
      name: input.name?.trim() || email.split("@")[0] || "User",
    },
    include: primaryMembershipInclude,
  });
}

export function profileFromUser(user: {
  id: string;
  email: string;
  name: string;
  members: Array<{
    id: string;
    role: MemberRole;
    program: {
      name: string;
      organization?: { name: string };
    };
  }>;
}) {
  const membership = user.members[0];
  if (!membership) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: "director" as AppRole,
      needsOnboarding: true as const,
    };
  }

  const role: AppRole =
    membership.role === MemberRole.STUDENT ? "student" : "director";

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role,
    memberId: membership.id,
    programName: membership.program.name,
    organizationName: membership.program.organization?.name,
    needsOnboarding: false as const,
  };
}
