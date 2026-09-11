"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Assignment = {
  id: string;
  title: string;
  agentLater: "papers" | "datasets" | null;
};

type PaperHit = {
  title: string;
  url: string;
  year: number | null;
  venue: string | null;
  source: string;
};

type DatasetHit = {
  id: string;
  title: string;
  url: string;
  downloads: number | null;
  licenceHint: string | null;
  source: string;
};

export function ResearchPlanDetail({ planId }: { planId: string }) {
  const [topic, setTopic] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [targetId, setTargetId] = useState("");
  const [papers, setPapers] = useState<PaperHit[] | null>(null);
  const [datasets, setDatasets] = useState<DatasetHit[] | null>(null);
  const [paperNote, setPaperNote] = useState<string | null>(null);
  const [dataNote, setDataNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/research/plans/${planId}`);
    const data = await res.json();
    if (!data.ok) {
      setError(data.error ?? "Failed to load plan");
      return;
    }
    setTopic(data.plan.topic);
    setAssignments(data.plan.assignments ?? []);
    setTargetId((prev) => prev || data.plan.assignments?.[0]?.id || "");
  }, [planId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function find(kind: "papers" | "datasets") {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/research/plans/${planId}/find`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Search failed");
      if (kind === "papers") {
        setPapers(data.papers ?? []);
        setPaperNote(data.error || data.note);
      } else {
        setDatasets(data.datasets ?? []);
        setDataNote([data.note, data.error].filter(Boolean).join(" "));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy(null);
    }
  }

  async function attach(input: {
    kind: "papers" | "datasets";
    title: string;
    url: string;
    alsoCatalog?: boolean;
    licenceHint?: string | null;
  }) {
    setBusy(input.url);
    setError(null);
    try {
      const res = await fetch(`/api/research/plans/${planId}/attach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          milestoneId: targetId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Attach failed");
      setToast(
        data.catalogId
          ? "Attached, and a Catalog row is waiting on held fields."
          : "Attached to the assignment.",
      );
      window.setTimeout(() => setToast(null), 2800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attach failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/app/research"
          className="text-sm text-lc-muted transition-colors hover:text-lc-ink"
        >
          ← Plan
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
          Find sources
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-lc-muted">
          {topic || "This plan"}
        </p>
        <p className="mt-2 text-sm text-lc-muted">
          Papers from Semantic Scholar / arXiv. Datasets from Hugging Face.
          Empty is honest. Attach only what you want students to see.
        </p>
      </div>

      {assignments.length > 0 ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Attach to assignment</span>
          <select
            className="lc-input"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
                {a.agentLater ? ` · ${a.agentLater}` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {error ? <p className="text-sm text-lc-danger">{error}</p> : null}
      {toast ? <p className="text-sm text-lc-success">{toast}</p> : null}

      <section className="space-y-3 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-lc-ink">Similar papers</h2>
          <Button
            variant="accent"
            size="sm"
            disabled={busy != null}
            onClick={() => void find("papers")}
          >
            {busy === "papers" ? "Searching…" : "Find papers"}
          </Button>
        </div>
        {paperNote ? <p className="text-sm text-lc-muted">{paperNote}</p> : null}
        {papers && papers.length === 0 ? (
          <p className="text-sm text-lc-muted">No matching titles. Nothing invented.</p>
        ) : null}
        {papers && papers.length > 0 ? (
          <ul className="space-y-3">
            {papers.map((p) => (
              <li key={p.url} className="space-y-1 border-t border-[var(--lc-line)] pt-3">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-lc-accent hover:underline"
                >
                  {p.title}
                </a>
                <p className="text-xs text-lc-muted">
                  {[p.venue, p.year, p.source].filter(Boolean).join(" · ")}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy != null}
                  onClick={() => void attach({ kind: "papers", title: p.title, url: p.url })}
                >
                  Attach as material
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-lc-ink">Datasets</h2>
          <Button
            variant="accent"
            size="sm"
            disabled={busy != null}
            onClick={() => void find("datasets")}
          >
            {busy === "datasets" ? "Searching…" : "Find datasets"}
          </Button>
        </div>
        {dataNote ? <p className="text-sm text-lc-muted">{dataNote}</p> : null}
        {datasets && datasets.length === 0 ? (
          <p className="text-sm text-lc-muted">No hub hits. Nothing invented.</p>
        ) : null}
        {datasets && datasets.length > 0 ? (
          <ul className="space-y-3">
            {datasets.map((d) => (
              <li key={d.url} className="space-y-2 border-t border-[var(--lc-line)] pt-3">
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-lc-accent hover:underline"
                >
                  {d.title}
                </a>
                <p className="text-xs text-lc-muted">
                  Hugging Face
                  {d.downloads != null ? ` · ${d.downloads} downloads` : ""}
                  {d.licenceHint ? ` · hub licence hint: ${d.licenceHint}` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy != null}
                    onClick={() =>
                      void attach({
                        kind: "datasets",
                        title: d.title,
                        url: d.url,
                        licenceHint: d.licenceHint,
                      })
                    }
                  >
                    Attach as material
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy != null}
                    onClick={() =>
                      void attach({
                        kind: "datasets",
                        title: d.title,
                        url: d.url,
                        licenceHint: d.licenceHint,
                        alsoCatalog: true,
                      })
                    }
                  >
                    Attach + Catalog hold
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
