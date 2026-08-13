"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Approval = {
  id: string;
  title: string;
  body: string;
  targetName: string | null;
};

const FALLBACK: Approval[] = [
  {
    id: "demo-1",
    title: "Nudge · Ayesha Rahman",
    targetName: "Ayesha Rahman",
    body: "You’ve been quiet on the Week 4 demo. The smallest next step is a 3-minute status note — even if the demo isn’t ready.",
  },
  {
    id: "demo-2",
    title: "Nudge · Daniel Okonkwo",
    targetName: "Daniel Okonkwo",
    body: "Your demo link is in — thanks. The writeup is still short of the rubric’s methods + result section.",
  },
  {
    id: "demo-3",
    title: "Nudge · Mei Chen",
    targetName: "Mei Chen",
    body: "We couldn’t open your demo URL. Can you repost a public link or a short screen recording?",
  },
];

export function ApprovalsView() {
  const [approvals, setApprovals] = useState<Approval[]>(FALLBACK);
  const [source, setSource] = useState<"live" | "demo">("demo");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ops/approvals");
        const data = await res.json();
        if (!cancelled && data.ok && data.approvals?.length) {
          setApprovals(data.approvals);
          setSource("live");
        }
      } catch {
        // keep demo drafts
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-lc-muted">Approvals</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
          Director board
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
          Coach drafts wait here. Nothing is sent until you approve.
          {source === "live"
            ? " Showing live pending items from the latest crew run."
            : " Showing demo drafts until a live run creates approvals."}{" "}
          Edit/approve actions land in Phase 3.
        </p>
      </div>

      <div className="space-y-3">
        {approvals.map((draft) => (
          <article
            key={draft.id}
            className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-lc-ink">
                  {draft.targetName ?? draft.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-lc-muted">
                  {draft.body}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" size="sm" disabled>
                  Edit
                </Button>
                <Button variant="primary" size="sm" disabled>
                  Approve
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Link href="/app/mission-control">
        <Button variant="ghost" size="sm">
          Back to Mission Control
        </Button>
      </Link>
    </div>
  );
}
