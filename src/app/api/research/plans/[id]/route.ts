import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { inLab, requireLabDirector } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const { id } = await params;
    const { findResearchPlanInLab, agentLaterOf } = await import(
      "@/server/research/plan-repo"
    );
    const plan = await findResearchPlanInLab({
      labId: gate.ctx.labId,
      programId: gate.ctx.membership.programId,
      planId: id,
    });
    if (!plan) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      plan: {
        id: plan.id,
        topic: plan.topic,
        weeks: plan.weeks,
        source: plan.source,
        createdAt: plan.createdAt.toISOString(),
        assignments: plan.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          agentLater: agentLaterOf(m.rubric),
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load plan",
      },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const { id } = await params;
    const prisma = getPrisma();
    const plan = await prisma.researchPlan.findFirst({
      where: { id, programId: gate.ctx.membership.programId, ...inLab(gate.ctx.labId) },
      include: { _count: { select: { milestones: true } } },
    });
    if (!plan) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.milestone.deleteMany({
        where: { researchPlanId: plan.id, organizationId: gate.ctx.labId },
      }),
      prisma.researchPlan.delete({ where: { id: plan.id } }),
    ]);

    return NextResponse.json({
      ok: true,
      deletedAssignments: plan._count.milestones,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to delete plan",
      },
      { status: 503 },
    );
  }
}
