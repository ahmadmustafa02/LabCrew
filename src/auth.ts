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
      needsOnboarding?: boolean;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: AppRole;
    memberId?: string;
    programName?: string;
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
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            members: {
              include: { program: true },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        });

        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return profileFromUser(user);
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
      user.needsOnboarding = profile.needsOnboarding;
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.role = user.role;
        token.memberId = user.memberId;
        token.programName = user.programName;
        token.needsOnboarding = Boolean(user.needsOnboarding);
        if (user.id) token.sub = user.id;
      }

      // After Google OAuth, Auth.js may set sub to Google subject — replace with our user id
      if (account?.provider === "google" && user?.id) {
        token.sub = user.id;
      }

      if (token.sub && (trigger === "update" || account?.provider === "google")) {
        const prisma = getPrisma();
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          include: {
            members: {
              include: { program: true },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        });
        if (dbUser) {
          const profile = profileFromUser(dbUser);
          token.role = profile.role;
          token.memberId =
            "memberId" in profile ? profile.memberId : undefined;
          token.programName =
            "programName" in profile ? profile.programName : undefined;
          token.needsOnboarding = profile.needsOnboarding;
        }
      }

      return token;
    },
  },
});

export type { AppRole };
