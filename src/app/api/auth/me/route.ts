import { NextResponse } from "next/server";
import { requireLabScope } from "@/server/tenancy/lab-scope";

export async function GET(request: Request) {
  const gate = await requireLabScope(request);
  if ("error" in gate) {
    return NextResponse.json({ ok: false, authenticated: false });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    authMethod: gate.ctx.authMethod,
    user: {
      id: gate.ctx.userId,
      email: gate.ctx.email,
      name: gate.ctx.name,
      role: gate.ctx.appRole,
      memberId: gate.ctx.membership.id,
      programName: gate.ctx.membership.programName,
      organizationId: gate.ctx.labId,
      programId: gate.ctx.membership.programId,
    },
  });
}
