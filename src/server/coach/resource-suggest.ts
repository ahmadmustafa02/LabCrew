/**
 * Adaptive Coach Phase C — select + rationalize ONLY from retrieved hits.
 * LLM never invents titles/URLs. Empty search → explicit empty draft.
 */
import { ApprovalStatus, type Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { chatJson, llmConfigured } from "@/server/llm/client";
import {
  searchPapersForTopic,
  type RetrievedPaper,
} from "@/server/coach/resource-search";
import { inLab } from "@/server/tenancy/lab-scope";

export const RESOURCE_KIND = "resources";

export type SuggestedResource = {
  title: string;
  url: string;
  year: number | null;
  venue: string | null;
  source: "semanticscholar" | "arxiv";
  paperId: string;
  rationale: string;
};

export type ResourceDraftPayload = {
  milestoneId: string;
  query: string;
  status: "found" | "empty";
  primarySource: "semanticscholar" | "arxiv" | "none";
  items: SuggestedResource[];
  note: string;
};

function heuristicPick(
  papers: RetrievedPaper[],
  take: number,
): SuggestedResource[] {
  return papers.slice(0, take).map((p, i) => ({
    ...p,
    rationale:
      i === 0
        ? "Top search hit for this assignment topic."
        : "Related result from the search API.",
  }));
}

async function selectFromRetrieved(
  topic: string,
  papers: RetrievedPaper[],
): Promise<SuggestedResource[]> {
  const take = Math.min(5, Math.max(3, Math.min(papers.length, 5)));
  if (!llmConfigured() || papers.length === 0) {
    return heuristicPick(papers, take);
  }

  const catalog = papers.map((p, index) => ({
    index,
    title: p.title,
    url: p.url,
    year: p.year,
    venue: p.venue,
    source: p.source,
    paperId: p.paperId,
  }));

  const result = await chatJson<{
    selections?: Array<{ index: number; rationale: string }>;
  }>({
    system: `You help a research lab director pick reading for an assignment.
You MUST only select from the provided catalog by index.
Return JSON: {"selections":[{"index":number,"rationale":string}]}
Pick 3–5 items. Rationale is one short sentence. Never invent a title, URL, or index.`,
    user: JSON.stringify({ topic, catalog }, null, 2),
    temperature: 0.2,
  });

  if (!result.ok || !Array.isArray(result.data.selections)) {
    return heuristicPick(papers, take);
  }

  const picked: SuggestedResource[] = [];
  const seen = new Set<number>();
  for (const sel of result.data.selections) {
    if (typeof sel.index !== "number" || seen.has(sel.index)) continue;
    const paper = papers[sel.index];
    if (!paper) continue;
    seen.add(sel.index);
    picked.push({
      ...paper,
      rationale: (sel.rationale ?? "").trim() || "Selected from search results.",
    });
    if (picked.length >= 5) break;
  }
  if (picked.length < 3) {
    for (const p of papers) {
      if (picked.some((x) => x.paperId === p.paperId)) continue;
      picked.push({
        ...p,
        rationale: "Filled from remaining search hits.",
      });
      if (picked.length >= 3) break;
    }
  }
  return picked.length ? picked : heuristicPick(papers, take);
}

export function formatResourceApprovalBody(payload: ResourceDraftPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function parseResourceApprovalBody(
  body: string,
): ResourceDraftPayload | null {
  try {
    const parsed = JSON.parse(body) as ResourceDraftPayload;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.status !== "found" && parsed.status !== "empty") return null;
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Search + draft a resources ApprovalItem for a milestone (lab-scoped).
 * Skips external search when a pending draft already matches the same query
 * (directors editing description repeatedly won't re-hit S2/arXiv).
 */
export async function draftResourceSuggestionsForMilestone(input: {
  labId: string;
  programId: string;
  milestoneId: string;
  title: string;
  description?: string | null;
  /** Force a fresh search even if pending draft matches */
  forceRefresh?: boolean;
}): Promise<{
  payload: ResourceDraftPayload;
  approvalId: string;
  reusedPending: boolean;
  searchCacheHit?: boolean;
}> {
  const topic = [input.title, input.description]
    .filter(Boolean)
    .join(" — ")
    .trim();
  const normalizedQuery = topic.replace(/\s+/g, " ").trim();

  const prisma = getPrisma();
  const pending = await prisma.approvalItem.findMany({
    where: {
      programId: input.programId,
      kind: RESOURCE_KIND,
      status: ApprovalStatus.PENDING,
      ...inLab(input.labId),
    },
  });
  const existingForMilestone = pending.filter((row) => {
    const parsed = parseResourceApprovalBody(row.body);
    return parsed?.milestoneId === input.milestoneId;
  });

  if (!input.forceRefresh) {
    const sameQuery = existingForMilestone.find((row) => {
      const parsed = parseResourceApprovalBody(row.body);
      return (
        parsed &&
        parsed.query.replace(/\s+/g, " ").trim().toLowerCase() ===
          normalizedQuery.toLowerCase()
      );
    });
    if (sameQuery) {
      const payload = parseResourceApprovalBody(sameQuery.body)!;
      return {
        payload,
        approvalId: sameQuery.id,
        reusedPending: true,
      };
    }
  }

  const search = await searchPapersForTopic(topic, 10);
  let payload: ResourceDraftPayload;

  if (search.papers.length === 0) {
    payload = {
      milestoneId: input.milestoneId,
      query: search.query,
      status: "empty",
      primarySource: search.primarySource,
      items: [],
      note: search.error
        ? `Nothing relevant found for this topic (${search.error}). Coach will not invent citations.`
        : "Nothing relevant found for this topic. Coach will not invent citations.",
    };
  } else {
    const items = await selectFromRetrieved(topic, search.papers);
    payload = {
      milestoneId: input.milestoneId,
      query: search.query,
      status: "found",
      primarySource: search.primarySource,
      items,
      note: `Selected ${items.length} of ${search.papers.length} search hits (${search.primarySource}).`,
    };
  }

  if (existingForMilestone.length) {
    await prisma.approvalItem.deleteMany({
      where: { id: { in: existingForMilestone.map((r) => r.id) } },
    });
  }

  const title =
    payload.status === "empty"
      ? `Resources — nothing found · ${input.title}`
      : `Resources — ${payload.items.length} papers · ${input.title}`;

  const created = await prisma.approvalItem.create({
    data: {
      organizationId: input.labId,
      programId: input.programId,
      kind: RESOURCE_KIND,
      title,
      body: formatResourceApprovalBody(payload),
      targetName: input.title,
      status: ApprovalStatus.PENDING,
    },
  });

  return {
    payload,
    approvalId: created.id,
    reusedPending: false,
    searchCacheHit: Boolean(search.cacheHit),
  };
}

/** Apply approved resource list onto the milestone (students read later in Phase D). */
export async function applyApprovedResources(input: {
  labId: string;
  body: string;
}): Promise<{ ok: true; milestoneId: string } | { ok: false; error: string }> {
  const payload = parseResourceApprovalBody(input.body);
  if (!payload) return { ok: false, error: "Invalid resource draft body" };

  const prisma = getPrisma();
  const milestone = await prisma.milestone.findFirst({
    where: { id: payload.milestoneId, ...inLab(input.labId) },
  });
  if (!milestone) return { ok: false, error: "Milestone not found in lab" };

  const coachResources =
    payload.status === "empty"
      ? ({
          status: "empty",
          query: payload.query,
          note: payload.note,
          items: [],
          approvedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue)
      : ({
          status: "found",
          query: payload.query,
          note: payload.note,
          primarySource: payload.primarySource,
          items: payload.items,
          approvedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue);

  await prisma.milestone.update({
    where: { id: milestone.id },
    data: { coachResources },
  });

  return { ok: true, milestoneId: milestone.id };
}
