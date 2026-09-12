"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/cn";

const links = [
  { href: "/product", label: "Product" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="lc-nav-blur sticky top-0 z-30 border-b border-[var(--lc-line)]">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-6 md:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-[17px] font-semibold tracking-tight text-lc-ink"
          >
            LabCrew
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-[8px] px-3 py-1.5 text-sm transition-colors duration-200",
                    active
                      ? "bg-[var(--lc-hover-strong)] font-medium text-lc-ink"
                      : "text-lc-muted hover:bg-[var(--lc-hover)] hover:text-lc-ink",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden text-sm text-lc-muted transition-colors hover:text-lc-ink sm:inline"
          >
            Sign in
          </Link>
          <Link href="/signup">
            <Button variant="accent" size="sm">
              Start free
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
