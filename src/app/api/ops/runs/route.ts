import { NextResponse } from "next/server";
import { AgentRunStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { getOpsQueue } from "@/server/queue/ops-queue";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      programId?: string;
    };

    const prisma = getPrisma();
    let programId = body.programId;

    if (!programId) {
      const program = await prisma.program.findFirst({
        where: { organization: { slug: "northwater" } },
        orderBy: { createdAt: "asc" },
      });
      if (!program) {
        return NextResponse.json(
          { ok: false, error: "No demo program. Run npm run db:seed" },
          { status: 404 },
        );
      }
      programId = program.id;
    }

    const run = await prisma.agentRun.create({
      data: {
        programId,
        status: AgentRunStatus.QUEUED,
        trigger: "manual",
      },
    });

    await getOpsQueue().add(
      "weekly-ops",
      {
        programId,
        runId: run.id,
        trigger: "manual",
      },
      { jobId: run.id },
    );

    return NextResponse.json({
      ok: true,
      run: {
        id: run.id,
        status: run.status,
        programId,
      },
    });
  } catch (error) {
    console.error("[api/ops/runs] POST failed", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to enqueue weekly ops",
      },
      { status: 503 },
    );
  }
}
