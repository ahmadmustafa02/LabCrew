import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { catalogSchema } from "@/server/catalog/schema";
import { inLab, requireLabScope } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;
    const url = new URL(request.url);
    const a = url.searchParams.get("a") ?? "";
    const b = url.searchParams.get("b") ?? "";
    if (!a || !b || a === b) {
      return NextResponse.json({ ok: false, error: "Pick two different records" }, { status: 400 });
    }

    const prisma = getPrisma();
    const rows = await prisma.catalogRecord.findMany({
      where: { id: { in: [a, b] }, ...inLab(gate.ctx.labId) },
      include: { fields: true },
    });
    if (rows.length !== 2) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const left = rows.find((r) => r.id === a)!;
    const right = rows.find((r) => r.id === b)!;
    const valueOf = (row: (typeof left), key: string) =>
      row.fields.find((f) => f.key === key && f.trust === "trusted")?.value ?? "—";

    return NextResponse.json({
      ok: true,
      left: { id: left.id, title: left.title },
      right: { id: right.id, title: right.title },
      rows: catalogSchema().map((spec) => ({
        key: spec.key,
        label: spec.label,
        left: valueOf(left, spec.key),
        right: valueOf(right, spec.key),
        same: valueOf(left, spec.key) === valueOf(right, spec.key),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Compare failed" },
      { status: 503 },
    );
  }
}
