import { NextResponse } from "next/server";
import { AgentRunStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import {
  inLab,
  requireLabDirector,
  requireLabScope,
} from "@/server/tenancy/lab-scope";
import { serializeAgentRun } from "@/server/ops/serialize-run";
import { getOpsQueue } from "@/server/queue/ops-queue";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const { searchParams } = new URL(request.url);
    const latest = searchParams.get("latest") === "1";
    if (!latest) {
      return NextResponse.json(
        { ok: false, error: "Use ?latest=1 to load the most recent run" },
        { status: 400 },
      );
    }

    // Never trust client programId — always use session membership.
    const programId = gate.ctx.membership.programId;
    const prisma = getPrisma();
    const run = await prisma.agentRun.findFirst({
      where: { programId, ...inLab(gate.ctx.labId) },
      orderBy: { createdAt: "desc" },
      include: {
        steps: { orderBy: { sortOrder: "asc" } },
        approvals: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ ok: true, run: null });
    }

    return NextResponse.json({ ok: true, run: serializeAgentRun(run) });
  } catch (error) {
    console.error("[api/ops/runs] GET failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load runs",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    // Ignore body.programId — session lab/program only.
    const programId = gate.ctx.membership.programId;
    const organizationId = gate.ctx.labId;

    const prisma = getPrisma();
    const run = await prisma.agentRun.create({
      data: {
        organizationId,
        programId,
        status: AgentRunStatus.QUEUED,
        trigger: "manual",
      },
    });

    await getOpsQueue().add(
      "weekly-ops",
      {
        organizationId,
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
        organizationId,
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
