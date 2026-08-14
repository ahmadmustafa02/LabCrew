import { MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireAuth } from "@/server/auth/api-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await requireAuth();
    if ("error" in gate) return gate.error;

    const prisma = getPrisma();
    const programId = gate.session.membership.programId;
    const me = gate.session.membership.id;

    if (gate.session.appRole === "student") {
      const conv = await prisma.conversation.findUnique({
        where: {
          programId_studentMemberId: {
            programId,
            studentMemberId: me,
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { include: { user: true } } },
          },
        },
      });

      return NextResponse.json({
        ok: true,
        conversations: conv
          ? [
              {
                id: conv.id,
                title: "Lab directors",
                studentMemberId: me,
                studentName: gate.session.name,
                lastMessageAt: conv.lastMessageAt?.toISOString() ?? null,
                lastPreview: conv.messages[0]?.body?.slice(0, 100) ?? null,
                lastSenderName: conv.messages[0]?.sender.user.name ?? null,
              },
            ]
          : [],
      });
    }

    const conversations = await prisma.conversation.findMany({
      where: { programId },
      include: {
        student: { include: { user: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { include: { user: true } } },
        },
      },
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    });

    const students = await prisma.member.findMany({
      where: { programId, role: MemberRole.STUDENT },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    const openIds = new Set(conversations.map((c) => c.studentMemberId));

    return NextResponse.json({
      ok: true,
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.student.user.name,
        studentMemberId: c.studentMemberId,
        studentName: c.student.user.name,
        studentEmail: c.student.user.email,
        lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
        lastPreview: c.messages[0]?.body?.slice(0, 100) ?? null,
        lastSenderName: c.messages[0]?.sender.user.name ?? null,
      })),
      studentsWithoutThread: students
        .filter((s) => !openIds.has(s.id))
        .map((s) => ({
          memberId: s.id,
          name: s.user.name,
          email: s.user.email,
        })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load conversations",
      },
      { status: 503 },
    );
  }
}

/** Start or open a student↔directors thread */
export async function POST(req: Request) {
  try {
    const gate = await requireAuth();
    if ("error" in gate) return gate.error;

    const prisma = getPrisma();
    const programId = gate.session.membership.programId;
    const body = (await req.json().catch(() => ({}))) as {
      studentMemberId?: string;
    };

    let studentMemberId = gate.session.membership.id;
    if (gate.session.appRole === "director") {
      if (!body.studentMemberId) {
        return NextResponse.json(
          { ok: false, error: "studentMemberId required" },
          { status: 400 },
        );
      }
      const student = await prisma.member.findFirst({
        where: {
          id: body.studentMemberId,
          programId,
          role: MemberRole.STUDENT,
        },
      });
      if (!student) {
        return NextResponse.json(
          { ok: false, error: "Student not found" },
          { status: 404 },
        );
      }
      studentMemberId = student.id;
    }

    const conv = await prisma.conversation.upsert({
      where: {
        programId_studentMemberId: { programId, studentMemberId },
      },
      create: { programId, studentMemberId },
      update: {},
      include: { student: { include: { user: true } } },
    });

    return NextResponse.json({
      ok: true,
      conversation: {
        id: conv.id,
        studentMemberId: conv.studentMemberId,
        studentName: conv.student.user.name,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to open conversation",
      },
      { status: 503 },
    );
  }
}
