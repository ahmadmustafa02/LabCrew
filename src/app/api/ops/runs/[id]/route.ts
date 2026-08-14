import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { serializeAgentRun } from "@/server/ops/serialize-run";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const prisma = getPrisma();
    const run = await prisma.agentRun.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { sortOrder: "asc" } },
        approvals: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "asc" },
        },
      },
    });

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
