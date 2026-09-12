import { NextResponse } from "next/server";
import { runSourceSearch } from "@/server/research/run-source-search";
import { requireLabDirector } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      planId?: string;
      kind?: string;
      query?: string;
    };
    const planId = body.planId?.trim() ?? "";
    if (!planId) {
      return NextResponse.json({ ok: false, error: "Missing plan" }, { status: 400 });
    }

    const result = await runSourceSearch({
      labId: gate.ctx.labId,
      programId: gate.ctx.membership.programId,
      planId,
      kind: body.kind,
      query: body.query,
    });
    if (!("ok" in result)) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(result);
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
