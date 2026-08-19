import { NextResponse } from "next/server";
import { revokeApiAccessToken } from "@/server/auth/api-tokens";
import { requireLabScope } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** Revoke a lab-scoped bearer token (must belong to caller's lab + user). */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const { id } = await params;
    const revoked = await revokeApiAccessToken(id, gate.ctx.labId);
    if (!revoked || revoked.userId !== gate.ctx.userId) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, revoked: true, id });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to revoke token",
      },
      { status: 503 },
    );
  }
}
