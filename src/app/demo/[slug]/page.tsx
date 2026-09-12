import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { DEMO_SEATS, demoLoginHref, demoSeat } from "@/lib/demo-seats";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DEMO_SEATS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const seat = demoSeat(slug);
  return { title: seat ? seat.title : "Demo" };
}

export default async function DemoSeatPage({ params }: Params) {
  const { slug } = await params;
  const seat = demoSeat(slug);
  if (!seat) notFound();

  return (
    <MarketingShell>
      <section className="mx-auto w-full max-w-3xl px-6 pb-16 pt-16 md:px-8 md:pt-20">
        <Link href="/demo" className="text-sm text-lc-muted hover:text-lc-ink">
          ← All demo stories
        </Link>
        <p className="mt-6 text-sm font-medium text-lc-accent">{seat.seat}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-lc-ink">
          {seat.title}
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-lc-muted">{seat.body}</p>
        <p className="mt-4 text-sm text-lc-muted">
          After sign-in you land on <code className="text-lc-ink">{seat.href}</code>.
          Director story: <code className="text-lc-ink">basit.raza@faculty.comsats.lab</code>.
          Student story: <code className="text-lc-ink">ahmad.mustafa@students.comsats.lab</code>.
          Password <code className="text-lc-ink">labcrew</code>.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href={demoLoginHref(seat)}>
            <Button variant="accent">Sign in and open this story</Button>
          </Link>
          <Link href="/demo">
            <Button variant="secondary">Other seats</Button>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
