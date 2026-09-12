import { MemberRole, MilestoneAudience, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";

export function studentMilestoneWhere(memberId: string): Prisma.MilestoneWhereInput {
  return {
    OR: [
      { audience: MilestoneAudience.ALL },
      { assignees: { some: { memberId } } },
    ],
  };
}

export function studentCanSeeMilestone(input: {
  audience: MilestoneAudience;
  assigneeIds: string[];
  memberId: string;
}): boolean {
  if (input.audience !== MilestoneAudience.SELECTED) return true;
  return input.assigneeIds.includes(input.memberId);
}

export async function studentAssignedToMilestone(input: {
  labId: string;
  milestoneId: string;
  memberId: string;
  audience: MilestoneAudience;
}): Promise<boolean> {
  if (input.audience !== MilestoneAudience.SELECTED) return true;
  const row = await getPrisma().milestoneAssignee.findFirst({
    where: {
      organizationId: input.labId,
      milestoneId: input.milestoneId,
      memberId: input.memberId,
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function resolveStudentTargets(input: {
  labId: string;
  programId: string;
  audience?: "ALL" | "SELECTED";
  memberIds?: string[];
}): Promise<
  | { ok: true; audience: MilestoneAudience; memberIds: string[] }
  | { ok: false; error: string; status: number }
> {
  const audience =
    input.audience === "SELECTED" ? MilestoneAudience.SELECTED : MilestoneAudience.ALL;

  const students = await getPrisma().member.findMany({
    where: {
      programId: input.programId,
      organizationId: input.labId,
      role: MemberRole.STUDENT,
    },
    select: { id: true },
  });
  const allowed = new Set(students.map((s) => s.id));

  if (audience === MilestoneAudience.ALL) {
    return { ok: true, audience, memberIds: [] };
  }

  const ids = [...new Set((input.memberIds ?? []).filter((id) => allowed.has(id)))];
  if (ids.length === 0) {
    return { ok: false, error: "Select at least one student", status: 400 };
  }
  return { ok: true, audience, memberIds: ids };
}

export async function replaceAssignees(input: {
  labId: string;
  milestoneId: string;
  audience: MilestoneAudience;
  memberIds: string[];
}) {
  const prisma = getPrisma();
  await prisma.milestoneAssignee.deleteMany({
    where: { milestoneId: input.milestoneId, organizationId: input.labId },
  });
  if (input.audience === MilestoneAudience.SELECTED && input.memberIds.length > 0) {
    await prisma.milestoneAssignee.createMany({
      data: input.memberIds.map((memberId) => ({
        organizationId: input.labId,
        milestoneId: input.milestoneId,
        memberId,
      })),
    });
  }
}
