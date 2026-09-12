import { MilestoneStatus, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { inLab } from "@/server/tenancy/lab-scope";

export function milestoneIsOnboard(rubric: unknown): boolean {
  return Boolean((rubric as { onboarding?: boolean } | null)?.onboarding);
}

const STEPS = [
  {
    title: "Week 0 — Account works",
    description: "Sign in, open Assignments, confirm you can see this lab.",
    instructions:
      "Turn in a one-line note: you signed in and opened Who has what. Do not invent a paper.",
    collect: false,
  },
  {
    title: "Week 0 — Safety note",
    description: "Short acknowledgement of lab rules the director posted.",
    instructions:
      "Write three sentences: what you will not do with lab stuff, who you tell if something is broken.",
    collect: false,
  },
  {
    title: "Week 0 — First collect",
    description: "One small log so the week-1 collect is not the first time you see the form.",
    instructions: "Log 2–4 rows. Blanks allowed. This is practice, not a paper.",
    collect: true,
  },
];

export async function onboardAlreadyExists(input: {
  labId: string;
  programId: string;
}): Promise<boolean> {
  const rows = await getPrisma().milestone.findMany({
    where: { programId: input.programId, ...inLab(input.labId) },
    select: { title: true, rubric: true },
  });
  return rows.some((r) => milestoneIsOnboard(r.rubric) || r.title.startsWith("Week 0 —"));
}

export async function createOnboardTrack(input: {
  labId: string;
  programId: string;
}): Promise<{ created: number }> {
  if (await onboardAlreadyExists(input)) {
    return { created: 0 };
  }

  const prisma = getPrisma();
  const maxSort = await prisma.milestone.aggregate({
    where: { programId: input.programId, organizationId: input.labId },
    _max: { sortOrder: true },
  });
  let sort = (maxSort._max.sortOrder ?? 0) - STEPS.length;
  if (sort < 0) sort = 0;

  const now = new Date();
  await prisma.$transaction(
    STEPS.map((step, i) => {
      const due = new Date(now);
      due.setDate(due.getDate() + i * 2);
      due.setHours(17, 0, 0, 0);
      return prisma.milestone.create({
        data: {
          organizationId: input.labId,
          programId: input.programId,
          title: step.title,
          description: step.description,
          instructions: step.instructions,
          dueAt: due,
          status: i === 0 ? MilestoneStatus.ACTIVE : MilestoneStatus.UPCOMING,
          sortOrder: sort + i,
          materials: [] as Prisma.InputJsonValue,
          dataSchema: step.collect
            ? ({
                columns: [
                  { name: "site", type: "text" },
                  { name: "note", type: "text" },
                ],
              } as Prisma.InputJsonValue)
            : Prisma.DbNull,
          rubric: {
            requireEvidenceUrl: false,
            requireWriteup: !step.collect,
            requireRepoUrl: false,
            minWriteupLength: 20,
            checklist: step.collect
              ? ["At least two rows"]
              : ["Short note turned in"],
            acceptData: step.collect,
            requireData: step.collect,
            onboarding: true,
          } as Prisma.InputJsonValue,
        },
      });
    }),
  );

  return { created: STEPS.length };
}
