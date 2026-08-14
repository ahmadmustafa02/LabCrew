import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free with LabCrew. Scale when your research program grows.",
};

const plans = [
  {
    name: "Lab",
    price: "Free",
    blurb: "For a single research cohort getting started.",
    cta: "Create your lab",
    href: "/signup",
    featured: false,
    features: [
      "1 program workspace",
      "Assignments + review workflow",
      "Meetings, messages, announcements",
      "Weekly ops crew (LLM optional)",
      "Monday Brief export",
      "Dark mode",
    ],
  },
  {
    name: "Research",
    price: "Soon",
    blurb: "For faculty running multiple cohorts and mentors.",
    cta: "Join waitlist",
    href: "/signup",
    featured: true,
    features: [
      "Everything in Lab",
      "Multi-program & mentors",
      "CSV roster import",
      "Deeper PDF / repo evidence AI",
      "Priority email delivery",
      "Audit log",
    ],
  },
];

const faqs = [
  {
    q: "Is LabCrew a project manager?",
    a: "No. It’s an AI operations crew for research labs — weekly signals, evidence scoring, and human approvals.",
  },
  {
    q: "Do agents email students automatically?",
    a: "Never. Coach drafts nudges; directors approve or reject before anything is sent.",
  },
  {
    q: "Do I need an LLM API key?",
    a: "Optional. Without a key, scoring falls back to heuristics. With Groq/OpenAI-compatible keys, Referee and Coach use real models.",
  },
  {
    q: "Can students submit files?",
    a: "Yes — attachments, links, repos, and writeups, with professor review statuses.",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-16 text-center md:px-8 md:pt-20">
        <p className="lc-animate-in text-sm font-medium text-lc-accent">Pricing</p>
        <h1 className="lc-animate-in lc-delay-1 mt-3 text-4xl font-semibold tracking-[-0.035em] text-lc-ink md:text-5xl">
          Start free. Scale when the lab grows.
        </h1>
        <p className="lc-animate-in lc-delay-2 mx-auto mt-5 max-w-xl text-lg leading-relaxed text-lc-muted">
          Self-host friendly. No credit card. Ship a real cohort workspace
          today.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 pb-20 md:grid-cols-2 md:px-8">
        {plans.map((plan, i) => (
          <Reveal key={plan.name} delay={i * 90}>
            <article
              className={
                plan.featured
                  ? "relative h-full rounded-[20px] border border-lc-accent bg-[var(--lc-surface)] p-8 shadow-[var(--lc-shadow)]"
                  : "h-full rounded-[20px] border border-[var(--lc-line)] bg-[var(--lc-surface)] p-8"
              }
            >
              {plan.featured ? (
                <span className="absolute right-6 top-6 rounded-md bg-[var(--lc-accent-soft)] px-2 py-0.5 text-[11px] font-medium text-lc-accent">
                  Coming next
                </span>
              ) : null}
              <p className="text-sm font-medium text-lc-muted">{plan.name}</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight text-lc-ink">
                {plan.price}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-lc-muted">
                {plan.blurb}
              </p>
              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm text-lc-ink">
                    <svg
                      className="mt-0.5 shrink-0 text-lc-accent"
                      width="14"
                      height="14"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M2.5 6.2L4.8 8.5L9.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href={plan.href}>
                  <Button
                    variant={plan.featured ? "secondary" : "accent"}
                    size="lg"
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </article>
          </Reveal>
        ))}
      </section>

      <section id="faq" className="mx-auto w-full max-w-3xl px-6 pb-28 md:px-8">
        <Reveal>
          <h2 className="text-center text-2xl font-semibold tracking-tight text-lc-ink">
            FAQ
          </h2>
        </Reveal>
        <div className="mt-10 space-y-4">
          {faqs.map((item, i) => (
            <Reveal key={item.q} delay={i * 50}>
              <div className="rounded-[14px] border border-[var(--lc-line)] bg-[var(--lc-surface)] px-5 py-4">
                <h3 className="font-medium text-lc-ink">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-lc-muted">
                  {item.a}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
