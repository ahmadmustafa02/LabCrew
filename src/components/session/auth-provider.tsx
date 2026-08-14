"use client";

import { SessionProvider as NextAuthProvider } from "next-auth/react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthProvider>{children}</NextAuthProvider>;
}
