import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { inLab, requireLabScope } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

/** List bearer tokens for the caller's lab membership (never returns plaintext). */
export async function GET(request: Request) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const tokens = await getPrisma().apiAccessToken.findMany({
      where: {
        ...inLab(gate.ctx.labId),
        userId: gate.ctx.userId,
        memberId: gate.ctx.membership.id,
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, tokens });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to list tokens",
      },
      { status: 503 },
    );
  }
}
