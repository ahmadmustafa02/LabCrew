import type { Prisma } from "@prisma/client";
import { DataValueType } from "@prisma/client";
import {
  FLAG_IQR_OUTLIER,
  iqrOutlierIndexes,
  mergeFlagReasons,
} from "@/server/data/submission-data";

type Db = Prisma.TransactionClient;

/**
 * Recompute IQR outlier flags for all NUMBER cells on an assignment (lab-scoped).
 * Preserves non-IQR flag reasons (duplicates). Flag, never reject.
 */
export async function recomputeIqrFlagsForMilestone(
  tx: Db,
  labId: string,
  milestoneId: string,
): Promise<{ columnsChecked: number; cellsFlagged: number }> {
  const submissions = await tx.submission.findMany({
    where: { organizationId: labId, milestoneId },
    select: { id: true },
  });
  const submissionIds = submissions.map((s) => s.id);
  if (submissionIds.length === 0) {
    return { columnsChecked: 0, cellsFlagged: 0 };
  }

  const cells = await tx.submissionDataPoint.findMany({
    where: {
      organizationId: labId,
      submissionId: { in: submissionIds },
      valueType: DataValueType.NUMBER,
    },
    select: {
      id: true,
      columnName: true,
      value: true,
      flagged: true,
      flagReason: true,
    },
  });

  const byColumn = new Map<string, typeof cells>();
  for (const cell of cells) {
    const list = byColumn.get(cell.columnName) ?? [];
    list.push(cell);
    byColumn.set(cell.columnName, list);
  }

  let cellsFlagged = 0;

  for (const [, colCells] of byColumn) {
    const nums = colCells.map((c) => Number(c.value));
    const outlierIdx = iqrOutlierIndexes(nums);

    for (let i = 0; i < colCells.length; i++) {
      const cell = colCells[i];
      const withoutIqr = (cell.flagReason ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && s !== FLAG_IQR_OUTLIER);
      const isOutlier = outlierIdx.has(i);
      const nextReason = mergeFlagReasons(
        withoutIqr.join(","),
        isOutlier ? FLAG_IQR_OUTLIER : null,
      );
      const nextFlagged = Boolean(nextReason);
      if (isOutlier) cellsFlagged += 1;

      if (cell.flagged !== nextFlagged || (cell.flagReason ?? null) !== nextReason) {
        await tx.submissionDataPoint.update({
          where: { id: cell.id },
          data: { flagged: nextFlagged, flagReason: nextReason },
        });
      }
    }
  }

  return { columnsChecked: byColumn.size, cellsFlagged };
}
