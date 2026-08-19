export function serializeAgentRun(run: {
  id: string;
  status: string;
  programId: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  summary: unknown;
  steps: Array<{
    id: string;
    agent: string;
    title: string;
    detail: string | null;
    status: string;
    sortOrder: number;
    startedAt: Date | null;
    finishedAt: Date | null;
    payload: unknown;
  }>;
  approvals: Array<{
    id: string;
    title: string;
    body: string;
    targetName: string | null;
  }>;
}) {
  const summary = (run.summary ?? {}) as {
    briefing?: string;
    agenda?: string[];
    pendingApprovals?: number;
    dataSummary?: {
      milestoneId: string;
      milestoneTitle: string;
      contributorCount: number;
      cellCount: number;
      flaggedCellCount: number;
      line: string;
      columns: Array<{
        columnName: string;
        sampleSize: number;
        mean: number | null;
        median: number | null;
        outlierCheck: {
          status: string;
          minRequired: number;
          flaggedCount: number;
        };
      }>;
    } | null;
  };
  const referee = run.steps.find((s) => s.agent === "REFEREE");
  const refereePayload = (referee?.payload ?? {}) as {
    exceptions?: { name: string; reason: string; severity: string }[];
    complete?: number;
    weak?: number;
    missing?: number;
  };
  const coach = run.steps.find((s) => s.agent === "COACH");
  const coachPayload = (coach?.payload ?? {}) as { draftCount?: number };
  const clerk = run.steps.find((s) => s.agent === "CLERK");
  const clerkPayload = (clerk?.payload ?? {}) as {
    briefing?: string;
    agenda?: string[];
    pendingApprovals?: number;
    dataSummary?: typeof summary.dataSummary;
  };

  const complete = refereePayload.complete ?? 0;
  const weak = refereePayload.weak ?? 0;
  const missing = refereePayload.missing ?? 0;
  const exceptions = refereePayload.exceptions ?? [];
  const draftCount = coachPayload.draftCount ?? run.approvals.length;
  const dataSummary = summary.dataSummary ?? clerkPayload.dataSummary ?? null;

  return {
    id: run.id,
    status: run.status,
    programId: run.programId,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    steps: run.steps.map((step) => ({
      id: step.id,
      agent: step.agent,
      title: step.title,
      detail: step.detail,
      status: step.status.toLowerCase(),
      sortOrder: step.sortOrder,
      startedAt: step.startedAt,
      finishedAt: step.finishedAt,
    })),
    exceptions,
    approvals: run.approvals.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      targetName: a.targetName,
    })),
    stats: {
      onTrack: complete,
      students: complete + weak + missing,
      exceptions: exceptions.length,
      draftNudges: draftCount,
    },
    briefing: summary.briefing ?? clerkPayload.briefing ?? null,
    agenda: summary.agenda ?? clerkPayload.agenda ?? [],
    dataSummary,
  };
}
