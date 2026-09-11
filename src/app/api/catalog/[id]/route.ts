import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { inLab, requireLabScope } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;
    const { id } = await params;

    const record = await getPrisma().catalogRecord.findFirst({
      where: { id, ...inLab(gate.ctx.labId) },
      include: { fields: { orderBy: { key: "asc" } } },
    });
    if (!record) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 503 },
    );
  }
}
