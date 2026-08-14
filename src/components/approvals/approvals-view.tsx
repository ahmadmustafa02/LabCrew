"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Approval = {
  id: string;
  title: string;
  body: string;
  targetName: string | null;
  status?: string;
};

const FALLBACK: Approval[] = [
  {
    id: "demo-1",
    title: "Nudge - Ayesha Rahman",
    targetName: "Ayesha Rahman",
    body: "You've been quiet on the Week 4 demo. The smallest next step is a 3-minute status note - even if the demo isn't ready.",
  },
  {
    id: "demo-2",
    title: "Nudge - Daniel Okonkwo",
    targetName: "Daniel Okonkwo",
    body: "Your demo link is in - thanks. The writeup is still short of the rubric's methods + result section.",
  },
  {
    id: "demo-3",
    title: "Nudge - Mei Chen",
    targetName: "Mei Chen",
    body: "We couldn't open your demo URL. Can you repost a public link or a short screen recording?",
  },
];

export function ApprovalsView() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [source, setSource] = useState<"live" | "demo" | "loading">("loading");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/approvals");
      const data = await res.json();
      if (data.ok) {
        setApprovals(data.approvals ?? []);
        setSource("live");
        return;
      }
      setApprovals(FALLBACK);
      setSource("demo");
    } catch {
      setApprovals(FALLBACK);
      setSource("demo");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }

  async function decide(
    id: string,
    action: "approve" | "reject" | "save",
    body?: string,
  ) {
    if (source !== "live" || id.startsWith("demo-")) {
      showToast("Demo mode - start a live weekly ops run to decide for real.");
      return;
    }

    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/ops/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, body }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Update failed");
      }

      if (action === "save") {
        setApprovals((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, body: data.approval.body } : item,
          ),
        );
        setEditingId(null);
        showToast("Draft saved");
      } else {
        setApprovals((prev) => prev.filter((item) => item.id !== id));
        setEditingId(null);
        showToast(
          action === "approve"
            ? "Approved - nudge marked sent (simulated)"
            : "Rejected - draft dismissed",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-lc-muted">Approvals</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
            Director board
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
            Coach drafts wait here. Nothing leaves until you approve.
            {source === "live"
              ? " Live pending items from Postgres."
              : source === "demo"
                ? " Demo drafts until a live run creates approvals."
                : ""}
          </p>
          {error ? (
            <p className="mt-2 text-sm text-lc-danger">{error}</p>
          ) : null}
        </div>
        {toast ? (
          <p className="rounded-[10px] bg-[var(--lc-success-soft)] px-3 py-2 text-sm text-lc-success">
            {toast}
          </p>
        ) : null}
      </div>

      {source === "loading" ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[120px] animate-pulse rounded-[16px] border border-[var(--lc-line)] bg-lc-surface"
            />
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <div className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-10 text-sm text-lc-muted">
          No pending drafts. Run weekly ops from Mission Control when the cohort
          needs attention.
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((draft) => {
            const editing = editingId === draft.id;
            const busy = busyId === draft.id;
            return (
              <article
                key={draft.id}
                className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5 transition-[opacity,transform] duration-200"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-2xl flex-1">
                      <p className="text-sm font-semibold text-lc-ink">
                        {draft.targetName ?? draft.title}
                      </p>
                      {editing ? (
                        <textarea
                          value={draftBody}
                          onChange={(e) => setDraftBody(e.target.value)}
                          rows={4}
                          className="lc-input mt-3 min-h-[96px] py-2.5"
                        />
                      ) : (
                        <p className="mt-2 text-sm leading-relaxed text-lc-muted">
                          {draft.body}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {editing ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busy}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busy || draftBody.trim().length < 8}
                            onClick={() => void decide(draft.id, "save", draftBody)}
                          >
                            Save
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={busy || draftBody.trim().length < 8}
                            onClick={() =>
                              void decide(draft.id, "approve", draftBody)
                            }
                          >
                            Approve
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busy}
                            onClick={() => {
                              setEditingId(draft.id);
                              setDraftBody(draft.body);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            className={cn("text-lc-danger hover:bg-[var(--lc-danger-soft)]")}
                            onClick={() => void decide(draft.id, "reject")}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={busy}
                            onClick={() => void decide(draft.id, "approve")}
                          >
                            Approve
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Link href="/app/brief">
        <Button variant="ghost" size="sm">
          ← Back to Monday Brief
        </Button>
      </Link>
    </div>
  );
}
