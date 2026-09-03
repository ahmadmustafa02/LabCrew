"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session/session-provider";
import type { AssignmentDataSchema, AssignmentRubric, MaterialItem } from "@/lib/assignment-types";
import { cn } from "@/lib/cn";
import { CohortDataPanel } from "@/components/assignments/cohort-data-panel";
import { SubmissionFeed } from "@/components/assignments/submission-feed";
import { formatDueLabel } from "@/lib/assignment-buckets";

const inputClass = "lc-input";

type Attachment = {
  id: string;
  title: string;
  kind: string;
  url: string;
  originalName?: string;
  size?: number;
};

type DataTable = {
  columns: string[];
  rows: Array<{
    rowIndex: number;
    values: Record<string, string>;
    flags?: Record<string, { flagged: boolean; flagReason: string | null }>;
    rowFlagged?: boolean;
  }>;
  cellCount: number;
  flaggedCellCount?: number;
};

type ReviewStatus =
  | "PENDING_REVIEW"
  | "NEEDS_REVISION"
  | "APPROVED"
  | "DONE"
  | null;

type SubmissionRow = {
  id: string;
  memberId: string;
  studentName: string;
  studentEmail?: string;
  status: string;
  evidenceUrl: string | null;
  repoUrl: string | null;
  writeup: string | null;
  checklist?: unknown;
  attachments: Attachment[];
  score: number | null;
  reviewStatus: ReviewStatus;
  reviewComment: string | null;
  reviewedAt: string | null;
  submittedAt: string | null;
  updatedAt?: string;
  dataTable?: DataTable | null;
  posts?: Array<{
    id: string;
    version: number;
    writeup: string | null;
    evidenceUrl: string | null;
    repoUrl: string | null;
    attachments: Attachment[];
    submittedAt: string;
    editedAt: string | null;
  }>;
};

type AssignmentDetail = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  materials: MaterialItem[] | null;
  rubric: AssignmentRubric | null;
  dataSchema: AssignmentDataSchema | null;
  coachResources?: {
    status: "found" | "empty";
    query: string;
    note: string;
    items: Array<{
      title: string;
      url: string;
      year: number | null;
      venue: string | null;
      rationale: string;
    }>;
    approvedAt: string | null;
  } | null;
  dueAt: string | null;
  status: string;
  stats: {
    studentCount: number;
    turnedIn: number;
    pendingReview: number;
    needsRevision: number;
    approved: number;
  };
  submissions: SubmissionRow[];
};

const REVIEW_OPTIONS: Array<{
  value: NonNullable<ReviewStatus>;
  label: string;
}> = [
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "NEEDS_REVISION", label: "Needs revision" },
  { value: "APPROVED", label: "Approved" },
  { value: "DONE", label: "Done" },
];

function formatFlagReason(reason: string | null | undefined): string {
  if (!reason) return "Flagged";
  return reason
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      if (r === "iqr_outlier") return "IQR outlier";
      if (r === "duplicate_row") return "Duplicate row";
      if (r === "duplicate_resubmission") return "Duplicate resubmit";
      return r;
    })
    .join(" · ");
}
function reviewBadgeClass(status: ReviewStatus) {
  if (status === "APPROVED" || status === "DONE") {
    return "bg-[var(--lc-success-soft)] text-lc-success";
  }
  if (status === "NEEDS_REVISION") {
    return "bg-[var(--lc-danger-soft)] text-lc-danger";
  }
  if (status === "PENDING_REVIEW") {
    return "bg-[var(--lc-warn-soft)] text-lc-warn";
  }
  return "bg-black/[0.04] text-lc-muted";
}

