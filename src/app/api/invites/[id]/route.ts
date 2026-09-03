import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { inLab, requireLabDirector } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** Revoke a pending invite (expires it immediately). */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const { id } = await params;
    const prisma = getPrisma();
    const invite = await prisma.invite.findFirst({
      where: {
        id,
        ...inLab(gate.ctx.labId),
        programId: gate.ctx.membership.programId,
        acceptedAt: null,
      },
    });
    if (!invite) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    await prisma.invite.update({
      where: { id },
      data: { expiresAt: new Date(0) },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to revoke invite",
      },
      { status: 503 },
    );
  }
}
