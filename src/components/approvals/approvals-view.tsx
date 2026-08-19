"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { SoftReveal } from "@/components/ui/soft-reveal";
import { cn } from "@/lib/cn";

type Approval = {
  id: string;
  title: string;
  body: string;
  targetName: string | null;
  status?: string;
  deliveryStatus?: string | null;
  deliveryChannel?: string | null;
  deliveryError?: string | null;
  deliveredAt?: string | null;
};

export function ApprovalsView() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  /** live = API ok; unavailable = load failed (must not look like empty inbox) */
  const [source, setSource] = useState<"live" | "unavailable" | "loading">(
    "loading",
  );
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
        setError(null);
        return;
      }
      setApprovals([]);
      setSource("unavailable");
      setError(data.error ?? "Could not load approvals");
    } catch {
      setApprovals([]);
      setSource("unavailable");
      setError("Could not load approvals — check your connection and try again");
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
    if (source !== "live") {
      showToast("Approvals still loading — try again in a moment.");
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
      } else if (action === "approve") {
        const d = data.delivery as
          | {
              ok?: boolean;
              status?: string;
              channel?: string | null;
              error?: string | null;
              to?: string;
            }
          | null
          | undefined;
        setApprovals((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: data.approval.status,
                  body: data.approval.body,
                  deliveryStatus: d?.status ?? data.approval.deliveryStatus,
                  deliveryChannel: d?.channel ?? data.approval.deliveryChannel,
                  deliveryError: d?.error ?? data.approval.deliveryError,
                  deliveredAt: data.approval.deliveredAt,
                }
              : item,
          ),
        );
        setEditingId(null);
        if (d?.status === "sent") {
          showToast(`Emailed${d.to ? ` ${d.to}` : ""} via SMTP`);
        } else if (d?.status === "console") {
          showToast("Logged to console (no SMTP / SMTP failed over)");
        } else if (d?.status === "failed") {
          showToast(d.error ?? "Delivery failed");
        } else {
          showToast("Approved");
        }
      } else {
        setApprovals((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: "REJECTED" } : item,
          ),
        );
        setEditingId(null);
        showToast("Rejected — draft dismissed");
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
            {source === "live" ? " Live pending items from Postgres." : ""}
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

      <SoftReveal
        ready={source !== "loading"}
        skeleton={<CardListSkeleton count={3} />}
      >
      {source === "unavailable" ? (
        <div
          role="alert"
          className="rounded-[16px] border border-[var(--lc-danger)]/30 bg-[var(--lc-danger-soft)] px-5 py-10 text-sm text-lc-danger"
        >
          <p className="font-medium">Approvals unavailable</p>
          <p className="mt-2 opacity-90">
            Could not load pending drafts. This is not an empty inbox — refresh
            or check the API / database connection.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSource("loading");
              void load();
            }}
          >
            Retry
          </Button>
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
            const pending =
              !draft.status || draft.status === "PENDING" || draft.id.startsWith("demo-");
            const deliveryLabel =
              draft.deliveryStatus === "sent"
                ? `Sent via ${draft.deliveryChannel ?? "SMTP"}`
                : draft.deliveryStatus === "console"
                  ? "Logged to console"
                  : draft.deliveryStatus === "failed"
                    ? `Delivery failed${draft.deliveryError ? `: ${draft.deliveryError}` : ""}`
                    : draft.status === "REJECTED"
                      ? "Rejected"
                      : null;
            return (
              <article
                key={draft.id}
                className={cn(
                  "rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5",
                  !pending && "opacity-80",
                )}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-2xl flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-lc-ink">
                          {draft.targetName ?? draft.title}
                        </p>
                        {deliveryLabel ? (
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[11px] font-medium",
                              draft.deliveryStatus === "sent" &&
                                "bg-[var(--lc-success-soft)] text-lc-success",
                              draft.deliveryStatus === "console" &&
                                "bg-[var(--lc-warn-soft)] text-lc-warn",
                              draft.deliveryStatus === "failed" &&
                                "bg-[var(--lc-danger-soft)] text-lc-danger",
                              draft.status === "REJECTED" &&
                                "bg-black/[0.04] text-lc-muted",
                            )}
                          >
                            {deliveryLabel}
                          </span>
                        ) : null}
                      </div>
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
                      {pending ? (
                        editing ? (
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
                      )
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      </SoftReveal>

      <Link href="/app/brief">
        <Button variant="ghost" size="sm">
          ← Back to Monday Brief
        </Button>
      </Link>
    </div>
  );
}
