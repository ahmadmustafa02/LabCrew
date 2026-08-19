import { NextResponse } from "next/server";
import { requireLabDirector } from "@/server/tenancy/lab-scope";
import { findAgentRunInLab } from "@/server/tenancy/lab-repo";
import { serializeAgentRun } from "@/server/ops/serialize-run";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const { id } = await params;
    const run = await findAgentRunInLab(gate.ctx.labId, id);

    if (!run) {
      return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, run: serializeAgentRun(run) });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load run",
      },
      { status: 503 },
    );
  }
}
