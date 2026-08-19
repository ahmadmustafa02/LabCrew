"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type OutlierCheck = {
  status: "insufficient_sample" | "checked_clean" | "checked_with_flags";
  minRequired: number;
  flaggedCount: number;
};

type HistBin = {
  from: number;
  to: number;
  count: number;
  label: string;
};

type DirectorColumn = {
  columnName: string;
  sampleSize: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  outlierCheck: OutlierCheck;
  bins?: HistBin[];
};

type CohortRow = {
  submissionId: string;
  memberId: string;
  studentName: string;
  rowIndex: number;
  values: Record<string, string>;
  flagged: boolean;
  flagReasons: string[];
};

type StudentColumn = {
  columnName: string;
  own: {
    values: number[];
    mean: number | null;
    median: number | null;
    flaggedCount: number;
  };
  cohort:
    | {
        status: "ok";
        sampleSize: number;
        contributorCount: number;
        mean: number;
        median: number;
        outlierCheck: OutlierCheck;
      }
    | {
        status: "insufficient_cohort";
        sampleSize: number;
        contributorCount: number;
        minRequired: number;
        outlierCheck: OutlierCheck;
        message: string;
      };
};

type DirectorPayload = {
  ok: true;
  role: "director";
  contributorCount: number;
  columns: DirectorColumn[];
  rows: CohortRow[];
};

type StudentPayload = {
  ok: true;
  role: "student";
  contributorCount: number;
  columns: StudentColumn[];
  peerRawRows: null;
};

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

function outlierLabel(check: OutlierCheck): string {
  if (check.status === "insufficient_sample") {
    return `Not enough data yet to flag outliers (need ${check.minRequired}+ values, have ${check.flaggedCount === 0 ? "fewer" : check.flaggedCount})`;
  }
  if (check.status === "checked_clean") {
    return "Outlier check complete — no IQR flags";
  }
  return `Outlier check complete — ${check.flaggedCount} flagged`;
}

function OutlierStatusLine({
  check,
  sampleSize,
}: {
  check: OutlierCheck;
  sampleSize: number;
}) {
  const insufficient = check.status === "insufficient_sample";
  return (
    <p
      className={cn(
        "text-xs",
        insufficient ? "text-lc-warn" : "text-lc-muted",
      )}
    >
      {insufficient
        ? `Not enough data yet to flag outliers (need ${check.minRequired}+, have ${sampleSize}).`
        : outlierLabel(check)}
    </p>
  );
}

