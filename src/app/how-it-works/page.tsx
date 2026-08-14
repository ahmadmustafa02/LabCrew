import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "A weekly rhythm for research labs — signals, evidence, human approvals.",
};

const timeline = [
  {
    t: "Monday morning",
    title: "Open the Brief",
    body: "See cohort health, exceptions, and drafts waiting in Approvals — compiled overnight or on demand.",
  },
  {
    t: "During the week",
    title: "Students ship evidence",
    body: "Assignments collect writeups, repos, and attachments. Meetings and messages keep the lab in sync.",
  },
  {
    t: "Ops run",
    title: "Dispatch the crew",
    body: "Pulse gathers signals. Referee scores work. Coach drafts nudges. Clerk updates the briefing.",
  },
  {
    t: "You decide",
    title: "Approve what ships",
    body: "Edit or reject every nudge. Mark submissions pending, needs revision, approved, or done.",
  },
];

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-16 md:px-8 md:pt-20">
        <p className="lc-animate-in text-sm font-medium text-lc-accent">
          How it works
        </p>
        <h1 className="lc-animate-in lc-delay-1 mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-lc-ink md:text-5xl">
          A weekly rhythm directors can trust.
        </h1>
        <p className="lc-animate-in lc-delay-2 mt-5 max-w-2xl text-lg leading-relaxed text-lc-muted">
          LabCrew is not a chatbot bolted onto a task list. It’s a closed loop:
          signals in, evidence scored, humans approve, students get clarity.
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-10 md:px-8">
        <div className="relative space-y-4 before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-px before:bg-[var(--lc-line-strong)] md:before:left-[23px]">
          {timeline.map((item, i) => (
            <Reveal key={item.title} delay={i * 80}>
              <article className="relative grid gap-4 rounded-[16px] border border-[var(--lc-line)] bg-[var(--lc-surface)] p-5 pl-14 md:grid-cols-[180px_1fr] md:pl-16 md:p-7">
                <span className="absolute left-3 top-6 flex h-4 w-4 items-center justify-center rounded-full border-2 border-lc-accent bg-[var(--lc-bg)] md:left-4 md:top-8 md:h-5 md:w-5" />
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-lc-accent md:pt-1">
                  {item.t}
                </p>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-lc-ink">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-lc-muted">
                    {item.body}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-8 md:pb-28">
        <Reveal>
          <div className="rounded-[20px] border border-[var(--lc-line)] bg-[var(--lc-surface)] p-8 md:p-10">
            <h2 className="text-2xl font-semibold tracking-tight text-lc-ink">
              Why this feels different
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Human-in-the-loop",
                  body: "Agents prepare. Directors decide. Students never get surprise AI mail.",
                },
                {
                  title: "Evidence, not vibes",
                  body: "Rubrics, attachments, and review statuses keep research work measurable.",
                },
                {
                  title: "Built for labs",
                  body: "Meetings, announcements, messages, and ops — one cohort workspace.",
                },
              ].map((c) => (
                <div key={c.title}>
                  <h3 className="font-semibold text-lc-ink">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-lc-muted">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button variant="accent" size="lg">
                  Start free
                </Button>
              </Link>
              <Link href="/product">
                <Button variant="secondary" size="lg">
                  Explore product
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
