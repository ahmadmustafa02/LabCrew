import { getPrisma } from "@/lib/db";
import { inLab } from "@/server/tenancy/lab-scope";

export type PlanListItem = {
  id: string;
  topic: string;
  weeks: number;
  source: string | null;
  assignmentCount: number;
  createdAt: string;
};

export function topicFromMilestone(row: {
  description: string | null;
  rubric: unknown;
}): string | null {
  const rubric = (row.rubric ?? {}) as { researchTopic?: unknown };
  if (typeof rubric.researchTopic === "string" && rubric.researchTopic.trim()) {
    return rubric.researchTopic.trim();
  }
  const m = row.description?.match(/\nPlan:\s*(.+)$/m);
  return m?.[1]?.trim() || null;
}

export async function backfillOrphanPlans(input: {
  labId: string;
  programId: string;
}) {
  const prisma = getPrisma();
  const orphans = await prisma.milestone.findMany({
    where: {
      programId: input.programId,
      ...inLab(input.labId),
      researchPlanId: null,
    },
    select: { id: true, description: true, rubric: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, { ids: string[]; createdAt: Date }>();
  for (const row of orphans) {
    const topic = topicFromMilestone(row);
    if (!topic) continue;
    const g = groups.get(topic) ?? { ids: [], createdAt: row.createdAt };
    g.ids.push(row.id);
    if (row.createdAt < g.createdAt) g.createdAt = row.createdAt;
    groups.set(topic, g);
  }

  for (const [topic, g] of groups) {
    const plan = await prisma.researchPlan.create({
      data: {
        organizationId: input.labId,
        programId: input.programId,
        topic,
        weeks: Math.min(8, Math.max(4, g.ids.length)),
        source: "imported",
        createdAt: g.createdAt,
      },
    });
    await prisma.milestone.updateMany({
      where: { id: { in: g.ids }, organizationId: input.labId },
      data: { researchPlanId: plan.id },
    });
  }
}

export async function listResearchPlans(input: {
  labId: string;
  programId: string;
}): Promise<PlanListItem[]> {
  await backfillOrphanPlans(input);
  const rows = await getPrisma().researchPlan.findMany({
    where: { programId: input.programId, ...inLab(input.labId) },
    include: { _count: { select: { milestones: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((p) => ({
    id: p.id,
    topic: p.topic,
    weeks: p.weeks,
    source: p.source,
    assignmentCount: p._count.milestones,
    createdAt: p.createdAt.toISOString(),
  }));
}
