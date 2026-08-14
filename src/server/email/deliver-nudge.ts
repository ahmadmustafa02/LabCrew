type SendResult =
  | { ok: true; channel: "resend" | "console"; id?: string }
  | { ok: false; error: string };

/**
 * Deliver an approved Coach nudge.
 * Uses Resend when RESEND_API_KEY is set; otherwise logs to the server console.
 */
export async function deliverNudge(input: {
  toName: string | null;
  subject: string;
  body: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() || "LabCrew <ops@labcrew.local>";
  const toEmail = process.env.NUDGE_TEST_TO?.trim();

  if (!apiKey) {
    console.log(
      "[email] simulated nudge send",
      JSON.stringify(
        {
          toName: input.toName,
          subject: input.subject,
          body: input.body.slice(0, 240),
        },
        null,
        2,
      ),
    );
    return { ok: true, channel: "console" };
  }

  if (!toEmail) {
    return {
      ok: false,
      error: "RESEND_API_KEY set but NUDGE_TEST_TO missing",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject: input.subject,
        text: `Hi ${input.toName ?? "there"},\n\n${input.body}\n\n— LabCrew`,
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      return { ok: false, error: data.message ?? "Resend failed" };
    }
    return { ok: true, channel: "resend", id: data.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Send failed",
    };
  }
}
