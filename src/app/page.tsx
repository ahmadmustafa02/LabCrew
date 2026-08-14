import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="relative min-h-full overflow-hidden bg-lc-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--lc-halo)" }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-8">
        <Link href="/" className="text-[17px] font-semibold tracking-tight text-lc-ink">
          LabCrew
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden text-sm text-lc-muted transition-colors hover:text-lc-ink sm:inline"
          >
            Product
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Sign in
            </Button>
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-5.5rem)] w-full max-w-6xl flex-col justify-center px-6 pb-24 pt-10 md:px-8 md:pt-6">
        <div className="max-w-3xl">
          <p className="lc-animate-in text-sm font-medium tracking-wide text-lc-accent">
            LabCrew
          </p>
          <h1 className="lc-animate-in lc-delay-1 mt-4 text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.035em] text-lc-ink sm:text-6xl md:text-[4.25rem]">
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
              <Button variant="primary" size="lg">
                Create your lab
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign in
              </Button>
            </Link>
          </div>
        </div>

        <div className="lc-animate-in lc-delay-3 mt-20 max-w-4xl rounded-[18px] border border-[var(--lc-line)] bg-lc-surface/80 p-2 backdrop-blur-sm">
          <div className="overflow-hidden rounded-[14px] border border-[var(--lc-line)] bg-[#f5f5f7]">
            <div className="flex items-center gap-2 border-b border-[var(--lc-line)] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-xs text-lc-muted">
                Mission Control · Weekly ops
              </span>
            </div>
            <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-3 p-5 md:p-6">
                {[
                  ["Pulse", "Collected 12 student signals"],
                  ["Referee", "Scored evidence against rubric"],
                  ["Coach", "Drafted 3 personalized nudges"],
                  ["Clerk", "Compiled director briefing"],
                ].map(([agent, title], i) => (
                  <div
                    key={agent}
                    className="flex items-center gap-3 rounded-[12px] bg-white px-3.5 py-3"
                    style={{ opacity: 1 - i * 0.04 }}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--lc-success-soft)] text-lc-success">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path
                          d="M2.5 6.2L4.8 8.5L9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-medium text-lc-ink">{title}</p>
                      <p className="text-xs text-lc-muted">{agent}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[var(--lc-line)] p-5 md:border-l md:border-t-0 md:p-6">
                <p className="text-xs font-medium uppercase tracking-[0.06em] text-lc-muted">
                  Exceptions
                </p>
                <ul className="mt-4 space-y-3">
                  {[
                    "Ayesha · 6-day silence",
                    "Daniel · weak writeup",
                    "Mei · demo link down",
                  ].map((item) => (
                    <li
                      key={item}
                      className="rounded-[12px] border border-[var(--lc-line)] bg-white px-3.5 py-3 text-sm text-lc-ink"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs leading-relaxed text-lc-muted">
                  Humans stay in control. Nothing is sent until you approve.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
