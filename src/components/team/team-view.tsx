"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Invite = {
  id: string;
  email: string;
  role: string;
  joinPath: string;
  expiresAt: string;
};

type Student = {
  memberId: string;
  name: string;
  email: string;
};

export function TeamView() {
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    try {
      const [invRes, memRes] = await Promise.all([
        fetch("/api/invites"),
        fetch("/api/demo/members"),
      ]);
      const inv = await invRes.json();
      const mem = await memRes.json();
      if (inv.ok) setInvites(inv.invites);
      if (mem.ok) setStudents(mem.students);
      if (!inv.ok) setError(inv.error ?? "Failed to load invites");
    } catch {
      setError("Could not load team");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "STUDENT" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Invite failed");
      setEmail("");
      setToast(`Invite created for ${data.invite.email}`);
      window.setTimeout(() => setToast(null), 2500);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(invite: Invite) {
    const url = `${window.location.origin}${invite.joinPath}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-lc-muted">Team</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
            Students & invites
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
            Invite people by email. They set their own password and join your
            program — data stays in your org.
          </p>
          {error ? <p className="mt-2 text-sm text-lc-danger">{error}</p> : null}
        </div>
        {toast ? (
          <p className="rounded-[10px] bg-[var(--lc-success-soft)] px-3 py-2 text-sm text-lc-success">
            {toast}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={onInvite}
        className="flex flex-col gap-3 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5 sm:flex-row sm:items-end"
      >
        <label className="block min-w-0 flex-1 space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Student email</span>
          <input
            className="lc-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@university.edu"
            required
          />
        </label>
        <Button type="submit" variant="accent" disabled={busy || !email.trim()}>
          {busy ? "Sending…" : "Create invite"}
        </Button>
      </form>

      <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
        <div className="border-b border-[var(--lc-line)] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-lc-ink">Pending invites</h2>
        </div>
        {invites.length === 0 ? (
          <p className="px-5 py-8 text-sm text-lc-muted">No open invites.</p>
        ) : (
          <ul className="divide-y divide-[var(--lc-line)]">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div>
                  <p className="text-sm font-medium text-lc-ink">{invite.email}</p>
                  <p className="mt-0.5 text-xs text-lc-muted">
                    Expires {new Date(invite.expiresAt).toLocaleDateString()} ·{" "}
                    {invite.role}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void copyLink(invite)}
                >
                  {copiedId === invite.id ? "Copied" : "Copy join link"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
        <div className="border-b border-[var(--lc-line)] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-lc-ink">Roster</h2>
        </div>
        {students.length === 0 ? (
          <p className="px-5 py-8 text-sm text-lc-muted">
            No students yet. Send an invite to start the cohort.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--lc-line)]">
            {students.map((s) => (
              <li key={s.memberId} className="px-5 py-3.5">
                <p className="text-sm font-medium text-lc-ink">{s.name}</p>
                <p className="mt-0.5 text-xs text-lc-muted">{s.email}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
