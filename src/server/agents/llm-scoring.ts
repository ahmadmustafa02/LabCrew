import { chatJson, chatText, llmConfigured } from "@/server/llm/client";

export type RubricLike = {
  requireEvidenceUrl?: boolean;
  requireWriteup?: boolean;
  requireRepoUrl?: boolean;
  minWriteupLength?: number;
  checklist?: string[];
};

export type ScoreResult = {
  complete: boolean;
  notes: string;
  reason?: string;
  severity?: "high" | "medium";
  source: "llm" | "heuristic";
};

function heuristicScore(input: {
  writeup: string;
  evidenceUrl: string;
  repoUrl: string;
  rubric: RubricLike;
  milestoneTitle: string;
}): ScoreResult {
  const requireEvidence = input.rubric.requireEvidenceUrl !== false;
  const requireWriteup = input.rubric.requireWriteup !== false;
  const requireRepo = Boolean(input.rubric.requireRepoUrl);
  const minWriteup = input.rubric.minWriteupLength ?? 40;
  const problems: string[] = [];

  const isHttp = (v: string) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  if (requireEvidence && !input.evidenceUrl) {
    problems.push("Demo/evidence link missing");
  } else if (requireEvidence && input.evidenceUrl && !isHttp(input.evidenceUrl)) {
    problems.push("Evidence URL is not a valid http(s) link");
  }
  if (requireRepo && !input.repoUrl) {
    problems.push("GitHub repo missing");
  } else if (requireRepo && input.repoUrl && !isHttp(input.repoUrl)) {
    problems.push("Repo URL is not a valid http(s) link");
  }
  if (requireWriteup && input.writeup.length < minWriteup) {
    problems.push("Writeup too thin vs rubric");
  } else if (requireWriteup && input.writeup.length >= minWriteup) {
    const lower = input.writeup.toLowerCase();
    const signals = ["method", "result", "next", "finding", "approach", "demo"];
    const ok =
      signals.some((s) => lower.includes(s)) ||
      input.writeup.split(/\s+/).length >= 25;
    if (!ok) problems.push("Writeup lacks methods/results signal");
  }

  if (problems.length === 0) {
    return {
      complete: true,
      notes: `Meets rubric for ${input.milestoneTitle}`,
      source: "heuristic",
    };
  }
  return {
    complete: false,
    notes: problems.join("; "),
    reason: problems[0],
    severity: problems[0].includes("missing") ? "high" : "medium",
    source: "heuristic",
  };
}

export async function scoreSubmission(input: {
  studentName: string;
  milestoneTitle: string;
  instructions: string | null;
  writeup: string;
  evidenceUrl: string;
  repoUrl: string;
  rubric: RubricLike;
}): Promise<ScoreResult> {
  const fallback = heuristicScore(input);

  // Hard structural fails stay heuristic (no need for LLM)
  if (
    fallback.reason?.includes("missing") ||
    fallback.reason?.includes("not a valid")
  ) {
    return fallback;
  }

  if (!llmConfigured()) return fallback;

  const result = await chatJson<{
    complete?: boolean;
    notes?: string;
    reason?: string;
    severity?: "high" | "medium";
  }>({
    system: `You are a research-internship TA scoring one student submission against a rubric.
Return JSON only: {"complete":boolean,"notes":string,"reason":string,"severity":"high"|"medium"}
Be fair but strict on methods/results quality. reason is the single top issue if incomplete (else "").`,
    user: JSON.stringify(
      {
        student: input.studentName,
        milestone: input.milestoneTitle,
        instructions: input.instructions,
        rubric: input.rubric,
        evidenceUrl: input.evidenceUrl || null,
        repoUrl: input.repoUrl || null,
        writeup: input.writeup.slice(0, 4000),
      },
      null,
      2,
    ),
    temperature: 0.1,
  });

  if (!result.ok) {
    console.warn("[referee-llm] fallback", result.error);
    return fallback;
  }

  const complete = Boolean(result.data.complete);
  return {
    complete,
    notes:
      (result.data.notes ?? "").trim() ||
      (complete ? fallback.notes : fallback.notes),
    reason: complete
      ? undefined
      : (result.data.reason ?? fallback.reason ?? "Needs improvement"),
    severity: complete
      ? undefined
      : result.data.severity === "high"
        ? "high"
        : "medium",
    source: "llm",
  };
}

export async function draftNudge(input: {
  studentName: string;
  reason: string;
  severity: string;
  milestoneTitle: string;
}): Promise<{ body: string; source: "llm" | "heuristic" }> {
  const first = input.studentName.split(" ")[0] ?? "there";
  const heuristic =
    input.severity === "high"
      ? `Hi ${first} — ${input.reason}. The smallest next step is a short status note today, even if the demo isn’t perfect.`
      : `Hi ${first} — ${input.reason}. A tight 5-bullet update against the ${input.milestoneTitle} rubric will unblock review.`;

  if (!llmConfigured()) {
    return { body: heuristic, source: "heuristic" };
  }

  const result = await chatText({
    system: `You are Coach for a research internship lab. Write one short, kind, specific nudge (2–4 sentences, no markdown, no subject line). Human director will approve before send.`,
    user: `Student: ${input.studentName}
Milestone: ${input.milestoneTitle}
Issue severity: ${input.severity}
Issue: ${input.reason}

Write the nudge body only.`,
    temperature: 0.5,
  });

  if (!result.ok) {
    console.warn("[coach-llm] fallback", result.error);
    return { body: heuristic, source: "heuristic" };
  }

  return { body: result.text.replace(/^["']|["']$/g, "").trim(), source: "llm" };
}
