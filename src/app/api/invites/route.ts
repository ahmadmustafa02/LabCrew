import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { MemberRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { requireDirector } from "@/server/auth/api-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await requireDirector();
    if ("error" in gate) return gate.error;

    const prisma = getPrisma();
    const invites = await prisma.invite.findMany({
      where: {
        programId: gate.session.membership.programId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      ok: true,
      invites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        token: i.token,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
        joinPath: `/join?token=${i.token}`,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to list invites",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireDirector();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as { email?: string; role?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
    }

    const role =
      body.role === "MENTOR" || body.role === "ADMIN"
        ? (body.role as MemberRole)
        : MemberRole.STUDENT;

    const prisma = getPrisma();
    const programId = gate.session.membership.programId;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { members: { where: { programId } } },
    });
    if (existingUser?.members.length) {
      return NextResponse.json(
        { ok: false, error: "This person is already in the program" },
        { status: 409 },
      );
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const invite = await prisma.invite.create({
      data: {
        programId,
        email,
        role,
        token,
        invitedById: gate.session.userId,
        expiresAt,
      },
    });

    return NextResponse.json({
      ok: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        token: invite.token,
        expiresAt: invite.expiresAt,
        joinPath: `/join?token=${invite.token}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create invite",
      },
      { status: 503 },
    );
  }
}
