import { NextResponse } from "next/server";
import { listResearchPlans } from "@/server/research/plans";
import { requireLabDirector } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const plans = await listResearchPlans({
      labId: gate.ctx.labId,
      programId: gate.ctx.membership.programId,
    });
    return NextResponse.json({ ok: true, plans });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load plans",
      },
      { status: 503 },
    );
  }
}
