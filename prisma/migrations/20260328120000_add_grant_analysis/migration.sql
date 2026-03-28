-- CreateTable
CREATE TABLE "GrantAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "riskClarityScore" INTEGER NOT NULL DEFAULT 0,
    "vulnerabilitySpecificityScore" INTEGER NOT NULL DEFAULT 0,
    "projectAlignmentScore" INTEGER NOT NULL DEFAULT 0,
    "budgetDefensibilityScore" INTEGER NOT NULL DEFAULT 0,
    "narrativeQualityScore" INTEGER NOT NULL DEFAULT 0,
    "strengthsSummary" TEXT,
    "weaknessesSummary" TEXT,
    "priorityFixesSummary" TEXT,
    "analysisJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrantAnalysis_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrantAnalysisFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grantAnalysisId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "suggestedFix" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrantAnalysisFlag_grantAnalysisId_fkey" FOREIGN KEY ("grantAnalysisId") REFERENCES "GrantAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectAnalysisSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grantAnalysisId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "findingsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectAnalysisSnapshot_grantAnalysisId_fkey" FOREIGN KEY ("grantAnalysisId") REFERENCES "GrantAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
