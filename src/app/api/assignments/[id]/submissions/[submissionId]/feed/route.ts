import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { requireLabScope } from "@/server/tenancy/lab-scope";
import {
  findMilestoneInLab,
  findSubmissionInLab,
} from "@/server/tenancy/lab-repo";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string; submissionId: string }>;
};

const REACTION_EMOJIS = new Set([
  "like",
  "celebrate",
  "insightful",
  "curious",
]);

function canViewSubmission(
  role: string,
  viewerMemberId: string,
  submissionMemberId: string,
) {
  return role === "director" || viewerMemberId === submissionMemberId;
}

function asAttachments(value: unknown) {
  return Array.isArray(value) ? value : [];
}

async function loadPostSocial(postId: string, viewerMemberId: string) {
  const prisma = getPrisma();
  const comments = await prisma.submissionComment.findMany({
    where: { postId, parentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      author: { include: { user: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { include: { user: true } } },
      },
    },
  });

  const reactions = await prisma.submissionReaction.findMany({
    where: { postId },
  });

  const reactionSummary = ["like", "celebrate", "insightful", "curious"].map(
    (emoji) => {
      const rows = reactions.filter((r) => r.emoji === emoji);
      return {
        emoji,
        count: rows.length,
        mine: rows.some((r) => r.memberId === viewerMemberId),
      };
    },
  );

  return {
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: {
        memberId: c.authorMemberId,
        name: c.author.user.name,
        role: c.author.role,
      },
      replies: c.replies.map((r) => ({
        id: r.id,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
        author: {
          memberId: r.authorMemberId,
          name: r.author.user.name,
          role: r.author.role,
        },
      })),
    })),
    reactions: reactionSummary,
  };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const { id: milestoneId, submissionId } = await params;
    const milestone = await findMilestoneInLab(gate.ctx.labId, milestoneId);
    const submission = await findSubmissionInLab(gate.ctx.labId, submissionId);

    if (!milestone || !submission || submission.milestoneId !== milestoneId) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (
      !canViewSubmission(
        gate.ctx.appRole,
        gate.ctx.membership.id,
        submission.memberId,
      )
    ) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (typeof (prisma as { submissionPost?: unknown }).submissionPost === "undefined") {
      console.error("[feed] submissionPost delegate missing — stale Prisma client");
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server needs a restart (work-log model not loaded). Restart npm run dev.",
        },
        { status: 503 },
      );
    }

    let posts = await prisma.submissionPost.findMany({
      where: {
        submissionId,
        organizationId: gate.ctx.labId,
      },
      orderBy: { version: "asc" },
    });

    // Heal: turned-in submission with no posts (failed creates during earlier bugs).
    if (
      posts.length === 0 &&
      (submission.status === "SUBMITTED" || submission.status === "SCORED")
    ) {
      const healed = await prisma.submissionPost.create({
        data: {
          organizationId: gate.ctx.labId,
          submissionId,
          version: 1,
          evidenceUrl: submission.evidenceUrl,
          repoUrl: submission.repoUrl,
          writeup: submission.writeup,
          checklist: (submission.checklist ??
            undefined) as Prisma.InputJsonValue | undefined,
          attachments: (submission.attachments ??
            undefined) as Prisma.InputJsonValue | undefined,
          submittedAt: submission.submittedAt ?? new Date(),
        },
      });
      posts = [healed];
    }

    if (posts.length === 0) {
      return NextResponse.json({
        ok: true,
        published: false,
        posts: [],
        reviewStatus: submission.reviewStatus,
      });
    }

    const viewerId = gate.ctx.membership.id;
    const isOwner = viewerId === submission.memberId;
    const serialized = [];
    for (const post of posts) {
      const social = await loadPostSocial(post.id, viewerId);
      serialized.push({
        id: post.id,
        version: post.version,
        writeup: post.writeup,
        evidenceUrl: post.evidenceUrl,
        repoUrl: post.repoUrl,
        attachments: asAttachments(post.attachments),
        submittedAt: post.submittedAt.toISOString(),
        editedAt: post.editedAt?.toISOString() ?? null,
        canEdit: isOwner,
        comments: social.comments,
        reactions: social.reactions,
      });
    }

    return NextResponse.json({
      ok: true,
      published: true,
      posts: serialized,
      reviewStatus: submission.reviewStatus,
      studentName: undefined as string | undefined,
    });
  } catch (error) {
    console.error("[feed] GET failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Feed failed",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const gate = await requireLabScope(request);
    if ("error" in gate) return gate.error;

    const { id: milestoneId, submissionId } = await params;
    const body = (await request.json()) as {
      action?: "comment" | "reply" | "reaction" | "edit";
      postId?: string;
      text?: string;
      parentId?: string;
      emoji?: string;
      writeup?: string;
      evidenceUrl?: string;
      repoUrl?: string;
      attachments?: unknown;
    };

    const milestone = await findMilestoneInLab(gate.ctx.labId, milestoneId);
    const submission = await findSubmissionInLab(gate.ctx.labId, submissionId);

    if (!milestone || !submission || submission.milestoneId !== milestoneId) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (
      !canViewSubmission(
        gate.ctx.appRole,
        gate.ctx.membership.id,
        submission.memberId,
      )
    ) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const postId = body.postId?.trim() ?? "";
    if (!postId) {
      return NextResponse.json(
        { ok: false, error: "postId required" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const post = await prisma.submissionPost.findFirst({
      where: {
        id: postId,
        submissionId,
        organizationId: gate.ctx.labId,
      },
    });
    if (!post) {
      return NextResponse.json({ ok: false, error: "Post not found" }, { status: 404 });
    }

    const action = body.action ?? "comment";

    if (action === "edit") {
      if (gate.ctx.membership.id !== submission.memberId) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      const attachments = Array.isArray(body.attachments)
        ? body.attachments
        : undefined;
      await prisma.submissionPost.update({
        where: { id: post.id },
        data: {
          writeup:
            typeof body.writeup === "string"
              ? body.writeup.trim() || null
              : undefined,
          evidenceUrl:
            typeof body.evidenceUrl === "string"
              ? body.evidenceUrl.trim() || null
              : undefined,
          repoUrl:
            typeof body.repoUrl === "string"
              ? body.repoUrl.trim() || null
              : undefined,
          attachments:
            attachments !== undefined
              ? (attachments as Prisma.InputJsonValue)
              : undefined,
          editedAt: new Date(),
        },
      });

      // Keep aggregate submission in sync when editing the latest post.
      const latest = await prisma.submissionPost.findFirst({
        where: { submissionId, organizationId: gate.ctx.labId },
        orderBy: { version: "desc" },
      });
      if (latest?.id === post.id) {
        await prisma.submission.update({
          where: { id: submissionId },
          data: {
            writeup:
              typeof body.writeup === "string"
                ? body.writeup.trim() || null
                : undefined,
            evidenceUrl:
              typeof body.evidenceUrl === "string"
                ? body.evidenceUrl.trim() || null
                : undefined,
            repoUrl:
              typeof body.repoUrl === "string"
                ? body.repoUrl.trim() || null
                : undefined,
            attachments:
              attachments !== undefined
                ? (attachments as Prisma.InputJsonValue)
                : undefined,
          },
        });
      }
    } else if (action === "reaction") {
      const emoji = body.emoji?.trim() ?? "";
      if (!REACTION_EMOJIS.has(emoji)) {
        return NextResponse.json(
          { ok: false, error: "Invalid reaction" },
          { status: 400 },
        );
      }
      const existing = await prisma.submissionReaction.findUnique({
        where: {
          postId_memberId_emoji: {
            postId,
            memberId: gate.ctx.membership.id,
            emoji,
          },
        },
      });
      if (existing) {
        await prisma.submissionReaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.submissionReaction.create({
          data: {
            organizationId: gate.ctx.labId,
            postId,
            memberId: gate.ctx.membership.id,
            emoji,
          },
        });
      }
    } else {
      const text = body.text?.trim() ?? "";
      if (text.length < 1 || text.length > 4000) {
        return NextResponse.json(
          { ok: false, error: "Comment must be 1–4000 characters" },
          { status: 400 },
        );
      }

      let parentId: string | null = null;
      if (action === "reply" || body.parentId) {
        parentId = body.parentId ?? null;
        if (!parentId) {
          return NextResponse.json(
            { ok: false, error: "parentId required for reply" },
            { status: 400 },
          );
        }
        const parent = await prisma.submissionComment.findFirst({
          where: {
            id: parentId,
            postId,
            organizationId: gate.ctx.labId,
            parentId: null,
          },
        });
        if (!parent) {
          return NextResponse.json(
            { ok: false, error: "Parent comment not found" },
            { status: 404 },
          );
        }
      }

      await prisma.submissionComment.create({
        data: {
          organizationId: gate.ctx.labId,
          postId,
          authorMemberId: gate.ctx.membership.id,
          parentId,
          body: text,
        },
      });
    }

    // Return refreshed list (same shape as GET).
    const posts = await prisma.submissionPost.findMany({
      where: { submissionId, organizationId: gate.ctx.labId },
      orderBy: { version: "asc" },
    });
    const viewerId = gate.ctx.membership.id;
    const isOwner = viewerId === submission.memberId;
    const serialized = [];
    for (const p of posts) {
      const social = await loadPostSocial(p.id, viewerId);
      serialized.push({
        id: p.id,
        version: p.version,
        writeup: p.writeup,
        evidenceUrl: p.evidenceUrl,
        repoUrl: p.repoUrl,
        attachments: asAttachments(p.attachments),
        submittedAt: p.submittedAt.toISOString(),
        editedAt: p.editedAt?.toISOString() ?? null,
        canEdit: isOwner,
        comments: social.comments,
        reactions: social.reactions,
      });
    }

    return NextResponse.json({
      ok: true,
      published: true,
      posts: serialized,
      reviewStatus: submission.reviewStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Feed update failed",
      },
      { status: 503 },
    );
  }
}
