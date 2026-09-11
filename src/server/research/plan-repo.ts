import { getPrisma } from "@/lib/db";
import { inLab } from "@/server/tenancy/lab-scope";

export async function findResearchPlanInLab(input: {
  labId: string;
  programId: string;
  planId: string;
}) {
  return getPrisma().researchPlan.findFirst({
    where: {
      id: input.planId,
      programId: input.programId,
      ...inLab(input.labId),
    },
    include: {
      milestones: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          rubric: true,
          materials: true,
        },
      },
    },
  });
}

export function agentLaterOf(rubric: unknown): "papers" | "datasets" | null {
  const v = (rubric ?? {}) as { agentLater?: unknown };
  if (v.agentLater === "papers" || v.agentLater === "datasets") return v.agentLater;
  return null;
}
