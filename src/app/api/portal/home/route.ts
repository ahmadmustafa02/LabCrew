import { MemberRole, MilestoneStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { loadNextStep } from "@/server/coach/recommend";
import {
  loadApprovedNudgeForStudent,
  loadStudentProgress,
} from "@/server/coach/student-coach";
import { studentMilestoneWhere } from "@/server/assignments/audience";
import { inLab, requireLabStudent } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const gate = await requireLabStudent(request);
    if ("error" in gate) return gate.error;

    const prisma = getPrisma();
    const programId = gate.ctx.membership.programId;
    const memberId = gate.ctx.membership.id;
    const labId = gate.ctx.labId;
    const lab = inLab(labId);
    const now = new Date();

    const [meetings, milestones, notifications, unreadCount, progress, nudge, nextStep] =
      await Promise.all([
        prisma.meeting.findMany({
          where: {
            programId,
            ...lab,
            invites: { some: { memberId, organizationId: labId } },
            startsAt: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
          },
          include: {
            invites: { where: { memberId, organizationId: labId } },
          },
          orderBy: { startsAt: "asc" },
          take: 5,
        }),
        prisma.milestone.findMany({
          where: {
            programId,
            ...lab,
            status: { in: [MilestoneStatus.ACTIVE, MilestoneStatus.UPCOMING] },
            ...studentMilestoneWhere(memberId),
          },
          include: {
            submissions: {
              where: { memberId, organizationId: labId },
              take: 1,
            },
          },
          orderBy: [{ status: "asc" }, { dueAt: "asc" }],
          take: 6,
        }),
        prisma.notification.findMany({
          where: {
            memberId,
            organizationId: labId,
            readAt: null,
            kind: { not: "MEETING" },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        prisma.notification.count({
          where: {
            memberId,
            organizationId: labId,
            readAt: null,
            kind: { not: "MEETING" },
          },
        }),
        loadStudentProgress({ labId, programId, memberId }),
        loadApprovedNudgeForStudent({
          labId,
          programId,
          email: gate.ctx.email,
          name: gate.ctx.name,
        }),
        loadNextStep({ labId, programId, memberId }),
      ]);

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
        organizationId: labId,
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
        coach: {
          progress: {
            streak: progress.streak,
            submittedCount: progress.submittedCount,
            milestoneCount: progress.milestoneCount,
            openCount: progress.openCount,
            headline: progress.headline,
            detail: progress.detail,
          },
          nudge: nudge
            ? {
                id: nudge.id,
                title: nudge.title,
                body: nudge.body,
                decidedAt: nudge.decidedAt,
              }
            : null,
        },
        nextStep,
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
