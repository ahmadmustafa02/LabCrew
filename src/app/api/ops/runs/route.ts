import { NextResponse } from "next/server";
import { AgentRunStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import {
  assertSameProgram,
  requireAuth,
  requireDirector,
} from "@/server/auth/api-session";
import { serializeAgentRun } from "@/server/ops/serialize-run";
import { getOpsQueue } from "@/server/queue/ops-queue";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const gate = await requireAuth();
    if ("error" in gate) return gate.error;

    const { searchParams } = new URL(request.url);
    const latest = searchParams.get("latest") === "1";
    if (!latest) {
      return NextResponse.json(
        { ok: false, error: "Use ?latest=1 to load the most recent run" },
        { status: 400 },
      );
    }

    const programId =
      searchParams.get("programId") ?? gate.session.membership.programId;
    const wrong = assertSameProgram(gate.session, programId);
    if (wrong) return wrong;

    const prisma = getPrisma();
    const run = await prisma.agentRun.findFirst({
      where: { programId },
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
    const gate = await requireDirector();
    if ("error" in gate) return gate.error;

    const body = (await request.json().catch(() => ({}))) as {
      programId?: string;
    };

    const programId = body.programId ?? gate.session.membership.programId;
    const wrong = assertSameProgram(gate.session, programId);
    if (wrong) return wrong;

    const prisma = getPrisma();
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
