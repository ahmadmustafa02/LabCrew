import { appBaseUrl, sendMail } from "@/server/email/mailer";
import { createNotifications } from "@/server/notifications/create";

export async function notifyAnnouncement(input: {
  programId: string;
  title: string;
  body: string;
  recipients: { memberId: string; email: string; name: string }[];
}) {
  const href = "/app/announcements";
  const base = appBaseUrl();
  const preview = input.body.slice(0, 160);

  await createNotifications(
    input.recipients.map((r) => ({
      programId: input.programId,
      memberId: r.memberId,
      kind: "ANNOUNCEMENT",
      title: input.title,
      body: preview,
      href,
    })),
  );

  await Promise.all(
    input.recipients.map(async (r) => {
      await sendMail({
        to: r.email,
        subject: `LabCrew: ${input.title}`,
        text: [
          `Hi ${r.name},`,
          "",
          input.title,
          "",
          input.body,
          "",
          `Open in LabCrew: ${base}${href}`,
          "",
          "— LabCrew",
        ].join("\n"),
      });
    }),
  );
}
