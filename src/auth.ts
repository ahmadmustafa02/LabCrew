import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { MemberRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { authConfig, type AppRole } from "@/auth.config";

declare module "next-auth" {
  interface User {
    role?: AppRole;
    memberId?: string;
    programName?: string;
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      role: AppRole;
      memberId?: string;
      programName?: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: AppRole;
    memberId?: string;
    programName?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
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

        const membership = user.members[0];
        if (!membership) return null;

        const role: AppRole =
          membership.role === MemberRole.STUDENT ? "student" : "director";

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role,
          memberId: membership.id,
          programName: membership.program.name,
        };
      },
    }),
  ],
});

export type { AppRole };
