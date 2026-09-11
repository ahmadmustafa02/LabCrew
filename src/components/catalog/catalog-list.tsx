"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  title: string;
  status: string;
  sourceName: string | null;
  held: number;
  trusted: number;
  fields: Record<string, string>;
};

export function CatalogList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [modality, setModality] = useState("");
  const [human, setHuman] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<string[]>([]);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (modality) params.set("modality", modality);
    if (human) params.set("humanRated", human);
    const res = await fetch(`/api/catalog?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed");
    setRows(data.records);
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, []);

  function toggle(id: string) {
    setPick((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 2 ? [prev[1], id] : [...prev, id],
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-lc-muted">Catalog</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Dataset records</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-lc-muted">
            Search checked rows — not PDFs. A field is listed only after a cited sentence
            passed the verifier, or a human approved it.
          </p>
        </div>
        <div className="flex gap-2">
          {pick.length === 2 ? (
            <Link href={`/app/catalog/compare?a=${pick[0]}&b=${pick[1]}`}>
              <Button variant="secondary">Compare selected</Button>
            </Link>
          ) : null}
          <Link href="/app/catalog/new">
            <Button>Add from paper</Button>
          </Link>
        </div>
      </header>

      <form
        className="grid gap-3 rounded-[14px] border border-[var(--lc-line)] bg-lc-surface p-4 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          load().catch((err: Error) => setError(err.message));
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title or values"
          className="rounded-[10px] border border-[var(--lc-line)] bg-transparent px-3 py-2 text-sm"
        />
        <select
          value={modality}
          onChange={(e) => setModality(e.target.value)}
          className="rounded-[10px] border border-[var(--lc-line)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Any modality</option>
          <option value="audio">Audio</option>
          <option value="video">Video</option>
          <option value="audiovisual">Audiovisual</option>
          <option value="text">Text</option>
        </select>
        <select
          value={human}
          onChange={(e) => setHuman(e.target.value)}
          className="rounded-[10px] border border-[var(--lc-line)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Ratings: any</option>
          <option value="yes">Human-rated</option>
        </select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {error ? <p className="text-sm text-lc-danger">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-[var(--lc-line-strong)] px-4 py-10 text-center text-sm text-lc-muted">
          No checked records yet. Add a paper excerpt.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => toggle(row.id)}
                  className={`w-10 shrink-0 rounded-[12px] border text-xs ${
                    pick.includes(row.id)
                      ? "border-lc-accent bg-[var(--lc-accent-soft)] text-lc-accent"
                      : "border-[var(--lc-line)] text-lc-muted"
                  }`}
                  aria-label="Select to compare"
                >
                  {pick.includes(row.id) ? "On" : "—"}
                </button>
                <Link
                  href={`/app/catalog/${row.id}`}
                  className="flex-1 rounded-[12px] border border-[var(--lc-line)] bg-lc-surface px-4 py-3 hover:bg-[var(--lc-hover)]"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium">{row.title}</p>
                    <span className="text-xs text-lc-muted">{row.status.replace("_", " ")}</span>
                  </div>
                  <p className="mt-1 text-xs text-lc-muted">
                    {row.fields.modality ?? "modality ?"} · {row.fields.instanceCount ?? "n ?"} ·{" "}
                    {row.fields.licence ?? "licence ?"} · {row.trusted} trusted · {row.held} held
                  </p>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
