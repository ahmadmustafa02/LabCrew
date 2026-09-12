export type RoadmapKind = "collect" | "writeup" | "catalog" | "review";

export type AgentLater = "papers" | "datasets" | null;

export type RoadmapStep = {
  title: string;
  kind: RoadmapKind;
  week: number;
  description: string;
  instructions: string;
  acceptData: boolean;
  dataColumns: Array<{ name: string; type: "text" | "number" | "boolean" }>;
  checklist: string[];
  nextHint: string;
  agentLater: AgentLater;
};

export type ResearchRoadmap = {
  topic: string;
  weeks: number;
  source: "heuristic" | "llm";
  model?: string;
  note: string;
  steps: RoadmapStep[];
};

const NOTE =
  "Draft only. No papers or datasets are invented. You edit, then add assignments. Similar-paper and dataset agents attach later to the marked steps.";

const CITATIONISH =
  /\b(et al\.|doi:|arxiv:\s?\d|isbn|pmid|https?:\/\/|we (found|retrieved) \d+)/i;

export function clampWeeks(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 6;
  return Math.min(8, Math.max(4, Math.round(n)));
}

export function cleanTopic(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function stripCitationish(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !CITATIONISH.test(s))
    .join(" ")
    .trim();
}

function kindOf(raw: unknown): RoadmapKind {
  const k = String(raw ?? "").toLowerCase();
  if (k === "collect" || k === "catalog" || k === "review" || k === "writeup") {
    return k;
  }
  return "writeup";
}

function agentOf(raw: unknown): AgentLater {
  const k = String(raw ?? "").toLowerCase();
  if (k === "papers" || k === "datasets") return k;
  return null;
}

export function sanitizeRoadmap(input: {
  topic: string;
  weeks: number;
  source: "heuristic" | "llm";
  model?: string;
  steps: Array<Partial<RoadmapStep>>;
}): ResearchRoadmap {
  const topic = cleanTopic(input.topic) || "Untitled inquiry";
  const weeks = clampWeeks(input.weeks);
  const steps = input.steps
    .slice(0, 8)
    .map((s, i) => {
      const week = Math.min(weeks, Math.max(1, Number(s.week) || i + 1));
      const kind = kindOf(s.kind);
      const acceptData = kind === "collect" || Boolean(s.acceptData);
      const title = stripCitationish(String(s.title ?? "").trim()).slice(0, 120);
      const description = stripCitationish(String(s.description ?? "").trim()).slice(0, 400);
      const instructions = stripCitationish(String(s.instructions ?? "").trim()).slice(0, 1200);
      const checklist = (s.checklist ?? [])
        .map((c) => stripCitationish(String(c).trim()))
        .filter(Boolean)
        .slice(0, 6);
      const dataColumns = acceptData
        ? (s.dataColumns ?? [])
            .map((c) => ({
              name: String(c?.name ?? "")
                .replace(/[^a-z0-9_]/gi, "")
                .slice(0, 40),
              type:
                c?.type === "number" || c?.type === "boolean" ? c.type : ("text" as const),
            }))
            .filter((c) => c.name)
            .slice(0, 8)
        : [];
      return {
        title: title || `Week ${week} task`,
        kind,
        week,
        description: description || `Work on ${topic}.`,
        instructions:
          instructions ||
          `Stay on "${topic}". Do not invent paper titles. If you cite, paste the excerpt into Catalog.`,
        acceptData,
        dataColumns,
        checklist:
          checklist.length > 0
            ? checklist
            : ["Short note of what you did", "Link or file if you have one"],
        nextHint: stripCitationish(String(s.nextHint ?? "").trim()).slice(0, 200),
        agentLater: agentOf(s.agentLater),
      };
    })
    .filter((s) => s.title);

  return {
    topic,
    weeks,
    source: input.source,
    model: input.model,
    note: NOTE,
    steps: steps.length >= 3 ? steps : heuristicRoadmap(topic, weeks).steps,
  };
}

function flavor(topic: string) {
  const t = topic.toLowerCase();
  if (/\b(cve|vulnerab|exploit|reachab|sast|cwe|insecure)\b/.test(t)) return "vuln";
  if (/\b(dataset|corpus|emotion|speech|audio|annotat)\b/.test(t)) return "data";
  if (/\b(field|stream|water|soil|sensor|ph)\b/.test(t)) return "field";
  return "general";
}

