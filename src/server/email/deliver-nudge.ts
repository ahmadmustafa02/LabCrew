import { sendMail, type MailResult } from "@/server/email/mailer";
import { getPrisma } from "@/lib/db";

/**
 * Deliver an approved Coach nudge to the real student email when known.
 * Free path: SMTP if configured, otherwise server console.
 */
export async function deliverNudge(input: {
  programId: string;
  toName: string | null;
  toEmail?: string | null;
  subject: string;
  body: string;
}): Promise<MailResult & { to?: string }> {
  let to = input.toEmail?.trim().toLowerCase() || null;

  if (!to && input.toName) {
    const prisma = getPrisma();
    const member = await prisma.member.findFirst({
      where: {
        programId: input.programId,
        user: { name: input.toName },
      },
      include: { user: true },
    });
    to = member?.user.email ?? null;
  }

  if (!to) {
    console.log("[mail] nudge has no student email", {
      toName: input.toName,
      subject: input.subject,
    });
    return { ok: false, error: "No student email on file for this nudge" };
  }

  const result = await sendMail({
    to,
    subject: input.subject,
    text: `Hi ${input.toName ?? "there"},\n\n${input.body}\n\n— LabCrew`,
  });

  return { ...result, to };
}
