import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
};

const ROWS = [
  { label: "Submission rate", value: "75%", note: "9 of 12 on Week 4" },
  { label: "At-risk students", value: "3", note: "silence or weak evidence" },
  { label: "Nudge → resubmit", value: "—", note: "tracks after Phase 3 sends" },
  { label: "Median time-to-feedback", value: "—", note: "mentor loop metric" },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-lc-muted">Analytics</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
          Cohort health
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
          DataForge-shaped loop: collect signals, visualize exceptions, later
          analyze whether interventions worked.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ROWS.map((row) => (
          <div
            key={row.label}
            className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5"
          >
            <p className="text-xs text-lc-muted">{row.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-lc-ink">
              {row.value}
            </p>
            <p className="mt-2 text-sm text-lc-muted">{row.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
