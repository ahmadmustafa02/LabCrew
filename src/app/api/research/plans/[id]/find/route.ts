import { NextResponse } from "next/server";
import { searchPapersForTopic } from "@/server/coach/resource-search";
import { searchDatasetsForTopic } from "@/server/research/find-datasets";
import { findResearchPlanInLab } from "@/server/research/plan-repo";
import { requireLabDirector } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const { id } = await params;
    const plan = await findResearchPlanInLab({
      labId: gate.ctx.labId,
      programId: gate.ctx.membership.programId,
      planId: id,
    });
    if (!plan) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const body = (await request.json()) as { kind?: string; query?: string };
    const query = (body.query ?? plan.topic).trim();
    const kind = body.kind === "datasets" ? "datasets" : "papers";

    if (kind === "datasets") {
      const found = await searchDatasetsForTopic(query);
      return NextResponse.json({
        ok: true,
        kind,
        query: found.query,
        source: found.source,
        error: found.error ?? null,
        note: `Hugging Face search: “${found.query}”. Empty is honest. Licence stays held until Catalog has a quote.`,
        datasets: found.datasets,
      });
    }

    const found = await searchPapersForTopic(query, 8);
    return NextResponse.json({
      ok: true,
      kind,
      query: found.query,
      source: found.primarySource,
      error: found.error ?? null,
      note: "Semantic Scholar, then arXiv. Titles come from the APIs. Nothing is invented.",
      papers: found.papers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 503 },
    );
  }
}
