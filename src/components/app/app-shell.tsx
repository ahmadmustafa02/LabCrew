"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageTransition } from "@/components/app/page-transition";
import { useSession } from "@/components/session/session-provider";
import { cn } from "@/lib/cn";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    role,
    programName,
    studentName,
    userName,
    signOutUser,
  } = useSession();

  const nav =
    role === "director"
      ? [
          { href: "/app/brief", label: "Monday Brief" },
          { href: "/app/mission-control", label: "Mission Control" },
          { href: "/app/assignments", label: "Assignments" },
          { href: "/app/approvals", label: "Approvals" },
          { href: "/app/analytics", label: "Analytics" },
        ]
      : [{ href: "/app/assignments", label: "My tasks" }];

  return (
    <div className="min-h-full bg-lc-bg">
      <header className="sticky top-0 z-20 border-b border-[var(--lc-line)] bg-lc-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/app" className="text-[15px] font-semibold tracking-tight">
              LabCrew
            </Link>
            <div className="hidden h-4 w-px bg-[var(--lc-line-strong)] sm:block" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium text-lc-ink">
                {programName ?? "Northwater Lab"}
              </p>
              <p className="text-xs text-lc-muted">
                {role === "director"
                  ? `Director · ${userName ?? "…"}`
                  : `Student · ${studentName ?? userName ?? "…"}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="cursor-pointer rounded-[10px] px-3 py-1.5 text-xs font-medium text-lc-muted transition-colors hover:bg-black/[0.04] hover:text-lc-ink"
            >
              Switch account
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-0 md:gap-8">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 border-r border-[var(--lc-line)] px-3 py-6 md:block">
          <nav className="space-y-1">
            {nav.map((item) => {
              const active =
                item.href === "/app/assignments"
                  ? pathname.startsWith("/app/assignments")
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
        </aside>

        <div className="min-w-0 flex-1 px-4 py-6 md:px-0 md:pr-6 md:py-8">
          <nav className="mb-5 flex gap-1 overflow-x-auto md:hidden">
            {nav.map((item) => {
              const active =
                item.href === "/app/assignments"
                  ? pathname.startsWith("/app/assignments")
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-[10px] px-3 py-2 text-sm transition-colors duration-200",
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
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </div>
  );
}