export function heuristicRoadmap(topicRaw: string, weeksRaw?: number): ResearchRoadmap {
  const topic = cleanTopic(topicRaw) || "Untitled inquiry";
  const weeks = clampWeeks(weeksRaw);
  const f = flavor(topic);

  const collectCols =
    f === "vuln"
      ? [
          { name: "case_id", type: "text" as const },
          { name: "language", type: "text" as const },
          { name: "reachable", type: "boolean" as const },
          { name: "note", type: "text" as const },
        ]
      : f === "field"
        ? [
            { name: "site", type: "text" as const },
            { name: "reading", type: "number" as const },
            { name: "note", type: "text" as const },
          ]
        : [
            { name: "item_id", type: "text" as const },
            { name: "label", type: "text" as const },
            { name: "note", type: "text" as const },
          ];

  const steps: RoadmapStep[] = [
    {
      title: `Week 1 — Frame: ${topic}`,
      kind: "writeup",
      week: 1,
      description: `One-page scope. What question, what is out of scope, what a student can finish in ${weeks} weeks.`,
      instructions: `Write a short framing note for "${topic}". Name the question, one success metric, and what you will not do. Do not invent paper titles. If you already have a PDF, paste an excerpt into Catalog later.`,
      acceptData: false,
      dataColumns: [],
      checklist: ["Question in one sentence", "Out of scope list", "Success metric"],
      nextHint: "Next: check existing artifacts in Catalog — no invented sources.",
      agentLater: "papers",
    },
    {
      title: `Week 2 — Catalog check: ${topic}`,
      kind: "catalog",
      week: 2,
      description: "Add one real paper or dataset record. Held fields stay held until a quote supports them.",
      instructions: `Open Catalog. Paste an excerpt or PDF you already have about "${topic}". Approve only fields the verifier supports. Empty is honest.`,
      acceptData: false,
      dataColumns: [],
      checklist: ["One catalog record started", "No unsourced licence or count"],
      nextHint: "Next: a small collect so the cohort has shared rows.",
      agentLater: "datasets",
    },
    {
      title: `Week 3 — Small collect: ${topic}`,
      kind: "collect",
      week: 3,
      description: "A few structured rows — one case, site, or example — not a literature dump.",
      instructions: `Log 4–8 rows on "${topic}". Use the columns on this assignment. If a cell is unknown, leave it blank.`,
      acceptData: true,
      dataColumns: collectCols,
      checklist: ["At least 4 rows", "Blanks allowed"],
      nextHint: "Next: a methods note from those rows.",
      agentLater: null,
    },
    {
      title: `Week 4 — Methods note: ${topic}`,
      kind: "writeup",
      week: 4,
      description: "How you collected or labelled. Limits. What you would not claim.",
      instructions: `Short methods writeup for "${topic}". Point at your collect rows. No new paper names unless you paste them into Catalog.`,
      acceptData: false,
      dataColumns: [],
      checklist: ["Methods paragraph", "Limits paragraph"],
      nextHint: "Next: director review, then a closing report.",
      agentLater: null,
    },
    {
      title: `Week 5 — Director review: ${topic}`,
      kind: "review",
      week: Math.min(weeks, 5),
      description: "Human gate. Coach and later agents do not skip this.",
      instructions: `Students post what is ready. Director comments on the work feed. Nothing is “done” until you say so.`,
      acceptData: false,
      dataColumns: [],
      checklist: ["Work-feed comment from director"],
      nextHint: "Next: closing report if the week is still open.",
      agentLater: null,
    },
    {
      title: `Week ${weeks} — Close: ${topic}`,
      kind: "writeup",
      week: weeks,
      description: "What you can claim from this cohort’s artifacts. Demo or report, not a generated IEEE paper.",
      instructions: `Turn in a short close-out for "${topic}": what you measured, what failed, what a next term should collect. Do not auto-write a conference paper.`,
      acceptData: false,
      dataColumns: [],
      checklist: ["Claims tied to collect or catalog", "Open questions"],
      nextHint: "Home will say the week is clear, or send you to held catalog fields.",
      agentLater: "papers",
    },
  ];

  const kept = steps.filter((s) => s.week <= weeks);
  return sanitizeRoadmap({
    topic,
    weeks,
    source: "heuristic",
    steps: kept,
  });
}

export function dueAtForWeek(week: number, from = new Date()): Date {
  const d = new Date(from);
  d.setHours(17, 0, 0, 0);
  d.setDate(d.getDate() + Math.max(0, week - 1) * 7);
  return d;
}
