export type StepStatus = "pending" | "running" | "succeeded" | "failed";

export type MockStep = {
  id: string;
  agent: "Dispatcher" | "Pulse" | "Referee" | "Coach" | "Clerk";
  title: string;
  detail: string;
  status: StepStatus;
  at: string;
};

export type MockException = {
  id: string;
  name: string;
  reason: string;
  severity: "high" | "medium";
  milestone: string;
};

export const DEMO_PROGRAM = {
  org: "Northwater Lab",
  name: "Summer Research Cohort ’26",
  students: 12,
  mentors: 2,
  activeMilestone: "Week 4 — Working demo + short report",
};

export const MOCK_RUN = {
  id: "run_1024",
  label: "Weekly ops",
  status: "succeeded" as const,
  startedAt: "Sun 21:04",
  duration: "48s",
  steps: [
    {
      id: "s1",
      agent: "Dispatcher",
      title: "Opened weekly ops run",
      detail: "Queued Pulse → Referee → Coach → Clerk",
      status: "succeeded",
      at: "21:04:01",
    },
    {
      id: "s2",
      agent: "Pulse",
      title: "Collected cohort signals",
      detail: "12 members · 9 submissions · 3 silent 5+ days",
      status: "succeeded",
      at: "21:04:08",
    },
    {
      id: "s3",
      agent: "Referee",
      title: "Scored evidence against rubric",
      detail: "7 complete · 2 weak writeups · 3 missing",
      status: "succeeded",
      at: "21:04:22",
    },
    {
      id: "s4",
      agent: "Coach",
      title: "Drafted personalized nudges",
      detail: "3 high-priority drafts ready for approval",
      status: "succeeded",
      at: "21:04:36",
    },
    {
      id: "s5",
      agent: "Clerk",
      title: "Compiled director briefing",
      detail: "Exception packet + Monday agenda prepared",
      status: "succeeded",
      at: "21:04:48",
    },
  ] satisfies MockStep[],
};

export const MOCK_EXCEPTIONS: MockException[] = [
  {
    id: "e1",
    name: "Ayesha Rahman",
    reason: "No submission · 6-day silence",
    severity: "high",
    milestone: "Week 4 demo",
  },
  {
    id: "e2",
    name: "Daniel Okonkwo",
    reason: "Writeup too thin vs rubric",
    severity: "medium",
    milestone: "Week 4 demo",
  },
  {
    id: "e3",
    name: "Mei Chen",
    reason: "Demo link unreachable",
    severity: "high",
    milestone: "Week 4 demo",
  },
];

export const MOCK_STATS = [
  { label: "On track", value: "9", hint: "of 12 students" },
  { label: "Exceptions", value: "3", hint: "need a decision" },
  { label: "Draft nudges", value: "3", hint: "awaiting approval" },
  { label: "Last run", value: "48s", hint: "weekly ops" },
];
