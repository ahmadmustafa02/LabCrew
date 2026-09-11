import { EquipmentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import {
  onboardAlreadyExists,
} from "@/server/desk/onboard";
import { inLab, requireLabDirector, requireLabScope } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const prisma = getPrisma();
    const { labId, membership, appRole } = gate.ctx;
    const [items, onboard] = await Promise.all([
      prisma.equipment.findMany({
        where: { programId: membership.programId, ...inLab(labId) },
        include: { holder: { include: { user: { select: { name: true } } } } },
        orderBy: { name: "asc" },
      }),
      onboardAlreadyExists({ labId, programId: membership.programId }),
    ]);

    return NextResponse.json({
      ok: true,
      onboardExists: onboard,
      role: appRole,
      viewerMemberId: membership.id,
      equipment: items.map((e) => ({
        id: e.id,
        name: e.name,
        note: e.note,
        status: e.status,
        holderMemberId: e.holderMemberId,
        holderName: e.holder?.user.name ?? null,
        dueBackAt: e.dueBackAt?.toISOString() ?? null,
        mine: e.holderMemberId === membership.id,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load the list",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as { name?: string; note?: string };
    const name = body.name?.trim() ?? "";
    if (name.length < 2) {
      return NextResponse.json({ ok: false, error: "Give it a name." }, { status: 400 });
    }

    const row = await getPrisma().equipment.create({
      data: {
        organizationId: gate.ctx.labId,
        programId: gate.ctx.membership.programId,
        name,
        note: body.note?.trim() || null,
        status: EquipmentStatus.IN_LAB,
      },
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to add gear",
      },
      { status: 503 },
    );
  }
}
