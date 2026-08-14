"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardListSkeleton, PageHeaderSkeleton, Skeleton } from "@/components/ui/skeleton";
import { SoftReveal } from "@/components/ui/soft-reveal";
import { cn } from "@/lib/cn";

type Brief = {
  programName: string;
  milestone: string | null;
  students: number;
  turnedIn: number;
  submissionRate: number;
  hasRun: boolean;
  runStatus: string | null;
  runId: string | null;
  runFinishedAt: string | null;
  briefing: string | null;
  agenda: string[];
  stats: {
    onTrack: number;
    students: number;
    exceptions: number;
    draftNudges: number;
  } | null;
  exceptions: Array<{ name: string; reason: string; severity: string }>;
  pendingApprovals: Array<{
    id: string;
    title: string;
    body: string;
    targetName: string | null;
  }>;
  emptyHint: string | null;
};

export function MondayBriefView() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/demo/brief");
        const data = await res.json();
        if (!cancelled) {
          if (data.ok) setBrief(data.brief);
          else setError(data.error ?? "Could not load brief");
        }
      } catch {
        if (!cancelled) setError("Brief unavailable — is Docker running?");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && !brief) {
    return <p className="text-sm text-lc-danger">{error ?? "Brief unavailable"}</p>;
  }

  const when = brief?.runFinishedAt
    ? new Date(brief.runFinishedAt).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <SoftReveal
      ready={!loading && Boolean(brief)}
      skeleton={
        <div className="space-y-6">
          <PageHeaderSkeleton titleWidth="w-64" />
          <Skeleton className="h-36 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface" />
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-40 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface" />
            <Skeleton className="h-40 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface" />
          </div>
        </div>
      }
    >
      {brief ? (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-lc-muted">Monday Brief</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
            What needs you
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
            {brief.programName}
            {brief.milestone ? ` · ${brief.milestone}` : ""}
            {when ? ` · Updated ${when}` : ""}
          </p>
          {error ? <p className="mt-2 text-sm text-lc-danger">{error}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/ops/brief/export?format=md">
            <Button variant="secondary" size="md" type="button">
              Export MD
            </Button>
          </a>
          <a href="/api/ops/brief/export?format=html" target="_blank" rel="noreferrer">
            <Button variant="secondary" size="md" type="button">
              Print / PDF
            </Button>
          </a>
          <Link href="/app/mission-control">
            <Button variant="secondary" size="md">
              Run weekly ops
            </Button>
          </Link>
          {brief.pendingApprovals.length > 0 ? (
            <Link href="/app/approvals">
              <Button variant="accent" size="md">
                Review drafts
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {brief.emptyHint ? (
        <div className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-8">
          <p className="text-[15px] leading-relaxed text-lc-muted">
            {brief.emptyHint}
          </p>
          <div className="mt-4">
            <Link href="/app/mission-control">
              <Button variant="accent" size="md">
                Open Mission Control
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-6">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-lc-muted">
              Clerk summary
            </p>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-lc-ink">
              {brief.briefing ??
                "Weekly ops finished. Open Approvals for anything that still needs a decision."}
            </p>
            {brief.stats ? (
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-lc-muted">
                <span>
                  <span className="font-medium text-lc-ink">
                    {brief.stats.onTrack}
                  </span>{" "}
                  on track
                </span>
                <span>
                  <span className="font-medium text-lc-ink">
                    {brief.stats.exceptions}
                  </span>{" "}
                  exceptions
                </span>
                <span>
                  <span className="font-medium text-lc-ink">
                    {brief.stats.draftNudges}
                  </span>{" "}
                  draft nudges
                </span>
                <span>
                  <span className="font-medium text-lc-ink">
                    {brief.submissionRate}%
                  </span>{" "}
                  submitted ({brief.turnedIn}/{brief.students})
                </span>
              </div>
            ) : null}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[15px] font-semibold text-lc-ink">
                  Who needs you
                </h2>
                <Link
                  href="/app/approvals"
                  className="text-xs font-medium text-lc-accent transition-colors hover:text-lc-ink"
                >
                  Approvals
                </Link>
              </div>
              {brief.exceptions.length === 0 ? (
                <p className="mt-4 text-sm text-lc-muted">
                  No exceptions this week. Cohort looks clear.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {brief.exceptions.map((item) => (
                    <li
                      key={`${item.name}-${item.reason}`}
                      className="rounded-[12px] border border-[var(--lc-line)] bg-lc-bg px-3.5 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-lc-ink">
                            {item.name}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-lc-muted">
                            {item.reason}
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
              )}
            </section>

            <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5">
              <h2 className="text-[15px] font-semibold text-lc-ink">
                Monday agenda
              </h2>
              {brief.agenda.length === 0 ? (
                <p className="mt-4 text-sm text-lc-muted">
                  Run weekly ops to generate a standup agenda.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {brief.agenda.map((item, i) => (
                    <li key={item} className="flex gap-3 text-sm text-lc-ink">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[11px] font-medium text-lc-muted">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ol>
              )}

              {brief.pendingApprovals.length > 0 ? (
                <div className="mt-6 border-t border-[var(--lc-line)] pt-5">
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-lc-muted">
                    Next approvals
                  </p>
                  <ul className="mt-3 space-y-2">
                    {brief.pendingApprovals.slice(0, 3).map((draft) => (
                      <li key={draft.id} className="text-sm text-lc-muted">
                        <span className="font-medium text-lc-ink">
                          {draft.targetName ?? draft.title}
                        </span>
                        <span className="mt-0.5 line-clamp-1 block">
                          {draft.body}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    <Link href="/app/approvals">
                      <Button variant="secondary" size="sm">
                        Open approval board
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </>
      )}
    </div>
      ) : null}
    </SoftReveal>
  );
}
