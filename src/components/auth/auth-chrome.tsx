"use client";

import Link from "next/link";

export function AuthChrome({
  children,
  backHref = "/",
  backLabel = "Back",
}: {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="relative min-h-full overflow-hidden bg-lc-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--lc-halo)" }}
      />
      <header className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between px-6 pt-6">
        <Link
          href="/"
          className="text-[17px] font-semibold tracking-tight text-lc-ink"
        >
          LabCrew
        </Link>
        <Link
          href={backHref}
          className="text-sm text-lc-muted transition-colors hover:text-lc-ink"
        >
          ← {backLabel}
        </Link>
      </header>
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col px-6 pb-16 pt-10">
        {children}
      </div>
    </div>
  );
}
