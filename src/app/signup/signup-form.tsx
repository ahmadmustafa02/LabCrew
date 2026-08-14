"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthProvider } from "@/components/session/auth-provider";

function SignupFormInner() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [programName, setProgramName] = useState("Summer Research Cohort");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          orgName,
          programName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Signup failed");
      }

      const login = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (login?.error) {
        router.push("/login");
        return;
      }
      router.replace("/app/brief");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-lc-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--lc-halo)" }}
      />
      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-[17px] font-semibold tracking-tight text-lc-ink"
          >
            LabCrew
          </Link>
          <Link
            href="/"
            className="text-sm text-lc-muted transition-colors hover:text-lc-ink"
          >
            ← Back to home
          </Link>
        </div>

        <h1 className="mt-8 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
          Create your lab
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-lc-muted">
          Sign up as director. You get an organization, a program, and a real
          database workspace — not a shared demo.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-lc-muted">Your name</span>
            <input
              className="lc-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-lc-muted">Work email</span>
            <input
              className="lc-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-lc-muted">
              Password (min 8)
            </span>
            <input
              className="lc-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
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
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-lc-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-lc-ink hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupForm() {
  return (
    <AuthProvider>
      <SignupFormInner />
    </AuthProvider>
  );
}
