-- Adaptive Coach Phase C: store approved resource lists on milestones

ALTER TABLE "Milestone" ADD COLUMN "coachResources" JSONB;
