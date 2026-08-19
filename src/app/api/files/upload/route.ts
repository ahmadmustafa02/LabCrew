import { randomUUID } from "crypto";
import path from "path";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { requireAuth } from "@/server/auth/api-session";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;

/** Any authenticated member can upload (materials for directors, attachments for students). */
export async function POST(request: Request) {
  try {
    const gate = await requireAuth();
    if ("error" in gate) return gate.error;

    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File too large (max 12MB)" },
        { status: 400 },
      );
    }

    const ext = path.extname(file.name) || ".bin";
    const safeExt = ext.slice(0, 12);
    const id = randomUUID();
    const filename = `${id}${safeExt}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";

    const prisma = getPrisma();
    await prisma.storedFile.create({
      data: {
        organizationId: gate.session.membership.organizationId,
        programId: gate.session.membership.programId,
        filename,
        originalName: file.name,
        contentType,
        size: file.size,
        data: buffer,
        uploadedById: gate.session.userId,
      },
    });

    return NextResponse.json({
      ok: true,
      file: {
        id,
        title: title || file.name,
        kind: "file" as const,
        url: `/api/files/${filename}`,
        originalName: file.name,
        size: file.size,
      },
      // backwards-compatible for assignment material uploads
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
