import { NextResponse } from "next/server";
import { Prisma, ReviewStatus, SubmissionStatus } from "@prisma/client";
import type { AssignmentRubric } from "@/lib/assignment-types";
import { getPrisma } from "@/lib/db";
import { recomputeIqrFlagsForMilestone } from "@/server/data/data-quality";
import {
  FLAG_DUPLICATE_RESUBMIT,
  fingerprintRowSet,
  groupCellsToTable,
  mergeFlagReasons,
  parseCsvToRows,
  parseDataSchema,
  rowsToDataPoints,
  validateCsvHeadersAgainstSchema,
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
      requireData: Boolean(rubricOf(milestone).requireData),
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
      dataRows?: DataRowInput[];
      dataCsv?: string;
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
    const requireData = Boolean(rubric.requireData);

    let dataCells: ReturnType<typeof rowsToDataPoints>["cells"] | null = null;
    let warnings: string[] = [];

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
        const headerErr = validateCsvHeadersAgainstSchema(parsed.headers, schema);
        if (headerErr) {
          return NextResponse.json(
            { ok: false, error: headerErr },
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

    if (
      acceptData &&
      requireData &&
      status === SubmissionStatus.SUBMITTED &&
      dataCells !== null &&
      dataCells.length === 0
    ) {
      return NextResponse.json(
        { ok: false, error: "Structured data is required for this assignment" },
        { status: 400 },
      );
    }

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
      const existing = await tx.submission.findUnique({
        where: { milestoneId_memberId: { milestoneId, memberId } },
      });

      if (dataCells && dataCells.length > 0 && existing) {
        const prev = await tx.submissionDataPoint.findMany({
          where: { submissionId: existing.id, organizationId: labId },
          select: { rowIndex: true, columnName: true, value: true },
        });
        if (
          prev.length > 0 &&
          fingerprintRowSet(prev) === fingerprintRowSet(dataCells)
        ) {
          dataCells = dataCells.map((c) => ({
            ...c,
            flagged: true,
            flagReason: mergeFlagReasons(c.flagReason, FLAG_DUPLICATE_RESUBMIT),
          }));
          warnings.push(
            "This data matches your previous submission and was flagged as a duplicate resubmission.",
          );
        }
      }

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
              flagged: Boolean(c.flagged),
              flagReason: c.flagReason ?? null,
            })),
          });
        }
      }

      if (
        acceptData &&
        requireData &&
        status === SubmissionStatus.SUBMITTED
      ) {
        const count = await tx.submissionDataPoint.count({
          where: { submissionId: row.id, organizationId: labId },
        });
        if (count === 0) {
          throw new Error("Structured data is required for this assignment");
        }
      }

      if (dataCells !== null) {
        await recomputeIqrFlagsForMilestone(tx, labId, milestoneId);
      }

      return row;
    });

    const cells = await findDataPointsForSubmissionInLab(labId, submission.id);

    return NextResponse.json({
      ok: true,
      submission,
      dataTable: groupCellsToTable(cells),
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit";
    const status =
      message === "Structured data is required for this assignment" ? 400 : 503;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
