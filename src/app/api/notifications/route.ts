import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireAuth } from "@/server/auth/api-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await requireAuth();
    if ("error" in gate) return gate.error;

    const prisma = getPrisma();
    const items = await prisma.notification.findMany({
      where: { memberId: gate.session.membership.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    const unread = items.filter((n) => !n.readAt).length;

    return NextResponse.json({
      ok: true,
      unread,
      notifications: items.map((n) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        href: n.href,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load notifications",
      },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireAuth();
    if ("error" in gate) return gate.error;

    const body = (await req.json().catch(() => ({}))) as {
      ids?: string[];
      all?: boolean;
      kind?: string;
    };

    const prisma = getPrisma();
    if (body.all) {
      await prisma.notification.updateMany({
        where: {
          memberId: gate.session.membership.id,
          readAt: null,
          ...(body.kind ? { kind: body.kind } : {}),
        },
        data: { readAt: new Date() },
      });
    } else if (body.ids?.length) {
      await prisma.notification.updateMany({
        where: {
          memberId: gate.session.membership.id,
          id: { in: body.ids },
        },
        data: { readAt: new Date() },
      });
    } else if (body.kind) {
      await prisma.notification.updateMany({
        where: {
          memberId: gate.session.membership.id,
          kind: body.kind,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to update notifications",
      },
      { status: 503 },
    );
  }
}
