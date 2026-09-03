-- Work log posts: each turn-in / resubmit is a separate post.
-- Comments & reactions move from Submission → SubmissionPost.

CREATE TABLE "SubmissionPost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "evidenceUrl" TEXT,
    "repoUrl" TEXT,
    "writeup" TEXT,
    "checklist" JSONB,
    "attachments" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubmissionPost_submissionId_version_key" ON "SubmissionPost"("submissionId", "version");
CREATE INDEX "SubmissionPost_organizationId_idx" ON "SubmissionPost"("organizationId");
CREATE INDEX "SubmissionPost_submissionId_submittedAt_idx" ON "SubmissionPost"("submissionId", "submittedAt");

ALTER TABLE "SubmissionPost" ADD CONSTRAINT "SubmissionPost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionPost" ADD CONSTRAINT "SubmissionPost_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one post per already-turned-in submission
INSERT INTO "SubmissionPost" (
  "id", "organizationId", "submissionId", "version",
  "evidenceUrl", "repoUrl", "writeup", "checklist", "attachments",
  "submittedAt", "editedAt", "createdAt", "updatedAt"
)
SELECT
  'post_' || s."id",
  s."organizationId",
  s."id",
  1,
  s."evidenceUrl",
  s."repoUrl",
  s."writeup",
  s."checklist",
  s."attachments",
  COALESCE(s."submittedAt", s."updatedAt", s."createdAt"),
  NULL,
  COALESCE(s."submittedAt", s."createdAt"),
  s."updatedAt"
FROM "Submission" s
WHERE s."status" IN ('SUBMITTED', 'SCORED');

-- Repoint comments to posts
ALTER TABLE "SubmissionComment" ADD COLUMN "postId" TEXT;

UPDATE "SubmissionComment" c
SET "postId" = p."id"
FROM "SubmissionPost" p
WHERE p."submissionId" = c."submissionId";

DELETE FROM "SubmissionComment" WHERE "postId" IS NULL;

ALTER TABLE "SubmissionComment" DROP CONSTRAINT IF EXISTS "SubmissionComment_submissionId_fkey";
DROP INDEX IF EXISTS "SubmissionComment_submissionId_createdAt_idx";
ALTER TABLE "SubmissionComment" DROP COLUMN "submissionId";
ALTER TABLE "SubmissionComment" ALTER COLUMN "postId" SET NOT NULL;

CREATE INDEX "SubmissionComment_postId_createdAt_idx" ON "SubmissionComment"("postId", "createdAt");
ALTER TABLE "SubmissionComment" ADD CONSTRAINT "SubmissionComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SubmissionPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Repoint reactions to posts
ALTER TABLE "SubmissionReaction" ADD COLUMN "postId" TEXT;

UPDATE "SubmissionReaction" r
SET "postId" = p."id"
FROM "SubmissionPost" p
WHERE p."submissionId" = r."submissionId";

DELETE FROM "SubmissionReaction" WHERE "postId" IS NULL;

ALTER TABLE "SubmissionReaction" DROP CONSTRAINT IF EXISTS "SubmissionReaction_submissionId_fkey";
ALTER TABLE "SubmissionReaction" DROP CONSTRAINT IF EXISTS "SubmissionReaction_submissionId_memberId_emoji_key";
DROP INDEX IF EXISTS "SubmissionReaction_submissionId_idx";
ALTER TABLE "SubmissionReaction" DROP COLUMN "submissionId";
ALTER TABLE "SubmissionReaction" ALTER COLUMN "postId" SET NOT NULL;

CREATE UNIQUE INDEX "SubmissionReaction_postId_memberId_emoji_key" ON "SubmissionReaction"("postId", "memberId", "emoji");
CREATE INDEX "SubmissionReaction_postId_idx" ON "SubmissionReaction"("postId");
ALTER TABLE "SubmissionReaction" ADD CONSTRAINT "SubmissionReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SubmissionPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
