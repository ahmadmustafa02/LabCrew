import { MemberRole } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { createNotifications } from "@/server/notifications/create";

export async function canAccessConversation(
  conversationId: string,
  session: {
    appRole: string;
    membership: { id: string; programId: string };
  },
) {
  const prisma = getPrisma();
  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      programId: session.membership.programId,
    },
  });
  if (!conv) return null;
  if (session.appRole === "director") return conv;
  if (conv.studentMemberId === session.membership.id) return conv;
  return null;
}

export async function notifyNewMessage(input: {
  programId: string;
  conversationId: string;
  senderMemberId: string;
  studentMemberId: string;
  preview: string;
}) {
  const prisma = getPrisma();
  const sender = await prisma.member.findUnique({
    where: { id: input.senderMemberId },
    include: { user: true },
  });
  if (!sender) return;

  const href = `/app/messages?c=${input.conversationId}`;
  const preview = input.preview.slice(0, 140);

  if (sender.role === MemberRole.STUDENT) {
    const directors = await prisma.member.findMany({
      where: {
        programId: input.programId,
        role: { in: [MemberRole.ADMIN, MemberRole.MENTOR] },
      },
    });
    await createNotifications(
      directors.map((d) => ({
        programId: input.programId,
        memberId: d.id,
        kind: "MESSAGE",
        title: `Message from ${sender.user.name}`,
        body: preview,
        href,
      })),
    );
  } else {
    await createNotifications([
      {
        programId: input.programId,
        memberId: input.studentMemberId,
        kind: "MESSAGE",
        title: `Message from ${sender.user.name}`,
        body: preview,
        href,
      },
    ]);
  }
}
