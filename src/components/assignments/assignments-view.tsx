"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session/session-provider";
import type { MaterialItem } from "@/lib/assignment-types";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { SoftReveal } from "@/components/ui/soft-reveal";
import { cn } from "@/lib/cn";
import {
  assignmentBucket,
  formatDueGroup,
  formatDueLabel,
  isTurnedIn,
  type AssignmentBucket,
} from "@/lib/assignment-buckets";

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

const TABS: Array<{ id: AssignmentBucket; label: string }> = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past_due", label: "Past due" },
  { id: "completed", label: "Completed" },
];

type LabRowLike = {
  memberId: string;
  role: "student" | "director";
  organizationName: string;
  programName: string;
  active: boolean;
};

function studentStatusBadge(a: Assignment) {
  if (a.myReviewStatus === "NEEDS_REVISION") {
    return { label: "Needs revision", tone: "danger" as const };
  }
  if (a.myReviewStatus === "APPROVED" || a.myReviewStatus === "DONE") {
    return { label: "Approved", tone: "success" as const };
  }
  if (isTurnedIn(a)) {
    return { label: "Turned in", tone: "success" as const };
  }
  if (a.myStatus === "DRAFT") {
    return { label: "Draft", tone: "muted" as const };
  }
  return { label: "Not turned in", tone: "muted" as const };
}

function directorStatusBadge(a: Assignment) {
  if (a.status === "CLOSED") {
    return { label: "Closed", tone: "muted" as const };
  }
  if (a.pendingReview > 0) {
    return { label: `${a.pendingReview} to review`, tone: "warn" as const };
  }
  if (a.studentCount > 0 && a.approved >= a.studentCount) {
    return { label: "All approved", tone: "success" as const };
  }
  return {
    label: `${a.submissionCount}/${a.studentCount || "—"} in`,
    tone: "muted" as const,
  };
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warn" | "danger" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "success" && "bg-[var(--lc-success-soft)] text-lc-success",
        tone === "warn" && "bg-[var(--lc-warn-soft)] text-lc-warn",
        tone === "danger" && "bg-[var(--lc-danger-soft)] text-lc-danger",
        tone === "muted" && "bg-black/[0.05] text-lc-muted dark:bg-white/[0.06]",
      )}
    >
      {tone === "success" ? (
        <span aria-hidden className="text-[10px]">
          ✓
        </span>
      ) : null}
      {label}
    </span>
  );
}

export function AssignmentsView() {
  const { role, programName, organizationName } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<AssignmentBucket>("upcoming");
  const [studentLabHint, setStudentLabHint] = useState<{
    memberId: string;
    organizationName: string;
    programName: string;
  } | null>(null);

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

  useEffect(() => {
    if (role !== "director" || loading || assignments.length > 0) {
      setStudentLabHint(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/labs");
        const data = await res.json();
        if (cancelled || !data.ok) return;
        const student = (data.labs as LabRowLike[]).find(
          (l) => l.role === "student" && !l.active,
        );
        if (student) {
          setStudentLabHint({
            memberId: student.memberId,
            organizationName: student.organizationName,
            programName: student.programName,
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, loading, assignments.length]);

  const counts = useMemo(() => {
    const c = { upcoming: 0, past_due: 0, completed: 0 };
    for (const a of assignments) {
      c[assignmentBucket(a, role)] += 1;
    }
    return c;
  }, [assignments, role]);

  const grouped = useMemo(() => {
    const filtered = assignments
      .filter((a) => assignmentBucket(a, role) === tab)
      .sort((a, b) => {
        const da = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        return tab === "completed" ? db - da : da - db;
      });

    const map = new Map<string, Assignment[]>();
    for (const a of filtered) {
      const key = formatDueGroup(a.dueAt);
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [assignments, role, tab]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
            Assignments
          </h1>
          <p className="mt-1.5 text-sm text-lc-muted">
            {organizationName || programName
              ? `${organizationName ?? programName}${programName && organizationName ? ` · ${programName}` : ""} · `
              : ""}
            {role === "director"
              ? "Create tasks and review turned-in work."
              : "Track what’s due and turn in your work."}
          </p>
          {studentLabHint ? (
            <p className="mt-2 rounded-[10px] border border-[var(--lc-warn)]/30 bg-[var(--lc-warn-soft)] px-3 py-2 text-sm text-lc-warn">
              You’re in <strong>Director</strong> mode on an empty lab.
              Your student work is in{" "}
              <strong>{studentLabHint.organizationName}</strong> (
              {studentLabHint.programName}). Open the account menu → Your labs →
              pick the one marked <strong>Student</strong>.
            </p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-lc-danger">{error}</p> : null}
        </div>
        {role === "director" && !studentLabHint ? (
          <Link href="/app/assignments/new">
            <Button variant="accent" size="md">
              New assignment
            </Button>
          </Link>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Assignment filters"
        className="flex gap-1 border-b border-[var(--lc-line)]"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-lc-ink"
                  : "text-lc-muted hover:text-lc-ink",
              )}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-lc-muted">{counts[t.id]}</span>
              {active ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-lc-accent" />
              ) : null}
            </button>
          );
        })}
      </div>

      <SoftReveal ready={!loading} skeleton={<CardListSkeleton count={4} />}>
        {grouped.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[var(--lc-line)] px-5 py-14 text-center">
            {assignments.length === 0 ? (
              <>
                <p className="text-sm text-lc-muted">
                  {role === "director"
                    ? studentLabHint
                      ? `This director lab has no assignments. Switch to ${studentLabHint.organizationName} (Student) in the account menu.`
                      : "No assignments yet. Create one to get the cohort started."
                    : "No assignments in this lab yet."}
                </p>
                {role === "director" && !studentLabHint ? (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Link href="/app/assignments/new">
                      <Button variant="accent" size="md">
                        New assignment
                      </Button>
                    </Link>
                    <Link href="/app/team">
                      <Button variant="secondary" size="md">
                        Invite students
                      </Button>
                    </Link>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-lc-muted">
                {tab === "upcoming" && "Nothing upcoming."}
                {tab === "past_due" && "No past-due assignments."}
                {tab === "completed" && "No completed assignments yet."}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([group, items]) => (
              <section key={group}>
                <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-lc-ink">
                  {group}
                </h2>
                <ul className="divide-y divide-[var(--lc-line)] overflow-hidden rounded-[14px] border border-[var(--lc-line)] bg-lc-surface">
                  {items.map((item) => {
                    const badge =
                      role === "student"
                        ? studentStatusBadge(item)
                        : directorStatusBadge(item);
                    return (
                      <li key={item.id}>
                        <Link
                          href={`/app/assignments/${item.id}`}
                          className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                        >
                          <span
                            aria-hidden
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--lc-accent-soft)] text-xs font-semibold text-lc-accent"
                          >
                            {item.title.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold text-lc-ink">
                              {item.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-lc-muted">
                              {role === "student" && isTurnedIn(item)
                                ? `Submitted · ${formatDueLabel(item.dueAt)}`
                                : formatDueLabel(item.dueAt)}
                              {item.materialCount > 0
                                ? ` · ${item.materialCount} material${item.materialCount === 1 ? "" : "s"}`
                                : ""}
                            </p>
                            {programName ? (
                              <p className="mt-0.5 truncate text-xs text-lc-muted">
                                {programName}
                              </p>
                            ) : null}
                          </div>
                          <StatusPill label={badge.label} tone={badge.tone} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </SoftReveal>
    </div>
  );
}
