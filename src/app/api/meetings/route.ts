import { MeetingAudience, MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import {
  inLab,
  requireLabDirector,
  requireLabScope,
} from "@/server/tenancy/lab-scope";
import { notifyMeetingInvites } from "@/server/meetings/notify";

export const runtime = "nodejs";

function serializeMeeting(
  m: {
    id: string;
    title: string;
    agenda: string | null;
    meetingUrl: string | null;
    startsAt: Date;
    endsAt: Date | null;
    audience: MeetingAudience;
    createdAt: Date;
    createdBy: { user: { name: string } };
    invites: {
      id: string;
      memberId: string;
      rsvp: string | null;
      readAt: Date | null;
      member: { user: { name: string; email: string } };
    }[];
  },
  viewerMemberId?: string,
) {
  const mine = viewerMemberId
    ? m.invites.find((i) => i.memberId === viewerMemberId)
    : undefined;
  return {
    id: m.id,
    title: m.title,
    agenda: m.agenda,
    meetingUrl: m.meetingUrl,
    startsAt: m.startsAt.toISOString(),
    endsAt: m.endsAt?.toISOString() ?? null,
    audience: m.audience,
    createdAt: m.createdAt.toISOString(),
    createdByName: m.createdBy.user.name,
    inviteCount: m.invites.length,
    myRsvp: mine?.rsvp ?? null,
    myInviteId: mine?.id ?? null,
    recipients: m.invites.map((i) => ({
      memberId: i.memberId,
      name: i.member.user.name,
      email: i.member.user.email,
      rsvp: i.rsvp,
    })),
  };
}

export async function GET(request: Request) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const { ctx } = gate;
    const prisma = getPrisma();
    const programId = ctx.membership.programId;
    const memberId = ctx.membership.id;
    const lab = inLab(ctx.labId);

    if (ctx.appRole === "director") {
      const meetings = await prisma.meeting.findMany({
        where: { programId, ...lab },
        include: {
          createdBy: { include: { user: true } },
          invites: { include: { member: { include: { user: true } } } },
        },
        orderBy: { startsAt: "desc" },
      });
      return NextResponse.json({
        ok: true,
        meetings: meetings.map((m) => serializeMeeting(m)),
      });
    }

    const meetings = await prisma.meeting.findMany({
      where: {
        programId,
        ...lab,
        invites: { some: { memberId } },
      },
      include: {
        createdBy: { include: { user: true } },
        invites: {
          where: { memberId },
          include: { member: { include: { user: true } } },
        },
      },
      orderBy: { startsAt: "asc" },
    });

    await prisma.meetingInvite.updateMany({
      where: {
        memberId,
        organizationId: ctx.labId,
        readAt: null,
        meeting: { programId, organizationId: ctx.labId },
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      meetings: meetings.map((m) => serializeMeeting(m, memberId)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load meetings",
      },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireLabDirector(req);
    if ("error" in gate) return gate.error;

    const body = (await req.json()) as {
      title?: string;
      agenda?: string;
      meetingUrl?: string;
      startsAt?: string;
      endsAt?: string;
      audience?: "ALL" | "SELECTED";
      memberIds?: string[];
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Title is required" },
        { status: 400 },
      );
    }
    if (!body.startsAt) {
      return NextResponse.json(
        { ok: false, error: "Start time is required" },
        { status: 400 },
      );
    }
    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid start time" },
        { status: 400 },
      );
    }

    const audience =
      body.audience === "SELECTED"
        ? MeetingAudience.SELECTED
        : MeetingAudience.ALL;

    const prisma = getPrisma();
    const programId = gate.ctx.membership.programId;
    const organizationId = gate.ctx.labId;

    const students = await prisma.member.findMany({
      where: { programId, organizationId, role: MemberRole.STUDENT },
      include: { user: true },
    });

    let targets = students;
    if (audience === MeetingAudience.SELECTED) {
      const ids = new Set(body.memberIds ?? []);
      if (ids.size === 0) {
        return NextResponse.json(
          { ok: false, error: "Select at least one student" },
          { status: 400 },
        );
      }
      targets = students.filter((s) => ids.has(s.id));
      if (targets.length === 0) {
        return NextResponse.json(
          { ok: false, error: "No matching students in your program" },
          { status: 404 },
        );
      }
    }

    const meeting = await prisma.meeting.create({
      data: {
        organizationId,
        programId,
        createdById: gate.ctx.membership.id,
        title,
        agenda: body.agenda?.trim() || null,
        meetingUrl: body.meetingUrl?.trim() || null,
        startsAt,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        audience,
        invites: {
          create: targets.map((t) => ({
            organizationId,
            memberId: t.id,
            notifiedAt: new Date(),
          })),
        },
      },
      include: {
        createdBy: { include: { user: true } },
        invites: { include: { member: { include: { user: true } } } },
      },
    });

    await notifyMeetingInvites({
      organizationId,
      programId,
      meetingId: meeting.id,
      title: meeting.title,
      agenda: meeting.agenda,
      meetingUrl: meeting.meetingUrl,
      startsAt: meeting.startsAt,
      recipients: targets.map((t) => ({
        memberId: t.id,
        email: t.user.email,
        name: t.user.name,
      })),
    });

    return NextResponse.json({
      ok: true,
      meeting: serializeMeeting(meeting),
      sent: targets.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create meeting",
      },
      { status: 503 },
    );
  }
}
