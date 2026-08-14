"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { signOut, useSession as useAuthSession } from "next-auth/react";
import type { AppRole } from "@/auth.config";

type SessionState = {
  role: AppRole;
  studentMemberId: string | null;
  studentName: string | null;
  programName: string | null;
  userName: string | null;
  userEmail: string | null;
  needsOnboarding: boolean;
  ready: boolean;
  switchAccount: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data, status } = useAuthSession();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status !== "loading") setReady(true);
  }, [status]);

  const switchAccount = useCallback(async () => {
    await signOut({ callbackUrl: "/login?switch=1" });
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut({ callbackUrl: "/" });
  }, []);

  const value = useMemo<SessionState>(() => {
    const role = (data?.user?.role as AppRole) ?? "director";
    const needsOnboarding = Boolean(
      (data?.user as { needsOnboarding?: boolean } | undefined)
        ?.needsOnboarding,
    );
    return {
      role,
      studentMemberId:
        role === "student" ? (data?.user?.memberId ?? null) : null,
      studentName: role === "student" ? (data?.user?.name ?? null) : null,
      programName: data?.user?.programName ?? null,
      userName: data?.user?.name ?? null,
      userEmail: data?.user?.email ?? null,
      needsOnboarding,
      ready,
      switchAccount,
      signOutUser,
    };
  }, [data, ready, switchAccount, signOutUser]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
