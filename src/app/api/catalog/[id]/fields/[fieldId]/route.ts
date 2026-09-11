import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { inLab, requireLabScope } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; fieldId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;
    const { id, fieldId } = await params;
    const body = (await request.json()) as {
      trust?: "trusted" | "held" | "rejected";
      value?: string;
    };

    const prisma = getPrisma();
    const field = await prisma.catalogField.findFirst({
      where: { id: fieldId, recordId: id, ...inLab(gate.ctx.labId) },
    });
    if (!field) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.catalogField.update({
      where: { id: field.id },
      data: {
        ...(body.trust ? { trust: body.trust } : {}),
        ...(typeof body.value === "string" ? { value: body.value.trim() } : {}),
      },
    });

    const remaining = await prisma.catalogField.count({
      where: { recordId: id, organizationId: gate.ctx.labId, trust: "held" },
    });
    await prisma.catalogRecord.update({
      where: { id },
      data: { status: remaining === 0 ? "finalized" : "pending_review" },
    });

    return NextResponse.json({ ok: true, field: updated, remainingHeld: remaining });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 503 },
    );
  }
}
