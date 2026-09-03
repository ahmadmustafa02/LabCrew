"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthChrome } from "@/components/auth/auth-chrome";
import { AuthProvider } from "@/components/session/auth-provider";
import { Button } from "@/components/ui/button";

function extractToken(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    if (trimmed.includes("token=")) {
      const url = new URL(trimmed, "http://localhost");
      return url.searchParams.get("token")?.trim() ?? "";
    }
  } catch {
    /* plain token */
  }
  return trimmed;
}

function JoinFormInner() {
  const router = useRouter();
  const search = useSearchParams();
  const queryToken = search.get("token") ?? "";
  const [tokenInput, setTokenInput] = useState(queryToken);
  const [token, setToken] = useState(queryToken);
  const [inviteMeta, setInviteMeta] = useState<{
    email: string;
    programName: string;
    orgName: string;
    role?: string;
    existingAccount?: boolean;
    hasPassword?: boolean;
  } | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(queryToken));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setLoading(false);
        setInviteMeta(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/invites/accept?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json();
        if (!cancelled) {
          if (!data.ok) {
            setError(data.error ?? "Invalid invite");
            setInviteMeta(null);
          } else {
            setInviteMeta(data.invite);
          }
        }
      } catch {
        if (!cancelled) setError("Could not load invite");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Join failed");

      const login = await signIn("credentials", {
        email: data.email,
        password,
        redirect: false,
      });
      if (login?.error) {
        window.location.assign("/login");
        return;
      }
      window.location.assign(
        data.role === "STUDENT" ? "/app/home" : "/app/assignments",
      );
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed");
      setBusy(false);
    }
  }

  return (
    <AuthChrome backHref="/login" backLabel="Sign in">
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
        Join a lab
      </h1>

      {!token ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-lc-muted">
            Paste the invite link your director sent you.
          </p>
          <form
            className="mt-8 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const next = extractToken(tokenInput);
              if (!next) {
                setError("Paste a full invite link or token");
                return;
              }
              setError(null);
              setToken(next);
              router.replace(`/join?token=${encodeURIComponent(next)}`);
            }}
          >
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-lc-muted">
                Invite link or token
              </span>
              <input
                className="lc-input"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="https://…/join?token=…"
                required
              />
            </label>
            {error ? <p className="text-sm text-lc-danger">{error}</p> : null}
            <Button type="submit" variant="accent" size="lg" className="w-full">
              Continue
            </Button>
          </form>
        </>
      ) : loading ? (
        <p className="mt-2 text-sm text-lc-muted">Loading invite…</p>
      ) : inviteMeta ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-lc-muted">
            You’re invited to{" "}
            <span className="text-lc-ink">{inviteMeta.programName}</span> at{" "}
            <span className="text-lc-ink">{inviteMeta.orgName}</span> as{" "}
            <span className="text-lc-ink">{inviteMeta.email}</span>
            {inviteMeta.role === "STUDENT"
              ? " (student)"
              : inviteMeta.role === "MENTOR"
                ? " (mentor)"
                : inviteMeta.role === "ADMIN"
                  ? " (admin)"
                  : ""}
            .
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
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
              <span className="text-xs font-medium text-lc-muted">
                {inviteMeta.existingAccount && inviteMeta.hasPassword
                  ? "Your existing password"
                  : "Choose a password (min 8)"}
              </span>
              <input
                className="lc-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              {inviteMeta.existingAccount && inviteMeta.hasPassword ? (
                <span className="block text-xs text-lc-muted">
                  This email already has an account — enter that password. We
                  won&apos;t change it.
                </span>
              ) : null}
            </label>
            {error ? <p className="text-sm text-lc-danger">{error}</p> : null}
            <Button
              type="submit"
              variant="accent"
              size="lg"
              disabled={busy}
              className="w-full"
            >
              {busy ? "Joining…" : "Join lab"}
            </Button>
          </form>
        </>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-lc-danger">
            {error ?? "Invite is invalid or expired"}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setToken("");
              setTokenInput("");
              setError(null);
              router.replace("/join");
            }}
          >
            Try another link
          </Button>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-lc-muted">
        Creating a lab as director?{" "}
        <Link href="/signup" className="font-medium text-lc-ink hover:underline">
          Start free
        </Link>
      </p>
    </AuthChrome>
  );
}

export default function JoinForm() {
  return (
    <AuthProvider>
      <JoinFormInner />
    </AuthProvider>
  );
}
