import { MemberRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import type { AppRole } from "@/auth.config";

export async function loadAuthProfile(email: string) {
  const prisma = getPrisma();
  const normalized = email.trim().toLowerCase();
  let user = await prisma.user.findUnique({
    where: { email: normalized },
    include: {
      members: {
        include: { program: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  return user;
}

export async function ensureGoogleUser(input: {
  email: string;
  name?: string | null;
}) {
  const prisma = getPrisma();
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    include: {
      members: {
        include: { program: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (existing) {
    if (input.name && input.name !== existing.name) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { name: input.name },
        include: {
          members: {
            include: { program: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      });
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      email,
      name: input.name?.trim() || email.split("@")[0] || "User",
    },
    include: {
      members: {
        include: { program: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });
}

export function profileFromUser(user: {
  id: string;
  email: string;
  name: string;
  members: Array<{
    id: string;
    role: MemberRole;
    program: { name: string };
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
    needsOnboarding: false as const,
  };
}
