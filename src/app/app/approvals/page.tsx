import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Approvals",
};

const DRAFTS = [
  {
    name: "Ayesha Rahman",
    preview:
      "You’ve been quiet for 6 days on the Week 4 demo. The smallest next step is a 3-minute status note — even if the demo isn’t ready.",
  },
  {
    name: "Daniel Okonkwo",
    preview:
      "Your demo link is in — thanks. The writeup is still short of the rubric’s “methods + result” section. Want a 5-bullet template?",
  },
  {
    name: "Mei Chen",
    preview:
      "We couldn’t open your demo URL from the lab network. Can you repost a public link or a 30-second screen recording?",
  },
];

export default function ApprovalsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-lc-muted">Approvals</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
          Director board
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
          Coach drafts wait here. Nothing is sent until you approve. Full edit
          flow lands in Phase 3.
        </p>
      </div>

      <div className="space-y-3">
        {DRAFTS.map((draft) => (
          <article
            key={draft.name}
            className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold text-lc-ink">{draft.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-lc-muted">
                  {draft.preview}
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
