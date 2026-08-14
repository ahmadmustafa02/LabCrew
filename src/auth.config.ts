import type { NextAuthConfig } from "next-auth";

export type AppRole = "director" | "student";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.memberId = user.memberId;
        token.programName = user.programName;
      }
      return token;
    },
    async session({ session, token }) {
      const user = session.user as typeof session.user & {
        id: string;
        role: AppRole;
        memberId?: string;
        programName?: string;
      };
      user.id = token.sub ?? "";
      user.role = (token.role as AppRole) ?? "student";
      user.memberId = typeof token.memberId === "string" ? token.memberId : undefined;
      user.programName =
        typeof token.programName === "string" ? token.programName : undefined;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth);
      if (pathname.startsWith("/app")) return isLoggedIn;
      if (pathname === "/login") return true;
      return true;
    },
  },
} satisfies NextAuthConfig;
