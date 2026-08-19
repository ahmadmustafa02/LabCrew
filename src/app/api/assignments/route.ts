import { NextResponse } from "next/server";
import { MilestoneStatus, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import type {
  AssignmentDataSchema,
  AssignmentRubric,
  MaterialItem,
} from "@/lib/assignment-types";
import { requireAuth, requireDirector } from "@/server/auth/api-session";
import { parseDataSchema } from "@/server/data/submission-data";
import { draftResourceSuggestionsForMilestone } from "@/server/coach/resource-suggest";

export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await requireAuth();
    if ("error" in gate) return gate.error;

    const { membership } = gate.session;
    const prisma = getPrisma();

    const assignments = await prisma.milestone.findMany({
      where: { programId: membership.programId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        submissions: {
          select: {
            id: true,
            status: true,
            reviewStatus: true,
            memberId: true,
          },
        },
        program: {
          include: {
            members: {
              where: { role: "STUDENT" },
              select: { id: true },
            },
          },
        },
      },
    });

    const isStudent = gate.session.appRole === "student";
    const myId = membership.id;

    return NextResponse.json({
      ok: true,
      programId: membership.programId,
      assignments: assignments.map((a) => {
        const turnedIn = a.submissions.filter((s) =>
          ["SUBMITTED", "SCORED"].includes(s.status),
        );
        const mySub = a.submissions.find((s) => s.memberId === myId);
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          instructions: a.instructions,
          materials: a.materials,
          rubric: a.rubric,
          dueAt: a.dueAt,
          status: a.status,
          sortOrder: a.sortOrder,
          materialCount: Array.isArray(a.materials) ? a.materials.length : 0,
          studentCount: a.program.members.length,
          submissionCount: turnedIn.length,
          pendingReview: turnedIn.filter(
            (s) => s.reviewStatus === "PENDING_REVIEW",
          ).length,
          needsRevision: turnedIn.filter(
            (s) => s.reviewStatus === "NEEDS_REVISION",
          ).length,
          approved: turnedIn.filter(
            (s) =>
              s.reviewStatus === "APPROVED" || s.reviewStatus === "DONE",
          ).length,
          myStatus: isStudent ? (mySub?.status ?? null) : null,
          myReviewStatus: isStudent ? (mySub?.reviewStatus ?? null) : null,
        };
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to list assignments",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireDirector();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      instructions?: string;
      dueAt?: string | null;
      status?: MilestoneStatus;
      materials?: MaterialItem[];
      rubric?: AssignmentRubric;
      dataSchema?: AssignmentDataSchema | null;
      sortOrder?: number;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
    }

    const programId = gate.session.membership.programId;
    const organizationId = gate.session.membership.organizationId;
    const prisma = getPrisma();

    const maxSort = await prisma.milestone.aggregate({
      where: { programId },
      _max: { sortOrder: true },
    });

    const dataSchema = parseDataSchema(body.dataSchema);

    const assignment = await prisma.milestone.create({
      data: {
        organizationId,
        programId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        instructions: body.instructions?.trim() || null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        status: body.status ?? MilestoneStatus.ACTIVE,
        sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
        materials: (body.materials ?? []) as Prisma.InputJsonValue,
        dataSchema: dataSchema
          ? (dataSchema as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
        rubric: (body.rubric ?? {
          requireEvidenceUrl: true,
          requireWriteup: true,
          minWriteupLength: 40,
          checklist: [],
          acceptData: false,
        }) as Prisma.InputJsonValue,
      },
    });

    // Phase C — retrieval-grounded resource draft → Approvals (never invents)
    let resourceDraft: { approvalId: string; status: string } | null = null;
    try {
      const drafted = await draftResourceSuggestionsForMilestone({
        labId: organizationId,
        programId,
        milestoneId: assignment.id,
        title: assignment.title,
        description: assignment.description,
      });
      resourceDraft = {
        approvalId: drafted.approvalId,
        status: drafted.payload.status,
        reusedPending: drafted.reusedPending,
        searchCacheHit: drafted.searchCacheHit ?? false,
      };
    } catch (err) {
      console.warn("[resources] draft on create failed", err);
    }

    return NextResponse.json({ ok: true, assignment, resourceDraft });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create assignment",
      },
      { status: 503 },
    );
  }
}
