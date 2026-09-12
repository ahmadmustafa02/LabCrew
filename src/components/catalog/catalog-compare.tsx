"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Row = { key: string; label: string; left: string; right: string; same: boolean };

export function CatalogCompare() {
  const params = useSearchParams();
  const a = params.get("a") ?? "";
  const b = params.get("b") ?? "";
  const [title, setTitle] = useState({ left: "", right: "" });
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!a || !b) {
      setError("Pick two records from the catalog.");
      return;
    }
    (async () => {
      const res = await fetch(`/api/catalog/compare?a=${a}&b=${b}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Compare failed");
        return;
      }
      setTitle({ left: data.left.title, right: data.right.title });
      setRows(data.rows);
    })().catch((e: Error) => setError(e.message));
  }, [a, b]);

  return (
    <div className="space-y-6">
      <Link href="/app/catalog" className="text-sm text-lc-accent hover:underline">
        Catalog
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Compare</h1>
      {error ? <p className="text-sm text-lc-danger">{error}</p> : null}
      {rows.length > 0 ? (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-lc-muted">
              <th className="py-2 pr-3 font-medium">Field</th>
              <th className="py-2 pr-3 font-medium">{title.left}</th>
              <th className="py-2 font-medium">{title.right}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-[var(--lc-line)]">
                <td className="py-3 pr-3 text-lc-muted">{row.label}</td>
                <td className="py-3 pr-3">{row.left}</td>
                <td className={`py-3 ${row.same ? "text-lc-muted" : "font-medium"}`}>{row.right}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
