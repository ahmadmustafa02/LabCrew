"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/ui/skeleton";

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

function roleLabel(role: string) {
  if (role === "STUDENT") return "Student";
  if (role === "MENTOR") return "Mentor";
  if (role === "ADMIN") return "Admin";
  return role;
}

export function TeamView() {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"STUDENT" | "MENTOR" | "ADMIN">(
    "STUDENT",
  );
  const [invites, setInvites] = useState<Invite[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [ready, setReady] = useState(false);
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
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Invite failed");
      setEmail("");
      setInviteRole("STUDENT");
      setToast(`Invite link ready for ${data.invite.email}`);
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

  async function revokeInvite(invite: Invite) {
    if (!window.confirm(`Revoke invite for ${invite.email}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${invite.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Revoke failed");
      setToast("Invite revoked");
      window.setTimeout(() => setToast(null), 2000);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setBusy(false);
    }
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
            Create an invite link, copy it, and send it to the student yourself.
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
          <span className="text-xs font-medium text-lc-muted">Email</span>
          <input
            className="lc-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@university.edu"
            required
          />
        </label>
        <label className="block space-y-1.5 sm:w-44">
          <span className="text-xs font-medium text-lc-muted">Role</span>
          <select
            className="lc-input"
            value={inviteRole}
            onChange={(e) =>
              setInviteRole(e.target.value as "STUDENT" | "MENTOR" | "ADMIN")
            }
          >
            <option value="STUDENT">Student</option>
            <option value="MENTOR">Mentor (staff)</option>
            <option value="ADMIN">Admin (co-director)</option>
          </select>
        </label>
        <Button type="submit" variant="accent" disabled={busy || !email.trim()}>
          {busy ? "Creating link…" : "Create invite link"}
        </Button>
      </form>

      <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
        <div className="border-b border-[var(--lc-line)] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-lc-ink">Pending invites</h2>
        </div>
        {!ready ? (
          <div className="space-y-2 p-5">
            <CardListSkeleton count={2} />
          </div>
        ) : invites.length === 0 ? (
          <p className="px-5 py-8 text-sm text-lc-muted">
            No open invites. Create a link above, then copy it to share.
          </p>
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
                    {roleLabel(invite.role)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void copyLink(invite)}
                  >
                    {copiedId === invite.id ? "Copied" : "Copy join link"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void revokeInvite(invite)}
                  >
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
        <div className="border-b border-[var(--lc-line)] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-lc-ink">Roster</h2>
        </div>
        {!ready ? (
          <div className="p-5">
            <CardListSkeleton count={2} />
          </div>
        ) : students.length === 0 ? (
          <p className="px-5 py-8 text-sm text-lc-muted">
            No students yet.{" "}
            <Link href="#top" className="text-lc-accent hover:underline">
              Create an invite
            </Link>{" "}
            to start the cohort.
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
