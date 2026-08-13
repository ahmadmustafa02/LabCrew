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

const DEFAULT_STATS: RunStats = {
  onTrack: 9,
  students: 12,
  exceptions: 3,
  draftNudges: 3,
};

export function useLiveOpsRun() {
  const demo = useOpsRunReplay();
  const [mode, setMode] = useState<LiveMode>("demo");
  const [programId, setProgramId] = useState<string | null>(null);
  const [programLabel, setProgramLabel] = useState(MOCK_RUN.label);
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveRunId, setLiveRunId] = useState(MOCK_RUN.id);
  const [liveBadge, setLiveBadge] = useState<"idle" | "running" | "succeeded">(
    "succeeded",
  );
  const [liveSteps, setLiveSteps] = useState<MockStep[]>(MOCK_RUN.steps);
  const [liveExceptions, setLiveExceptions] =
    useState<LiveException[]>(MOCK_EXCEPTIONS);
  const [showExceptions, setShowExceptions] = useState(true);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [stats, setStats] = useState<RunStats>(DEFAULT_STATS);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/demo/program");
        const data = await res.json();
        if (!cancelled && data.ok) {
          setProgramId(data.program.id);
          setProgramLabel(data.program.name);
          setMode("live");
        }
      } catch {
        // keep demo mode
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const statCards = [
    {
      label: "On track",
      value: String(stats.onTrack),
      hint: `of ${stats.students || 12} students`,
    },
    {
      label: "Exceptions",
      value: String(stats.exceptions),
      hint: "need a decision",
    },
    {
      label: "Draft nudges",
      value: String(stats.draftNudges),
      hint: "awaiting approval",
    },
    MOCK_STATS[3],
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
