import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";

export function MissionControlPreview() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--lc-line-strong)] bg-[var(--lc-surface)] shadow-[var(--lc-shadow)]">
      <div className="flex items-center gap-2 border-b border-[var(--lc-line)] bg-[var(--lc-elevated)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-lc-muted">
          Mission Control · Weekly ops
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-[var(--lc-success-soft)] px-2 py-0.5 text-[11px] font-medium text-lc-success">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lc-success" />
          Live
        </span>
      </div>
      <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-2.5 p-5 md:p-6">
          {[
            ["Pulse", "Collected 12 student signals", "done"],
            ["Referee", "Scored evidence against rubric", "done"],
            ["Coach", "Drafted 3 personalized nudges", "done"],
            ["Clerk", "Compiled director briefing", "running"],
          ].map(([agent, title, state]) => (
            <div
              key={agent}
              className="flex items-center gap-3 rounded-[12px] border border-[var(--lc-line)] bg-[var(--lc-elevated)] px-3.5 py-3"
            >
              <span
                className={
                  state === "done"
                    ? "flex h-7 w-7 items-center justify-center rounded-full bg-[var(--lc-success-soft)] text-lc-success"
                    : "flex h-7 w-7 items-center justify-center rounded-full bg-[var(--lc-accent-soft)] text-lc-accent"
                }
              >
                {state === "done" ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path
                      d="M2.5 6.2L4.8 8.5L9.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-lc-ink">{title}</p>
                <p className="text-xs text-lc-muted">{agent}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--lc-line)] bg-[var(--lc-panel)] p-5 md:border-l md:border-t-0 md:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-lc-muted">
            Needs your approval
          </p>
          <ul className="mt-4 space-y-2.5">
            {[
              ["Ayesha · 6-day silence", "Nudge draft ready"],
              ["Daniel · weak writeup", "Request revision"],
              ["Mei · demo link down", "Check evidence"],
            ].map(([item, meta]) => (
              <li
                key={item}
                className="rounded-[12px] border border-[var(--lc-line)] bg-[var(--lc-elevated)] px-3.5 py-3"
              >
                <p className="text-sm text-lc-ink">{item}</p>
                <p className="mt-0.5 text-xs text-lc-muted">{meta}</p>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-lc-muted">
            Nothing reaches students until a human director approves.
          </p>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <>
      {/* Hero — one composition */}
      <section className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
        <div className="max-w-3xl">
          <p className="lc-animate-in text-[15px] font-semibold tracking-tight text-lc-ink">
            LabCrew
          </p>
          <h1 className="lc-animate-in lc-delay-1 mt-4 text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.04em] text-lc-ink sm:text-6xl md:text-[4.35rem]">
            Your lab’s AI
            <br />
            operations crew.
          </h1>
          <p className="lc-animate-in lc-delay-2 mt-6 max-w-xl text-lg leading-relaxed text-lc-muted sm:text-[1.25rem]">
            Agents collect signals, score evidence, draft nudges, and prepare
            your Monday briefing. You approve what matters.
          </p>
          <div className="lc-animate-in lc-delay-3 mt-10 flex flex-wrap items-center gap-3">
            <Link href="/signup">
              <Button variant="accent" size="lg">
                Create your lab
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button variant="secondary" size="lg">
                See how it works
              </Button>
            </Link>
          </div>
        </div>

        <div className="lc-animate-in lc-delay-4 lc-float mt-16 md:mt-20">
          <MissionControlPreview />
        </div>
      </section>

      {/* Proof strip */}
      <section className="border-y border-[var(--lc-line)] bg-[var(--lc-surface)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="max-w-sm text-sm leading-relaxed text-lc-muted">
            Built for research internships, faculty labs, and cohort programs —
            not generic project management.
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-lc-ink">
            <span>Weekly ops loop</span>
            <span>Human approvals</span>
            <span>Evidence scoring</span>
            <span>Student portal</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20 md:px-8 md:py-28">
        <Reveal>
          <p className="text-sm font-medium text-lc-accent">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-lc-ink md:text-4xl">
            Run the week in three moves.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Dispatch the crew",
              body: "One click starts Pulse, Referee, Coach, and Clerk. They pull meetings, submissions, and signals across the cohort.",
            },
            {
              step: "02",
              title: "Review what matters",
              body: "Exceptions land in Approvals — silence, weak evidence, broken demos. Edit drafts or reject them.",
            },
            {
              step: "03",
              title: "Ship the Monday Brief",
              body: "Get a director briefing with scored work, nudges ready to send, and a clear picture of the lab.",
            },
          ].map((item, i) => (
            <Reveal key={item.step} delay={i * 90}>
              <article className="h-full rounded-[16px] border border-[var(--lc-line)] bg-[var(--lc-surface)] p-6">
                <p className="font-mono text-xs text-lc-accent">{item.step}</p>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-lc-ink">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-lc-muted">
                  {item.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section className="bg-[var(--lc-surface)] py-20 md:py-28">
        <div className="mx-auto w-full max-w-6xl px-6 md:px-8">
          <Reveal>
            <p className="text-sm font-medium text-lc-accent">The crew</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-lc-ink md:text-4xl">
              Specialized agents. Deterministic orchestration.
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-lc-muted">
              LLMs only where scoring and copy need them. The weekly loop stays
              reliable, auditable, and under your control.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: "Pulse",
                role: "Signals",
                desc: "Attendance, silence, submission velocity, meeting RSVPs.",
              },
              {
                name: "Referee",
                role: "Evidence",
                desc: "Scores writeups, repos, and attachments against your rubric.",
              },
              {
                name: "Coach",
                role: "Nudges",
                desc: "Drafts personalized follow-ups — never auto-sends.",
              },
              {
                name: "Clerk",
                role: "Briefing",
                desc: "Compiles the Monday Brief directors actually read.",
              },
            ].map((a, i) => (
              <Reveal key={a.name} delay={i * 70}>
                <article className="h-full rounded-[16px] border border-[var(--lc-line)] bg-[var(--lc-elevated)] p-5 transition-[border-color,background-color] duration-200 hover:border-[var(--lc-line-strong)]">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-lc-muted">
                    {a.role}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-lc-ink">
                    {a.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-lc-muted">
                    {a.desc}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Product surfaces */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20 md:px-8 md:py-28">
        <Reveal>
          <p className="text-sm font-medium text-lc-accent">Platform</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-lc-ink md:text-4xl">
            Everything a research cohort needs — in one OS.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Assignments & review",
              body: "ClickUp-style statuses, file attachments, professor comments, and student resubmits.",
              href: "/product#assignments",
            },
            {
              title: "Meetings & messages",
              body: "Invite the cohort, track RSVPs, and keep a direct line between directors and students.",
              href: "/product#collaboration",
            },
            {
              title: "Approvals & nudges",
              body: "Edit, approve, or reject every draft. Email delivers when SMTP is configured.",
              href: "/product#approvals",
            },
            {
              title: "Analytics & brief",
              body: "See cohort health at a glance, then export the Monday Brief as Markdown or print HTML.",
              href: "/product#brief",
            },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <Link
                href={f.href}
                className="group block h-full rounded-[16px] border border-[var(--lc-line)] bg-[var(--lc-surface)] p-6 transition-[border-color,background-color] duration-200 hover:border-[var(--lc-line-strong)] hover:bg-[var(--lc-elevated)]"
              >
                <h3 className="text-lg font-semibold tracking-tight text-lc-ink">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-lc-muted">
                  {f.body}
                </p>
                <p className="mt-4 text-sm font-medium text-lc-accent transition-transform duration-200 group-hover:translate-x-0.5">
                  Explore →
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Two audiences */}
      <section className="border-y border-[var(--lc-line)] bg-[var(--lc-surface)] py-20 md:py-28">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 md:grid-cols-2 md:px-8">
          <Reveal>
            <article className="h-full rounded-[18px] border border-[var(--lc-line)] bg-[var(--lc-elevated)] p-7 md:p-8">
              <p className="text-sm font-medium text-lc-accent">Directors</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-lc-ink">
                Stay above the noise.
              </h3>
              <ul className="mt-6 space-y-3 text-sm leading-relaxed text-lc-muted">
                <li>Run weekly ops without chasing every student manually.</li>
                <li>Approve nudges before anything is sent.</li>
                <li>Review submissions with statuses that actually mean something.</li>
                <li>Open Monday with a briefing, not a blank calendar.</li>
              </ul>
            </article>
          </Reveal>
          <Reveal delay={100}>
            <article className="h-full rounded-[18px] border border-[var(--lc-line)] bg-[var(--lc-elevated)] p-7 md:p-8">
              <p className="text-sm font-medium text-lc-accent">Students</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-lc-ink">
                Know exactly what’s next.
              </h3>
              <ul className="mt-6 space-y-3 text-sm leading-relaxed text-lc-muted">
                <li>Home hub for meetings, tasks, and unseen updates.</li>
                <li>Submit work with attachments, links, and writeups.</li>
                <li>See review status — pending, needs revision, approved, done.</li>
                <li>Message your professor without losing the thread.</li>
              </ul>
            </article>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20 md:px-8 md:py-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-[22px] border border-[var(--lc-line-strong)] bg-[var(--lc-ink)] px-8 py-14 text-center md:px-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(80% 80% at 50% 0%, rgba(41,151,255,0.35), transparent 60%)",
              }}
            />
            <div className="relative">
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--lc-ink-inverse)] md:text-4xl">
                Stand up your lab in minutes.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[color-mix(in_srgb,var(--lc-ink-inverse)_72%,transparent)]">
                Create a program, invite students, run weekly ops. Dark mode
                included — for late-night briefing sessions.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link href="/signup">
                  <Button
                    variant="accent"
                    size="lg"
                    className="!bg-lc-accent"
                  >
                    Start free
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="!border-white/20 !bg-white/10 !text-white hover:!bg-white/15"
                  >
                    View pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
