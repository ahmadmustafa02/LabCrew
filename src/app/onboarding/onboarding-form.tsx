"use client";

import { FormEvent, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { AuthChrome } from "@/components/auth/auth-chrome";
import { Button } from "@/components/ui/button";

export function OnboardingForm({ email }: { email: string }) {
  const { update } = useSession();
  const [orgName, setOrgName] = useState("");
  const [programName, setProgramName] = useState("Research Cohort");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(json: {
    memberId?: string;
    program?: { name?: string };
  }) {
    try {
      await update({
        needsOnboarding: false,
        role: "director",
        memberId: json.memberId,
        programName: json.program?.name ?? programName,
      });
    } catch {
      // Cookie refresh is best-effort; DB gate on /app is the source of truth.
    }
    window.location.assign("/app/brief");
  }

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
      await finish(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <AuthChrome backHref="/" backLabel="Home">
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
        Set up your lab
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-lc-muted">
        Signed in as {email}. Create your organization to start inviting
        students.
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
            disabled={busy}
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
            disabled={busy}
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
          {busy ? "Opening your lab…" : "Continue to LabCrew"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-lc-muted">
        Wrong account?{" "}
        <button
          type="button"
          className="cursor-pointer font-medium text-lc-ink underline-offset-2 hover:underline"
          onClick={() => void signOut({ callbackUrl: "/login?switch=1" })}
        >
          Sign out
        </button>
      </p>
      <p className="mt-8 text-center text-sm text-lc-muted">
        Have an invite link?{" "}
        <a
          href="/join"
          className="font-medium text-lc-ink underline-offset-2 hover:underline"
        >
          Join a lab instead
        </a>
      </p>
    </AuthChrome>
  );
}
