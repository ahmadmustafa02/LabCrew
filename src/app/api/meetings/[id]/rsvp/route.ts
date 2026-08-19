import { RsvpStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireLabStudent } from "@/server/tenancy/lab-scope";
import { findMeetingInLab } from "@/server/tenancy/lab-repo";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireLabStudent(req);
    if ("error" in gate) return gate.error;

    const { id } = await ctx.params;
    const body = (await req.json()) as { rsvp?: string };
    const rsvpRaw = body.rsvp?.toUpperCase();
    if (rsvpRaw !== "YES" && rsvpRaw !== "NO" && rsvpRaw !== "MAYBE") {
      return NextResponse.json(
        { ok: false, error: "rsvp must be YES, NO, or MAYBE" },
        { status: 400 },
      );
    }

    const meeting = await findMeetingInLab(gate.ctx.labId, id);
    if (!meeting) {
      return NextResponse.json(
        { ok: false, error: "Meeting invite not found" },
        { status: 404 },
      );
    }

    const prisma = getPrisma();
    const invite = await prisma.meetingInvite.findFirst({
      where: {
        meetingId: id,
        memberId: gate.ctx.membership.id,
        organizationId: gate.ctx.labId,
      },
    });
    if (!invite) {
      return NextResponse.json(
        { ok: false, error: "Meeting invite not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.meetingInvite.update({
      where: { id: invite.id },
      data: { rsvp: rsvpRaw as RsvpStatus, readAt: new Date() },
    });

    return NextResponse.json({ ok: true, rsvp: updated.rsvp });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update RSVP",
      },
      { status: 503 },
    );
  }
}
