"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MOCK_RUN,
  type MockStep,
  type StepStatus,
} from "@/lib/mock-data";

type LiveException = {
  name: string;
  reason: string;
  severity: string;
};

/** Pipeline connectivity — never silently falls back to demo replay. */
export type PipelineStatus = "ok" | "degraded" | "delayed" | "unknown";

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

function durationHint(
  startedAt?: string | Date | null,
  finishedAt?: string | Date | null,
) {
  if (!startedAt || !finishedAt) return "—";
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const sec = Math.max(1, Math.round(ms / 1000));
  return `${sec}s`;
}

const IDLE_STEPS: MockStep[] = MOCK_RUN.steps.map((s) => ({
  ...s,
  status: "pending" as const,
  detail: "Waiting for weekly ops…",
}));

export function useLiveOpsRun() {
  const [ready, setReady] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineStatus>("unknown");
  const [programId, setProgramId] = useState<string | null>(null);
  const [programLabel, setProgramLabel] = useState("");
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveRunId, setLiveRunId] = useState("—");
  const [liveBadge, setLiveBadge] = useState<"idle" | "running" | "succeeded">(
    "idle",
  );
  const [liveSteps, setLiveSteps] = useState<MockStep[]>(IDLE_STEPS);
  const [liveExceptions, setLiveExceptions] = useState<LiveException[]>([]);
  const [showExceptions, setShowExceptions] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [lastRunDuration, setLastRunDuration] = useState("—");
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const pollRef = useRef<number | null>(null);
  const healthRef = useRef<number | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/health");
      const data = await res.json();
      const h = data.health;
      if (!data.ok || !h) {
        setPipeline("degraded");
        return { canEnqueue: false, processingDelayed: false, degraded: true };
      }
      if (h.degraded) {
        setPipeline("degraded");
      } else if (h.processingDelayed) {
        setPipeline("delayed");
      } else {
        setPipeline("ok");
      }
      return h as {
        canEnqueue: boolean;
        processingDelayed: boolean;
        degraded: boolean;
      };
    } catch {
      setPipeline("degraded");
      return { canEnqueue: false, processingDelayed: false, degraded: true };
    }
  }, []);

  useEffect(() => () => {
    stopPoll();
    if (healthRef.current != null) window.clearInterval(healthRef.current);
  }, [stopPoll]);

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
      setHasRun(true);
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
          : IDLE_STEPS;

      setLiveSteps(steps);
      setLiveExceptions(run.exceptions);
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
        await refreshHealth();
        const res = await fetch("/api/demo/program");
        const data = await res.json();
        if (cancelled) return;

        if (!data.ok) {
          setError(data.error ?? "Could not load program");
          setReady(true);
          return;
        }

        setProgramId(data.program.id);
        setProgramLabel(data.program.name);

        const latestRes = await fetch("/api/ops/runs?latest=1");
        const latest = await latestRes.json();
        if (cancelled) return;

        if (latest.ok && latest.run) {
          applyLivePayload(latest.run);
          const status = String(latest.run.status).toUpperCase();
          if (status === "RUNNING" || status === "QUEUED") {
            pollRun(latest.run.id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ops unavailable");
          setPipeline("degraded");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    healthRef.current = window.setInterval(() => {
      void refreshHealth();
    }, 20_000);

    return () => {
      cancelled = true;
    };
  }, [applyLivePayload, pollRun, refreshHealth]);

  const canDispatch = pipeline === "ok" || pipeline === "delayed";

  const start = useCallback(async () => {
    setError(null);
    const health = await refreshHealth();

    if (health.degraded || !health.canEnqueue) {
      setError(
        "Ops pipeline degraded — Redis is unreachable. Dispatch is disabled until Redis is back.",
      );
      setLiveBusy(false);
      return;
    }

    try {
      setLiveBusy(true);
      setLiveBadge("running");
      setShowExceptions(false);
      setLiveExceptions([]);
      setLiveSteps(IDLE_STEPS);
      setHasRun(true);

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
      if (data.processingDelayed || health.processingDelayed) {
        setPipeline("delayed");
      }
      pollRun(data.run.id);
    } catch (err) {
      setLiveBusy(false);
      setLiveBadge("idle");
      setError(err instanceof Error ? err.message : "Live ops unavailable");
      // Do NOT fall back to silent demo replay.
      await refreshHealth();
    }
  }, [pollRun, programId, refreshHealth]);

  const liveStatCards = [
    {
      label: "On track",
      value: stats ? String(stats.onTrack) : hasRun ? "0" : "—",
      hint: stats
        ? `of ${stats.students} students`
        : hasRun
          ? "from last run"
          : "run weekly ops",
    },
    {
      label: "Exceptions",
      value: stats ? String(stats.exceptions) : hasRun ? "0" : "—",
      hint: "need a decision",
    },
    {
      label: "Draft nudges",
      value: stats ? String(stats.draftNudges) : hasRun ? "0" : "—",
      hint: "awaiting approval",
    },
    {
      label: "Last run",
      value: hasRun ? lastRunDuration : "—",
      hint: "weekly ops",
    },
  ];

  return {
    ready,
    pipeline,
    canDispatch,
    programLabel,
    steps: liveSteps,
    badge: liveBadge,
    busy: liveBusy,
    runId: liveRunId,
    showExceptions,
    exceptions: liveExceptions,
    briefing,
    error,
    statCards: liveStatCards,
    start,
  };
}
