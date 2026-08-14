"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/session/session-provider";
import { cn } from "@/lib/cn";

export function AccountMenu() {
  const { userName, userEmail, role, switchAccount, signOutUser } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex max-w-[200px] cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left transition-colors hover:bg-black/[0.04]",
          open && "bg-black/[0.04]",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-[11px] font-semibold text-lc-ink">
          {(userName ?? userEmail ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-xs font-medium text-lc-ink">
            {userName ?? "Account"}
          </span>
          <span className="block truncate text-[11px] text-lc-muted">
            {role === "director" ? "Director" : "Student"}
          </span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-[12px] border border-[var(--lc-line)] bg-lc-surface py-1 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
        >
          <div className="border-b border-[var(--lc-line)] px-3 py-2.5">
            <p className="truncate text-sm font-medium text-lc-ink">
              {userName}
            </p>
            <p className="truncate text-xs text-lc-muted">{userEmail}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            className="block w-full cursor-pointer px-3 py-2.5 text-left text-sm text-lc-ink transition-colors hover:bg-black/[0.03]"
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
            className="block w-full cursor-pointer px-3 py-2.5 text-left text-sm text-lc-ink transition-colors hover:bg-black/[0.03]"
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
