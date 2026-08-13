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

    const summary = (run.summary ?? {}) as {
      briefing?: string;
      pendingApprovals?: number;
    };
    const referee = run.steps.find((s) => s.agent === "REFEREE");
    const refereePayload = (referee?.payload ?? {}) as {
      exceptions?: { name: string; reason: string; severity: string }[];
      complete?: number;
      weak?: number;
      missing?: number;
    };
    const coach = run.steps.find((s) => s.agent === "COACH");
    const coachPayload = (coach?.payload ?? {}) as { draftCount?: number };

    const complete = refereePayload.complete ?? 0;
    const weak = refereePayload.weak ?? 0;
    const missing = refereePayload.missing ?? 0;
    const exceptions = refereePayload.exceptions ?? [];
    const draftCount = coachPayload.draftCount ?? run.approvals.length;

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
        exceptions,
        approvals: run.approvals.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          targetName: a.targetName,
        })),
        stats: {
          onTrack: complete,
          students: complete + weak + missing,
          exceptions: exceptions.length,
          draftNudges: draftCount,
        },
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