function reviewLabel(status: ReviewStatus) {
  if (!status) return "Not reviewed";
  return REVIEW_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function formatBytes(n?: number) {
  if (!n || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssignmentDetailView({ assignmentId }: { assignmentId: string }) {
  const { role, studentMemberId, studentName } = useSession();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [writeup, setWriteup] = useState("");
  const [checks, setChecks] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dataCsv, setDataCsv] = useState("");
  const [dataTable, setDataTable] = useState<DataTable | null>(null);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<
    Record<string, { reviewStatus: NonNullable<ReviewStatus>; reviewComment: string }>
  >({});
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [myReview, setMyReview] = useState<{
    reviewStatus: ReviewStatus;
    reviewComment: string | null;
  } | null>(null);
  const [mySubmissionId, setMySubmissionId] = useState<string | null>(null);
  const [mySubmissionStatus, setMySubmissionStatus] = useState<string | null>(
    null,
  );
  const [mySubmittedAt, setMySubmittedAt] = useState<string | null>(null);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editDueAt, setEditDueAt] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/assignments/${assignmentId}`);
    const data = await res.json();
    if (!data.ok) {
      setError(data.error ?? "Failed to load");
      return;
    }
    setAssignment(data.assignment);
    const a = data.assignment as AssignmentDetail;
    setEditTitle(a.title ?? "");
    setEditInstructions(a.instructions ?? a.description ?? "");
    if (a.dueAt) {
      const d = new Date(a.dueAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      setEditDueAt(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    } else {
      setEditDueAt("");
    }
  }, [assignmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (role !== "student" || !studentMemberId || !assignment) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/assignments/${assignmentId}/submit`);
      const data = await res.json();
      if (cancelled || !data.ok || !data.submission) return;
      const s = data.submission;
      setMySubmissionId(s.id ?? null);
      setMySubmissionStatus(s.status ?? null);
      setMySubmittedAt(s.submittedAt ?? null);
      setEvidenceUrl(s.evidenceUrl ?? "");
      setRepoUrl(s.repoUrl ?? "");
      setWriteup(s.writeup ?? "");
      setChecks(Array.isArray(s.checklist) ? (s.checklist as string[]) : []);
      setAttachments(Array.isArray(s.attachments) ? s.attachments : []);
      if (data.dataTable) setDataTable(data.dataTable);
      setMyReview({
        reviewStatus: s.reviewStatus ?? null,
        reviewComment: s.reviewComment ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [role, studentMemberId, assignment, assignmentId]);

  useEffect(() => {
    if (!assignment || role !== "director") return;
    // Sync from server unless the professor is mid-edit on an expanded row.
    setReviewDrafts((prev) => {
      const next = { ...prev };
      for (const s of assignment.submissions) {
        if (expandedId === s.id && next[s.id]) continue;
        next[s.id] = {
          reviewStatus: s.reviewStatus ?? "PENDING_REVIEW",
          reviewComment: s.reviewComment ?? "",
        };
      }
      return next;
    });
  }, [assignment, role, expandedId]);

  const rubric = assignment?.rubric;
  const materials = useMemo(
    () => (Array.isArray(assignment?.materials) ? assignment!.materials! : []),
    [assignment],
  );
  const checklist = rubric?.checklist ?? [];
  const stats = assignment?.stats;

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploadBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("title", file.name);
      const res = await fetch("/api/files/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Upload failed");
      const fileMeta = (data.file ?? data.material) as Attachment;
      setAttachments((prev) => [...prev, fileMeta]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadBusy(false);
    }
  }

  function addLinkAttachment() {
    const title = linkTitle.trim() || "Link";
    const url = linkUrl.trim();
    if (!url) return;
    setAttachments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title,
        kind: "link",
        url,
      },
    ]);
    setLinkTitle("");
    setLinkUrl("");
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function submit(status: "DRAFT" | "SUBMITTED") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceUrl,
          repoUrl,
          writeup,
          checklist: checks,
          attachments,
          status,
          ...(assignment?.rubric?.acceptData
            ? dataCsv.trim()
              ? { dataCsv }
              : {}
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Submit failed");
      if (data.dataTable) setDataTable(data.dataTable);
      const warn =
        Array.isArray(data.warnings) && data.warnings.length
          ? ` — ${data.warnings[0]}`
          : "";
      setToast(
        (status === "SUBMITTED" ? "Turned in" : "Draft saved") + warn,
      );
      window.setTimeout(() => setToast(null), 2500);
      if (status === "SUBMITTED") {
        setMyReview({ reviewStatus: "PENDING_REVIEW", reviewComment: null });
        setMySubmissionStatus("SUBMITTED");
        setMySubmittedAt(new Date().toISOString());
        if (data.submission?.id) setMySubmissionId(data.submission.id);
        setFeedRefreshKey((k) => k + 1);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveReview(submissionId: string) {
    const draft = reviewDrafts[submissionId];
    if (!draft) return;
    setReviewBusyId(submissionId);
    setError(null);
    try {
      const res = await fetch(
        `/api/assignments/${assignmentId}/submissions/${submissionId}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewStatus: draft.reviewStatus,
            reviewComment: draft.reviewComment,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Review failed");
      setToast("Review saved");
      window.setTimeout(() => setToast(null), 2500);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setReviewBusyId(null);
    }
  }

  if (!assignment) {
    return (
      <div className="space-y-6" aria-busy="true">
        {error ? (
          <p className="text-sm text-lc-danger">{error}</p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-md bg-black/[0.06]" />
              <div className="h-9 w-72 max-w-full animate-pulse rounded-md bg-black/[0.06]" />
              <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-black/[0.04]" />
            </div>
            <div className="h-40 animate-pulse rounded-[16px] border border-[var(--lc-line)] bg-lc-surface" />
          </>
        )}
      </div>
    );
  }

  const turnedInMine =
    mySubmissionStatus === "SUBMITTED" || mySubmissionStatus === "SCORED";
  const late =
    Boolean(assignment.dueAt) &&
    new Date(assignment.dueAt!).getTime() < Date.now() &&
    !turnedInMine;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-[var(--lc-line)] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href="/app/assignments"
            className="inline-flex items-center gap-1 text-sm text-lc-muted transition-colors hover:text-lc-ink"
          >
            <span aria-hidden>‹</span> Back
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
            {assignment.title}
          </h1>
          <p className="mt-2 text-sm text-lc-muted">
            {formatDueLabel(assignment.dueAt)}
            {materials.length > 0
              ? ` · ${materials.length} material${materials.length === 1 ? "" : "s"}`
              : ""}
            {late ? " · Late" : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {toast ? (
            <p className="rounded-[10px] bg-[var(--lc-success-soft)] px-3 py-2 text-sm text-lc-success">
              {toast}
            </p>
          ) : null}
          {role === "student" ? (
            <>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  turnedInMine
                    ? "bg-[var(--lc-success-soft)] text-lc-success"
                    : "bg-black/[0.05] text-lc-muted dark:bg-white/[0.06]",
                )}
              >
                {turnedInMine
                  ? "Turned in"
                  : late
                    ? "Not turned in · late"
                    : "Not turned in"}
              </span>
              <Button
                variant="accent"
                size="md"
                disabled={busy || uploadBusy}
                onClick={() => void submit("SUBMITTED")}
              >
                {busy
                  ? "Turning in…"
                  : late
                    ? "Turn in late"
                    : myReview?.reviewStatus === "NEEDS_REVISION"
                      ? "Turn in again"
                      : turnedInMine
                        ? "Turn in again"
                        : "Turn in"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="md"
                disabled={busy}
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? "Cancel edit" : "Edit"}
              </Button>
              <Button
                variant="secondary"
                size="md"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      const nextStatus =
                        assignment.status === "CLOSED" ? "ACTIVE" : "CLOSED";
                      const res = await fetch(
                        `/api/assignments/${assignmentId}`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: nextStatus }),
                        },
                      );
                      const data = await res.json();
                      if (!res.ok || !data.ok) {
                        throw new Error(data.error ?? "Update failed");
                      }
                      setToast(
                        nextStatus === "CLOSED"
                          ? "Assignment closed"
                          : "Assignment reopened",
                      );
                      window.setTimeout(() => setToast(null), 2200);
                      await load();
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Update failed",
                      );
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                {assignment.status === "CLOSED" ? "Reopen" : "Close"}
              </Button>
              <Button
                variant="secondary"
                size="md"
                disabled={busy}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Delete this assignment and all student submissions? This cannot be undone.",
                    )
                  ) {
                    return;
                  }
                  void (async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      const res = await fetch(
                        `/api/assignments/${assignmentId}`,
                        { method: "DELETE" },
                      );
                      const data = await res.json();
                      if (!res.ok || !data.ok) {
                        throw new Error(data.error ?? "Delete failed");
                      }
                      window.location.assign("/app/assignments");
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Delete failed",
                      );
                      setBusy(false);
                    }
                  })();
                }}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {role === "director" && editing ? (
        <form
          className="space-y-3 rounded-[14px] border border-[var(--lc-line)] bg-lc-surface p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                const res = await fetch(`/api/assignments/${assignmentId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: editTitle,
                    instructions: editInstructions,
                    dueAt: editDueAt ? new Date(editDueAt).toISOString() : null,
                  }),
                });
                const data = await res.json();
                if (!res.ok || !data.ok) {
                  throw new Error(data.error ?? "Save failed");
                }
                setToast("Assignment updated");
                window.setTimeout(() => setToast(null), 2200);
                setEditing(false);
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Save failed");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <p className="text-[15px] font-semibold text-lc-ink">Edit assignment</p>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-lc-muted">Title</span>
            <input
              className={inputClass}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-lc-muted">
              Instructions
            </span>
            <textarea
              className={inputClass}
              rows={4}
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-lc-muted">Due</span>
            <input
              type="datetime-local"
              className={inputClass}
              value={editDueAt}
              onChange={(e) => setEditDueAt(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-lc-danger">{error}</p> : null}
          <Button type="submit" variant="accent" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </form>
      ) : null}

      {role === "director" && stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Submitted"
            value={`${stats.turnedIn}/${stats.studentCount || "—"}`}
          />
          <StatCard
            label="Pending review"
            value={String(stats.pendingReview)}
            tone={stats.pendingReview > 0 ? "warn" : undefined}
          />
          <StatCard
            label="Needs revision"
            value={String(stats.needsRevision)}
            tone={stats.needsRevision > 0 ? "danger" : undefined}
          />
          <StatCard
            label="Approved / done"
            value={String(stats.approved)}
            tone={stats.approved > 0 ? "success" : undefined}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-8",
          role === "student" && "lg:grid-cols-[minmax(0,1fr)_320px]",
        )}
      >
        <div className="min-w-0 space-y-6">
          <section>
            <h2 className="text-[15px] font-semibold text-lc-ink">
              Instructions
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-lc-muted">
              {assignment.instructions ||
                assignment.description ||
                "None"}
            </p>
          </section>

          {materials.length > 0 ? (
            <section>
              <h2 className="text-[15px] font-semibold text-lc-ink">
                Reference materials
              </h2>
              <ul className="mt-3 space-y-2">
                {materials.map((m) => (
                  <li key={m.id}>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-lc-accent hover:underline"
                    >
                      {m.title}
                    </a>
                    <span className="ml-2 text-xs text-lc-muted">{m.kind}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

      {role === "student" &&
      turnedInMine &&
      mySubmissionId ? (
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-lc-ink">Your work</h2>
          <p className="text-sm text-lc-muted">
            Each turn-in is a separate post in your work log. Edit an old post
            with its Edit control; turning in again after feedback creates a new
            post.
          </p>
          <SubmissionFeed
            assignmentId={assignmentId}
            submissionId={mySubmissionId}
            studentName={studentName ?? "You"}
            reviewStatus={myReview?.reviewStatus ?? null}
            refreshKey={feedRefreshKey}
            initialPosts={
              assignment?.submissions.find((s) => s.id === mySubmissionId)
                ?.posts
            }
          />
        </section>
      ) : null}

      {role === "student" && assignment?.rubric?.acceptData ? (
        <CohortDataPanel assignmentId={assignmentId} role="student" />
      ) : null}

      {role === "director" && assignment?.rubric?.acceptData ? (
        <CohortDataPanel assignmentId={assignmentId} role="director" />
      ) : null}
        </div>

      {role === "student" ? (
        <aside className="space-y-5 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5 lg:sticky lg:top-20 lg:self-start">
          <div>
            <h2 className="text-[15px] font-semibold text-lc-ink">My work</h2>
            <p className="mt-1 text-sm text-lc-muted">
              {myReview?.reviewStatus === "NEEDS_REVISION"
                ? "Professor asked for changes — turn in again to add a new post. Older attempts stay in Your work."
                : turnedInMine
                  ? "Update the fields and turn in again to add a new work-log post. Use Edit on a past post to change that attempt only."
                  : "Attach files or links, then turn in from the header."}
            </p>
            {myReview?.reviewStatus ? (
              <div className="mt-3 space-y-1.5">
                <p
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                    reviewBadgeClass(myReview.reviewStatus),
                  )}
                >
                  {reviewLabel(myReview.reviewStatus)}
                </p>
                {myReview.reviewComment ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-lc-ink">
                    {myReview.reviewComment}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {rubric?.requireEvidenceUrl !== false ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-lc-muted">
                Evidence / demo URL
              </span>
              <input
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </label>
          ) : null}

          {rubric?.requireRepoUrl ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-lc-muted">GitHub repo</span>
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/..."
                className={inputClass}
              />
            </label>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-lc-muted">
                GitHub repo (optional)
              </span>
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/..."
                className={inputClass}
              />
            </label>
          )}

          {rubric?.requireWriteup !== false ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-lc-muted">
                Writeup / research notes
              </span>
              <textarea
                value={writeup}
                onChange={(e) => setWriteup(e.target.value)}
                rows={5}
                placeholder="Methods, results, blockers, what you want reviewed..."
                className={inputClass}
              />
            </label>
          ) : null}

          {rubric?.acceptData ? (
            <div className="space-y-3 rounded-[12px] border border-[var(--lc-line)] bg-[#fafafa] p-4">
              <div>
                <p className="text-[13px] font-semibold text-lc-ink">
                  Structured data
                </p>
                <p className="mt-1 text-sm text-lc-muted">
                  Paste CSV (header row + data).{" "}
                  {assignment.dataSchema?.columns?.length
                    ? `Expected columns (validated): ${assignment.dataSchema.columns
                        .map((c) => `${c.name} (${c.type})`)
                        .join(", ")}.`
                    : "No director schema — any CSV columns accepted; types inferred per cell."}
                </p>
              </div>
              <textarea
                value={dataCsv}
                onChange={(e) => setDataCsv(e.target.value)}
                rows={6}
                placeholder={
                  "sample_id,od600,hours\nA1,0.42,24\nA2,0.51,24"
                }
                className={inputClass}
              />
              {dataTable && dataTable.rows.length > 0 ? (
                <div className="overflow-x-auto rounded-[10px] border border-[var(--lc-line)] bg-lc-surface">
                  <p className="border-b border-[var(--lc-line)] px-3 py-2 text-xs text-lc-muted">
                    Saved data · {dataTable.rows.length} row
                    {dataTable.rows.length === 1 ? "" : "s"} ·{" "}
                    {dataTable.cellCount} cells
                    {dataTable.flaggedCellCount
                      ? ` · ${dataTable.flaggedCellCount} flagged`
                      : ""}
                  </p>
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-black/[0.02] text-xs text-lc-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">#</th>
                        {dataTable.columns.map((col) => (
                          <th key={col} className="px-3 py-2 font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataTable.rows.map((row) => (
                        <tr
                          key={row.rowIndex}
                          className={cn(
                            "border-t border-[var(--lc-line)]",
                            row.rowFlagged && "bg-[#fff8f0]",
                          )}
                        >
                          <td className="px-3 py-2 font-mono text-xs text-lc-muted">
                            {row.rowIndex + 1}
                            {row.rowFlagged ? (
                              <span className="ml-1 text-[10px] font-sans font-medium text-[#b45309]">
                                flagged
                              </span>
                            ) : null}
                          </td>
                          {dataTable.columns.map((col) => {
                            const flag = row.flags?.[col];
                            return (
                              <td key={col} className="px-3 py-2 text-lc-ink">
                                <span
                                  className={cn(
                                    flag?.flagged &&
                                      "rounded px-1 font-medium text-[#9a3412] ring-1 ring-[#fdba74]",
                                  )}
                                  title={
                                    flag?.flagged
                                      ? formatFlagReason(flag.flagReason)
                                      : undefined
                                  }
                                >
                                  {row.values[col] ?? "—"}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-lc-muted">
                  No structured data saved yet — paste CSV and save draft or
                  submit.
                </p>
              )}
            </div>
          ) : null}

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-lc-muted">Attachments</p>
              <p className="mt-0.5 text-sm text-lc-muted">
                Upload attack docs, PDFs, notebooks, slides, or add external links.
              </p>
            </div>

            {attachments.length > 0 ? (
              <ul className="space-y-2">
                {attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[var(--lc-line)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-lc-accent hover:underline"
                      >
                        {a.title}
                      </a>
                      <span className="ml-2 text-xs text-lc-muted">
                        {a.kind}
                        {a.size ? ` · ${formatBytes(a.size)}` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      className="text-xs text-lc-muted hover:text-lc-danger"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-lc-muted">No attachments yet.</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer">
                <span className="sr-only">Upload file</span>
                <input
                  type="file"
                  className="hidden"
                  disabled={uploadBusy}
                  onChange={(e) => {
                    void onUpload(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                <span className="inline-flex h-9 items-center rounded-[10px] border border-[var(--lc-line)] bg-white px-3 text-sm text-lc-ink hover:bg-[#fafafa]">
                  {uploadBusy ? "Uploading…" : "Upload file"}
                </span>
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
              <input
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Link title"
                className={inputClass}
              />
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!linkUrl.trim()}
                onClick={addLinkAttachment}
              >
                Add link
              </Button>
            </div>
          </div>

          {checklist.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-lc-muted">Checklist</p>
              {checklist.map((item) => {
                const on = checks.includes(item);
                return (
                  <label
                    key={item}
                    className="flex items-start gap-2 text-sm text-lc-ink"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => {
                        setChecks((prev) =>
                          e.target.checked
                            ? [...prev, item]
                            : prev.filter((x) => x !== item),
                        );
                      }}
                    />
                    {item}
                  </label>
                );
              })}
            </div>
          ) : null}

          {error ? <p className="text-sm text-lc-danger">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={busy || uploadBusy}
              onClick={() => void submit("DRAFT")}
            >
              Save draft
            </Button>
            <label className="inline-flex cursor-pointer">
              <span className="sr-only">Upload file</span>
              <input
                type="file"
                className="hidden"
                disabled={uploadBusy}
                onChange={(e) => {
                  void onUpload(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              <span className="inline-flex h-9 items-center rounded-[10px] border border-[var(--lc-line)] bg-lc-surface px-3 text-sm text-lc-ink hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                {uploadBusy ? "Uploading…" : "Attach"}
              </span>
            </label>
          </div>
        </aside>
      ) : null}
      </div>

      {role === "director" ? (
        <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
          <div className="border-b border-[var(--lc-line)] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-lc-ink">
              Student work
            </h2>
            <p className="mt-0.5 text-sm text-lc-muted">
              Turned-in work appears as posts — react, comment, and set review
              status.
            </p>
          </div>

          {assignment.submissions.length === 0 ? (
            <p className="px-5 py-8 text-sm text-lc-muted">No submissions yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--lc-line)]">
              {assignment.submissions.map((s) => {
                const open = expandedId === s.id;
                const draft = reviewDrafts[s.id] ?? {
                  reviewStatus: (s.reviewStatus ??
                    "PENDING_REVIEW") as NonNullable<ReviewStatus>,
                  reviewComment: s.reviewComment ?? "",
                };
                const turnedIn =
                  s.status === "SUBMITTED" || s.status === "SCORED";
                return (
                  <li key={s.id} className="px-5 py-4">
                    <button
                      type="button"
                      className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                      onClick={() =>
                        setExpandedId((id) => (id === s.id ? null : s.id))
                      }
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-lc-ink">
                          {s.studentName}
                        </p>
                        <p className="mt-0.5 text-xs text-lc-muted">
                          {s.submittedAt
                            ? `Submitted ${new Date(s.submittedAt).toLocaleString()}`
                            : s.status === "DRAFT"
                              ? "Draft only"
                              : "Not submitted"}
                          {s.attachments?.length
                            ? ` · ${s.attachments.length} attachment${s.attachments.length === 1 ? "" : "s"}`
                            : ""}
                          {s.score != null ? ` · score ${s.score}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[11px] font-medium",
                            reviewBadgeClass(s.reviewStatus),
                          )}
                        >
                          {turnedIn
                            ? reviewLabel(s.reviewStatus)
                            : s.status}
                        </span>
                        <span className="text-xs text-lc-muted">
                          {open ? "Hide" : "Review"}
                        </span>
                      </div>
                    </button>

                    {open ? (
                      <div className="mt-4 space-y-4 border-t border-[var(--lc-line)] pt-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field
                            label="Evidence URL"
                            value={s.evidenceUrl}
                            link
                          />
                          <Field label="Repo URL" value={s.repoUrl} link />
                        </div>

                        {s.writeup ? (
                          <div>
                            <p className="text-xs font-medium text-lc-muted">
                              Writeup
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-lc-ink">
                              {s.writeup}
                            </p>
                          </div>
                        ) : null}

                        {s.dataTable && s.dataTable.rows.length > 0 ? (
                          <div className="overflow-x-auto rounded-[10px] border border-[var(--lc-line)]">
                            <p className="border-b border-[var(--lc-line)] px-3 py-2 text-xs font-medium text-lc-muted">
                              Structured data · {s.dataTable.rows.length} rows
                              {s.dataTable.flaggedCellCount
                                ? ` · ${s.dataTable.flaggedCellCount} flagged`
                                : ""}
                            </p>
                            <table className="min-w-full text-left text-sm">
                              <thead className="bg-black/[0.02] text-xs text-lc-muted">
                                <tr>
                                  <th className="px-3 py-2 font-medium">#</th>
                                  {s.dataTable.columns.map((col) => (
                                    <th key={col} className="px-3 py-2 font-medium">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {s.dataTable.rows.map((row) => (
                                  <tr
                                    key={row.rowIndex}
                                    className={cn(
                                      "border-t border-[var(--lc-line)]",
                                      row.rowFlagged && "bg-[#fff8f0]",
                                    )}
                                  >
                                    <td className="px-3 py-2 font-mono text-xs text-lc-muted">
                                      {row.rowIndex + 1}
                                      {row.rowFlagged ? (
                                        <span className="ml-1 text-[10px] font-sans font-medium text-[#b45309]">
                                          flagged
                                        </span>
                                      ) : null}
                                    </td>
                                    {s.dataTable!.columns.map((col) => {
                                      const flag = row.flags?.[col];
                                      return (
                                        <td key={col} className="px-3 py-2">
                                          <span
                                            className={cn(
                                              flag?.flagged &&
                                                "rounded px-1 font-medium text-[#9a3412] ring-1 ring-[#fdba74]",
                                            )}
                                            title={
                                              flag?.flagged
                                                ? formatFlagReason(flag.flagReason)
                                                : undefined
                                            }
                                          >
                                            {row.values[col] ?? "—"}
                                          </span>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}

                        {s.attachments?.length ? (
                          <div>
                            <p className="text-xs font-medium text-lc-muted">
                              Attachments
                            </p>
                            <ul className="mt-2 space-y-1.5">
                              {s.attachments.map((a) => (
                                <li key={a.id}>
                                  <a
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-lc-accent hover:underline"
                                  >
                                    {a.title}
                                  </a>
                                  <span className="ml-2 text-xs text-lc-muted">
                                    {a.kind}
                                    {a.size ? ` · ${formatBytes(a.size)}` : ""}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-sm text-lc-muted">
                            No attachments on this submission.
                          </p>
                        )}

                        {turnedIn ? (
                          <div className="space-y-4">
                            <SubmissionFeed
                              assignmentId={assignmentId}
                              submissionId={s.id}
                              studentName={s.studentName}
                              reviewStatus={s.reviewStatus}
                              refreshKey={feedRefreshKey}
                              initialPosts={s.posts}
                            />
                            <div className="space-y-3 rounded-[12px] border border-[var(--lc-line)] bg-black/[0.02] p-4 dark:bg-white/[0.03]">
                            <p className="text-[13px] font-semibold text-lc-ink">
                              Review status
                            </p>
                            <label className="block space-y-1.5">
                              <span className="text-xs font-medium text-lc-muted">
                                Status
                              </span>
                              <select
                                className={inputClass}
                                value={draft.reviewStatus}
                                onChange={(e) =>
                                  setReviewDrafts((prev) => ({
                                    ...prev,
                                    [s.id]: {
                                      ...draft,
                                      reviewStatus: e.target
                                        .value as NonNullable<ReviewStatus>,
                                    },
                                  }))
                                }
                              >
                                {REVIEW_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block space-y-1.5">
                              <span className="text-xs font-medium text-lc-muted">
                                Formal review note (also in Approvals trail)
                              </span>
                              <textarea
                                rows={3}
                                className={inputClass}
                                placeholder="Optional formal note…"
                                value={draft.reviewComment}
                                onChange={(e) =>
                                  setReviewDrafts((prev) => ({
                                    ...prev,
                                    [s.id]: {
                                      ...draft,
                                      reviewComment: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </label>
                            {s.reviewedAt ? (
                              <p className="text-xs text-lc-muted">
                                Last reviewed{" "}
                                {new Date(s.reviewedAt).toLocaleString()}
                              </p>
                            ) : null}
                            <Button
                              variant="primary"
                              disabled={reviewBusyId === s.id}
                              onClick={() => void saveReview(s.id)}
                            >
                              {reviewBusyId === s.id
                                ? "Saving…"
                                : "Save review"}
                            </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-lc-muted">
                            Student has not turned in yet — review unlocks after
                            turn-in.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {error ? (
            <p className="border-t border-[var(--lc-line)] px-5 py-3 text-sm text-lc-danger">
              {error}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn" | "danger" | "success";
}) {
  return (
    <div className="rounded-[14px] border border-[var(--lc-line)] bg-lc-surface px-4 py-3">
      <p className="text-xs text-lc-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight",
          tone === "warn" && "text-lc-warn",
          tone === "danger" && "text-lc-danger",
          tone === "success" && "text-lc-success",
          !tone && "text-lc-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  link,
}: {
  label: string;
  value: string | null;
  link?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-lc-muted">{label}</p>
      {value ? (
        link ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all text-sm text-lc-accent hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="mt-1 text-sm text-lc-ink">{value}</p>
        )
      ) : (
        <p className="mt-1 text-sm text-lc-muted">—</p>
      )}
    </div>
  );
}
