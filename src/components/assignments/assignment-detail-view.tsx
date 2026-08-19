"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session/session-provider";
import type { AssignmentDataSchema, AssignmentRubric, MaterialItem } from "@/lib/assignment-types";
import { cn } from "@/lib/cn";
import { CohortDataPanel } from "@/components/assignments/cohort-data-panel";

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

  const load = useCallback(async () => {
    const res = await fetch(`/api/assignments/${assignmentId}`);
    const data = await res.json();
    if (!data.ok) {
      setError(data.error ?? "Failed to load");
      return;
    }
    setAssignment(data.assignment);
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
        (status === "SUBMITTED" ? "Submitted for review" : "Draft saved") + warn,
      );      window.setTimeout(() => setToast(null), 2500);
      if (status === "SUBMITTED") {
        setMyReview({ reviewStatus: "PENDING_REVIEW", reviewComment: null });
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href="/app/assignments"
            className="text-sm text-lc-muted transition-colors duration-200 hover:text-lc-ink"
          >
            ← Assignments
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
            {assignment.title}
          </h1>
          <p className="mt-2 max-w-2xl whitespace-pre-wrap text-[15px] leading-relaxed text-lc-muted">
            {assignment.instructions ||
              assignment.description ||
              "No instructions yet."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-lc-muted">
            <span>
              {assignment.dueAt
                ? `Due ${new Date(assignment.dueAt).toLocaleString()}`
                : "No due date"}
            </span>
            <span>·</span>
            <span className="uppercase tracking-wide">{assignment.status}</span>
            {materials.length > 0 ? (
              <>
                <span>·</span>
                <span>
                  {materials.length} material{materials.length === 1 ? "" : "s"}
                </span>
              </>
            ) : null}
          </div>
        </div>
        {toast ? (
          <p className="shrink-0 rounded-[10px] bg-[var(--lc-success-soft)] px-3 py-2 text-sm text-lc-success">
            {toast}
          </p>
        ) : null}
      </div>

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

      {role === "student" && myReview?.reviewStatus ? (
        <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-lc-ink">Review status</h2>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-medium",
                reviewBadgeClass(myReview.reviewStatus),
              )}
            >
              {reviewLabel(myReview.reviewStatus)}
            </span>
          </div>
          {myReview.reviewComment ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-lc-ink">
              {myReview.reviewComment}
            </p>
          ) : (
            <p className="mt-2 text-sm text-lc-muted">
              No professor comment yet.
            </p>
          )}
        </section>
      ) : null}

      {materials.length > 0 ? (
        <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
          <h2 className="text-[15px] font-semibold text-lc-ink">Materials</h2>
          <p className="mt-1 text-sm text-lc-muted">
            Reference docs and links from your professor.
          </p>
          <ul className="mt-3 space-y-2">
            {materials.map((m) => (
              <li key={m.id}>
                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-lc-accent hover:underline"
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
      assignment.coachResources?.status === "found" &&
      (assignment.coachResources.items?.length ?? 0) > 0 ? (
        <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
          <h2 className="text-[15px] font-semibold text-lc-ink">
            Suggested reading
          </h2>
          <p className="mt-1 text-sm text-lc-muted">
            Director-approved papers for this assignment — open one when you need
            a foothold, not as homework for its own sake.
          </p>
          <ul className="mt-3 space-y-3">
            {assignment.coachResources.items.map((item) => (
              <li
                key={item.url}
                className="rounded-[10px] border border-[var(--lc-line)] px-3 py-2.5"
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-lc-ink underline-offset-2 hover:underline"
                >
                  {item.title}
                </a>
                <p className="mt-0.5 text-xs text-lc-muted">
                  {[item.venue, item.year].filter(Boolean).join(" · ")}
                </p>
                {item.rationale ? (
                  <p className="mt-1 text-xs leading-relaxed text-lc-muted">
                    {item.rationale}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {role === "student" ? (
        <section className="space-y-5 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
          <div>
            <h2 className="text-[15px] font-semibold text-lc-ink">Your submission</h2>
            <p className="mt-1 text-sm text-lc-muted">
              Submitting as {studentName ?? "student"}. Attach evidence files,
              links, and notes — then submit for review.
            </p>
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
            <Button
              variant="primary"
              disabled={busy || uploadBusy}
              onClick={() => void submit("SUBMITTED")}
            >
              {busy ? "Submitting…" : "Submit for review"}
            </Button>
          </div>
        </section>
      ) : null}

      {role === "student" && assignment?.rubric?.acceptData ? (
        <CohortDataPanel assignmentId={assignmentId} role="student" />
      ) : null}

      {role === "director" && assignment?.rubric?.acceptData ? (
        <CohortDataPanel assignmentId={assignmentId} role="director" />
      ) : null}

      {role === "director" ? (
        <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
          <div className="border-b border-[var(--lc-line)] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-lc-ink">
              Student submissions
            </h2>
            <p className="mt-0.5 text-sm text-lc-muted">
              Open a submission to review work, leave comments, and set status
              (pending → needs revision → approved → done).
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
                          <div className="space-y-3 rounded-[12px] border border-[var(--lc-line)] bg-[#fafafa] p-4">
                            <p className="text-[13px] font-semibold text-lc-ink">
                              Professor review
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
                                Comments for student
                              </span>
                              <textarea
                                rows={4}
                                className={inputClass}
                                placeholder="What looks good, what to fix, next steps..."
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
                        ) : (
                          <p className="text-sm text-lc-muted">
                            Student has not submitted yet — review unlocks after
                            submit.
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
