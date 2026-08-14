import {
  AgentName,
  AgentRunStatus,
  AgentStepStatus,
  ApprovalStatus,
  MemberRole,
  MilestoneStatus,
  Prisma,
  SubmissionStatus,
} from "@prisma/client";
import { getPrisma } from "../../lib/db";

const STEP_PAUSE_MS = 450;

type StepDef = {
  agent: AgentName;
  title: string;
  run: () => Promise<{ detail: string; payload?: Prisma.InputJsonValue }>;
};

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function executeWeeklyOps(runId: string) {
  const prisma = getPrisma();
  const run = await prisma.agentRun.findUniqueOrThrow({
    where: { id: runId },
    include: { program: true },
  });

  await prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: AgentRunStatus.RUNNING,
      startedAt: new Date(),
    },
  });

  const programId = run.programId;

  const steps: StepDef[] = [
    {
      agent: AgentName.DISPATCHER,
      title: "Opened weekly ops run",
      run: async () => ({
        detail: "Queued Pulse -> Referee -> Coach -> Clerk",
      }),
    },
    {
      agent: AgentName.PULSE,
      title: "Collected cohort signals",
      run: async () => {
        // SUBMITTED and SCORED both count as "turned in" (SCORED is post-Referee).
        const turnedIn = {
          in: [SubmissionStatus.SUBMITTED, SubmissionStatus.SCORED],
        };

        const [students, submissions, activeMilestone] = await Promise.all([
          prisma.member.count({
            where: { programId, role: MemberRole.STUDENT },
          }),
          prisma.submission.count({
            where: {
              member: { programId },
              status: turnedIn,
            },
          }),
          prisma.milestone.findFirst({
            where: { programId, status: MilestoneStatus.ACTIVE },
          }),
        ]);

        const silent = await prisma.member.findMany({
          where: {
            programId,
            role: MemberRole.STUDENT,
            submissions: {
              none: {
                milestoneId: activeMilestone?.id,
                status: turnedIn,
              },
            },
          },
          include: { user: true },
        });

        return {
          detail: `${students} members | ${submissions} submissions | ${silent.length} missing active milestone`,
          payload: {
            students,
            submissions,
            missing: silent.map((m) => m.user.name),
          },
        };
      },
    },
    {
      agent: AgentName.REFEREE,
      title: "Scored evidence against rubric",
      run: async () => {
        const activeMilestone = await prisma.milestone.findFirst({
          where: { programId, status: MilestoneStatus.ACTIVE },
        });
        if (!activeMilestone) {
          return { detail: "No active milestone - nothing to score" };
        }

        const rubric = (activeMilestone.rubric ?? {}) as {
          requireEvidenceUrl?: boolean;
          requireWriteup?: boolean;
          requireRepoUrl?: boolean;
          minWriteupLength?: number;
        };
        const requireEvidence = rubric.requireEvidenceUrl !== false;
        const requireWriteup = rubric.requireWriteup !== false;
        const requireRepo = Boolean(rubric.requireRepoUrl);
        const minWriteup = rubric.minWriteupLength ?? 40;

        const students = await prisma.member.findMany({
          where: { programId, role: MemberRole.STUDENT },
          include: { user: true },
        });
        const rows = await prisma.submission.findMany({
          where: { milestoneId: activeMilestone.id },
        });
        const byMember = new Map(rows.map((r) => [r.memberId, r]));

        let complete = 0;
        let weak = 0;
        let missing = 0;
        const exceptions: { name: string; reason: string; severity: string }[] =
          [];

        for (const student of students) {
          const name = student.user.name;
          const row = byMember.get(student.id);

          if (!row || row.status === SubmissionStatus.DRAFT) {
            missing += 1;
            exceptions.push({
              name,
              reason: "No submission - milestone still open",
              severity: "high",
            });
            continue;
          }

          const writeup = (row.writeup ?? "").trim();
          const hasEvidence = Boolean(row.evidenceUrl);
          const hasRepo = Boolean(row.repoUrl);
          const problems: string[] = [];

          if (requireEvidence && !hasEvidence) {
            problems.push("Demo/evidence link missing");
          }
          if (requireRepo && !hasRepo) {
            problems.push("GitHub repo missing");
          }
          if (requireWriteup && writeup.length < minWriteup) {
            problems.push("Writeup too thin vs rubric");
          }

          if (problems.length === 0) {
            complete += 1;
            await prisma.submission.update({
              where: { id: row.id },
              data: {
                status: SubmissionStatus.SCORED,
                score: {
                  complete: true,
                  notes: `Meets rubric for ${activeMilestone.title}`,
                },
              },
            });
          } else {
            weak += 1;
            exceptions.push({
              name,
              reason: problems[0],
              severity: problems[0].includes("missing") ? "high" : "medium",
            });
            await prisma.submission.update({
              where: { id: row.id },
              data: {
                status: SubmissionStatus.SCORED,
                score: { complete: false, notes: problems.join("; ") },
              },
            });
          }
        }

        return {
          detail: `${complete} complete | ${weak} weak | ${missing} missing`,
          payload: { complete, weak, missing, exceptions },
        };
      },
    },
    {
      agent: AgentName.COACH,
      title: "Drafted personalized nudges",
      run: async () => {
        const refereeStep = await prisma.agentStep.findFirst({
          where: { runId, agent: AgentName.REFEREE, status: AgentStepStatus.SUCCEEDED },
          orderBy: { sortOrder: "desc" },
        });
        const payload = (refereeStep?.payload ?? {}) as {
          exceptions?: { name: string; reason: string; severity: string }[];
        };
        const exceptions = payload.exceptions ?? [];

        await prisma.approvalItem.deleteMany({
          where: { programId, status: ApprovalStatus.PENDING, kind: "nudge" },
        });

        for (const item of exceptions) {
          const body =
            item.severity === "high"
              ? `Hi ${item.name.split(" ")[0]} — ${item.reason}. The smallest next step is a short status note today, even if the demo isn’t perfect.`
              : `Hi ${item.name.split(" ")[0]} — ${item.reason}. A tight 5-bullet update against the Week 4 rubric will unblock review.`;

          await prisma.approvalItem.create({
            data: {
              programId,
              runId,
              kind: "nudge",
              title: `Nudge - ${item.name}`,
              body,
              targetName: item.name,
              status: ApprovalStatus.PENDING,
            },
          });
        }

        return {
          detail: `${exceptions.length} high-priority drafts ready for approval`,
          payload: { draftCount: exceptions.length },
        };
      },
    },
    {
      agent: AgentName.CLERK,
      title: "Compiled director briefing",
      run: async () => {
        const refereeStep = await prisma.agentStep.findFirst({
          where: {
            runId,
            agent: AgentName.REFEREE,
            status: AgentStepStatus.SUCCEEDED,
          },
          orderBy: { sortOrder: "desc" },
        });
        const referee = (refereeStep?.payload ?? {}) as {
          complete?: number;
          weak?: number;
          missing?: number;
          exceptions?: { name: string; reason: string; severity: string }[];
        };
        const pending = await prisma.approvalItem.count({
          where: { programId, status: ApprovalStatus.PENDING },
        });
        const complete = referee.complete ?? 0;
        const weak = referee.weak ?? 0;
        const missing = referee.missing ?? 0;
        const exceptions = referee.exceptions ?? [];
        const names = exceptions.slice(0, 3).map((e) => e.name.split(" ")[0]);

        const briefing =
          pending === 0
            ? `${complete} students are on track for the active milestone. No exception packet this week — use standup for demos and questions.`
            : `${complete} on track, ${weak} weak, ${missing} missing. Focus Monday on ${names.join(", ") || "the exception list"}. ${pending} Coach draft${pending === 1 ? "" : "s"} wait in Approvals.`;

        const agenda =
          pending === 0
            ? [
                "Quick wins from on-track demos",
                "Open questions from the cohort",
                "Next milestone expectations",
              ]
            : [
                `Unblock ${names[0] ?? "at-risk students"} first`,
                "Approve or edit pending nudges",
                "Confirm Week deliverable bar for everyone else",
              ];

        const detail =
          pending === 0
            ? "Cohort looks clear — no exception packet needed"
            : `Exception packet ready | ${pending} drafts awaiting director approval`;

        return {
          detail,
          payload: {
            briefing,
            agenda,
            pendingApprovals: pending,
            complete,
            weak,
            missing,
          },
        };
      },
    },
  ];

  try {
    for (const [index, def] of steps.entries()) {
      const step = await prisma.agentStep.create({
        data: {
          runId,
          agent: def.agent,
          title: def.title,
          status: AgentStepStatus.RUNNING,
          startedAt: new Date(),
          sortOrder: index,
        },
      });

      await sleep(STEP_PAUSE_MS);
      const result = await def.run();

      await prisma.agentStep.update({
        where: { id: step.id },
        data: {
          status: AgentStepStatus.SUCCEEDED,
          detail: result.detail,
          payload: result.payload,
          finishedAt: new Date(),
        },
      });
    }

    const clerkStep = await prisma.agentStep.findFirst({
      where: {
        runId,
        agent: AgentName.CLERK,
        status: AgentStepStatus.SUCCEEDED,
      },
      orderBy: { sortOrder: "desc" },
    });
    const clerkPayload = (clerkStep?.payload ?? {}) as {
      briefing?: string;
      agenda?: string[];
      pendingApprovals?: number;
    };

    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: AgentRunStatus.SUCCEEDED,
        finishedAt: new Date(),
        summary: {
          ok: true,
          finishedAt: new Date().toISOString(),
          briefing: clerkPayload.briefing ?? null,
          agenda: clerkPayload.agenda ?? [],
          pendingApprovals: clerkPayload.pendingApprovals ?? 0,
        },
      },
    });

    return { ok: true as const, runId };
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: AgentRunStatus.FAILED,
        finishedAt: new Date(),
        summary: {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    });
    throw error;
  }
}
