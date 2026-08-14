import { MemberRole, MilestoneStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireStudent } from "@/server/auth/api-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await requireStudent();
    if ("error" in gate) return gate.error;

    const prisma = getPrisma();
    const programId = gate.session.membership.programId;
    const memberId = gate.session.membership.id;
    const now = new Date();

    const [meetings, milestones, notifications, unreadCount] =
      await Promise.all([
        prisma.meeting.findMany({
          where: {
            programId,
            invites: { some: { memberId } },
            startsAt: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
          },
          include: {
            invites: { where: { memberId } },
          },
          orderBy: { startsAt: "asc" },
          take: 5,
        }),
        prisma.milestone.findMany({
          where: {
            programId,
            status: { in: [MilestoneStatus.ACTIVE, MilestoneStatus.UPCOMING] },
          },
          include: {
            submissions: { where: { memberId }, take: 1 },
          },
          orderBy: [{ status: "asc" }, { dueAt: "asc" }],
          take: 6,
        }),
        // Inbox = unread only. Meetings already have an Upcoming section.
        prisma.notification.findMany({
          where: {
            memberId,
            readAt: null,
            kind: { not: "MEETING" },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.notification.count({
          where: {
            memberId,
            readAt: null,
            kind: { not: "MEETING" },
          },
        }),
      ]);

    // One row per message thread — don't dump every chat ping.
    const inbox: typeof notifications = [];
    let sawMessage = false;
    for (const n of notifications) {
      if (n.kind === "MESSAGE") {
        if (sawMessage) continue;
        sawMessage = true;
      }
      inbox.push(n);
      if (inbox.length >= 6) break;
    }

    const directors = await prisma.member.findMany({
      where: {
        programId,
        role: { in: [MemberRole.ADMIN, MemberRole.MENTOR] },
      },
      include: { user: true },
      take: 3,
    });

    return NextResponse.json({
      ok: true,
      home: {
        meetings: meetings.map((m) => ({
          id: m.id,
          title: m.title,
          agenda: m.agenda,
          meetingUrl: m.meetingUrl,
          startsAt: m.startsAt.toISOString(),
          rsvp: m.invites[0]?.rsvp ?? null,
        })),
        tasks: milestones.map((ms) => ({
          id: ms.id,
          title: ms.title,
          status: ms.status,
          dueAt: ms.dueAt?.toISOString() ?? null,
          submitted: Boolean(
            ms.submissions[0] && ms.submissions[0].status !== "DRAFT",
          ),
        })),
        notifications: inbox.map((n) => ({
          id: n.id,
          kind: n.kind,
          title: n.title,
          body: n.body,
          href: n.href,
          readAt: n.readAt?.toISOString() ?? null,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadNotifications: unreadCount,
        directors: directors.map((d) => ({
          name: d.user.name,
          role: d.role,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load portal",
      },
      { status: 503 },
    );
  }
}
