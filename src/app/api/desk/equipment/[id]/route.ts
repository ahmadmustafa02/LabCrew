import { EquipmentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { inLab, requireLabScope } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const { id } = await params;
    const body = (await request.json()) as { action?: string; dueBackAt?: string };
    const prisma = getPrisma();
    const item = await prisma.equipment.findFirst({
      where: { id, programId: gate.ctx.membership.programId, ...inLab(gate.ctx.labId) },
    });
    if (!item) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const isDirector = gate.ctx.appRole === "director";
    const action = body.action;

    if (action === "checkout") {
      if (item.status !== EquipmentStatus.IN_LAB) {
        return NextResponse.json({ ok: false, error: "Someone already has it." }, { status: 400 });
      }
      const due = body.dueBackAt ? new Date(body.dueBackAt) : new Date();
      if (!body.dueBackAt) due.setDate(due.getDate() + 7);
      await prisma.equipment.update({
        where: { id: item.id },
        data: {
          status: EquipmentStatus.CHECKED_OUT,
          holderMemberId: gate.ctx.membership.id,
          dueBackAt: due,
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "return") {
      const mine = item.holderMemberId === gate.ctx.membership.id;
      if (!mine && !isDirector) {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      }
      await prisma.equipment.update({
        where: { id: item.id },
        data: {
          status: EquipmentStatus.IN_LAB,
          holderMemberId: null,
          dueBackAt: null,
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "broken" || action === "repair") {
      if (!isDirector) {
        return NextResponse.json({ ok: false, error: "Director access required" }, { status: 403 });
      }
      await prisma.equipment.update({
        where: { id: item.id },
        data: {
          status:
            action === "broken" ? EquipmentStatus.BROKEN : EquipmentStatus.IN_LAB,
          holderMemberId: action === "broken" ? item.holderMemberId : null,
          dueBackAt: action === "broken" ? item.dueBackAt : null,
        },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Update failed",
      },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;
    if (gate.ctx.appRole !== "director") {
      return NextResponse.json({ ok: false, error: "Director access required" }, { status: 403 });
    }
    const { id } = await params;
    const existing = await getPrisma().equipment.findFirst({
      where: { id, ...inLab(gate.ctx.labId) },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    await getPrisma().equipment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Delete failed",
      },
      { status: 503 },
    );
  }
}
