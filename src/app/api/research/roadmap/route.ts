import { NextResponse } from "next/server";
import { draftResearchRoadmap } from "@/server/research/draft-roadmap";
import { cleanTopic } from "@/server/research/roadmap";
import { requireLabDirector } from "@/server/tenancy/lab-scope";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const gate = await requireLabDirector(request);
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as { topic?: string; weeks?: number };
    const topic = cleanTopic(body.topic);
    if (topic.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Type a research topic (a short sentence is enough)." },
        { status: 400 },
      );
    }

    const roadmap = await draftResearchRoadmap({ topic, weeks: body.weeks });
    return NextResponse.json({ ok: true, roadmap });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to draft roadmap",
      },
      { status: 503 },
    );
  }
}
