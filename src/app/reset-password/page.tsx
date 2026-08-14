"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthChrome } from "@/components/auth/auth-chrome";
import { AuthProvider } from "@/components/session/auth-provider";
import { Button } from "@/components/ui/button";

function ResetInner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Reset failed");
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthChrome backHref="/login" backLabel="Sign in">
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
        Choose a new password
      </h1>
      {!token ? (
        <p className="mt-4 text-sm text-lc-danger">
          Missing reset token.{" "}
          <Link href="/forgot-password" className="underline">
            Request a new link
          </Link>
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-lc-muted">
              New password (min 8)
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
              Confirm password
            </span>
            <input
              className="lc-input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
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
            {busy ? "Saving…" : "Update password"}
          </Button>
        </form>
      )}
    </AuthChrome>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthProvider>
      <Suspense
        fallback={
          <div className="flex min-h-full items-center justify-center text-sm text-lc-muted">
            Loading…
          </div>
        }
      >
        <ResetInner />
      </Suspense>
    </AuthProvider>
  );
}
