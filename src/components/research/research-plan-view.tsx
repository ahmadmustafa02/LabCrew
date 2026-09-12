"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ResearchRoadmap, RoadmapStep } from "@/server/research/roadmap";

type SavedPlan = {
  id: string;
  topic: string;
  weeks: number;
  assignmentCount: number;
  createdAt: string;
};

const inputClass = "lc-input";

const KIND_LABEL: Record<RoadmapStep["kind"], string> = {
  collect: "Collect",
  writeup: "Writeup",
  catalog: "Catalog",
  review: "Review",
};

const LATER_LABEL: Record<string, string> = {
  papers: "Later: similar-papers agent can attach here",
  datasets: "Later: dataset catalog agent can attach here",
};

export function ResearchPlanView() {
  const [topic, setTopic] = useState("");
  const [weeks, setWeeks] = useState(6);
  const [roadmap, setRoadmap] = useState<ResearchRoadmap | null>(null);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    const res = await fetch("/api/research/plans");
    const data = await res.json();
    if (data.ok) setPlans(data.plans ?? []);
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  async function onDraft() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/research/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, weeks }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Draft failed");
      setRoadmap(data.roadmap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCommit() {
    if (!roadmap) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/research/roadmap/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: roadmap.topic,
          weeks: roadmap.weeks,
          steps: roadmap.steps,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not add assignments");
      setRoadmap(null);
      setTopic("");
      await loadPlans();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add assignments");
    } finally {
      setBusy(false);
    }
  }

  function patchStep(index: number, patch: Partial<RoadmapStep>) {
    setRoadmap((prev) => {
      if (!prev) return prev;
      const steps = prev.steps.map((s, i) => (i === index ? { ...s, ...patch } : s));
      return { ...prev, steps };
    });
  }

  function removeStep(index: number) {
    setRoadmap((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: prev.steps.filter((_, i) => i !== index) };
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/app/assignments"
          className="text-sm text-lc-muted transition-colors duration-200 hover:text-lc-ink"
        >
          ← Assignments
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
          Plan
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-lc-muted">
          Recent roadmaps stay here. Draft another from a topic when you want.
          Nothing is assigned until you add it. It will not invent papers.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-lc-ink">Recent</h2>
        {plans.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-[var(--lc-line)] px-5 py-8 text-sm text-lc-muted">
            No plans yet. Draft one below.
          </p>
        ) : (
          <ul className="space-y-2">
            {plans.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-lc-ink">{p.topic}</p>
                  <p className="mt-1 text-sm text-lc-muted">
                    {p.assignmentCount} assignment{p.assignmentCount === 1 ? "" : "s"}
                    {p.weeks ? ` · ${p.weeks} weeks` : ""}
                    {` · ${new Date(p.createdAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/app/research/${p.id}`}>
                    <Button variant="accent" size="sm">
                      Find sources
                    </Button>
                  </Link>
                  <Link href="/app/assignments">
                    <Button variant="secondary" size="sm">
                      Assignments
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Delete this plan and its ${p.assignmentCount} assignment${p.assignmentCount === 1 ? "" : "s"}?`,
                        )
                      ) {
                        return;
                      }
                      void (async () => {
                        setBusy(true);
                        setError(null);
                        try {
                          const res = await fetch(`/api/research/plans/${p.id}`, {
                            method: "DELETE",
                          });
                          const data = await res.json();
                          if (!res.ok || !data.ok) {
                            throw new Error(data.error ?? "Delete failed");
                          }
                          await loadPlans();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Delete failed");
                        } finally {
                          setBusy(false);
                        }
                      })();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-4 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <h2 className="text-[15px] font-semibold text-lc-ink">Plan from a topic</h2>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">What are you studying</span>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder="AI coding vulnerability — can we tell reachable flaws from scanner noise in student repos?"
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Weeks</span>
          <input
            type="number"
            min={4}
            max={8}
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className={inputClass}
          />
        </label>
        <Button variant="accent" size="md" disabled={busy || topic.trim().length < 8} onClick={onDraft}>
          {busy && !roadmap ? "Drafting…" : "Draft roadmap"}
        </Button>
      </div>

      {error ? <p className="text-sm text-lc-danger">{error}</p> : null}

      {roadmap ? (
        <div className="space-y-4">
          <div className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-lc-muted">
              Draft · {roadmap.source === "llm" ? "model" : "template"}
              {roadmap.model ? ` · ${roadmap.model}` : ""}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-lc-muted">{roadmap.note}</p>
          </div>

          {roadmap.steps.map((step, i) => (
            <article
              key={`${step.week}-${i}`}
              className="space-y-3 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-lc-muted">
                  Week {step.week} · {KIND_LABEL[step.kind]}
                </p>
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="text-xs text-lc-muted hover:text-lc-ink"
                >
                  Remove
                </button>
              </div>
              <input
                value={step.title}
                onChange={(e) => patchStep(i, { title: e.target.value })}
                className={inputClass}
              />
              <textarea
                value={step.instructions}
                onChange={(e) => patchStep(i, { instructions: e.target.value })}
                rows={3}
                className={inputClass}
              />
              {step.nextHint ? (
                <p className="text-sm text-lc-muted">Next: {step.nextHint}</p>
              ) : null}
              {step.agentLater ? (
                <p className="text-xs text-lc-muted">{LATER_LABEL[step.agentLater]}</p>
              ) : null}
            </article>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button variant="accent" size="md" disabled={busy || roadmap.steps.length < 3} onClick={onCommit}>
              {busy ? "Adding…" : "Add these assignments"}
            </Button>
            <Button variant="secondary" size="md" disabled={busy} onClick={onDraft}>
              Draft again
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
