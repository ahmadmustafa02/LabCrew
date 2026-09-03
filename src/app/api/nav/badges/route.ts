import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { inLab, requireLabScope } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

/** Lightweight unread counts for sidebar badges. */
export async function GET(request: Request) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const { ctx } = gate;
    const prisma = getPrisma();
    const memberId = ctx.membership.id;
    const programId = ctx.membership.programId;
    const lab = inLab(ctx.labId);

    const [meetings, announcements, approvals] = await Promise.all([
      prisma.meetingInvite.count({
        where: {
          memberId,
          ...lab,
          readAt: null,
          meeting: { programId, ...lab },
        },
      }),
      prisma.announcementRecipient.count({
        where: {
          memberId,
          ...lab,
          readAt: null,
          announcement: { programId, ...lab },
        },
      }),
      ctx.appRole === "director"
        ? prisma.approvalItem.count({
            where: {
              status: "PENDING",
              programId,
              ...lab,
            },
          })
        : Promise.resolve(0),
    ]);

    return NextResponse.json({
      ok: true,
      badges: {
        meetings,
        announcements,
        approvals,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load nav badges",
      },
      { status: 503 },
    );
  }
}
