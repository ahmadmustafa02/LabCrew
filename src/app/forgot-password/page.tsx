"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AuthChrome } from "@/components/auth/auth-chrome";
import { AuthProvider } from "@/components/session/auth-provider";
import { Button } from "@/components/ui/button";

function ForgotInner() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    setResetUrl(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Request failed");
      setMessage(data.message);
      if (data.resetUrl) setResetUrl(data.resetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthChrome backHref="/login" backLabel="Sign in">
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
        Forgot password
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-lc-muted">
        We’ll email a reset link. If SMTP isn’t set up (free console mode), the
        link appears here and in the server logs.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Email</span>
          <input
            className="lc-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm text-lc-danger">{error}</p> : null}
        {message ? <p className="text-sm text-lc-success">{message}</p> : null}
        {resetUrl ? (
          <p className="break-all rounded-[12px] border border-[var(--lc-line)] bg-lc-bg px-3 py-3 text-sm text-lc-ink">
            <Link href={resetUrl} className="text-lc-accent hover:underline">
              {resetUrl}
            </Link>
          </p>
        ) : null}
        <Button
          type="submit"
          variant="accent"
          size="lg"
          disabled={busy}
          className="w-full"
        >
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthChrome>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthProvider>
      <ForgotInner />
    </AuthProvider>
  );
}
