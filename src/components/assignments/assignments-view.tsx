"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session/session-provider";
import type { MaterialItem } from "@/lib/assignment-types";
import { cn } from "@/lib/cn";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  dueAt: string | null;
  status: string;
  submissionCount: number;
  materials?: MaterialItem[] | null;
};

export function AssignmentsView() {
  const { role } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/assignments");
        const data = await res.json();
        if (!cancelled) {
          if (data.ok) setAssignments(data.assignments);
          else setError(data.error ?? "Failed to load");
        }
      } catch {
        if (!cancelled) setError("Could not load assignments");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-lc-muted">Assignments</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
            {role === "director" ? "Program tasks" : "Your tasks"}
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
            {role === "director"
              ? "Create weekly research tasks, attach materials, and define what done means."
              : "Open a task, use the materials, then submit your evidence."}
          </p>
          {error ? <p className="mt-2 text-sm text-lc-danger">{error}</p> : null}
        </div>
        {role === "director" ? (
          <Link href="/app/assignments/new">
            <Button variant="accent" size="md">
              New assignment
            </Button>
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {assignments.length === 0 ? (
          <div className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-10 text-sm text-lc-muted">
            No assignments yet.
            {role === "director"
              ? " Create Week 1 reading or Week 4 demo to start the loop."
              : ""}
          </div>
        ) : (
          assignments.map((item) => (
            <Link
              key={item.id}
              href={`/app/assignments/${item.id}`}
              className="block rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5 transition-colors hover:bg-[#fafafa]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-lc-ink">{item.title}</p>
                  <p className="mt-1 text-sm text-lc-muted">
                    {item.description || item.instructions || "No description"}
                  </p>
                  <p className="mt-2 text-xs text-lc-muted">
                    {item.dueAt
                      ? `Due ${new Date(item.dueAt).toLocaleDateString()}`
                      : "No due date"}
                    {role === "director"
                      ? ` · ${item.submissionCount} submitted`
                      : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-medium",
                    item.status === "ACTIVE"
                      ? "bg-[var(--lc-accent-soft)] text-lc-accent"
                      : "bg-black/[0.04] text-lc-muted",
                  )}
                >
                  {item.status}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
