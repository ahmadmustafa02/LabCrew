"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session/session-provider";
import type { MaterialItem } from "@/lib/assignment-types";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { SoftReveal } from "@/components/ui/soft-reveal";
import { cn } from "@/lib/cn";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  dueAt: string | null;
  status: string;
  submissionCount: number;
  studentCount: number;
  materialCount: number;
  pendingReview: number;
  needsRevision: number;
  approved: number;
  myStatus: string | null;
  myReviewStatus: string | null;
  materials?: MaterialItem[] | null;
};

function reviewLabel(status: string | null) {
  if (!status) return null;
  if (status === "PENDING_REVIEW") return "Pending review";
  if (status === "NEEDS_REVISION") return "Needs revision";
  if (status === "APPROVED") return "Approved";
  if (status === "DONE") return "Done";
  return status;
}

export function AssignmentsView() {
  const { role } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
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
      } finally {
        if (!cancelled) setLoading(false);
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
              ? "Create tasks, review submissions, and move work to approved / done."
              : "Open a task, attach your work, and track review status."}
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

      <SoftReveal ready={!loading} skeleton={<CardListSkeleton count={3} />}>
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <div className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-10 text-sm text-lc-muted">
              No assignments yet.
              {role === "director"
                ? " Create a task with materials and a clear definition of done."
                : ""}
            </div>
          ) : (
            assignments.map((item) => {
              const blurb =
                item.instructions ||
                item.description ||
                "No description yet.";
              return (
                <Link
                  key={item.id}
                  href={`/app/assignments/${item.id}`}
                  className="block rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5 transition-[background-color,border-color] duration-200 ease-out hover:border-[var(--lc-line-strong)] hover:bg-[#fafafa]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-semibold tracking-tight text-lc-ink">
                        {item.title}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-lc-muted">
                        {blurb}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-lc-muted">
                        <span>
                          {item.dueAt
                            ? `Due ${new Date(item.dueAt).toLocaleDateString()}`
                            : "No due date"}
                        </span>
                        <span>·</span>
                        <span>
                          {item.materialCount} material
                          {item.materialCount === 1 ? "" : "s"}
                        </span>
                        {role === "director" ? (
                          <>
                            <span>·</span>
                            <span>
                              {item.submissionCount}/{item.studentCount || "—"}{" "}
                              submitted
                            </span>
                            {item.pendingReview > 0 ? (
                              <>
                                <span>·</span>
                                <span className="text-lc-warn">
                                  {item.pendingReview} pending review
                                </span>
                              </>
                            ) : null}
                            {item.needsRevision > 0 ? (
                              <>
                                <span>·</span>
                                <span className="text-lc-danger">
                                  {item.needsRevision} need revision
                                </span>
                              </>
                            ) : null}
                            {item.approved > 0 ? (
                              <>
                                <span>·</span>
                                <span className="text-lc-success">
                                  {item.approved} approved
                                </span>
                              </>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <span>·</span>
                            <span>
                              {item.myStatus === "SUBMITTED" ||
                              item.myStatus === "SCORED"
                                ? "Submitted"
                                : item.myStatus === "DRAFT"
                                  ? "Draft saved"
                                  : "Not started"}
                            </span>
                            {reviewLabel(item.myReviewStatus) ? (
                              <>
                                <span>·</span>
                                <span>{reviewLabel(item.myReviewStatus)}</span>
                              </>
                            ) : null}
                          </>
                        )}
                      </div>
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
              );
            })
          )}
        </div>
      </SoftReveal>
    </div>
  );
}
