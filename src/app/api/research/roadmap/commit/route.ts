import { MilestoneStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import {
  dueAtForWeek,
  sanitizeRoadmap,
  type RoadmapStep,
} from "@/server/research/roadmap";
import { requireLabDirector } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      topic?: string;
      weeks?: number;
      steps?: Array<Partial<RoadmapStep>>;
    };

    const roadmap = sanitizeRoadmap({
      topic: body.topic ?? "",
      weeks: body.weeks ?? 6,
      source: "heuristic",
      steps: body.steps ?? [],
    });

    if (roadmap.steps.length < 3) {
      return NextResponse.json(
        { ok: false, error: "Keep at least three steps, or draft again." },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const programId = gate.ctx.membership.programId;
    const organizationId = gate.ctx.labId;

    const maxSort = await prisma.milestone.aggregate({
      where: { programId, organizationId },
      _max: { sortOrder: true },
    });
    let sort = maxSort._max.sortOrder ?? 0;

    const plan = await prisma.researchPlan.create({
      data: {
        organizationId,
        programId,
        topic: roadmap.topic,
        weeks: roadmap.weeks,
        source: roadmap.source,
      },
    });

    const created = await prisma.$transaction(
      roadmap.steps.map((step, i) => {
        sort += 1;
        const collect = step.kind === "collect" || step.acceptData;
        return prisma.milestone.create({
          data: {
            organizationId,
            programId,
            researchPlanId: plan.id,
            title: step.title,
            description: `${step.description}\n\nPlan: ${roadmap.topic}`,
            instructions: step.instructions,
            dueAt: dueAtForWeek(step.week),
            status: i === 0 ? MilestoneStatus.ACTIVE : MilestoneStatus.UPCOMING,
            sortOrder: sort,
            materials: [] as Prisma.InputJsonValue,
            dataSchema: collect
              ? ({
                  columns:
                    step.dataColumns.length > 0
                      ? step.dataColumns
                      : [{ name: "note", type: "text" }],
                } as Prisma.InputJsonValue)
              : Prisma.DbNull,
            rubric: {
              requireEvidenceUrl: step.kind !== "collect",
              requireWriteup: step.kind !== "collect",
              requireRepoUrl: false,
              minWriteupLength: 40,
              checklist: step.checklist,
              acceptData: collect,
              requireData: collect,
              researchTopic: roadmap.topic,
              agentLater: step.agentLater,
            } as Prisma.InputJsonValue,
          },
        });
      }),
    );

    return NextResponse.json({
      ok: true,
      planId: plan.id,
      topic: roadmap.topic,
      assignmentIds: created.map((m) => m.id),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to add assignments",
      },
      { status: 503 },
    );
  }
}
