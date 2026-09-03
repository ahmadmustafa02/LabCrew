"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountMenu } from "@/components/auth/account-menu";
import { PageTransition } from "@/components/app/page-transition";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useSession } from "@/components/session/session-provider";
import { cn } from "@/lib/cn";

type NavBadges = {
  meetings: number;
  announcements: number;
  approvals: number;
};

type BadgeKey = keyof NavBadges;

type NavItem = {
  href: string;
  label: string;
  badgeKey?: BadgeKey;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, programName, organizationName } = useSession();
  const [badges, setBadges] = useState<NavBadges>({
    meetings: 0,
    announcements: 0,
    approvals: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/nav/badges");
        const data = await res.json();
        if (!cancelled && data.ok && data.badges) {
          setBadges({
            meetings: data.badges.meetings ?? 0,
            announcements: data.badges.announcements ?? 0,
            approvals: data.badges.approvals ?? 0,
          });
        }
      } catch {
        /* keep zeros */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, role]);

  const nav: NavItem[] =
    role === "director"
      ? [
          { href: "/app/brief", label: "Monday Brief" },
          { href: "/app/mission-control", label: "Mission Control" },
          { href: "/app/assignments", label: "Assignments" },
          { href: "/app/meetings", label: "Meetings", badgeKey: "meetings" },
          {
            href: "/app/announcements",
            label: "Announcements",
            badgeKey: "announcements",
          },
          { href: "/app/messages", label: "Messages" },
          { href: "/app/approvals", label: "Approvals", badgeKey: "approvals" },
          { href: "/app/analytics", label: "Analytics" },
          { href: "/app/team", label: "Team" },
        ]
      : [
          { href: "/app/home", label: "Home" },
          { href: "/app/assignments", label: "Assignments" },
          { href: "/app/meetings", label: "Meetings", badgeKey: "meetings" },
          {
            href: "/app/announcements",
            label: "Announcements",
            badgeKey: "announcements",
          },
          { href: "/app/messages", label: "Messages" },
        ];

  function isActive(href: string) {
    if (href === "/app/assignments") return pathname.startsWith("/app/assignments");
    if (href === "/app/messages") return pathname.startsWith("/app/messages");
    if (href === "/app/meetings") return pathname.startsWith("/app/meetings");
    if (href === "/app/announcements")
      return pathname.startsWith("/app/announcements");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function NavLink({
    item,
    compact,
  }: {
    item: NavItem;
    compact?: boolean;
  }) {
    const active = isActive(item.href);
    const count = item.badgeKey ? badges[item.badgeKey] : 0;
    return (
      <Link
        href={item.href}
        className={cn(
          compact
            ? "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 py-2 text-sm transition-colors duration-200"
            : "flex items-center justify-between gap-2 rounded-[10px] px-3 py-2.5 text-sm transition-colors duration-200",
          active
            ? "bg-[var(--lc-hover-strong)] font-medium text-lc-ink"
            : compact
              ? "text-lc-muted"
              : "text-lc-muted hover:bg-[var(--lc-hover)] hover:text-lc-ink",
        )}
      >
        <span>{item.label}</span>
        {count > 0 ? (
          <span
            className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-[var(--lc-accent-soft)] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-lc-accent"
            aria-label={`${count} unread`}
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <div className="min-h-full bg-lc-bg">
      <header className="sticky top-0 z-20 border-b border-[var(--lc-line)] bg-[var(--lc-surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/app" className="text-[15px] font-semibold tracking-tight">
              LabCrew
            </Link>
            <div className="hidden h-4 w-px bg-[var(--lc-line-strong)] sm:block" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium text-lc-ink">
                {organizationName ?? programName ?? "Your lab"}
              </p>
              <p className="text-xs text-lc-muted">
                {role === "director" ? "Director" : "Student"}
                {programName ? ` · ${programName}` : ""}
                <span className="text-lc-muted"> · switch labs in account menu</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-0 md:gap-8">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 border-r border-[var(--lc-line)] px-3 py-6 md:block">
          <nav className="space-y-1">
            {nav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-6 md:px-0 md:pr-6 md:py-8">
          <nav className="mb-5 flex gap-1 overflow-x-auto md:hidden">
            {nav.map((item) => (
              <NavLink key={item.href} item={item} compact />
            ))}
          </nav>
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </div>
  );
}
