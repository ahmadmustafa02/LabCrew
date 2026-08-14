"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AuthChrome } from "@/components/auth/auth-chrome";
import { AuthProvider } from "@/components/session/auth-provider";
import { Button } from "@/components/ui/button";

function OnboardingInner() {
  const router = useRouter();
  const { data, status, update } = useSession();
  const [orgName, setOrgName] = useState("");
  const [programName, setProgramName] = useState("Research Cohort");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, programName }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed");
      await update();
      router.replace("/app/brief");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthChrome backHref="/" backLabel="Home">
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
        Set up your lab
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-lc-muted">
        Signed in as {data?.user?.email}. Create your organization to start
        inviting students.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">
            Lab / organization
          </span>
          <input
            className="lc-input"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Northwater Lab"
            required
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">
            First program name
          </span>
          <input
            className="lc-input"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm text-lc-danger">{error}</p> : null}
        <Button
          type="submit"
          variant="accent"
          size="lg"
          disabled={busy}
          className="w-full"
        >
          {busy ? "Creating…" : "Continue to LabCrew"}
        </Button>
      </form>
    </AuthChrome>
  );
}

export default function OnboardingPage() {
  return (
    <AuthProvider>
      <OnboardingInner />
    </AuthProvider>
  );
}
