import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

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

    const summary = (run.summary ?? {}) as { briefing?: string };
    const referee = run.steps.find((s) => s.agent === "REFEREE");
    const refereePayload = (referee?.payload ?? {}) as {
      exceptions?: { name: string; reason: string; severity: string }[];
    };

    return NextResponse.json({
      ok: true,
      run: {
        id: run.id,
        status: run.status,
        programId: run.programId,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        steps: run.steps.map((step) => ({
          id: step.id,
          agent: step.agent,
          title: step.title,
          detail: step.detail,
          status: step.status.toLowerCase(),
          sortOrder: step.sortOrder,
          startedAt: step.startedAt,
          finishedAt: step.finishedAt,
        })),
        exceptions: refereePayload.exceptions ?? [],
        approvals: run.approvals.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          targetName: a.targetName,
        })),
        briefing:
          summary.briefing ??
          ((run.steps.find((s) => s.agent === "CLERK")?.payload as { briefing?: string })
            ?.briefing ??
            null),
      },
    });
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
