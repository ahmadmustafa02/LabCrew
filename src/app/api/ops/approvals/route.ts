import { NextResponse } from "next/server";
import { ApprovalStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { requireDirector } from "@/server/auth/api-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await requireDirector();
    if ("error" in gate) return gate.error;

    const programId = gate.session.membership.programId;
    const prisma = getPrisma();

    // Paper-search resource drafts are retired — clear any leftover pending ones.
    await prisma.approvalItem.updateMany({
      where: {
        programId,
        status: ApprovalStatus.PENDING,
        kind: "resources",
      },
      data: {
        status: ApprovalStatus.REJECTED,
        decidedAt: new Date(),
        deliveryStatus: "skipped",
        deliveryError: "Resource search feature removed",
      },
    });

    const items = await prisma.approvalItem.findMany({
      where: {
        programId,
        NOT: { kind: "resources" },
        OR: [
          { status: ApprovalStatus.PENDING },
          {
            status: {
              in: [
                ApprovalStatus.APPROVED,
                ApprovalStatus.EDITED,
                ApprovalStatus.REJECTED,
              ],
            },
            decidedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        ],
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 40,
    });

    return NextResponse.json({
      ok: true,
      programId,
      approvals: items.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        targetName: item.targetName,
        kind: item.kind,
        status: item.status,
        deliveryStatus: item.deliveryStatus,
        deliveryChannel: item.deliveryChannel,
        deliveryError: item.deliveryError,
        deliveredAt: item.deliveredAt?.toISOString() ?? null,
        decidedAt: item.decidedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load approvals",
      },
      { status: 503 },
    );
  }
}
