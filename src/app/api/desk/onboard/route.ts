import { NextResponse } from "next/server";
import { createOnboardTrack } from "@/server/desk/onboard";
import { requireLabDirector } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const result = await createOnboardTrack({
      labId: gate.ctx.labId,
      programId: gate.ctx.membership.programId,
    });
    return NextResponse.json({
      ok: true,
      created: result.created,
      already: result.created === 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to add week 0",
      },
      { status: 503 },
    );
  }
}
