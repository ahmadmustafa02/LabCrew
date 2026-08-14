import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireAuth } from "@/server/auth/api-session";
import {
  canAccessConversation,
  notifyNewMessage,
} from "@/server/messages/access";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireAuth();
    if ("error" in gate) return gate.error;

    const { id } = await ctx.params;
    const conv = await canAccessConversation(id, gate.session);
    if (!conv) {
      return NextResponse.json(
        { ok: false, error: "Conversation not found" },
        { status: 404 },
      );
    }

    const url = new URL(req.url);
    const after = url.searchParams.get("after");
    const prisma = getPrisma();

    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        ...(after
          ? { createdAt: { gt: new Date(after) } }
          : {}),
      },
      include: { sender: { include: { user: true } } },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return NextResponse.json({
      ok: true,
      conversationId: id,
      studentMemberId: conv.studentMemberId,
      messages: messages.map((m) => ({
        id: m.id,
        clientId: m.clientId,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        senderMemberId: m.senderMemberId,
        senderName: m.sender.user.name,
        mine: m.senderMemberId === gate.session.membership.id,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load messages",
      },
      { status: 503 },
    );
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireAuth();
    if ("error" in gate) return gate.error;

    const { id } = await ctx.params;
    const conv = await canAccessConversation(id, gate.session);
    if (!conv) {
      return NextResponse.json(
        { ok: false, error: "Conversation not found" },
        { status: 404 },
      );
    }

    const body = (await req.json()) as { body?: string; clientId?: string };
    const text = body.body?.trim();
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Message body required" },
        { status: 400 },
      );
    }
    if (text.length > 4000) {
      return NextResponse.json(
        { ok: false, error: "Message too long" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const now = new Date();
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderMemberId: gate.session.membership.id,
        body: text,
        clientId: body.clientId?.slice(0, 64) || null,
      },
      include: { sender: { include: { user: true } } },
    });

    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: now },
    });

    void notifyNewMessage({
      programId: gate.session.membership.programId,
      conversationId: id,
      senderMemberId: gate.session.membership.id,
      studentMemberId: conv.studentMemberId,
      preview: text,
    });

    return NextResponse.json({
      ok: true,
      message: {
        id: message.id,
        clientId: message.clientId,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        senderMemberId: message.senderMemberId,
        senderName: message.sender.user.name,
        mine: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to send message",
      },
      { status: 503 },
    );
  }
}
