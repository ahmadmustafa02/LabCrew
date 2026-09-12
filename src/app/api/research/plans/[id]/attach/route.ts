import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import type { MaterialItem } from "@/lib/assignment-types";
import { getPrisma } from "@/lib/db";
import { catalogSchema } from "@/server/catalog/schema";
import { agentLaterOf, findResearchPlanInLab } from "@/server/research/plan-repo";
import { requireLabDirector } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function asMaterials(value: unknown): MaterialItem[] {
  return Array.isArray(value) ? (value as MaterialItem[]) : [];
}

export async function POST(request: Request, { params }: Params) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const { id } = await params;
    const plan = await findResearchPlanInLab({
      labId: gate.ctx.labId,
      programId: gate.ctx.membership.programId,
      planId: id,
    });
    if (!plan) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      kind?: "papers" | "datasets";
      milestoneId?: string;
      title?: string;
      url?: string;
      alsoCatalog?: boolean;
      licenceHint?: string | null;
    };

    const title = body.title?.trim() ?? "";
    const url = body.url?.trim() ?? "";
    if (!title || !url.startsWith("http")) {
      return NextResponse.json(
        { ok: false, error: "Need a real title and http(s) URL from search." },
        { status: 400 },
      );
    }

    const kind = body.kind === "datasets" ? "datasets" : "papers";
    const preferred =
      plan.milestones.find((m) => m.id === body.milestoneId) ??
      plan.milestones.find((m) => agentLaterOf(m.rubric) === kind) ??
      plan.milestones[0];
    if (!preferred) {
      return NextResponse.json(
        { ok: false, error: "This plan has no assignments to attach to." },
        { status: 400 },
      );
    }

    const materials = asMaterials(preferred.materials);
    if (!materials.some((m) => m.url === url)) {
      materials.push({
        id: crypto.randomUUID(),
        title,
        kind: "link",
        url,
      });
    }

    const prisma = getPrisma();
    await prisma.milestone.update({
      where: { id: preferred.id },
      data: { materials: materials as Prisma.InputJsonValue },
    });

    let catalogId: string | null = null;
    if (kind === "datasets" && body.alsoCatalog) {
      const sourceText = [
        `Dataset name: ${title}.`,
        `Hub page: ${url}.`,
        "Listed on Hugging Face. Other catalog fields stay held until a paper excerpt supports them.",
      ].join(" ");
      const record = await prisma.catalogRecord.create({
        data: {
          organizationId: gate.ctx.labId,
          programId: gate.ctx.membership.programId,
          title,
          sourceName: url,
          sourceText,
          status: "pending_review",
          fields: {
            create: catalogSchema().map((spec) => {
              if (spec.key === "title") {
                return {
                  organizationId: gate.ctx.labId,
                  key: spec.key,
                  label: spec.label,
                  value: title,
                  quote: `Dataset name: ${title}.`,
                  confidence: "0.9",
                  trust: "trusted" as const,
                  verifierNote: "Title taken from the Hugging Face listing.",
                };
              }
              return {
                organizationId: gate.ctx.labId,
                key: spec.key,
                label: spec.label,
                value: spec.key === "licence" && body.licenceHint ? body.licenceHint : "",
                quote: "",
                confidence: "0",
                trust: "held" as const,
                verifierNote:
                  spec.key === "licence" && body.licenceHint
                    ? "Hub hinted a licence. Held until a source sentence supports it."
                    : "Not in the hub listing we stored. Held.",
              };
            }),
          },
        },
      });
      catalogId = record.id;
    }

    return NextResponse.json({
      ok: true,
      assignmentId: preferred.id,
      catalogId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Attach failed",
      },
      { status: 503 },
    );
  }
}
