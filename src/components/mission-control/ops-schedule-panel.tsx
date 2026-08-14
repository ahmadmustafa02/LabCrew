"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Schedule = {
  enabled: boolean;
  dayOfWeek: number;
  dayLabel: string;
  hourLocal: number;
  timezone: string;
  lastEnqueuedAt: string | null;
};

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function OpsSchedulePanel() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/ops/schedule");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed");
      setSchedule(data.schedule);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load schedule");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(next: Partial<Schedule> & { enabled?: boolean }) {
    if (!schedule) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ops/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: next.enabled ?? schedule.enabled,
          dayOfWeek: next.dayOfWeek ?? schedule.dayOfWeek,
          hourLocal: next.hourLocal ?? schedule.hourLocal,
          timezone: next.timezone ?? schedule.timezone,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      setSchedule(data.schedule);
      setToast("Schedule saved");
      window.setTimeout(() => setToast(null), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!schedule) {
    return (
      <div className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5">
        <p className="text-sm text-lc-muted">Loading schedule…</p>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-lc-ink">
            Auto weekly ops
          </h2>
          <p className="mt-0.5 text-xs text-lc-muted">
            Worker checks every minute. Keep <code>npm run worker</code> running.
          </p>
        </div>
        {toast ? (
          <p className="text-sm text-lc-success">{toast}</p>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-sm text-lc-danger">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={schedule.enabled}
            disabled={busy}
            onChange={(e) => void save({ enabled: e.target.checked })}
          />
          Enabled
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-lc-muted">Day</span>
          <select
            className="lc-input w-auto min-w-[140px]"
            value={schedule.dayOfWeek}
            disabled={busy}
            onChange={(e) =>
              void save({ dayOfWeek: Number(e.target.value) })
            }
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-lc-muted">Hour (local)</span>
          <select
            className="lc-input w-auto min-w-[100px]"
            value={schedule.hourLocal}
            disabled={busy}
            onChange={(e) =>
              void save({ hourLocal: Number(e.target.value) })
            }
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[180px] flex-1 text-sm">
          <span className="mb-1 block text-xs text-lc-muted">Timezone</span>
          <input
            className="lc-input"
            value={schedule.timezone}
            disabled={busy}
            onChange={(e) =>
              setSchedule({ ...schedule, timezone: e.target.value })
            }
            onBlur={() => void save({ timezone: schedule.timezone })}
            placeholder="Asia/Karachi"
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void save({})}
        >
          Save
        </Button>
      </div>
      <p className="mt-3 text-xs text-lc-muted">
        Runs {DAYS[schedule.dayOfWeek]} at {String(schedule.hourLocal).padStart(2, "0")}:00 ({schedule.timezone}).
        {schedule.lastEnqueuedAt
          ? ` Last auto-run: ${new Date(schedule.lastEnqueuedAt).toLocaleString()}.`
          : " No auto-run yet."}
      </p>
    </div>
  );
}
