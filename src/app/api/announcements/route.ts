import { MeetingAudience, MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireAuth, requireDirector } from "@/server/auth/api-session";
import { notifyAnnouncement } from "@/server/announcements/notify";

export const runtime = "nodejs";

function serialize(
  a: {
    id: string;
    title: string;
    body: string;
    audience: MeetingAudience;
    createdAt: Date;
    createdBy: { user: { name: string } };
    recipients: { memberId: string; member: { user: { name: string } } }[];
  },
) {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.audience,
    createdAt: a.createdAt.toISOString(),
    createdByName: a.createdBy.user.name,
    recipientCount: a.recipients.length,
  };
}

export async function GET() {
  try {
    const gate = await requireAuth();
    if ("error" in gate) return gate.error;

    const prisma = getPrisma();
    if (!prisma.announcement) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Database client is outdated — restart `npm run dev` after schema migrate.",
        },
        { status: 503 },
      );
    }

    const programId = gate.session.membership.programId;
    const memberId = gate.session.membership.id;

    if (gate.session.appRole === "director") {
      const rows = await prisma.announcement.findMany({
        where: { programId },
        include: {
          createdBy: { include: { user: true } },
          recipients: { include: { member: { include: { user: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      });
      return NextResponse.json({
        ok: true,
        announcements: rows.map(serialize),
      });
    }

    const rows = await prisma.announcement.findMany({
      where: {
        programId,
        recipients: { some: { memberId } },
      },
      include: {
        createdBy: { include: { user: true } },
        recipients: {
          where: { memberId },
          include: { member: { include: { user: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    await prisma.announcementRecipient.updateMany({
      where: { memberId, readAt: null, announcement: { programId } },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      announcements: rows.map(serialize),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load announcements",
      },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireDirector();
    if ("error" in gate) return gate.error;

    const body = (await req.json()) as {
      title?: string;
      body?: string;
      audience?: "ALL" | "SELECTED";
      memberIds?: string[];
    };

    const title = body.title?.trim();
    const text = body.body?.trim();
    if (!title || !text) {
      return NextResponse.json(
        { ok: false, error: "Title and body are required" },
        { status: 400 },
      );
    }

    const audience =
      body.audience === "SELECTED"
        ? MeetingAudience.SELECTED
        : MeetingAudience.ALL;

    const prisma = getPrisma();
    const programId = gate.session.membership.programId;
    const students = await prisma.member.findMany({
      where: { programId, role: MemberRole.STUDENT },
      include: { user: true },
    });

    let targets = students;
    if (audience === MeetingAudience.SELECTED) {
      const ids = new Set(body.memberIds ?? []);
      targets = students.filter((s) => ids.has(s.id));
      if (targets.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Select at least one student" },
          { status: 400 },
        );
      }
    }

    const row = await prisma.announcement.create({
      data: {
        organizationId: gate.session.membership.organizationId,
        programId,
        createdById: gate.session.membership.id,
        title,
        body: text,
        audience,
        recipients: {
          create: targets.map((t) => ({
            organizationId: gate.session.membership.organizationId,
            memberId: t.id,
            notifiedAt: new Date(),
          })),
        },
      },
      include: {
        createdBy: { include: { user: true } },
        recipients: { include: { member: { include: { user: true } } } },
      },
    });

    await notifyAnnouncement({
      organizationId: gate.session.membership.organizationId,
      programId,
      title,
      body: text,
      recipients: targets.map((t) => ({
        memberId: t.id,
        email: t.user.email,
        name: t.user.name,
      })),
    });

    return NextResponse.json({
      ok: true,
      announcement: serialize(row),
      sent: targets.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to send announcement",
      },
      { status: 503 },
    );
  }
}
