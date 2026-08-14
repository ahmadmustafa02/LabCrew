import { getPrisma } from "@/lib/db";

export async function createNotifications(
  items: {
    programId: string;
    memberId: string;
    kind: string;
    title: string;
    body?: string;
    href?: string;
  }[],
) {
  if (items.length === 0) return;
  const prisma = getPrisma();
  await prisma.notification.createMany({ data: items });
}
