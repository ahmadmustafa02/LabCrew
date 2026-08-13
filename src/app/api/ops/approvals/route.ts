import { NextResponse } from "next/server";
import { ApprovalStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const prisma = getPrisma();

    const program =
      programId != null
        ? await prisma.program.findUnique({ where: { id: programId } })
        : await prisma.program.findFirst({
            where: { organization: { slug: "northwater" } },
          });

    if (!program) {
      return NextResponse.json(
        { ok: false, error: "Program not found" },
        { status: 404 },
      );
    }

    const items = await prisma.approvalItem.findMany({
      where: { programId: program.id, status: ApprovalStatus.PENDING },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      ok: true,
      programId: program.id,
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
