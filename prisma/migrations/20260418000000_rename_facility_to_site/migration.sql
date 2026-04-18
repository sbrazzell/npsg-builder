-- Rename Facility table to Site
ALTER TABLE "Facility" RENAME TO "Site";

-- Rename facilityName → siteName
ALTER TABLE "Site" RENAME COLUMN "facilityName" TO "siteName";

-- Add targetCycleYear (default 2026)
ALTER TABLE "Site" ADD COLUMN "targetCycleYear" INTEGER NOT NULL DEFAULT 2026;

-- Rename facilityId → siteId in all related tables
ALTER TABLE "ThreatAssessment" RENAME COLUMN "facilityId" TO "siteId";
ALTER TABLE "ExistingSecurityMeasure" RENAME COLUMN "facilityId" TO "siteId";
ALTER TABLE "ProjectProposal" RENAME COLUMN "facilityId" TO "siteId";
ALTER TABLE "NarrativeDraft" RENAME COLUMN "facilityId" TO "siteId";
ALTER TABLE "SiteObservation" RENAME COLUMN "facilityId" TO "siteId";
ALTER TABLE "ApplicationPacket" RENAME COLUMN "facilityId" TO "siteId";
ALTER TABLE "ApplicationDraft" RENAME COLUMN "facilityId" TO "siteId";
ALTER TABLE "GrantAnalysis" RENAME COLUMN "facilityId" TO "siteId";
