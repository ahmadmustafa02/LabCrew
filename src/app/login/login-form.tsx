"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthChrome } from "@/components/auth/auth-chrome";
import { GoogleSignInButton } from "@/components/auth/google-button";
import { AuthProvider } from "@/components/session/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const DEMOS = [
  {
    label: "Director Reed",
    email: "director@northwater.lab",
    hint: "Seeded demo lab",
  },
  {
    label: "Ayesha (student)",
    email: "ayesha.rahman@students.northwater.lab",
    hint: "Seeded demo student",
  },
];

function LoginFormInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/app";
  const switched = search.get("switch") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtitle = useMemo(() => {
    if (switched) return "Choose another account to continue.";
    return "Sign in to your lab workspace.";
  }, [switched]);

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
      setError("Invalid email or password.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <AuthChrome backHref="/" backLabel="Home">
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
        {switched ? "Switch account" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-lc-muted">{subtitle}</p>

      <div className="mt-8 space-y-3">
        <GoogleSignInButton callbackUrl="/app" />
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-[var(--lc-line)]" />
          <span className="text-xs text-lc-muted">or email</span>
          <div className="h-px flex-1 bg-[var(--lc-line)]" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-2 space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Email</span>
          <input
            className="lc-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
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
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-lc-muted">
        New lab?{" "}
        <Link href="/signup" className="font-medium text-lc-ink hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-8 border-t border-[var(--lc-line)] pt-6">
        <button
          type="button"
          className="cursor-pointer text-xs font-medium text-lc-muted transition-colors hover:text-lc-ink"
          onClick={() => setShowDemo((v) => !v)}
        >
          {showDemo ? "Hide demo accounts" : "Use seeded demo accounts"}
        </button>
        {showDemo ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-lc-muted">Password for demos: labcrew</p>
            {DEMOS.map((demo) => {
              const selected = email === demo.email;
              return (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => {
                    setEmail(demo.email);
                    setPassword("labcrew");
                    setError(null);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer flex-col rounded-[12px] border px-4 py-3 text-left transition-colors",
                    selected
                      ? "border-lc-accent bg-[var(--lc-accent-soft)]"
                      : "border-[var(--lc-line)] bg-lc-surface hover:bg-[#fafafa]",
                  )}
                >
                  <span className="text-sm font-medium text-lc-ink">
                    {demo.label}
                  </span>
                  <span className="mt-0.5 text-xs text-lc-muted">{demo.hint}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </AuthChrome>
  );
}

export default function LoginForm() {
  return (
    <AuthProvider>
      <LoginFormInner />
    </AuthProvider>
  );
}
