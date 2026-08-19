import { NextResponse } from "next/server";
import { requireLabScope } from "@/server/tenancy/lab-scope";
import { findStoredFileInLab } from "@/server/tenancy/lab-repo";

export const runtime = "nodejs";

type Params = { params: Promise<{ name: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const { name } = await params;
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
      return NextResponse.json({ ok: false, error: "Invalid file" }, { status: 400 });
    }

    const file = await findStoredFileInLab(gate.ctx.labId, name);
    if (!file) {
      return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
    }

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
