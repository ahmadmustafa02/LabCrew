import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";
import { findInviteByJoinToken } from "@/server/tenancy/lab-repo";

export const runtime = "nodejs";

/**
 * Public join endpoints — auth is the high-entropy invite token itself.
 * There is no invite-by-id public lookup (that would be IDOR).
 * Unknown / expired / accepted all return the same 404 shape.
 */

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
    }

    const invite = await findInviteByJoinToken(token);
    if (!invite) {
      return NextResponse.json(
        { ok: false, error: "Invite is invalid or expired" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      invite: {
        email: invite.email,
        role: invite.role,
        programName: invite.program.name,
        orgName: invite.program.organization.name,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load invite",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      name?: string;
      password?: string;
    };
    const token = body.token?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    const password = body.password ?? "";

    if (!token) {
      return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
    }
    if (name.length < 2) {
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const invite = await findInviteByJoinToken(token);
    if (!invite) {
      return NextResponse.json(
        { ok: false, error: "Invite is invalid or expired" },
        { status: 404 },
      );
    }

    const prisma = getPrisma();
    const passwordHash = await bcrypt.hash(password, 10);
    const email = invite.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const already = await prisma.member.findFirst({
        where: {
          programId: invite.programId,
          organizationId: invite.organizationId,
          userId: existing.id,
        },
      });
      if (already) {
        return NextResponse.json(
          { ok: false, error: "Already a member — sign in instead" },
          { status: 409 },
        );
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: existing.id },
          data: {
            name,
            passwordHash,
          },
        }),
        prisma.member.create({
          data: {
            organizationId: invite.organizationId,
            programId: invite.programId,
            userId: existing.id,
            role: invite.role,
          },
        }),
        prisma.invite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        }),
      ]);

      return NextResponse.json({
        ok: true,
        email,
        message: "Joined — sign in with your email and password",
      });
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, passwordHash },
      });
      await tx.member.create({
        data: {
          organizationId: invite.organizationId,
          programId: invite.programId,
          userId: user.id,
          role: invite.role,
        },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    });

    return NextResponse.json({
      ok: true,
      email,
      message: "Account created — sign in with your email and password",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to accept invite",
      },
      { status: 503 },
    );
  }
}
