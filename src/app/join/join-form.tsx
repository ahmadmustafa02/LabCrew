"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthChrome } from "@/components/auth/auth-chrome";
import { AuthProvider } from "@/components/session/auth-provider";
import { Button } from "@/components/ui/button";

function JoinFormInner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const [inviteMeta, setInviteMeta] = useState<{
    email: string;
    programName: string;
    orgName: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setError("Missing invite token");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/invites/accept?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json();
        if (!cancelled) {
          if (!data.ok) setError(data.error ?? "Invalid invite");
          else setInviteMeta(data.invite);
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
        router.push("/login");
        return;
      }
      router.replace("/app/assignments");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthChrome backHref="/login" backLabel="Sign in">
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
        Join program
      </h1>
      {loading ? (
        <p className="mt-2 text-sm text-lc-muted">Loading invite…</p>
      ) : inviteMeta ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-lc-muted">
            You’re invited to{" "}
            <span className="text-lc-ink">{inviteMeta.programName}</span> at{" "}
            <span className="text-lc-ink">{inviteMeta.orgName}</span> as{" "}
            <span className="text-lc-ink">{inviteMeta.email}</span>.
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
                Choose a password (min 8)
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
            {error ? <p className="text-sm text-lc-danger">{error}</p> : null}
            <Button
              type="submit"
              variant="accent"
              size="lg"
              disabled={busy}
              className="w-full"
            >
              {busy ? "Joining…" : "Accept invite"}
            </Button>
          </form>
        </>
      ) : (
        <p className="mt-2 text-sm text-lc-danger">
          {error ?? "Invite unavailable"}{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      )}
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
