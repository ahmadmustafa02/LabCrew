import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { issueApiAccessToken } from "@/server/auth/api-tokens";
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

/** Issue a lab-scoped bearer token. Plaintext is returned once. */
export async function POST(request: Request) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const name = body.name?.trim() || "LabCrew Field";
    if (name.length > 80) {
      return NextResponse.json({ ok: false, error: "Name is too long" }, { status: 400 });
    }

    const issued = await issueApiAccessToken({
      userId: gate.ctx.userId,
      organizationId: gate.ctx.labId,
      programId: gate.ctx.membership.programId,
      memberId: gate.ctx.membership.id,
      name,
    });

    return NextResponse.json({
      ok: true,
      token: issued.token,
      tokenId: issued.id,
      expiresAt: issued.expiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to issue token",
      },
      { status: 503 },
    );
  }
}
