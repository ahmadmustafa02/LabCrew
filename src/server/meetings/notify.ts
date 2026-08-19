import { appBaseUrl, sendMail } from "@/server/email/mailer";
import { createNotifications } from "@/server/notifications/create";

export async function notifyMeetingInvites(input: {
  organizationId: string;
  programId: string;
  meetingId: string;
  title: string;
  agenda: string | null;
  meetingUrl: string | null;
  startsAt: Date;
  recipients: { memberId: string; email: string; name: string }[];
}) {
  const when = input.startsAt.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const href = "/app/meetings";
  const base = appBaseUrl();

  await createNotifications(
    input.recipients.map((r) => ({
      organizationId: input.organizationId,
      programId: input.programId,
      memberId: r.memberId,
      kind: "MEETING",
      title: `Meeting: ${input.title}`,
      body: `${when}${input.agenda ? ` — ${input.agenda.slice(0, 120)}` : ""}`,
      href,
    })),
  );

  await Promise.all(
    input.recipients.map(async (r) => {
      const lines = [
        `Hi ${r.name},`,
        "",
        `You're invited to a lab meeting: ${input.title}`,
        `When: ${when}`,
        input.agenda ? `Agenda:\n${input.agenda}` : null,
        input.meetingUrl ? `Join link: ${input.meetingUrl}` : null,
        "",
        `Open in LabCrew: ${base}${href}`,
        "",
        "— LabCrew",
      ].filter(Boolean) as string[];

      await sendMail({
        to: r.email,
        subject: `Lab meeting: ${input.title}`,
        text: lines.join("\n"),
      });
    }),
  );
}
