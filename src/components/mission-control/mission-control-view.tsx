"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLiveOpsRun } from "@/hooks/use-live-ops-run";
import { DEMO_PROGRAM, type StepStatus } from "@/lib/mock-data";
import { cn } from "@/lib/cn";

function statusStyles(status: StepStatus) {
  if (status === "succeeded") {
    return "bg-[var(--lc-success-soft)] text-lc-success";
  }
  if (status === "running") {
    return "bg-[var(--lc-accent-soft)] text-lc-accent";
  }
  if (status === "failed") {
    return "bg-[var(--lc-danger-soft)] text-lc-danger";
  }
  return "bg-black/[0.04] text-lc-muted";
}

function badgeCopy(badge: "idle" | "running" | "succeeded") {
  if (badge === "running") return "Running";
  if (badge === "succeeded") return "Succeeded";
  return "Idle";
}

export function MissionControlView() {
  const {
    mode,
    programLabel,
    steps,
    badge,
    busy,
    runId,
    showExceptions,
    exceptions,
    briefing,
    error,
    statCards,
    start,
  } = useLiveOpsRun();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-lc-muted">Mission Control</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
            Weekly ops
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
            {DEMO_PROGRAM.activeMilestone}.{" "}
            {mode === "live"
              ? `${programLabel} is connected — runs hit BullMQ + Postgres.`
              : "Demo replay mode (start Docker + seed for live crew)."}
          </p>
          {error ? (
            <p className="mt-2 text-sm text-lc-danger">{error}</p>
          ) : null}
        </div>
        <Button
          variant="accent"
          size="lg"
          onClick={start}
          disabled={busy}
          className="shrink-0"
        >
          {busy ? "Crew running…" : "Run weekly ops"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[14px] border border-[var(--lc-line)] bg-lc-surface px-4 py-4"
          >
            <p className="text-xs text-lc-muted">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-lc-ink">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-lc-muted">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
          <div className="flex items-center justify-between border-b border-[var(--lc-line)] px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-lc-ink">
                Agent timeline
              </h2>
              <p className="mt-0.5 font-mono text-xs text-lc-muted">
                {runId}
                {mode === "live" ? " · live" : " · demo"}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                badge === "running" &&
                  "bg-[var(--lc-accent-soft)] text-lc-accent",
                badge === "succeeded" &&
                  "bg-[var(--lc-success-soft)] text-lc-success",
                badge === "idle" && "bg-black/[0.04] text-lc-muted",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  badge === "running" && "bg-lc-accent animate-pulse",
                  badge === "succeeded" && "bg-lc-success",
                  badge === "idle" && "bg-lc-muted",
                )}
              />
              {badgeCopy(badge)}
            </span>
          </div>

          <ol className="divide-y divide-[var(--lc-line)]">
            {steps.map((step) => (
              <li
                key={step.id}
                className={cn(
                  "flex gap-4 px-5 py-4 transition-colors duration-200",
                  step.status === "running" && "bg-[var(--lc-accent-soft)]",
                  step.status === "pending" && "opacity-45",
                )}
              >
                <div className="w-14 shrink-0 pt-0.5 font-mono text-xs text-lc-muted">
                  {step.at.slice(3)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-medium",
                        statusStyles(step.status),
                      )}
                    >
                      {step.agent}
                    </span>
                    <p className="text-sm font-medium text-lc-ink">{step.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-lc-muted">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-6">
          <div className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
            <div className="border-b border-[var(--lc-line)] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-lc-ink">
                Exceptions
              </h2>
              <p className="mt-0.5 text-xs text-lc-muted">
                Only people who need a decision
              </p>
            </div>
            {showExceptions ? (
              <ul className="divide-y divide-[var(--lc-line)]">
                {exceptions.map((item) => (
                  <li
                    key={`${item.name}-${item.reason}`}
                    className="px-5 py-4 lc-animate-in"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-lc-ink">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm text-lc-muted">{item.reason}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium",
                          item.severity === "high"
                            ? "bg-[var(--lc-danger-soft)] text-lc-danger"
                            : "bg-[var(--lc-warn-soft)] text-lc-warn",
                        )}
                      >
                        {item.severity}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-10 text-sm text-lc-muted">
                Waiting for Referee to finish scoring…
              </div>
            )}
          </div>

          <div className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5">
            <h2 className="text-[15px] font-semibold text-lc-ink">
              Director briefing
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-lc-muted">
              {showExceptions
                ? briefing ??
                  "Cohort is mostly healthy. Three students need attention. Coach drafts are waiting on Approvals."
                : "Clerk will assemble the Monday packet when the crew finishes."}
            </p>
            <div className="mt-4">
              <Link href="/app/approvals">
                <Button variant="secondary" size="sm" disabled={!showExceptions}>
                  Review drafts
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
