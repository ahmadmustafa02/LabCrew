import { searchPapersForTopic } from "@/server/coach/resource-search";
import { searchDatasetsForTopic } from "@/server/research/find-datasets";
import { findResearchPlanInLab } from "@/server/research/plan-repo";

export async function runSourceSearch(input: {
  labId: string;
  programId: string;
  planId: string;
  kind?: string;
  query?: string;
}) {
  const plan = await findResearchPlanInLab({
    labId: input.labId,
    programId: input.programId,
    planId: input.planId,
  });
  if (!plan) return { error: "Not found" as const };

  const query = (input.query ?? plan.topic).trim();
  const kind = input.kind === "datasets" ? "datasets" : "papers";

  if (kind === "datasets") {
    const found = await searchDatasetsForTopic(query);
    return {
      ok: true as const,
      kind,
      query: found.query,
      source: found.source,
      error: found.error ?? null,
      note: `Hugging Face search: “${found.query}”. Empty is honest. Licence stays held until Catalog has a quote.`,
      datasets: found.datasets,
    };
  }

  const found = await searchPapersForTopic(query, 8);
  return {
    ok: true as const,
    kind,
    query: found.query,
    source: found.primarySource,
    error: found.error ?? null,
    note: "Semantic Scholar, then arXiv, then OpenAlex. Titles come from the APIs. Nothing is invented.",
    papers: found.papers,
  };
}
