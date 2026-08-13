"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { DEMO_PROGRAM } from "@/lib/mock-data";

const NAV = [
  { href: "/app/mission-control", label: "Mission Control" },
  { href: "/app/approvals", label: "Approvals" },
  { href: "/app/analytics", label: "Analytics" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-full bg-lc-bg">
      <header className="sticky top-0 z-20 border-b border-[var(--lc-line)] bg-lc-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[15px] font-semibold tracking-tight">
              LabCrew
            </Link>
            <div className="hidden h-4 w-px bg-[var(--lc-line-strong)] sm:block" />
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-lc-ink">{DEMO_PROGRAM.name}</p>
              <p className="text-xs text-lc-muted">{DEMO_PROGRAM.org}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-lc-muted md:inline">
              Director mode · demo
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8e8ed] text-xs font-semibold text-lc-ink">
              DR
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-0 md:gap-8">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 border-r border-[var(--lc-line)] px-3 py-6 md:block">
          <nav className="space-y-1">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-[10px] px-3 py-2.5 text-sm transition-colors duration-200",
                    active
                      ? "bg-black/[0.05] font-medium text-lc-ink"
                      : "text-lc-muted hover:bg-black/[0.03] hover:text-lc-ink",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 rounded-[12px] border border-[var(--lc-line)] bg-lc-surface p-3">
            <p className="text-xs font-medium text-lc-ink">Phase 1</p>
            <p className="mt-1 text-xs leading-relaxed text-lc-muted">
              UI contract with mock runs. Real workers arrive in Phase 2.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-6 md:px-0 md:pr-6 md:py-8">
          <nav className="mb-5 flex gap-1 overflow-x-auto md:hidden">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-[10px] px-3 py-2 text-sm",
                    active
                      ? "bg-black/[0.05] font-medium text-lc-ink"
                      : "text-lc-muted",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {children}
        </div>
      </div>
    </div>
  );
}
