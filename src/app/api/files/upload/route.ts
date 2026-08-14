import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large (max 8MB)" }, { status: 400 });
    }

    const ext = path.extname(file.name) || ".bin";
    const safeExt = ext.slice(0, 12);
    const id = randomUUID();
    const filename = `${id}${safeExt}`;
    const dir = path.join(process.cwd(), "storage", "materials");
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);

    return NextResponse.json({
      ok: true,
      material: {
        id,
        title: title || file.name,
        kind: "file" as const,
        url: `/api/files/${filename}`,
        originalName: file.name,
        size: file.size,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 503 },
    );
  }
}
