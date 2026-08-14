import { requireAuth } from "@/server/auth/api-session";
import { getPrisma } from "@/lib/db";
import { canAccessConversation } from "@/server/messages/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE live stream for a conversation — near-instant feel without WebSockets.
 * Client reconnects automatically; we poll DB every ~700ms for new rows.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAuth();
  if ("error" in gate) return gate.error;

  const { id } = await ctx.params;
  const conv = await canAccessConversation(id, gate.session);
  if (!conv) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  let cursor =
    url.searchParams.get("after") ?? new Date(0).toISOString();

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("ready", { conversationId: id, at: new Date().toISOString() });

      const tick = async () => {
        if (closed) return;
        try {
          const prisma = getPrisma();
          const messages = await prisma.message.findMany({
            where: {
              conversationId: id,
              createdAt: { gt: new Date(cursor) },
            },
            include: { sender: { include: { user: true } } },
            orderBy: { createdAt: "asc" },
            take: 50,
          });
          for (const m of messages) {
            cursor = m.createdAt.toISOString();
            send("message", {
              id: m.id,
              clientId: m.clientId,
              body: m.body,
              createdAt: m.createdAt.toISOString(),
              senderMemberId: m.senderMemberId,
              senderName: m.sender.user.name,
              mine: m.senderMemberId === gate.session.membership.id,
            });
          }
        } catch {
          send("error", { message: "poll failed" });
        }
      };

      const interval = setInterval(() => {
        void tick();
      }, 700);

      const heartbeat = setInterval(() => {
        send("ping", { t: Date.now() });
      }, 15000);

      void tick();

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
