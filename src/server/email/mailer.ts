export type MailResult =
  | { ok: true; channel: "smtp" | "console"; id?: string }
  | { ok: false; error: string };

/**
 * Free-first mailer:
 * 1) SMTP if SMTP_HOST + SMTP_USER + SMTP_PASS (e.g. free Gmail app password)
 * 2) Otherwise console log (fully free, works offline)
 */
export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<MailResult> {
  const from =
    process.env.EMAIL_FROM?.trim() || "LabCrew <ops@labcrew.local>";
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");

  if (host && user && pass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      const info = await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
      });
      return { ok: true, channel: "smtp", id: info.messageId };
    } catch (error) {
      console.error("[mail] SMTP failed, falling back to console", error);
    }
  }

  console.log(
    "[mail:console]",
    JSON.stringify(
      {
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
      },
      null,
      2,
    ),
  );
  return { ok: true, channel: "console" };
}

export function appBaseUrl() {
  return (
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
