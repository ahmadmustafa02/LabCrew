import { RsvpStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireStudent } from "@/server/auth/api-session";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireStudent();
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

    const prisma = getPrisma();
    const invite = await prisma.meetingInvite.findFirst({
      where: {
        meetingId: id,
        memberId: gate.session.membership.id,
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
