import { NextResponse } from "next/server";
import { MilestoneStatus, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import type {
  AssignmentDataSchema,
  AssignmentRubric,
  MaterialItem,
} from "@/lib/assignment-types";
import { groupCellsToTable, parseDataSchema } from "@/server/data/submission-data";
import {
  replaceAssignees,
  resolveStudentTargets,
  studentAssignedToMilestone,
} from "@/server/assignments/audience";
import {
  requireLabDirector,
  requireLabScope,
} from "@/server/tenancy/lab-scope";
import {
  findMilestoneDetailInLab,
  findMilestoneInLab,
} from "@/server/tenancy/lab-repo";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function asAttachments(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export async function GET(request: Request, { params }: Params) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const { id } = await params;
    const assignment = await findMilestoneDetailInLab(gate.ctx.labId, id);

    if (!assignment) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const isDirector = gate.ctx.appRole === "director";
    const myMemberId = gate.ctx.membership.id;

    if (!isDirector) {
      const allowed = await studentAssignedToMilestone({
        labId: gate.ctx.labId,
        milestoneId: assignment.id,
        memberId: myMemberId,
        audience: assignment.audience,
      });
      if (!allowed) {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      }
    }

    const submissions = isDirector
      ? assignment.submissions
      : assignment.submissions.filter((s) => s.memberId === myMemberId);

    const studentCount =
      assignment.audience === "SELECTED"
        ? assignment.assignees.length
        : assignment.program.members.length;
    const turnedIn = assignment.submissions.filter((s) =>
      ["SUBMITTED", "SCORED"].includes(s.status),
    ).length;
    const pendingReview = assignment.submissions.filter(
      (s) => s.reviewStatus === "PENDING_REVIEW",
    ).length;
    const needsRevision = assignment.submissions.filter(
      (s) => s.reviewStatus === "NEEDS_REVISION",
    ).length;
    const approved = assignment.submissions.filter(
      (s) =>
        s.reviewStatus === "APPROVED" || s.reviewStatus === "DONE",
    ).length;

    const submissionIds = submissions.map((s) => s.id);
    const prisma = getPrisma();
    const allCells =
      submissionIds.length === 0
        ? []
        : await prisma.submissionDataPoint.findMany({
            where: {
              organizationId: gate.ctx.labId,
              submissionId: { in: submissionIds },
            },
            orderBy: [{ rowIndex: "asc" }, { columnName: "asc" }],
          });

    const cellsBySubmission = new Map<string, typeof allCells>();
    for (const cell of allCells) {
      const list = cellsBySubmission.get(cell.submissionId) ?? [];
      list.push(cell);
      cellsBySubmission.set(cell.submissionId, list);
    }

    return NextResponse.json({
      ok: true,
      assignment: {
        id: assignment.id,
        programId: assignment.programId,
        organizationId: assignment.organizationId,
        title: assignment.title,
        description: assignment.description,
        instructions: assignment.instructions,
        materials: assignment.materials,
        rubric: assignment.rubric,
        dataSchema: parseDataSchema(assignment.dataSchema),
        // Reading-list / coachResources search removed — directors attach materials manually.
        coachResources: null,
        dueAt: assignment.dueAt,
        status: assignment.status,
        audience: assignment.audience,
        assigneeIds: assignment.assignees.map((a) => a.memberId),
        assignees: assignment.assignees.map((a) => ({
          memberId: a.memberId,
          name: a.member.user.name,
          email: a.member.user.email,
        })),
        stats: {
          studentCount,
          turnedIn,
          pendingReview,
          needsRevision,
          approved,
        },
        submissions: submissions.map((s) => ({
          id: s.id,
          memberId: s.memberId,
          studentName: s.member.user.name,
          studentEmail: s.member.user.email,
          status: s.status,
          evidenceUrl: s.evidenceUrl,
          repoUrl: s.repoUrl,
          writeup: s.writeup,
          checklist: s.checklist,
          attachments: asAttachments(s.attachments),
          score: s.score,
          reviewStatus: s.reviewStatus,
          reviewComment: s.reviewComment,
          reviewedAt: s.reviewedAt,
          submittedAt: s.submittedAt,
          updatedAt: s.updatedAt,
          dataTable: groupCellsToTable(cellsBySubmission.get(s.id) ?? []),
          posts: (s.posts ?? []).map((p) => ({
            id: p.id,
            version: p.version,
            writeup: p.writeup,
            evidenceUrl: p.evidenceUrl,
            repoUrl: p.repoUrl,
            attachments: asAttachments(p.attachments),
            submittedAt: p.submittedAt.toISOString(),
            editedAt: p.editedAt?.toISOString() ?? null,
          })),
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load assignment",
      },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const { id } = await params;
    const existing = await findMilestoneInLab(gate.ctx.labId, id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      title?: string;
      description?: string | null;
      instructions?: string | null;
      dueAt?: string | null;
      status?: MilestoneStatus;
      materials?: MaterialItem[];
      rubric?: AssignmentRubric;
      dataSchema?: AssignmentDataSchema | null;
      audience?: "ALL" | "SELECTED";
      memberIds?: string[];
    };

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : existing.title;
    const description =
      body.description === undefined
        ? existing.description
        : body.description?.trim() || null;

    const dataSchema =
      body.dataSchema === undefined
        ? undefined
        : parseDataSchema(body.dataSchema);

    const targets =
      body.audience === undefined
        ? null
        : await resolveStudentTargets({
            labId: gate.ctx.labId,
            programId: existing.programId,
            audience: body.audience,
            memberIds: body.memberIds,
          });
    if (targets && !targets.ok) {
      return NextResponse.json(
        { ok: false, error: targets.error },
        { status: targets.status },
      );
    }

    const prisma = getPrisma();
    const assignment = await prisma.milestone.update({
      where: { id: existing.id },
      data: {
        title,
        description,
        instructions:
          body.instructions === undefined
            ? undefined
            : body.instructions?.trim() || null,
        dueAt:
          body.dueAt === undefined
            ? undefined
            : body.dueAt
              ? new Date(body.dueAt)
              : null,
        status: body.status,
        audience: targets?.audience,
        materials:
          body.materials === undefined
            ? undefined
            : (body.materials as Prisma.InputJsonValue),
        rubric:
          body.rubric === undefined
            ? undefined
            : (body.rubric as Prisma.InputJsonValue),
        dataSchema:
          dataSchema === undefined
            ? undefined
            : dataSchema
              ? (dataSchema as unknown as Prisma.InputJsonValue)
              : Prisma.DbNull,
      },
    });
    if (targets) {
      await replaceAssignees({
        labId: gate.ctx.labId,
        milestoneId: existing.id,
        audience: targets.audience,
        memberIds: targets.memberIds,
      });
    }

    return NextResponse.json({ ok: true, assignment });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to update assignment",
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
    const existing = await findMilestoneInLab(gate.ctx.labId, id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    if (existing.programId !== gate.ctx.membership.programId) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const prisma = getPrisma();
    await prisma.milestone.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to delete assignment",
      },
      { status: 503 },
    );
  }
}
