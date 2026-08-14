import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getPrisma } from "@/lib/db";
import { appBaseUrl, sendMail } from "@/server/email/mailer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return ok to avoid email enumeration — but if user exists, create token
    if (!user) {
      return NextResponse.json({
        ok: true,
        message: "If that email exists, a reset link is ready.",
      });
    }

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const resetUrl = `${appBaseUrl()}/reset-password?token=${token}`;
    const mail = await sendMail({
      to: user.email,
      subject: "Reset your LabCrew password",
      text: `Reset your password (valid 1 hour):\n\n${resetUrl}\n\nIf you didn't ask for this, ignore this email.`,
    });

    const isConsole = mail.ok && mail.channel === "console";

    return NextResponse.json({
      ok: true,
      message: isConsole
        ? "Email isn’t configured — use the reset link below (also printed in the server console)."
        : "Check your email for a reset link.",
      resetUrl: isConsole ? resetUrl : undefined,
      channel: mail.ok ? mail.channel : "console",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Request failed",
      },
      { status: 503 },
    );
  }
}
