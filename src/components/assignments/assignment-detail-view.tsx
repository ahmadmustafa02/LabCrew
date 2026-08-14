"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session/session-provider";
import type { AssignmentRubric, MaterialItem } from "@/lib/assignment-types";
import { cn } from "@/lib/cn";

const inputClass =
  "w-full rounded-[12px] border border-[var(--lc-line-strong)] bg-lc-bg px-3.5 py-2.5 text-sm text-lc-ink outline-none focus:border-lc-accent";

type AssignmentDetail = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  materials: MaterialItem[] | null;
  rubric: AssignmentRubric | null;
  dueAt: string | null;
  status: string;
  submissions: Array<{
    id: string;
    memberId: string;
    studentName: string;
    status: string;
    evidenceUrl: string | null;
    repoUrl: string | null;
    writeup: string | null;
    submittedAt: string | null;
  }>;
};

export function AssignmentDetailView({ assignmentId }: { assignmentId: string }) {
  const { role, studentMemberId, studentName } = useSession();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [writeup, setWriteup] = useState("");
  const [checks, setChecks] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
      const res = await fetch(
        `/api/assignments/${assignmentId}/submit?memberId=${studentMemberId}`,
      );
      const data = await res.json();
      if (cancelled || !data.ok || !data.submission) return;
      setEvidenceUrl(data.submission.evidenceUrl ?? "");
      setRepoUrl(data.submission.repoUrl ?? "");
      setWriteup(data.submission.writeup ?? "");
      setChecks(
        Array.isArray(data.submission.checklist)
          ? (data.submission.checklist as string[])
          : [],
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [role, studentMemberId, assignment, assignmentId]);

  const rubric = assignment?.rubric;
  const materials = useMemo(
    () => (Array.isArray(assignment?.materials) ? assignment!.materials! : []),
    [assignment],
  );
  const checklist = rubric?.checklist ?? [];

  async function submit(status: "DRAFT" | "SUBMITTED") {
    if (!studentMemberId) {
      setError("Pick a student identity in the header first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: studentMemberId,
          evidenceUrl,
          repoUrl,
          writeup,
          checklist: checks,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Submit failed");
      setToast(status === "SUBMITTED" ? "Submitted to LabCrew" : "Draft saved");
      window.setTimeout(() => setToast(null), 2500);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  if (!assignment) {
    return (
      <p className="text-sm text-lc-muted">{error ?? "Loading assignment…"}</p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/app/assignments"
            className="text-sm text-lc-muted hover:text-lc-ink"
          >
            Assignments
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
            {assignment.title}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-lc-muted">
            {assignment.instructions ||
              assignment.description ||
              "No instructions yet."}
          </p>
          <p className="mt-2 text-xs text-lc-muted">
            {assignment.dueAt
              ? `Due ${new Date(assignment.dueAt).toLocaleString()}`
              : "No due date"}{" "}
            · {assignment.status}
          </p>
        </div>
        {toast ? (
          <p className="rounded-[10px] bg-[var(--lc-success-soft)] px-3 py-2 text-sm text-lc-success">
            {toast}
          </p>
        ) : null}
      </div>

      {materials.length > 0 ? (
        <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
          <h2 className="text-[15px] font-semibold text-lc-ink">Materials</h2>
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

      {role === "student" ? (
        <section className="space-y-4 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
          <div>
            <h2 className="text-[15px] font-semibold text-lc-ink">Your submission</h2>
            <p className="mt-1 text-sm text-lc-muted">
              Submitting as {studentName ?? "student"}. Weekly ops will score this
              against the rubric.
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
          ) : null}
          {rubric?.requireWriteup !== false ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-lc-muted">
                Writeup / research notes
              </span>
              <textarea
                value={writeup}
                onChange={(e) => setWriteup(e.target.value)}
                rows={5}
                placeholder="Methods, results, blockers..."
                className={inputClass}
              />
            </label>
          ) : null}
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
              disabled={busy}
              onClick={() => void submit("DRAFT")}
            >
              Save draft
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => void submit("SUBMITTED")}
            >
              {busy ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
          <div className="border-b border-[var(--lc-line)] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-lc-ink">
              Student submissions
            </h2>
            <p className="mt-0.5 text-xs text-lc-muted">
              Switch to Student in the header to submit as a cohort member.
            </p>
          </div>
          {assignment.submissions.length === 0 ? (
            <p className="px-5 py-8 text-sm text-lc-muted">No submissions yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--lc-line)]">
              {assignment.submissions.map((s) => (
                <li key={s.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-lc-ink">
                      {s.studentName}
                    </p>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-medium",
                        s.status === "SUBMITTED" || s.status === "SCORED"
                          ? "bg-[var(--lc-success-soft)] text-lc-success"
                          : "bg-black/[0.04] text-lc-muted",
                      )}
                    >
                      {s.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-lc-muted">
                    {s.evidenceUrl || s.repoUrl || "No links"}
                  </p>
                  {s.writeup ? (
                    <p className="mt-1 line-clamp-2 text-sm text-lc-muted">
                      {s.writeup}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
