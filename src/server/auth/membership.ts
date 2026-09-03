import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import { resolveActiveMembership } from "@/server/auth/active-membership";

export async function getSessionMembership() {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email?.trim().toLowerCase();

  if (!userId && !email) {
    return { session: null, user: null, member: null };
  }

  let resolvedUserId = userId;
  if (!resolvedUserId && email) {
    const prisma = getPrisma();
    const byEmail = await prisma.user.findUnique({ where: { email } });
    resolvedUserId = byEmail?.id;
  }

  if (!resolvedUserId) {
    return { session, user: null, member: null };
  }

  const active = await resolveActiveMembership(
    resolvedUserId,
    session?.user?.memberId,
  );

  if (!active) {
    return { session, user: null, member: null };
  }

  return {
    session,
    user: {
      id: active.user.id,
      email: active.user.email,
      name: active.user.name,
      members: [active.membership],
    },
    member: {
      id: active.membership.id,
      role: active.membership.role,
      programId: active.membership.programId,
      organizationId: active.membership.organizationId,
      program: {
        name: active.membership.programName,
      },
      organization: {
        name: active.membership.organizationName,
        slug: active.membership.organizationSlug,
      },
    },
  };
}

/** App routes: must be signed in and belong to a lab. */
export async function requireAppMembership() {
  const { session, member } = await getSessionMembership();
  if (!session?.user) {
    redirect("/login");
  }
  if (!member) {
    redirect("/onboarding");
  }
  return { session, member };
}

/** Onboarding: signed in, no lab yet. If lab exists, send to app. */
export async function requireOnboardingAccess() {
  const { session, user, member } = await getSessionMembership();
  if (!session?.user) {
    redirect("/login");
  }
  if (member) {
    redirect("/app");
  }
  return { session, user };
}
