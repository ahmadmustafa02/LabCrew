import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";
import { authConfig, type AppRole } from "@/auth.config";
import {
  ensureGoogleUser,
  profileFromUser,
} from "@/server/auth/user-profile";

declare module "next-auth" {
  interface User {
    role?: AppRole;
    memberId?: string;
    programName?: string;
    organizationName?: string;
    needsOnboarding?: boolean;
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      role: AppRole;
      memberId?: string;
      programName?: string;
      organizationName?: string;
      needsOnboarding?: boolean;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: AppRole;
    memberId?: string;
    programName?: string;
    organizationName?: string;
    needsOnboarding?: boolean;
  }
}

const googleConfigured =
  Boolean(process.env.AUTH_GOOGLE_ID) &&
  Boolean(process.env.AUTH_GOOGLE_SECRET);

const providers = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      try {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const prisma = getPrisma();
        const userRow = await prisma.user.findUnique({ where: { email } });
        if (!userRow?.passwordHash) return null;
        const ok = await bcrypt.compare(password, userRow.passwordHash);
        if (!ok) return null;

        const { resolveActiveMembership, profileFromActiveMembership } =
          await import("@/server/auth/active-membership");
        const active = await resolveActiveMembership(userRow.id);
        return profileFromActiveMembership({
          userId: userRow.id,
          email: userRow.email,
          name: userRow.name,
          membership: active?.membership ?? null,
        });
      } catch (error) {
        console.error("[auth] authorize failed", error);
        return null;
      }
    },
  }),
  ...(googleConfigured
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      try {
        const dbUser = await ensureGoogleUser({
          email: user.email,
          name: user.name,
        });
        const profile = profileFromUser(dbUser);
        user.id = profile.id;
        user.role = profile.role;
        user.memberId = "memberId" in profile ? profile.memberId : undefined;
        user.programName =
          "programName" in profile ? profile.programName : undefined;
        user.organizationName =
          "organizationName" in profile ? profile.organizationName : undefined;
        user.needsOnboarding = profile.needsOnboarding;
        return true;
      } catch (error) {
        // Uncaught DB errors become Auth.js AccessDenied → bounce to /login.
        console.error("[auth] Google sign-in failed (often DB down)", error);
        return false;
      }
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.memberId = user.memberId;
        token.programName = user.programName;
        token.organizationName = user.organizationName;
        token.needsOnboarding = Boolean(user.needsOnboarding);
        if (user.id) token.sub = user.id;
        if (user.email) token.email = user.email;
      }

      // After Google OAuth, Auth.js may set sub to Google subject — replace with our user id
      if (account?.provider === "google" && user?.id) {
        token.sub = user.id;
      }

      // Client `update({ ... })` after onboarding — apply immediately
      if (trigger === "update" && session && typeof session === "object") {
        const patch = session as {
          needsOnboarding?: boolean;
          memberId?: string;
          programName?: string;
          organizationName?: string;
          role?: AppRole;
        };
        if (typeof patch.needsOnboarding === "boolean") {
          token.needsOnboarding = patch.needsOnboarding;
        }
        if (typeof patch.memberId === "string") {
          token.memberId = patch.memberId;
        }
        if (typeof patch.programName === "string") {
          token.programName = patch.programName;
        }
        if (typeof patch.organizationName === "string") {
          token.organizationName = patch.organizationName;
        }
        if (patch.role === "director" || patch.role === "student") {
          token.role = patch.role;
        }
      }

      if (
        token.sub &&
        (trigger === "update" || account?.provider === "google" || Boolean(user))
      ) {
        try {
          const { resolveActiveMembership, profileFromActiveMembership } =
            await import("@/server/auth/active-membership");
          const preferred =
            typeof token.memberId === "string" ? token.memberId : undefined;
          const active = await resolveActiveMembership(
            String(token.sub),
            preferred,
          );
          if (active) {
            token.sub = active.user.id;
            const profile = profileFromActiveMembership({
              userId: active.user.id,
              email: active.user.email,
              name: active.user.name,
              membership: active.membership,
            });
            token.role = profile.role;
            token.memberId =
              "memberId" in profile ? profile.memberId : undefined;
            token.programName =
              "programName" in profile ? profile.programName : undefined;
            token.organizationName =
              "organizationName" in profile
                ? profile.organizationName
                : undefined;
            token.needsOnboarding = profile.needsOnboarding;
          } else if (typeof token.email === "string") {
            const prisma = getPrisma();
            const byEmail = await prisma.user.findUnique({
              where: { email: token.email.trim().toLowerCase() },
            });
            if (byEmail) {
              const again = await resolveActiveMembership(
                byEmail.id,
                preferred,
              );
              if (again) {
                token.sub = again.user.id;
                const profile = profileFromActiveMembership({
                  userId: again.user.id,
                  email: again.user.email,
                  name: again.user.name,
                  membership: again.membership,
                });
                token.role = profile.role;
                token.memberId =
                  "memberId" in profile ? profile.memberId : undefined;
                token.programName =
                  "programName" in profile ? profile.programName : undefined;
                token.organizationName =
                  "organizationName" in profile
                    ? profile.organizationName
                    : undefined;
                token.needsOnboarding = profile.needsOnboarding;
              }
            }
          }
        } catch (error) {
          console.error("[auth] jwt profile refresh failed", error);
        }
      }

      return token;
    },
  },
});

export type { AppRole };
