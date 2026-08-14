"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session/session-provider";

export default function AppIndexPage() {
  const router = useRouter();
  const { role, ready } = useSession();

  useEffect(() => {
    if (ready) {
      router.replace(
        role === "student" ? "/app/assignments" : "/app/brief",
      );
      return;
    }
    // Failsafe: never leave the user on a forever spinner
    const t = window.setTimeout(() => {
      router.replace(
        role === "student" ? "/app/assignments" : "/app/brief",
      );
    }, 6000);
    return () => window.clearTimeout(t);
  }, [ready, role, router]);

  return (
    <p className="text-sm text-lc-muted">Opening your workspace…</p>
  );
}
