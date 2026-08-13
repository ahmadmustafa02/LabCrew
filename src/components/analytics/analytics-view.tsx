"use client";

import { useEffect, useState } from "react";

type Analytics = {
  programName: string;
  milestone: string | null;
  submissionRate: number;
  turnedIn: number;
  students: number;
  atRisk: number;
  nudgesApproved: number;
  nudgesRejected: number;
  nudgesPending: number;
  recentRuns: Array<{
    id: string;
    status: string;
    createdAt: string;
    durationSec: number | null;
  }>;
};

export function AnalyticsView() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/demo/analytics");
        const json = await res.json();
        if (!cancelled) {
          if (json.ok) setData(json.analytics);
          else setError(json.error ?? "Unavailable");
        }
      } catch {
        if (!cancelled) setError("Analytics unavailable - is Docker running?");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = data
    ? [
        {
          label: "Submission rate",
          value: `${data.submissionRate}%`,
          note: `${data.turnedIn} of ${data.students} on active milestone`,
        },
        {
          label: "At-risk students",
          value: String(data.atRisk),
          note: "Missing, weak writeup, or no demo link",
        },
        {
          label: "Nudges approved",
          value: String(data.nudgesApproved),
          note: "Director-approved sends (simulated)",
        },
        {
          label: "Nudges pending",
          value: String(data.nudgesPending),
          note: `${data.nudgesRejected} rejected all-time`,
        },
      ]
    : [
        { label: "Submission rate", value: "—", note: "Loading…" },
        { label: "At-risk students", value: "—", note: "Loading…" },
        { label: "Nudges approved", value: "—", note: "Loading…" },
        { label: "Nudges pending", value: "—", note: "Loading…" },
      ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-lc-muted">Analytics</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
          Cohort health
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
          Collect signals, visualize exceptions, measure whether director
          interventions moved.
          {data?.milestone ? ` Active: ${data.milestone}.` : ""}
        </p>
        {error ? (
          <p className="mt-2 text-sm text-lc-danger">{error}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((row) => (
          <div
            key={row.label}
            className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5"
          >
            <p className="text-xs text-lc-muted">{row.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-lc-ink">
              {row.value}
            </p>
            <p className="mt-2 text-sm text-lc-muted">{row.note}</p>
          </div>
        ))}
      </div>

      <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
        <div className="border-b border-[var(--lc-line)] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-lc-ink">Recent ops runs</h2>
          <p className="mt-0.5 text-xs text-lc-muted">
            From Postgres agent_run history
          </p>
        </div>
        {!data?.recentRuns?.length ? (
          <p className="px-5 py-8 text-sm text-lc-muted">
            No runs yet. Trigger weekly ops from Mission Control.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--lc-line)]">
            {data.recentRuns.map((run) => (
              <li
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5"
              >
                <div>
                  <p className="font-mono text-xs text-lc-muted">{run.id}</p>
                  <p className="mt-1 text-sm text-lc-ink">
                    {new Date(run.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-lc-ink">{run.status}</p>
                  <p className="mt-1 text-xs text-lc-muted">
                    {run.durationSec != null ? `${run.durationSec}s` : "—"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
