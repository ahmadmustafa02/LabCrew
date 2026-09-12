import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { asCatalogPage, extractCatalogFields } from "@/server/catalog/extract";
import { looksLikePdf, textFromPdf } from "@/server/catalog/pdf-text";
import { inLab, requireLabScope } from "@/server/tenancy/lab-scope";
import { findStoredFileInLab } from "@/server/tenancy/lab-repo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const modality = url.searchParams.get("modality")?.trim().toLowerCase() ?? "";
    const human = url.searchParams.get("humanRated")?.trim().toLowerCase() ?? "";
    const licence = url.searchParams.get("licence")?.trim().toLowerCase() ?? "";
    const status = url.searchParams.get("status")?.trim();

    const records = await getPrisma().catalogRecord.findMany({
      where: {
        ...inLab(gate.ctx.labId),
        programId: gate.ctx.membership.programId,
        ...(status ? { status: status as "draft" | "pending_review" | "finalized" } : {}),
      },
      include: { fields: true },
      orderBy: { updatedAt: "desc" },
    });

    const filtered = records.filter((row) => {
      const field = (key: string) =>
        row.fields.find((f) => f.key === key && f.trust === "trusted")?.value.toLowerCase() ?? "";
      if (q && !`${row.title} ${row.fields.map((f) => f.value).join(" ")}`.toLowerCase().includes(q)) {
        return false;
      }
      if (modality && !field("modality").includes(modality)) return false;
      if (human && !field("humanRated").includes(human)) return false;
      if (licence && !field("licence").includes(licence)) return false;
      return true;
    });

    return NextResponse.json({
      ok: true,
      records: filtered.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        sourceName: row.sourceName,
        held: row.fields.filter((f) => f.trust === "held").length,
        trusted: row.fields.filter((f) => f.trust === "trusted").length,
        fields: Object.fromEntries(
          row.fields.filter((f) => f.trust === "trusted").map((f) => [f.key, f.value]),
        ),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to list catalog" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      text?: string;
      filename?: string;
      sourceName?: string;
    };

    let source = body.text?.trim() ?? "";
    let sourceName = body.sourceName?.trim() || "Pasted text";

    if (!source && body.filename) {
      const file = await findStoredFileInLab(gate.ctx.labId, body.filename);
      if (!file) {
        return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
      }
      sourceName = file.originalName;
      if (looksLikePdf(file.data)) {
        source = await textFromPdf(file.data);
      } else {
        source = file.data.toString("utf8");
      }
    }

    if (source.length < 40) {
      return NextResponse.json(
        { ok: false, error: "Need a paper excerpt (or a PDF) of at least 40 characters" },
        { status: 400 },
      );
    }

    const extracted = await extractCatalogFields(source);
    const title =
      extracted.fields.find((f) => f.key === "title" && f.value)?.value ||
      sourceName.replace(/\.pdf$/i, "");

    const held = extracted.fields.filter((f) => f.trust === "held").length;
    const prisma = getPrisma();
    const record = await prisma.catalogRecord.create({
      data: {
        organizationId: gate.ctx.labId,
        programId: gate.ctx.membership.programId,
        title,
        sourceName,
        sourceText: source,
        status: held > 0 ? "pending_review" : "finalized",
        fields: {
          create: extracted.fields.map((f) => ({
            organizationId: gate.ctx.labId,
            key: f.key,
            label: f.label,
            value: f.value,
            quote: f.quote,
            page: asCatalogPage(f.page),
            confidence: f.confidence,
            trust: f.trust,
            verifierNote: f.verifierNote,
          })),
        },
      },
      include: { fields: true },
    });

    return NextResponse.json({ ok: true, via: extracted.via, record });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Extract failed" },
      { status: 503 },
    );
  }
}
