-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'DONE');

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN "attachments" JSONB,
ADD COLUMN "reviewStatus" "ReviewStatus",
ADD COLUMN "reviewComment" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" TEXT;

-- CreateIndex
CREATE INDEX "Submission_reviewStatus_idx" ON "Submission"("reviewStatus");
