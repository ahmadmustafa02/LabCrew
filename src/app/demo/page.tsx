import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { DEMO_SEATS, demoLoginHref } from "@/lib/demo-seats";

export const metadata: Metadata = {
  title: "Demo stories",
  description: "One Northwater lab, one link per MITACS story.",
};

export default function DemoIndexPage() {
  return (
    <MarketingShell>
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-16 md:px-8 md:pt-20">
        <p className="text-sm font-medium text-lc-accent">Northwater demo</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-lc-ink md:text-5xl">
          One lab. A link per professor story.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-lc-muted">
          Same Northwater cohort. Pick the seat you are writing to. Sign in with
          a seeded account (password <span className="text-lc-ink">labcrew</span>
          ). These paths work on this host — localhost or whatever you deploy.
        </p>
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {DEMO_SEATS.map((seat) => (
            <li
              key={seat.slug}
              className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-lc-accent">
                {seat.seat}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-lc-ink">{seat.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-lc-muted">{seat.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/demo/${seat.slug}`}>
                  <Button size="sm" variant="secondary">
                    Story
                  </Button>
                </Link>
                <Link href={demoLoginHref(seat)}>
                  <Button size="sm" variant="accent">
                    Open in lab
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </MarketingShell>
  );
}
