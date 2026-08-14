import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ name: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { name } = await params;
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
      return NextResponse.json({ ok: false, error: "Invalid file" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "storage", "materials", name);
    const data = await readFile(filePath);
    const ext = path.extname(name).toLowerCase();
    const type =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : "application/octet-stream";

    return new NextResponse(data, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `inline; filename="${name}"`,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
  }
}
