"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/session/session-provider";

const DIRECTOR_ONLY = [
  "/app/brief",
  "/app/mission-control",
  "/app/approvals",
  "/app/analytics",
  "/app/team",
  "/app/assignments/new",
];

function isDirectorOnly(pathname: string) {
  return DIRECTOR_ONLY.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Keeps students out of director-only routes (nav + deep links + role switch). */
export function RoleGate({ children }: { children: React.ReactNode }) {
  const { role, ready } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (role === "student" && isDirectorOnly(pathname)) {
      router.replace("/app/assignments");
    }
  }, [ready, role, pathname, router]);

  if (ready && role === "student" && isDirectorOnly(pathname)) {
    return (
      <p className="text-sm text-lc-muted">Opening your tasks…</p>
    );
  }

  return children;
}
