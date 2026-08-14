"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session/session-provider";

export default function AppIndexPage() {
  const router = useRouter();
  const { role, ready } = useSession();

  useEffect(() => {
    if (!ready) return;
    router.replace(
      role === "student" ? "/app/assignments" : "/app/mission-control",
    );
  }, [ready, role, router]);

  return (
    <p className="text-sm text-lc-muted">Opening your workspace…</p>
  );
}
