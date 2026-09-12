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
  "/app/research",
];

const STUDENT_ONLY = ["/app/home"];

function isDirectorOnly(pathname: string) {
  return DIRECTOR_ONLY.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isStudentOnly(pathname: string) {
  return STUDENT_ONLY.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

type Props = {
  children: React.ReactNode;
  /** Optional hard gate for a single page */
  allow?: "student" | "director";
};

/** Keeps students out of director-only routes (nav + deep links + role switch). */
export function RoleGate({ children, allow }: Props) {
  const { role, ready } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (allow === "student" && role !== "student") {
      router.replace("/app/brief");
      return;
    }
    if (allow === "director" && role !== "director") {
      router.replace("/app/home");
      return;
    }
    if (role === "student" && isDirectorOnly(pathname)) {
      router.replace("/app/home");
      return;
    }
    if (role === "director" && isStudentOnly(pathname)) {
      router.replace("/app/brief");
    }
  }, [ready, role, pathname, router, allow]);

  if (!ready) {
    return <p className="text-sm text-lc-muted">Opening your workspace…</p>;
  }

  if (
    (allow === "student" && role !== "student") ||
    (allow === "director" && role !== "director") ||
    (role === "student" && isDirectorOnly(pathname)) ||
    (role === "director" && isStudentOnly(pathname))
  ) {
    return (
      <p className="text-sm text-lc-muted">
        That page isn’t available in this workspace — taking you home…
      </p>
    );
  }

  return children;
}
