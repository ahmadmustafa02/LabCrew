import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { inLab, requireLabDirector } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const { id } = await params;
    const prisma = getPrisma();
    const row = await prisma.announcement.findFirst({
      where: {
        id,
        ...inLab(gate.ctx.labId),
        programId: gate.ctx.membership.programId,
      },
    });
    if (!row) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    await prisma.announcement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete announcement",
      },
      { status: 503 },
    );
  }
}
