import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import {
  assertSameProgram,
  requireAuth,
} from "@/server/auth/api-session";

export const runtime = "nodejs";

type Params = { params: Promise<{ name: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const gate = await requireAuth();
    if ("error" in gate) return gate.error;

    const { name } = await params;
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
      return NextResponse.json({ ok: false, error: "Invalid file" }, { status: 400 });
    }

    const prisma = getPrisma();
    const file = await prisma.storedFile.findUnique({ where: { filename: name } });
    if (!file) {
      return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
    }

    const wrong = assertSameProgram(gate.session, file.programId);
    if (wrong) return wrong;

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${file.originalName}"`,
        "Content-Length": String(file.size),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
  }
}
