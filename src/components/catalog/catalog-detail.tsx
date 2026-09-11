"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Field = {
  id: string;
  key: string;
  label: string;
  value: string;
  quote: string;
  page: number | null;
  confidence: string;
  trust: "trusted" | "held" | "rejected";
  verifierNote: string | null;
};

type RecordRow = {
  id: string;
  title: string;
  status: string;
  sourceName: string | null;
  sourceText: string;
  fields: Field[];
};

export function CatalogDetail({ id }: { id: string }) {
  const [record, setRecord] = useState<RecordRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/catalog/${id}`);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed");
    setRecord(data.record);
  }, [id]);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  async function decide(fieldId: string, trust: Field["trust"], value?: string) {
    const res = await fetch(`/api/catalog/${id}/fields/${fieldId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trust, value }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Update failed");
      return;
    }
    await load();
  }

  if (error && !record) return <p className="text-sm text-lc-danger">{error}</p>;
  if (!record) return <p className="text-sm text-lc-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/catalog" className="text-sm text-lc-accent hover:underline">
          Catalog
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{record.title}</h1>
        <p className="mt-1 text-sm text-lc-muted">
          {record.sourceName} · {record.status.replace("_", " ")}
        </p>
      </div>

      <ul className="space-y-3">
        {record.fields.map((field) => (
          <li
            key={field.id}
            className="rounded-[14px] border border-[var(--lc-line)] bg-lc-surface px-4 py-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{field.label}</p>
              <span
                className={
                  field.trust === "trusted"
                    ? "text-xs font-medium text-lc-success"
                    : field.trust === "rejected"
                      ? "text-xs font-medium text-lc-danger"
                      : "text-xs font-medium text-lc-warn"
                }
              >
                {field.trust}
              </span>
            </div>
            <p className="mt-1 text-base">{field.value || "—"}</p>
            {field.quote ? (
              <blockquote className="mt-2 border-l-2 border-lc-accent pl-3 text-sm leading-relaxed text-lc-muted">
                “{field.quote}”
                {field.page ? <span className="ml-2 text-xs">p.{field.page}</span> : null}
              </blockquote>
            ) : (
              <p className="mt-2 text-sm text-lc-muted">No source sentence — cannot trust this field.</p>
            )}
            {field.verifierNote ? (
              <p className="mt-2 text-xs text-lc-muted">{field.verifierNote}</p>
            ) : null}
            {field.trust === "held" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void decide(field.id, "trusted")}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void decide(field.id, "rejected")}
                >
                  Reject
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
