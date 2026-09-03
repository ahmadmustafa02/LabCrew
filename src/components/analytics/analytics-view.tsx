"use client";

import { useEffect, useState } from "react";
import { SoftReveal } from "@/components/ui/soft-reveal";
import { StatRowSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

type EngagementRow = {
  id: string;
  memberId: string;
  name: string;
  email: string;
  score: number;
  components: {
    timeliness?: { detail?: string };
    overdue?: { detail?: string };
    revision?: { detail?: string; cycles?: number };
    meeting?: { detail?: string };
    messaging?: { detail?: string };
  };
  computedAt: string;
};

export function AnalyticsView() {
  const [data, setData] = useState<Analytics | null>(null);
  const [engagement, setEngagement] = useState<{
    weekStart: string;
    scores: EngagementRow[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadEngagement() {
    const res = await fetch("/api/engagement");
    const json = await res.json();
    if (json.ok) {
      setEngagement({ weekStart: json.weekStart, scores: json.scores });
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const analyticsRes = await fetch("/api/demo/analytics");
        await loadEngagement().catch(() => null);
        const json = await analyticsRes.json();
        if (!cancelled) {
          if (json.ok) setData(json.analytics);
          else setError(json.error ?? "Unavailable");
        }
      } catch {
        if (!cancelled) setError("Analytics unavailable - is Docker running?");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onRecompute() {
    setRecomputing(true);
    try {
      const res = await fetch("/api/engagement", { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Recompute failed");
      await loadEngagement();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recompute failed");
    } finally {
      setRecomputing(false);
    }
  }

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
    : null;

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

      <SoftReveal
        ready={!loading}
        skeleton={
          <div className="space-y-6">
            <StatRowSkeleton count={4} />
            <div className="h-48 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface lc-skel" />
          </div>
        }
      >
        {!cards ? (
          <div
            role="alert"
            className="rounded-[16px] border border-[var(--lc-danger)]/30 bg-[var(--lc-danger-soft)] px-5 py-10 text-sm text-lc-danger"
          >
            <p className="font-medium">Analytics unavailable</p>
            <p className="mt-2 opacity-90">
              {error ??
                "Could not load cohort health. Check the database connection and try again."}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => {
                setLoading(true);
                setError(null);
                void (async () => {
                  try {
                    const analyticsRes = await fetch("/api/demo/analytics");
                    await loadEngagement().catch(() => null);
                    const json = await analyticsRes.json();
                    if (json.ok) setData(json.analytics);
                    else setError(json.error ?? "Unavailable");
                  } catch {
                    setError("Analytics unavailable - is Docker running?");
                  } finally {
                    setLoading(false);
                  }
                })();
              }}
            >
              Retry
            </Button>
          </div>
        ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((row) => (
              <div
                key={row.label}
                className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5"
              >
                <p className="text-xs font-medium text-lc-muted">{row.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-lc-ink">
                  {row.value}
                </p>
                <p className="mt-2 text-sm text-lc-muted">{row.note}</p>
              </div>
            ))}
          </div>

          <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--lc-line)] px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-lc-ink">
                  Engagement scores
                </h2>
                <p className="mt-0.5 text-xs text-lc-muted">
                  Director-only weekly heuristic (timeliness, overdue, revisions,
                  RSVP, message reply). Peers never see this.
                  {engagement?.weekStart
                    ? ` Week of ${new Date(engagement.weekStart).toLocaleDateString()}.`
                    : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={recomputing}
                onClick={onRecompute}
              >
                {recomputing ? "Scoring…" : "Recompute"}
              </Button>
            </div>
            {!engagement?.scores?.length ? (
              <p className="px-5 py-8 text-sm text-lc-muted">
                No scores yet. Run weekly ops (Pulse) or click Recompute.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--lc-line)]">
                {engagement.scores.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-lc-ink">
                        {row.name}
                      </p>
                      <p className="mt-0.5 text-xs text-lc-muted">{row.email}</p>
                      <p className="mt-2 max-w-lg text-xs leading-relaxed text-lc-muted">
                        {[
                          row.components?.timeliness?.detail,
                          row.components?.overdue?.detail,
                          row.components?.revision?.detail,
                          row.components?.meeting?.detail,
                          row.components?.messaging?.detail,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <p className="text-2xl font-semibold tabular-nums tracking-tight text-lc-ink">
                      {row.score}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
            <div className="border-b border-[var(--lc-line)] px-5 py-4">
              <h2 className="text-[15px] font-semibold text-lc-ink">
                Recent ops runs
              </h2>
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
                      <p className="text-sm font-medium text-lc-ink">
                        {run.status}
                      </p>
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
        )}
      </SoftReveal>
    </div>
  );
}
