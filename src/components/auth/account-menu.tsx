"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession as useAuthSession } from "next-auth/react";
import { useSession } from "@/components/session/session-provider";
import { cn } from "@/lib/cn";

type LabRow = {
  memberId: string;
  role: "student" | "director";
  programName: string;
  organizationName: string;
  active: boolean;
};

export function AccountMenu() {
  const {
    userName,
    userEmail,
    role,
    programName,
    organizationName,
    switchAccount,
    signOutUser,
  } = useSession();
  const { update } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [labs, setLabs] = useState<LabRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [program, setProgram] = useState("Research Cohort");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const loadLabs = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/labs");
      const data = await res.json();
      if (data.ok) setLabs(data.labs);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (open) void loadLabs();
  }, [open, loadLabs]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setError(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function applyProfileAndReload(profile: {
    role?: string;
    memberId?: string;
    programName?: string;
    organizationName?: string;
    needsOnboarding?: boolean;
  }) {
    await update({
      role: profile.role,
      memberId: profile.memberId,
      programName: profile.programName,
      organizationName: profile.organizationName,
      needsOnboarding: Boolean(profile.needsOnboarding),
    });
    const dest =
      profile.role === "student" ? "/app/home" : "/app/assignments";
    window.location.assign(dest);
  }

  async function switchLab(memberId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", memberId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Switch failed");
      await applyProfileAndReload(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Switch failed");
      setBusy(false);
    }
  }

  async function createLab(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          orgName,
          programName: program,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Create failed");
      await applyProfileAndReload(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex max-w-[220px] cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
          open && "bg-black/[0.04] dark:bg-white/[0.06]",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-[11px] font-semibold text-lc-ink dark:bg-white/[0.08]">
          {(userName ?? userEmail ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-xs font-medium text-lc-ink">
            {userName ?? "Account"}
          </span>
          <span className="block truncate text-[11px] text-lc-muted">
            {role === "director" ? "Director" : "Student"}
            {organizationName || programName
              ? ` · ${organizationName ?? programName}`
              : ""}
          </span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-[12px] border border-[var(--lc-line)] bg-lc-surface py-1 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
        >
          <div className="border-b border-[var(--lc-line)] px-3 py-2.5">
            <p className="truncate text-sm font-medium text-lc-ink">
              {userName}
            </p>
            <p className="truncate text-xs text-lc-muted">{userEmail}</p>
          </div>

          <div className="border-b border-[var(--lc-line)] px-3 py-2">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-lc-muted">
              Your labs
            </p>
            {labs.length === 0 ? (
              <p className="text-xs text-lc-muted">No labs yet.</p>
            ) : (
              <ul className="max-h-48 space-y-0.5 overflow-y-auto">
                {labs.map((lab) => (
                  <li key={lab.memberId}>
                    <button
                      type="button"
                      disabled={busy || lab.active}
                      onClick={() => void switchLab(lab.memberId)}
                      className={cn(
                        "flex w-full cursor-pointer flex-col rounded-[8px] px-2 py-1.5 text-left transition-colors",
                        lab.active
                          ? "bg-[var(--lc-accent-soft)]"
                          : "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]",
                      )}
                    >
                      <span className="truncate text-sm font-medium text-lc-ink">
                        {lab.organizationName}
                      </span>
                      <span className="truncate text-[11px] text-lc-muted">
                        {lab.role === "director" ? "Director" : "Student"} ·{" "}
                        {lab.programName}
                        {lab.active ? " · current" : " · switch"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {creating ? (
              <form onSubmit={createLab} className="mt-2 space-y-2">
                <input
                  className="lc-input"
                  placeholder="New lab name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  disabled={busy}
                />
                <input
                  className="lc-input"
                  placeholder="Program name"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  required
                  disabled={busy}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="cursor-pointer rounded-[8px] bg-lc-accent px-2.5 py-1.5 text-xs font-medium text-white"
                  >
                    {busy ? "Creating…" : "Create"}
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer text-xs text-lc-muted"
                    onClick={() => setCreating(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="mt-2 cursor-pointer text-xs font-medium text-lc-accent hover:underline"
                onClick={() => setCreating(true)}
              >
                + Create another lab
              </button>
            )}
            {error ? (
              <p className="mt-2 text-xs text-lc-danger">{error}</p>
            ) : null}
          </div>

          <a
            href="/join"
            className="block px-3 py-2.5 text-sm text-lc-ink transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            onClick={() => setOpen(false)}
          >
            Join a lab with invite link
          </a>
          <button
            type="button"
            role="menuitem"
            className="block w-full cursor-pointer px-3 py-2.5 text-left text-sm text-lc-ink transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            onClick={() => {
              setOpen(false);
              void switchAccount();
            }}
          >
            Switch account
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full cursor-pointer px-3 py-2.5 text-left text-sm text-lc-ink transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            onClick={() => {
              setOpen(false);
              void signOutUser();
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
