import { chatJson, llmConfigured } from "@/server/llm/client";
import {
  clampWeeks,
  cleanTopic,
  heuristicRoadmap,
  sanitizeRoadmap,
  type ResearchRoadmap,
  type RoadmapStep,
} from "./roadmap";

export async function draftResearchRoadmap(input: {
  topic: string;
  weeks?: number;
}): Promise<ResearchRoadmap> {
  const topic = cleanTopic(input.topic);
  const weeks = clampWeeks(input.weeks);
  if (topic.length < 8) {
    return heuristicRoadmap(topic || "Untitled inquiry", weeks);
  }

  const fallback = heuristicRoadmap(topic, weeks);
  if (!llmConfigured()) return fallback;

  const llm = await chatJson<{ steps?: Array<Partial<RoadmapStep>> }>({
    system: `You draft a research-lab roadmap for a professor. Return JSON: { "steps": [...] }.
Each step: title, kind (collect|writeup|catalog|review), week (1..${weeks}), description, instructions, acceptData, dataColumns ([{name,type}]), checklist (strings), nextHint, agentLater (papers|datasets|null).
Rules:
- 4 to ${weeks} steps, one per week-ish.
- No paper titles, authors, DOIs, arXiv ids, URLs, or dataset names you were not given.
- Catalog steps tell students to paste a source they already have.
- Collect steps are small structured logs, not a literature review.
- Do not write a conference paper. Close with a short report.
- Mark agentLater=papers or datasets only as a future hook, not as work you already did.`,
    user: `Topic: ${topic}\nWeeks: ${weeks}`,
    temperature: 0.3,
  });

  if (!llm.ok || !Array.isArray(llm.data.steps)) {
    return {
      ...fallback,
      note: `${fallback.note} Model did not return a usable draft${llm.ok ? "" : `: ${llm.error}`}. Using the template.`,
    };
  }

  return sanitizeRoadmap({
    topic,
    weeks,
    source: "llm",
    model: llm.model,
    steps: llm.data.steps,
  });
}