function Histogram({ bins }: { bins: HistBin[] }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div className="flex h-28 items-end gap-1">
      {bins.map((b) => (
        <div
          key={b.label}
          className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
          title={`${b.label}: ${b.count}`}
        >
          <div
            className="w-full rounded-t-[4px] bg-[var(--lc-accent)]"
            style={{ height: `${Math.max(4, (b.count / max) * 100)}%` }}
          />
          <span className="max-w-full truncate text-[9px] text-lc-muted">
            {b.count}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CohortDataPanel({
  assignmentId,
  role,
}: {
  assignmentId: string;
  role: "director" | "student";
}) {
  const [director, setDirector] = useState<DirectorPayload | null>(null);
  const [student, setStudent] = useState<StudentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/assignments/${assignmentId}/cohort-data`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Failed to load cohort data");
          setDirector(null);
          setStudent(null);
          return;
        }
        if (data.role === "director") {
          setDirector(data as DirectorPayload);
          setStudent(null);
        } else {
          setStudent(data as StudentPayload);
          setDirector(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  if (loading) {
    return (
      <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <p className="text-sm text-lc-muted">Loading cohort data…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <p className="text-sm text-lc-danger">{error}</p>
      </section>
    );
  }

  if (role === "director" && director) {
    if (director.columns.length === 0 && director.rows.length === 0) {
      return (
        <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
          <h2 className="text-[15px] font-semibold text-lc-ink">Cohort data</h2>
          <p className="mt-2 text-sm text-lc-muted">
            No structured numeric data submitted yet.
          </p>
        </section>
      );
    }

    const valueColumns = Array.from(
      new Set(director.rows.flatMap((r) => Object.keys(r.values))),
    );

    return (
      <section className="space-y-5 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <div>
          <h2 className="text-[15px] font-semibold text-lc-ink">Cohort data</h2>
          <p className="mt-1 text-sm text-lc-muted">
            {director.contributorCount} student
            {director.contributorCount === 1 ? "" : "s"} with structured data.
            Flagged rows highlighted.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {director.columns.map((col) => (
            <div
              key={col.columnName}
              className="rounded-[12px] border border-[var(--lc-line)] p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-lc-ink">
                  {col.columnName}
                </h3>
                <span className="text-xs text-lc-muted">
                  n={col.sampleSize} · mean {fmt(col.mean)} · median{" "}
                  {fmt(col.median)}
                </span>
              </div>
              <div className="mt-2">
                <OutlierStatusLine
                  check={col.outlierCheck}
                  sampleSize={col.sampleSize}
                />
              </div>
              {col.bins && col.bins.length > 0 ? (
                <div className="mt-3">
                  <Histogram bins={col.bins} />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {director.rows.length > 0 ? (
          <div className="overflow-x-auto rounded-[10px] border border-[var(--lc-line)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black/[0.02] text-xs text-lc-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Row</th>
                  {valueColumns.map((c) => (
                    <th key={c} className="px-3 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Flags</th>
                </tr>
              </thead>
              <tbody>
                {director.rows.map((row) => (
                  <tr
                    key={`${row.submissionId}:${row.rowIndex}`}
                    className={cn(
                      "border-t border-[var(--lc-line)]",
                      row.flagged && "bg-[var(--lc-warn-soft)]",
                    )}
                  >
                    <td className="px-3 py-2 text-lc-ink">{row.studentName}</td>
                    <td className="px-3 py-2 font-mono text-xs text-lc-muted">
                      {row.rowIndex + 1}
                    </td>
                    {valueColumns.map((c) => (
                      <td key={c} className="px-3 py-2">
                        {row.values[c] ?? "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-xs text-lc-warn">
                      {row.flagged ? row.flagReasons.join(", ") || "flagged" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    );
  }

  if (role === "student" && student) {
    if (student.columns.length === 0) {
      return null;
    }

    return (
      <section className="space-y-4 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <div>
          <h2 className="text-[15px] font-semibold text-lc-ink">
            You vs cohort
          </h2>
          <p className="mt-1 text-sm text-lc-muted">
            Your numbers compared to class aggregates only — classmates&apos;
            raw rows are never shown.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {student.columns.map((col) => (
            <div
              key={col.columnName}
              className="rounded-[12px] border border-[var(--lc-line)] p-4"
            >
              <h3 className="text-sm font-semibold text-lc-ink">
                {col.columnName}
              </h3>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-lc-muted">Your mean</dt>
                  <dd className="font-medium text-lc-ink">{fmt(col.own.mean)}</dd>
                </div>
                {col.cohort.status === "ok" ? (
                  <>
                    <div className="flex justify-between gap-2">
                      <dt className="text-lc-muted">
                        Cohort mean (n={col.cohort.contributorCount})
                      </dt>
                      <dd className="font-medium text-lc-ink">
                        {fmt(col.cohort.mean)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-lc-muted">Cohort median</dt>
                      <dd className="font-medium text-lc-ink">
                        {fmt(col.cohort.median)}
                      </dd>
                    </div>
                  </>
                ) : (
                  <p className="pt-1 text-xs text-lc-warn">{col.cohort.message}</p>
                )}
              </dl>
              <div className="mt-2">
                <OutlierStatusLine
                  check={
                    col.cohort.status === "ok"
                      ? col.cohort.outlierCheck
                      : col.cohort.outlierCheck
                  }
                  sampleSize={
                    col.cohort.status === "ok"
                      ? col.cohort.sampleSize
                      : col.cohort.sampleSize
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return null;
}
