import { NextResponse } from "next/server";
import { Prisma, ReviewStatus, SubmissionStatus } from "@prisma/client";
import type { AssignmentRubric } from "@/lib/assignment-types";
import { getPrisma } from "@/lib/db";
import {
  groupCellsToTable,
  parseCsvToRows,
  parseDataSchema,
  rowsToDataPoints,
  type DataRowInput,
} from "@/server/data/submission-data";
import { requireLabStudent } from "@/server/tenancy/lab-scope";
import {
  findDataPointsForSubmissionInLab,
  findMilestoneInLab,
} from "@/server/tenancy/lab-repo";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type Attachment = {
  id: string;
  title: string;
  kind: string;
  url: string;
  originalName?: string;
  size?: number;
};

function rubricOf(milestone: { rubric: unknown }): AssignmentRubric {
  return (milestone.rubric ?? {}) as AssignmentRubric;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const gate = await requireLabStudent(request);
    if ("error" in gate) return gate.error;

    const { id: milestoneId } = await params;
    const memberId = gate.ctx.membership.id;
    const labId = gate.ctx.labId;
    const prisma = getPrisma();

    const milestone = await findMilestoneInLab(labId, milestoneId);
    if (!milestone) {
      return NextResponse.json(
        { ok: false, error: "Assignment not found" },
        { status: 404 },
      );
    }

    const submission = await prisma.submission.findUnique({
      where: {
        milestoneId_memberId: { milestoneId, memberId },
      },
    });

    if (submission && submission.organizationId !== labId) {
      return NextResponse.json(
        { ok: false, error: "Assignment not found" },
        { status: 404 },
      );
    }

    let dataTable = null;
    if (submission) {
      const cells = await findDataPointsForSubmissionInLab(labId, submission.id);
      dataTable = groupCellsToTable(cells);
    }

    return NextResponse.json({
      ok: true,
      submission,
      dataSchema: parseDataSchema(milestone.dataSchema),
      acceptData: Boolean(rubricOf(milestone).acceptData),
      dataTable,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load submission",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const gate = await requireLabStudent(request);
    if ("error" in gate) return gate.error;

    const { id: milestoneId } = await params;
    const memberId = gate.ctx.membership.id;
    const labId = gate.ctx.labId;
    const body = (await request.json()) as {
      evidenceUrl?: string;
      repoUrl?: string;
      writeup?: string;
      checklist?: string[];
      attachments?: Attachment[];
      status?: "DRAFT" | "SUBMITTED";
      /** Object rows from the dynamic form */
      dataRows?: DataRowInput[];
      /** Raw CSV text (header + rows) */
      dataCsv?: string;
      /** If true, clear existing data points without replacing */
      clearData?: boolean;
    };

    const milestone = await findMilestoneInLab(labId, milestoneId);
    if (!milestone) {
      return NextResponse.json(
        { ok: false, error: "Assignment not found" },
        { status: 404 },
      );
    }

    const rubric = rubricOf(milestone);
    const schema = parseDataSchema(milestone.dataSchema);
    const acceptData = Boolean(rubric.acceptData);

    let dataCells: ReturnType<typeof rowsToDataPoints>["cells"] | null = null;
    if (acceptData) {
      if (body.clearData) {
        dataCells = [];
      } else if (typeof body.dataCsv === "string" && body.dataCsv.trim()) {
        const parsed = parseCsvToRows(body.dataCsv);
        if (parsed.error) {
          return NextResponse.json(
            { ok: false, error: parsed.error },
            { status: 400 },
          );
        }
        const built = rowsToDataPoints(parsed.rows, schema);
        if (built.error) {
          return NextResponse.json(
            { ok: false, error: built.error },
            { status: 400 },
          );
        }
        dataCells = built.cells;
      } else if (Array.isArray(body.dataRows)) {
        if (body.dataRows.length === 0) {
          dataCells = [];
        } else {
          const built = rowsToDataPoints(body.dataRows, schema);
          if (built.error) {
            return NextResponse.json(
              { ok: false, error: built.error },
              { status: 400 },
            );
          }
          dataCells = built.cells;
        }
      }
    }

    const status =
      body.status === "DRAFT" ? SubmissionStatus.DRAFT : SubmissionStatus.SUBMITTED;

    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    const data = {
      evidenceUrl: body.evidenceUrl?.trim() || null,
      repoUrl: body.repoUrl?.trim() || null,
      writeup: body.writeup?.trim() || null,
      checklist: (body.checklist ?? []) as Prisma.InputJsonValue,
      attachments: attachments as Prisma.InputJsonValue,
      status,
      submittedAt: status === SubmissionStatus.SUBMITTED ? new Date() : null,
      reviewStatus:
        status === SubmissionStatus.SUBMITTED
          ? ReviewStatus.PENDING_REVIEW
          : null,
      reviewComment:
        status === SubmissionStatus.SUBMITTED ? null : undefined,
      reviewedAt: status === SubmissionStatus.SUBMITTED ? null : undefined,
      reviewedById: status === SubmissionStatus.SUBMITTED ? null : undefined,
    };

    const prisma = getPrisma();
    const submission = await prisma.$transaction(async (tx) => {
      const row = await tx.submission.upsert({
        where: {
          milestoneId_memberId: { milestoneId, memberId },
        },
        create: {
          organizationId: labId,
          milestoneId,
          memberId,
          evidenceUrl: data.evidenceUrl,
          repoUrl: data.repoUrl,
          writeup: data.writeup,
          checklist: data.checklist,
          attachments: data.attachments,
          status: data.status,
          submittedAt: data.submittedAt,
          reviewStatus: data.reviewStatus,
        },
        update: {
          evidenceUrl: data.evidenceUrl,
          repoUrl: data.repoUrl,
          writeup: data.writeup,
          checklist: data.checklist,
          attachments: data.attachments,
          status: data.status,
          submittedAt: data.submittedAt,
          reviewStatus: data.reviewStatus,
          reviewComment: data.reviewComment,
          reviewedAt: data.reviewedAt,
          reviewedById: data.reviewedById,
          score: status === SubmissionStatus.SUBMITTED ? Prisma.DbNull : undefined,
        },
      });

      if (dataCells) {
        await tx.submissionDataPoint.deleteMany({
          where: { submissionId: row.id, organizationId: labId },
        });
        if (dataCells.length > 0) {
          await tx.submissionDataPoint.createMany({
            data: dataCells.map((c) => ({
              organizationId: labId,
              submissionId: row.id,
              rowIndex: c.rowIndex,
              columnName: c.columnName,
              value: c.value,
              valueType: c.valueType,
            })),
          });
        }
      }

      return row;
    });

    const cells = await findDataPointsForSubmissionInLab(labId, submission.id);

    return NextResponse.json({
      ok: true,
      submission,
      dataTable: groupCellsToTable(cells),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to submit",
      },
      { status: 503 },
    );
  }
}
