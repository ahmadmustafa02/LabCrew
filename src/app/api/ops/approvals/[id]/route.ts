import { NextResponse } from "next/server";
import { ApprovalStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { requireLabDirector } from "@/server/tenancy/lab-scope";
import { findApprovalInLab } from "@/server/tenancy/lab-repo";
import { deliverNudge } from "@/server/email/deliver-nudge";
import {
  RESOURCE_KIND,
  applyApprovedResources,
} from "@/server/coach/resource-suggest";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type Body = {
  action?: "approve" | "reject" | "save";
  body?: string;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const gate = await requireLabDirector(request);
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

    const existing = await findApprovalInLab(gate.ctx.labId, id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

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

    const prisma = getPrisma();

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
      // Phase C resource drafts: attach to milestone; do not email students.
      if (existing.kind === RESOURCE_KIND) {
        const applied = await applyApprovedResources({
          labId: gate.ctx.labId,
          body: updated.body,
        });
        const withDelivery = await prisma.approvalItem.update({
          where: { id },
          data: {
            deliveryStatus: applied.ok ? "applied" : "failed",
            deliveryChannel: "milestone",
            deliveryError: applied.ok ? null : applied.error,
            deliveredAt: new Date(),
          },
        });
        return NextResponse.json({
          ok: true,
          approval: serialize(withDelivery),
          delivery: {
            ok: applied.ok,
            status: applied.ok ? "applied" : "failed",
            channel: "milestone",
            error: applied.ok ? null : applied.error,
          },
        });
      }

      const result = await deliverNudge({
        programId: updated.programId,
        toName: updated.targetName,
        toEmail: updated.targetEmail,
        subject: updated.title,
        body: updated.body,
      });

      const deliveryStatus = result.ok
        ? result.channel === "smtp"
          ? "sent"
          : "console"
        : "failed";

      const withDelivery = await prisma.approvalItem.update({
        where: { id },
        data: {
          deliveryStatus,
          deliveryChannel: result.ok ? result.channel : null,
          deliveryError: result.ok ? null : result.error,
          deliveredAt: new Date(),
        },
      });

      delivery = {
        ok: result.ok,
        status: deliveryStatus,
        channel: result.ok ? result.channel : null,
        error: result.ok ? null : result.error,
        to: "to" in result ? result.to : undefined,
        at: withDelivery.deliveredAt,
      };

      return NextResponse.json({
        ok: true,
        approval: serialize(withDelivery),
        delivery,
      });
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
  kind?: string;
  status: ApprovalStatus;
  decidedAt: Date | null;
  deliveryStatus?: string | null;
  deliveryChannel?: string | null;
  deliveryError?: string | null;
  deliveredAt?: Date | null;
}) {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    targetName: item.targetName,
    kind: item.kind ?? "nudge",
    status: item.status,
    decidedAt: item.decidedAt,
    deliveryStatus: item.deliveryStatus ?? null,
    deliveryChannel: item.deliveryChannel ?? null,
    deliveryError: item.deliveryError ?? null,
    deliveredAt: item.deliveredAt?.toISOString() ?? null,
  };
}
