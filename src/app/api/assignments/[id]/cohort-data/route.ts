import { NextResponse } from "next/server";
import { DataValueType } from "@prisma/client";
import {
  buildDirectorCohortTable,
  buildNumericColumnStats,
  shapeStudentAggregate,
  studentOwnNumericSummary,
  STUDENT_AGGREGATE_MIN_N,
  IQR_MIN_SAMPLE,
} from "@/server/data/cohort-stats";
import { parseDataSchema } from "@/server/data/submission-data";
import { requireLabScope } from "@/server/tenancy/lab-scope";
import {
  findDataPointsForMilestoneInLab,
  findMilestoneInLab,
} from "@/server/tenancy/lab-repo";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const { id: milestoneId } = await params;
    const labId = gate.ctx.labId;
    const isDirector = gate.ctx.appRole === "director";
    const myMemberId = gate.ctx.membership.id;

    const milestone = await findMilestoneInLab(labId, milestoneId);
    if (!milestone) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const schema = parseDataSchema(milestone.dataSchema);
    const cells = await findDataPointsForMilestoneInLab(labId, milestoneId);

    const numericColumns = new Set<string>();
    if (schema) {
      for (const c of schema.columns) {
        if (c.type === "number") numericColumns.add(c.name);
      }
    }
    for (const cell of cells) {
      if (cell.valueType === DataValueType.NUMBER) {
        numericColumns.add(cell.columnName);
      }
    }

    const submissionsMeta = Array.from(
      new Map(
        cells.map((c) => [
          c.submissionId,
          {
            id: c.submission.id,
            memberId: c.submission.memberId,
            studentName: c.submission.member.user.name,
          },
        ]),
      ).values(),
    );

    const contributorIds = new Set(submissionsMeta.map((s) => s.memberId));

    const columns = Array.from(numericColumns).map((columnName) => {
      const colCells = cells.filter((c) => c.columnName === columnName);
      return buildNumericColumnStats(columnName, colCells, {
        includeBins: isDirector,
      });
    });

    if (isDirector) {
      return NextResponse.json({
        ok: true,
        role: "director",
        privacy: {
          studentAggregateMinN: STUDENT_AGGREGATE_MIN_N,
          iqrMinSample: IQR_MIN_SAMPLE,
        },
        contributorCount: contributorIds.size,
        columns,
        rows: buildDirectorCohortTable(cells, submissionsMeta),
      });
    }

    // Student: own cells only + aggregates when cohort large enough
    const ownCells = cells.filter((c) => c.submission.memberId === myMemberId);

    const ownByColumn = Array.from(numericColumns).map((columnName) => {
      const own = studentOwnNumericSummary(ownCells, columnName);
      const colStats = columns.find((c) => c.columnName === columnName)!;
      return {
        columnName,
        own: {
          values: own.values,
          mean: own.mean,
          median: own.median,
          flaggedCount: ownCells.filter(
            (c) => c.columnName === columnName && c.flagged,
          ).length,
        },
        cohort: shapeStudentAggregate(colStats, contributorIds.size),
      };
    });

    return NextResponse.json({
      ok: true,
      role: "student",
      privacy: {
        studentAggregateMinN: STUDENT_AGGREGATE_MIN_N,
        iqrMinSample: IQR_MIN_SAMPLE,
        note: "Aggregates hidden when contributorCount < studentAggregateMinN so classmates' values are not recoverable from mean + own.",
      },
      contributorCount: contributorIds.size,
      columns: ownByColumn,
      /** Always null for students — peer raw rows never leave the server. */
      peerRawRows: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load cohort data",
      },
      { status: 503 },
    );
  }
}
