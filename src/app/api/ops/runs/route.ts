import { NextResponse } from "next/server";
import { AgentRunStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { serializeAgentRun } from "@/server/ops/serialize-run";
import { getOpsQueue } from "@/server/queue/ops-queue";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latest = searchParams.get("latest") === "1";
    const programIdParam = searchParams.get("programId");

    if (!latest) {
      return NextResponse.json(
        { ok: false, error: "Use ?latest=1 to load the most recent run" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    let programId = programIdParam;

    if (!programId) {
      const program = await prisma.program.findFirst({
        where: { organization: { slug: "northwater" } },
        orderBy: { createdAt: "asc" },
      });
      if (!program) {
        return NextResponse.json({ ok: true, run: null });
      }
      programId = program.id;
    }

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
