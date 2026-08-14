import { NextResponse } from "next/server";
import { ApprovalStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import {
  assertSameProgram,
  requireDirector,
} from "@/server/auth/api-session";
import { deliverNudge } from "@/server/email/deliver-nudge";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type Body = {
  action?: "approve" | "reject" | "save";
  body?: string;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const gate = await requireDirector();
    if ("error" in gate) return gate.error;

    const { id } = await params;
    const input = (await request.json()) as Body;
    const action = input.action;

    if (!action || !["approve", "reject", "save"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "action must be approve | reject | save" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const existing = await prisma.approvalItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const wrong = assertSameProgram(gate.session, existing.programId);
    if (wrong) return wrong;

    if (existing.status !== ApprovalStatus.PENDING) {
      return NextResponse.json(
        { ok: false, error: "Only pending items can be updated" },
        { status: 409 },
      );
    }

    const nextBody =
      typeof input.body === "string" && input.body.trim().length > 0
        ? input.body.trim()
        : existing.body;

    if (action === "save") {
      const updated = await prisma.approvalItem.update({
        where: { id },
        data: { body: nextBody },
      });
      return NextResponse.json({
        ok: true,
        approval: serialize(updated),
      });
    }

    const bodyChanged = nextBody !== existing.body;
    const updated = await prisma.approvalItem.update({
      where: { id },
      data: {
        body: nextBody,
        status:
          action === "approve"
            ? bodyChanged
              ? ApprovalStatus.EDITED
              : ApprovalStatus.APPROVED
            : ApprovalStatus.REJECTED,
        decidedAt: new Date(),
      },
    });

    let delivery = null;
    if (action === "approve") {
      const result = await deliverNudge({
        programId: updated.programId,
        toName: updated.targetName,
        toEmail: updated.targetEmail,
        subject: updated.title,
        body: updated.body,
      });
      delivery = {
        ...result,
        at: updated.decidedAt,
      };
    }

    return NextResponse.json({
      ok: true,
      approval: serialize(updated),
      delivery,
    });
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

function serialize(item: {
  id: string;
  title: string;
  body: string;
  targetName: string | null;
  status: ApprovalStatus;
  decidedAt: Date | null;
}) {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    targetName: item.targetName,
    status: item.status,
    decidedAt: item.decidedAt,
  };
}
