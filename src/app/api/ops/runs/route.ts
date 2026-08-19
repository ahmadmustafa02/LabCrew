import { NextResponse } from "next/server";
import { AgentRunStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { checkRateLimit } from "@/server/http/rate-limit";
import { probeOpsHealth } from "@/server/ops/health";
import { serializeAgentRun } from "@/server/ops/serialize-run";
import { getOpsQueue } from "@/server/queue/ops-queue";
import {
  inLab,
  requireLabDirector,
  requireLabScope,
} from "@/server/tenancy/lab-scope";

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

    const limited = checkRateLimit({
      key: `ops-enqueue:${gate.ctx.userId}`,
      max: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const health = await probeOpsHealth();
    if (!health.canEnqueue) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ops pipeline degraded — Redis is unreachable. Cannot enqueue weekly ops.",
          code: "REDIS_UNAVAILABLE",
          health,
        },
        { status: 503 },
      );
    }

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

    try {
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
    } catch (enqueueError) {
      await prisma.agentRun.update({
        where: { id: run.id },
        data: { status: AgentRunStatus.FAILED },
      });
      console.error("[api/ops/runs] enqueue failed", enqueueError);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Failed to enqueue — Redis may be unreachable. Run left as FAILED.",
          code: "REDIS_UNAVAILABLE",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      processingDelayed: health.processingDelayed,
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
