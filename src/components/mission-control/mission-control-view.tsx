"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DEMO_PROGRAM,
  MOCK_EXCEPTIONS,
  MOCK_RUN,
  MOCK_STATS,
  type MockStep,
} from "@/lib/mock-data";
import { cn } from "@/lib/cn";

function statusStyles(status: MockStep["status"]) {
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

export function MissionControlView() {
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(0);

  const steps = useMemo(() => MOCK_RUN.steps, []);

  async function handleRun() {
    setBusy(true);
    setPulse((n) => n + 1);
    await new Promise((r) => setTimeout(r, 900));
    setBusy(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-lc-muted">Mission Control</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
            Weekly ops
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
            {DEMO_PROGRAM.activeMilestone}. Agents prepare the exception set;
            you decide what ships.
          </p>
        </div>
        <Button
          variant="accent"
          size="lg"
          onClick={handleRun}
          disabled={busy}
          className="shrink-0"
        >
          {busy ? "Starting run…" : "Run weekly ops"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {MOCK_STATS.map((stat) => (
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
                {MOCK_RUN.id} · {MOCK_RUN.startedAt} · {MOCK_RUN.duration}
              </p>
            </div>
            <span
              key={pulse}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lc-success-soft)] px-2.5 py-1 text-xs font-medium text-lc-success"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-lc-success" />
              Succeeded
            </span>
          </div>

          <ol className="divide-y divide-[var(--lc-line)]">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className={cn(
                  "flex gap-4 px-5 py-4 transition-colors",
                  busy && index === 0 && "bg-[var(--lc-accent-soft)]",
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
            <ul className="divide-y divide-[var(--lc-line)]">
              {MOCK_EXCEPTIONS.map((item) => (
                <li key={item.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-lc-ink">
                        {item.name}
                      </p>
                      <p className="mt-1 text-sm text-lc-muted">{item.reason}</p>
                      <p className="mt-1 text-xs text-lc-muted">
                        {item.milestone}
                      </p>
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
          </div>

          <div className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5">
            <h2 className="text-[15px] font-semibold text-lc-ink">
              Director briefing
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-lc-muted">
              Cohort is mostly healthy. Three students need attention before
              Wednesday standup. Three Coach drafts are waiting on Approvals.
            </p>
            <div className="mt-4">
              <Link href="/app/approvals">
                <Button variant="secondary" size="sm">
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
