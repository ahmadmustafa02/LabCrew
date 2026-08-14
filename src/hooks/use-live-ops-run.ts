"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MOCK_EXCEPTIONS,
  MOCK_RUN,
  MOCK_STATS,
  type MockStep,
  type StepStatus,
} from "@/lib/mock-data";
import { useOpsRunReplay } from "@/hooks/use-ops-run-replay";

type LiveException = {
  name: string;
  reason: string;
  severity: string;
};

type LiveMode = "live" | "demo";

type RunStats = {
  onTrack: number;
  students: number;
  exceptions: number;
  draftNudges: number;
};

function mapAgentLabel(agent: string) {
  const key = agent.toLowerCase();
  if (key === "dispatcher") return "Dispatcher";
  if (key === "pulse") return "Pulse";
  if (key === "referee") return "Referee";
  if (key === "coach") return "Coach";
  if (key === "clerk") return "Clerk";
  return agent;
}

function normalizeStatus(status: string): StepStatus {
  const s = status.toLowerCase();
  if (s === "succeeded" || s === "running" || s === "failed" || s === "pending") {
    return s;
  }
  if (s === "queued") return "pending";
  return "pending";
}

function durationHint(startedAt?: string | Date | null, finishedAt?: string | Date | null) {
  if (!startedAt || !finishedAt) return "—";
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const sec = Math.max(1, Math.round(ms / 1000));
  return `${sec}s`;
}

export function useLiveOpsRun() {
  const demo = useOpsRunReplay();
  const [mode, setMode] = useState<LiveMode>("demo");
  const [programId, setProgramId] = useState<string | null>(null);
  const [programLabel, setProgramLabel] = useState(MOCK_RUN.label);
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveRunId, setLiveRunId] = useState(MOCK_RUN.id);
  const [liveBadge, setLiveBadge] = useState<"idle" | "running" | "succeeded">(
    "idle",
  );
  const [liveSteps, setLiveSteps] = useState<MockStep[]>(
    MOCK_RUN.steps.map((s) => ({ ...s, status: "pending" as const })),
  );
  const [liveExceptions, setLiveExceptions] =
    useState<LiveException[]>(MOCK_EXCEPTIONS);
  const [showExceptions, setShowExceptions] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [lastRunDuration, setLastRunDuration] = useState("—");
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const applyLivePayload = useCallback(
    (run: {
      id: string;
      status: string;
      steps: Array<{
        id: string;
        agent: string;
        title: string;
        detail: string | null;
        status: string;
        startedAt?: string | null;
      }>;
      exceptions: LiveException[];
      briefing: string | null;
      stats?: RunStats;
      startedAt?: string | Date | null;
      finishedAt?: string | Date | null;
    }) => {
      setLiveRunId(run.id);
      const status = run.status.toUpperCase();
      if (status === "RUNNING" || status === "QUEUED") {
        setLiveBadge("running");
        setLiveBusy(true);
        setShowExceptions(run.exceptions.length > 0);
      } else if (status === "SUCCEEDED") {
        setLiveBadge("succeeded");
        setLiveBusy(false);
        setShowExceptions(true);
        setLastRunDuration(durationHint(run.startedAt, run.finishedAt));
        stopPoll();
      } else if (status === "FAILED") {
        setLiveBadge("idle");
        setLiveBusy(false);
        stopPoll();
      }

      const steps: MockStep[] =
        run.steps.length > 0
          ? run.steps.map((step, index) => ({
              id: step.id,
              agent: mapAgentLabel(step.agent) as MockStep["agent"],
              title: step.title,
              detail: step.detail ?? "",
              status: normalizeStatus(step.status),
              at: `21:04:${String(index * 8).padStart(2, "0")}`,
            }))
          : MOCK_RUN.steps.map((s) => ({ ...s, status: "pending" as const }));

      setLiveSteps(steps);
      if (run.exceptions.length) setLiveExceptions(run.exceptions);
      if (run.briefing) setBriefing(run.briefing);
      if (run.stats) setStats(run.stats);
    },
    [stopPoll],
  );

  const pollRun = useCallback(
    (runId: string) => {
      stopPoll();
      pollRef.current = window.setInterval(async () => {
        try {
          const res = await fetch(`/api/ops/runs/${runId}`);
          const data = await res.json();
          if (data.ok) applyLivePayload(data.run);
        } catch {
          // keep polling briefly
        }
      }, 700);
    },
    [applyLivePayload, stopPoll],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/demo/program");
        const data = await res.json();
        if (cancelled || !data.ok) {
          if (!cancelled) setHydrated(true);
          return;
        }

        setProgramId(data.program.id);
        setProgramLabel(data.program.name);
        setMode("live");

        const latestRes = await fetch(
          `/api/ops/runs?latest=1&programId=${encodeURIComponent(data.program.id)}`,
        );
        const latest = await latestRes.json();
        if (cancelled) return;

        if (latest.ok && latest.run) {
          applyLivePayload(latest.run);
          const status = String(latest.run.status).toUpperCase();
          if (status === "RUNNING" || status === "QUEUED") {
            pollRun(latest.run.id);
          }
        }
      } catch {
        // keep demo mode
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyLivePayload, pollRun]);

  const start = useCallback(async () => {
    setError(null);

    if (mode !== "live") {
      demo.start();
      return;
    }

    try {
      setLiveBusy(true);
      setLiveBadge("running");
      setShowExceptions(false);
      setLiveSteps(MOCK_RUN.steps.map((s) => ({ ...s, status: "pending" })));

      const res = await fetch("/api/ops/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to start weekly ops");
      }

      setLiveRunId(data.run.id);
      pollRun(data.run.id);
    } catch (err) {
      setLiveBusy(false);
      setError(err instanceof Error ? err.message : "Live ops unavailable");
      demo.start();
      setMode("demo");
    }
  }, [demo, mode, pollRun, programId]);

  const displayStats = stats ?? {
    onTrack: 0,
    students: 0,
    exceptions: 0,
    draftNudges: 0,
  };

  const statCards = [
    {
      label: "On track",
      value: hydrated && stats ? String(displayStats.onTrack) : "—",
      hint: stats
        ? `of ${displayStats.students || 12} students`
        : hydrated
          ? "run weekly ops"
          : "loading…",
    },
    {
      label: "Exceptions",
      value: hydrated && stats ? String(displayStats.exceptions) : "—",
      hint: "need a decision",
    },
    {
      label: "Draft nudges",
      value: hydrated && stats ? String(displayStats.draftNudges) : "—",
      hint: "awaiting approval",
    },
    {
      label: "Last run",
      value: hydrated ? lastRunDuration : "—",
      hint: "weekly ops",
    },
  ];

  if (mode === "live") {
    return {
      mode,
      programLabel,
      steps: liveSteps,
      badge: liveBadge,
      busy: liveBusy,
      runId: liveRunId,
      showExceptions,
      exceptions: liveExceptions,
      briefing,
      error,
      statCards,
      start,
    };
  }

  return {
    mode,
    programLabel,
    steps: demo.steps,
    badge: demo.badge,
    busy: demo.busy,
    runId: demo.runId,
    showExceptions: demo.showExceptions,
    exceptions: MOCK_EXCEPTIONS,
    briefing: null,
    error,
    statCards: MOCK_STATS,
    start,
  };
}
