import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Product",
  description:
    "Mission Control, assignments, meetings, approvals, and the LabCrew agent loop.",
};

const sections = [
  {
    id: "mission-control",
    title: "Mission Control",
    body: "The weekly ops cockpit. Dispatch the crew, watch Pulse → Referee → Coach → Clerk, and land exceptions that need a human.",
    points: [
      "One-click weekly ops",
      "Live agent step progress",
      "Exception queue for silence & weak evidence",
    ],
  },
  {
    id: "assignments",
    title: "Assignments & review",
    body: "Research tasks with materials, rubrics, multi-file submissions, and ClickUp-style review statuses.",
    points: [
      "Student attachments & links",
      "Pending · Needs revision · Approved · Done",
      "Professor comments with notifications",
    ],
  },
  {
    id: "collaboration",
    title: "Meetings & messages",
    body: "Schedule lab meetings, invite the cohort, track RSVPs, and keep director–student messaging in-product.",
    points: ["Bulk or selective invites", "RSVP tracking", "Realtime-feeling message threads"],
  },
  {
    id: "approvals",
    title: "Approvals & nudges",
    body: "Every coach draft waits for you. Edit the copy, approve to send, or reject — students only hear what you ship.",
    points: ["Edit before send", "SMTP delivery status", "Audit-friendly history"],
  },
  {
    id: "brief",
    title: "Monday Brief & analytics",
    body: "Start the week with a compiled briefing and cohort health — export Markdown or print-ready HTML.",
    points: ["Director home briefing", "Cohort analytics", "MD / HTML export"],
  },
  {
    id: "agents",
    title: "Agent crew",
    body: "Specialized roles with deterministic orchestration. LLMs only where scoring and language matter.",
    points: ["Pulse signals", "Referee scoring", "Coach drafts · Clerk briefing"],
  },
];

export default function ProductPage() {
  return (
    <MarketingShell>
      <section className="mx-auto w-full max-w-6xl px-6 pb-10 pt-16 md:px-8 md:pt-20">
        <p className="lc-animate-in text-sm font-medium text-lc-accent">Product</p>
        <h1 className="lc-animate-in lc-delay-1 mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-lc-ink md:text-5xl">
          The operating system for research labs.
        </h1>
        <p className="lc-animate-in lc-delay-2 mt-5 max-w-2xl text-lg leading-relaxed text-lc-muted">
          LabCrew combines cohort operations, evidence review, and an AI crew
          that prepares the week — while directors keep the final say.
        </p>
        <div className="lc-animate-in lc-delay-3 mt-8 flex flex-wrap gap-3">
          <Link href="/signup">
            <Button variant="accent" size="lg">
              Create your lab
            </Button>
          </Link>
          <Link href="/how-it-works">
            <Button variant="secondary" size="lg">
              How it works
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-6 px-6 pb-24 md:px-8">
        {sections.map((s, i) => (
          <Reveal key={s.id} delay={(i % 3) * 40}>
            <article
              id={s.id}
              className="scroll-mt-24 grid gap-6 rounded-[18px] border border-[var(--lc-line)] bg-[var(--lc-surface)] p-7 md:grid-cols-[1fr_1fr] md:p-9"
            >
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-lc-ink">
                  {s.title}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-lc-muted">
                  {s.body}
                </p>
              </div>
              <ul className="space-y-3 self-center">
                {s.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 rounded-[12px] border border-[var(--lc-line)] bg-[var(--lc-elevated)] px-4 py-3 text-sm text-lc-ink"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lc-accent" />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </section>
    </MarketingShell>
  );
}
