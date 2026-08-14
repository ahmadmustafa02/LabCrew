"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthChrome } from "@/components/auth/auth-chrome";
import { GoogleSignInButton } from "@/components/auth/google-button";
import { AuthProvider } from "@/components/session/auth-provider";
import { Button } from "@/components/ui/button";

function SignupFormInner() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [programName, setProgramName] = useState("Research Cohort");
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
    <AuthChrome backHref="/" backLabel="Home">
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
        Create your lab
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-lc-muted">
        Start as director. You’ll get your own organization and program in the
        database.
      </p>

      <div className="mt-8 space-y-3">
        <GoogleSignInButton
          label="Continue with Google"
          callbackUrl="/onboarding"
        />
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-[var(--lc-line)]" />
          <span className="text-xs text-lc-muted">or email</span>
          <div className="h-px flex-1 bg-[var(--lc-line)]" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-2 space-y-3">
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
        <Link href="/login" className="font-medium text-lc-ink hover:underline">
          Sign in
        </Link>
      </p>
    </AuthChrome>
  );
}

export default function SignupForm() {
  return (
    <AuthProvider>
      <SignupFormInner />
    </AuthProvider>
  );
}
