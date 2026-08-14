"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthProvider } from "@/components/session/auth-provider";

const DEMOS = [
  {
    label: "Director Reed",
    email: "director@northwater.lab",
    hint: "Mission Control, Brief, Approvals",
  },
  {
    label: "Ayesha (student)",
    email: "ayesha.rahman@students.northwater.lab",
    hint: "Submit evidence on My tasks",
  },
];

function LoginFormInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/app";
  const [email, setEmail] = useState(DEMOS[0].email);
  const [password, setPassword] = useState("labcrew");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtitle = useMemo(
    () => "Demo password for every seeded account: labcrew",
    [],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      setError(
        "Invalid email or password. Seed the DB if this is a fresh install.",
      );
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-lc-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--lc-halo)" }}
      />
      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
        <Link
          href="/"
          className="text-[17px] font-semibold tracking-tight text-lc-ink"
        >
          LabCrew
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-lc-muted">{subtitle}</p>

        <div className="mt-6 space-y-2">
          {DEMOS.map((demo) => (
            <button
              key={demo.email}
              type="button"
              onClick={() => {
                setEmail(demo.email);
                setPassword("labcrew");
              }}
              className="flex w-full cursor-pointer flex-col rounded-[12px] border border-[var(--lc-line)] bg-lc-surface px-4 py-3 text-left transition-colors hover:bg-[#fafafa]"
            >
              <span className="text-sm font-medium text-lc-ink">{demo.label}</span>
              <span className="mt-0.5 text-xs text-lc-muted">{demo.hint}</span>
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-lc-muted">Email</span>
            <input
              className="lc-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-lc-muted">Password</span>
            <input
              className="lc-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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
            {busy ? "Signing in…" : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginForm() {
  return (
    <AuthProvider>
      <LoginFormInner />
    </AuthProvider>
  );
}
