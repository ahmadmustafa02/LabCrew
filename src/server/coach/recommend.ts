import { MilestoneStatus, SubmissionStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { parseDataSchema } from "@/server/data/submission-data";
import { studentMilestoneWhere } from "@/server/assignments/audience";
import { milestoneIsOnboard } from "@/server/desk/onboard";
import { inLab } from "@/server/tenancy/lab-scope";

export type NextStepKind = "collect" | "writeup" | "catalog" | "gear" | "clear";

export type NextStep = {
  kind: NextStepKind;
  title: string;
  reason: string;
  href: string;
  assignmentId?: string;
};

type Candidate = {
  id: string;
  title: string;
  dueAt: Date | null;
  collect: boolean;
  onboard: boolean;
  submitted: boolean;
  draft: boolean;
  rowCount: number;
};

export function pickNextStep(input: {
  tasks: Candidate[];
  heldCatalog: number;
  overdueGear?: { name: string } | null;
}): NextStep {
  const openOnboard = input.tasks
    .filter((t) => t.onboard && !t.submitted)
    .sort((a, b) => (a.dueAt?.getTime() ?? 9e15) - (b.dueAt?.getTime() ?? 9e15))[0];
  if (openOnboard) {
    return {
      kind: openOnboard.collect ? "collect" : "writeup",
      title: openOnboard.title,
      reason: "Week 0 first — accounts, safety, or a practice collect. Then the term work.",
      href: `/app/assignments/${openOnboard.id}`,
      assignmentId: openOnboard.id,
    };
  }

  const openCollect = input.tasks
    .filter((t) => t.collect && !t.submitted)
    .sort((a, b) => (a.dueAt?.getTime() ?? 9e15) - (b.dueAt?.getTime() ?? 9e15));

  const empty = openCollect.find((t) => t.rowCount === 0);
  if (empty) {
    return {
      kind: "collect",
      title: empty.title,
      reason:
        empty.rowCount === 0
          ? "No field rows yet. Log a station before the writeup."
          : "Open collection.",
      href: `/app/assignments/${empty.id}`,
      assignmentId: empty.id,
    };
  }

  const draft = openCollect.find((t) => t.draft || t.rowCount > 0);
  if (draft) {
    return {
      kind: "collect",
      title: draft.title,
      reason: "You already started a log. Finish and turn it in.",
      href: `/app/assignments/${draft.id}`,
      assignmentId: draft.id,
    };
  }

  const writeup = input.tasks
    .filter((t) => !t.collect && !t.submitted)
    .sort((a, b) => (a.dueAt?.getTime() ?? 9e15) - (b.dueAt?.getTime() ?? 9e15))[0];
  if (writeup) {
    return {
      kind: "writeup",
      title: writeup.title,
      reason: "Field logs are in. Next is the short report — same week, different skill.",
      href: `/app/assignments/${writeup.id}`,
      assignmentId: writeup.id,
    };
  }

  if (input.overdueGear) {
    return {
      kind: "gear",
      title: input.overdueGear.name,
      reason: "This is past the return date. Put it back on Who has what.",
      href: "/app/desk",
    };
  }

  if (input.heldCatalog > 0) {
    return {
      kind: "catalog",
      title: "Catalog review",
      reason: `${input.heldCatalog} field${input.heldCatalog === 1 ? "" : "s"} waiting on a source check.`,
      href: "/app/catalog",
    };
  }

  return {
    kind: "clear",
    title: "Nothing queued",
    reason: "No open collection, writeup, or held catalog field.",
    href: "/app/assignments",
  };
}

function isCollect(milestone: { rubric: unknown; dataSchema: unknown }) {
  const rubric = (milestone.rubric ?? {}) as { acceptData?: boolean };
  return Boolean(rubric.acceptData) || parseDataSchema(milestone.dataSchema) != null;
}

export async function loadNextStep(input: {
  labId: string;
  programId: string;
  memberId: string;
}): Promise<NextStep> {
  const prisma = getPrisma();
  const lab = inLab(input.labId);

  const milestones = await prisma.milestone.findMany({
    where: {
      programId: input.programId,
      ...lab,
      status: { in: [MilestoneStatus.ACTIVE, MilestoneStatus.UPCOMING] },
      ...studentMilestoneWhere(input.memberId),
    },
    include: {
      submissions: {
        where: { memberId: input.memberId, organizationId: input.labId },
        include: {
          _count: { select: { dataPoints: true } },
        },
        take: 1,
      },
    },
  });

  const [heldCatalog, overdue] = await Promise.all([
    prisma.catalogField.count({
      where: { organizationId: input.labId, trust: "held" },
    }),
    prisma.equipment.findFirst({
      where: {
        organizationId: input.labId,
        programId: input.programId,
        holderMemberId: input.memberId,
        status: "CHECKED_OUT",
        dueBackAt: { lt: new Date() },
      },
      select: { name: true },
    }),
  ]);

  const tasks: Candidate[] = milestones.map((ms) => {
    const sub = ms.submissions[0];
    const submitted =
      sub != null &&
      (sub.status === SubmissionStatus.SUBMITTED ||
        sub.status === SubmissionStatus.SCORED);
    return {
      id: ms.id,
      title: ms.title,
      dueAt: ms.dueAt,
      collect: isCollect(ms),
      onboard: milestoneIsOnboard(ms.rubric),
      submitted,
      draft: sub?.status === SubmissionStatus.DRAFT,
      rowCount: sub?._count.dataPoints ?? 0,
    };
  });

  return pickNextStep({
    tasks,
    heldCatalog,
    overdueGear: overdue,
  });
}
