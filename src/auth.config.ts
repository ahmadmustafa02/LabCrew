import type { NextAuthConfig } from "next-auth";

export type AppRole = "director" | "student";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        token.memberId = user.memberId;
        token.programName = user.programName;
        token.organizationName = (
          user as { organizationName?: string }
        ).organizationName;
        token.needsOnboarding = Boolean(
          (user as { needsOnboarding?: boolean }).needsOnboarding,
        );
      }

      // Refresh membership from DB when possible (Google / returning sessions)
      if (token.sub && (user || trigger === "update")) {
        // filled in auth.ts via events — keep token fields
      }

      return token;
    },
    async session({ session, token }) {
      const user = session.user as typeof session.user & {
        id: string;
        role: AppRole;
        memberId?: string;
        programName?: string;
        organizationName?: string;
        needsOnboarding?: boolean;
      };
      user.id = token.sub ?? "";
      user.role = (token.role as AppRole) ?? "director";
      user.memberId =
        typeof token.memberId === "string" ? token.memberId : undefined;
      user.programName =
        typeof token.programName === "string" ? token.programName : undefined;
      user.organizationName =
        typeof token.organizationName === "string"
          ? token.organizationName
          : undefined;
      user.needsOnboarding = Boolean(token.needsOnboarding);
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth);
      if (pathname.startsWith("/app")) return isLoggedIn;
      return true;
    },
  },
} satisfies NextAuthConfig;
