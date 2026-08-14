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

    const items = await prisma.approvalItem.findMany({
      where: { programId, status: ApprovalStatus.PENDING },
      orderBy: { createdAt: "desc" },
      take: 20,
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
