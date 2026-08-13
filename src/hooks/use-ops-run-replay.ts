"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MOCK_RUN, type MockStep, type StepStatus } from "@/lib/mock-data";

export type RunBadge = "idle" | "running" | "succeeded";

export type ReplayStep = MockStep;

const STEP_MS = 700;

function cloneTemplate(status: StepStatus = "pending"): ReplayStep[] {
  return MOCK_RUN.steps.map((step) => ({
    ...step,
    status,
  }));
}

export function useOpsRunReplay() {
  const [steps, setSteps] = useState<ReplayStep[]>(() =>
    cloneTemplate("succeeded"),
  );
  const [badge, setBadge] = useState<RunBadge>("succeeded");
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState(MOCK_RUN.id);
  const [showExceptions, setShowExceptions] = useState(true);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const reduceMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const start = useCallback(() => {
    if (busy) return;
    clearTimers();
    setBusy(true);
    setShowExceptions(false);
    setBadge("running");
    setRunId(`run_${1000 + Math.floor(Math.random() * 9000)}`);

    const template = MOCK_RUN.steps;
    setSteps(cloneTemplate("pending"));

    if (reduceMotion) {
      setSteps(cloneTemplate("succeeded"));
      setBadge("succeeded");
      setShowExceptions(true);
      setBusy(false);
      return;
    }

    template.forEach((_, index) => {
      const startAt = index * STEP_MS;
      const doneAt = startAt + STEP_MS - 80;

      timers.current.push(
        window.setTimeout(() => {
          setSteps((prev) =>
            prev.map((step, i) => {
              if (i === index) return { ...step, status: "running" };
              if (i < index) return { ...step, status: "succeeded" };
              return { ...step, status: "pending" };
            }),
          );
        }, startAt),
      );

      timers.current.push(
        window.setTimeout(() => {
          setSteps((prev) =>
            prev.map((step, i) =>
              i <= index ? { ...step, status: "succeeded" } : step,
            ),
          );
          if (index >= 2) setShowExceptions(true);
          if (index === template.length - 1) {
            setBadge("succeeded");
            setBusy(false);
          }
        }, doneAt),
      );
    });
  }, [busy, clearTimers, reduceMotion]);

  return {
    steps,
    badge,
    busy,
    runId,
    showExceptions,
    start,
  };
}
