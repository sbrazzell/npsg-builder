-- AlterTable
ALTER TABLE "Facility" ADD COLUMN "lawEnforcementAgency" TEXT;
ALTER TABLE "Facility" ADD COLUMN "lawEnforcementContactDate" DATETIME;
ALTER TABLE "Facility" ADD COLUMN "lawEnforcementContactName" TEXT;
ALTER TABLE "Facility" ADD COLUMN "lawEnforcementFindings" TEXT;
ALTER TABLE "Facility" ADD COLUMN "lawEnforcementResponseDate" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ThreatAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facilityId" TEXT NOT NULL,
    "threatType" TEXT NOT NULL,
    "description" TEXT,
    "likelihood" INTEGER NOT NULL DEFAULT 3,
    "impact" INTEGER NOT NULL DEFAULT 3,
    "vulnerabilityNotes" TEXT,
    "incidentHistory" TEXT,
    "source" TEXT NOT NULL DEFAULT 'self_assessed',
    "sourceAgency" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ThreatAssessment_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ThreatAssessment" ("createdAt", "description", "facilityId", "id", "impact", "incidentHistory", "likelihood", "threatType", "updatedAt", "vulnerabilityNotes") SELECT "createdAt", "description", "facilityId", "id", "impact", "incidentHistory", "likelihood", "threatType", "updatedAt", "vulnerabilityNotes" FROM "ThreatAssessment";
DROP TABLE "ThreatAssessment";
ALTER TABLE "new_ThreatAssessment" RENAME TO "ThreatAssessment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
