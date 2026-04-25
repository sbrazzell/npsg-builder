-- AddColumn: timeline + sustainment structured data and narrative overrides
ALTER TABLE "ProjectProposal" ADD COLUMN "timelineJson" TEXT;
ALTER TABLE "ProjectProposal" ADD COLUMN "sustainmentJson" TEXT;
ALTER TABLE "ProjectProposal" ADD COLUMN "timelineNarrative" TEXT;
ALTER TABLE "ProjectProposal" ADD COLUMN "sustainmentNarrative" TEXT;
