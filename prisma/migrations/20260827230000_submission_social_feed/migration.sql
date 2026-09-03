-- CreateTable
CREATE TABLE "SubmissionComment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "authorMemberId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionReaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionComment_organizationId_idx" ON "SubmissionComment"("organizationId");

-- CreateIndex
CREATE INDEX "SubmissionComment_submissionId_createdAt_idx" ON "SubmissionComment"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "SubmissionComment_parentId_idx" ON "SubmissionComment"("parentId");

-- CreateIndex
CREATE INDEX "SubmissionReaction_organizationId_idx" ON "SubmissionReaction"("organizationId");

-- CreateIndex
CREATE INDEX "SubmissionReaction_submissionId_idx" ON "SubmissionReaction"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionReaction_submissionId_memberId_emoji_key" ON "SubmissionReaction"("submissionId", "memberId", "emoji");

-- AddForeignKey
ALTER TABLE "SubmissionComment" ADD CONSTRAINT "SubmissionComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionComment" ADD CONSTRAINT "SubmissionComment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionComment" ADD CONSTRAINT "SubmissionComment_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionComment" ADD CONSTRAINT "SubmissionComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SubmissionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionReaction" ADD CONSTRAINT "SubmissionReaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionReaction" ADD CONSTRAINT "SubmissionReaction_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionReaction" ADD CONSTRAINT "SubmissionReaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
