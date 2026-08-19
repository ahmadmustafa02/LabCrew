-- Phase 1a: structural multi-tenancy — organizationId (labId) on every tenant row.
-- Plus ApiAccessToken for mobile/API bearer auth (decided in Phase 1, not deferred).

-- ApiAccessToken (new)
CREATE TABLE "ApiAccessToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiAccessToken_tokenHash_key" ON "ApiAccessToken"("tokenHash");
CREATE INDEX "ApiAccessToken_userId_idx" ON "ApiAccessToken"("userId");
CREATE INDEX "ApiAccessToken_organizationId_idx" ON "ApiAccessToken"("organizationId");
CREATE INDEX "ApiAccessToken_memberId_idx" ON "ApiAccessToken"("memberId");

ALTER TABLE "ApiAccessToken" ADD CONSTRAINT "ApiAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiAccessToken" ADD CONSTRAINT "ApiAccessToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiAccessToken" ADD CONSTRAINT "ApiAccessToken_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiAccessToken" ADD CONSTRAINT "ApiAccessToken_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Helper: add nullable organizationId, backfill from Program, then NOT NULL + FK + index
-- Milestone
ALTER TABLE "Milestone" ADD COLUMN "organizationId" TEXT;
UPDATE "Milestone" m SET "organizationId" = p."organizationId" FROM "Program" p WHERE m."programId" = p."id";
ALTER TABLE "Milestone" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "Milestone_organizationId_idx" ON "Milestone"("organizationId");
CREATE INDEX "Milestone_programId_idx" ON "Milestone"("programId");
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Submission (via member)
ALTER TABLE "Submission" ADD COLUMN "organizationId" TEXT;
UPDATE "Submission" s SET "organizationId" = m."organizationId" FROM "Member" m WHERE s."memberId" = m."id";
ALTER TABLE "Submission" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "Submission_organizationId_idx" ON "Submission"("organizationId");
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AgentRun
ALTER TABLE "AgentRun" ADD COLUMN "organizationId" TEXT;
UPDATE "AgentRun" r SET "organizationId" = p."organizationId" FROM "Program" p WHERE r."programId" = p."id";
ALTER TABLE "AgentRun" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "AgentRun_organizationId_idx" ON "AgentRun"("organizationId");
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AgentStep (via run)
ALTER TABLE "AgentStep" ADD COLUMN "organizationId" TEXT;
UPDATE "AgentStep" s SET "organizationId" = r."organizationId" FROM "AgentRun" r WHERE s."runId" = r."id";
ALTER TABLE "AgentStep" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "AgentStep_organizationId_idx" ON "AgentStep"("organizationId");
ALTER TABLE "AgentStep" ADD CONSTRAINT "AgentStep_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ApprovalItem
ALTER TABLE "ApprovalItem" ADD COLUMN "organizationId" TEXT;
UPDATE "ApprovalItem" a SET "organizationId" = p."organizationId" FROM "Program" p WHERE a."programId" = p."id";
ALTER TABLE "ApprovalItem" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "ApprovalItem_organizationId_idx" ON "ApprovalItem"("organizationId");
ALTER TABLE "ApprovalItem" ADD CONSTRAINT "ApprovalItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invite
ALTER TABLE "Invite" ADD COLUMN "organizationId" TEXT;
UPDATE "Invite" i SET "organizationId" = p."organizationId" FROM "Program" p WHERE i."programId" = p."id";
ALTER TABLE "Invite" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "Invite_organizationId_idx" ON "Invite"("organizationId");
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- StoredFile
ALTER TABLE "StoredFile" ADD COLUMN "organizationId" TEXT;
UPDATE "StoredFile" f SET "organizationId" = p."organizationId" FROM "Program" p WHERE f."programId" = p."id";
ALTER TABLE "StoredFile" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "StoredFile_organizationId_idx" ON "StoredFile"("organizationId");
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Meeting
ALTER TABLE "Meeting" ADD COLUMN "organizationId" TEXT;
UPDATE "Meeting" m SET "organizationId" = p."organizationId" FROM "Program" p WHERE m."programId" = p."id";
ALTER TABLE "Meeting" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "Meeting_organizationId_idx" ON "Meeting"("organizationId");
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MeetingInvite (via meeting)
ALTER TABLE "MeetingInvite" ADD COLUMN "organizationId" TEXT;
UPDATE "MeetingInvite" mi SET "organizationId" = m."organizationId" FROM "Meeting" m WHERE mi."meetingId" = m."id";
ALTER TABLE "MeetingInvite" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "MeetingInvite_organizationId_idx" ON "MeetingInvite"("organizationId");
ALTER TABLE "MeetingInvite" ADD CONSTRAINT "MeetingInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Conversation
ALTER TABLE "Conversation" ADD COLUMN "organizationId" TEXT;
UPDATE "Conversation" c SET "organizationId" = p."organizationId" FROM "Program" p WHERE c."programId" = p."id";
ALTER TABLE "Conversation" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "Conversation_organizationId_idx" ON "Conversation"("organizationId");
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message (via conversation)
ALTER TABLE "Message" ADD COLUMN "organizationId" TEXT;
UPDATE "Message" msg SET "organizationId" = c."organizationId" FROM "Conversation" c WHERE msg."conversationId" = c."id";
ALTER TABLE "Message" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "Message_organizationId_idx" ON "Message"("organizationId");
ALTER TABLE "Message" ADD CONSTRAINT "Message_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notification
ALTER TABLE "Notification" ADD COLUMN "organizationId" TEXT;
UPDATE "Notification" n SET "organizationId" = p."organizationId" FROM "Program" p WHERE n."programId" = p."id";
ALTER TABLE "Notification" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Announcement
ALTER TABLE "Announcement" ADD COLUMN "organizationId" TEXT;
UPDATE "Announcement" a SET "organizationId" = p."organizationId" FROM "Program" p WHERE a."programId" = p."id";
ALTER TABLE "Announcement" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "Announcement_organizationId_idx" ON "Announcement"("organizationId");
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AnnouncementRecipient (via announcement)
ALTER TABLE "AnnouncementRecipient" ADD COLUMN "organizationId" TEXT;
UPDATE "AnnouncementRecipient" ar SET "organizationId" = a."organizationId" FROM "Announcement" a WHERE ar."announcementId" = a."id";
ALTER TABLE "AnnouncementRecipient" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "AnnouncementRecipient_organizationId_idx" ON "AnnouncementRecipient"("organizationId");
ALTER TABLE "AnnouncementRecipient" ADD CONSTRAINT "AnnouncementRecipient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ProgramOpsSchedule
ALTER TABLE "ProgramOpsSchedule" ADD COLUMN "organizationId" TEXT;
UPDATE "ProgramOpsSchedule" s SET "organizationId" = p."organizationId" FROM "Program" p WHERE s."programId" = p."id";
ALTER TABLE "ProgramOpsSchedule" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "ProgramOpsSchedule_organizationId_idx" ON "ProgramOpsSchedule"("organizationId");
ALTER TABLE "ProgramOpsSchedule" ADD CONSTRAINT "ProgramOpsSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Program index (was missing in some DBs)
CREATE INDEX IF NOT EXISTS "Program_organizationId_idx" ON "Program"("organizationId");
