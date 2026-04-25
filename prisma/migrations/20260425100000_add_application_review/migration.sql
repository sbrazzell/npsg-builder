-- CreateTable: ApplicationReview
CREATE TABLE "ApplicationReview" (
    "id"                 TEXT NOT NULL PRIMARY KEY,
    "draftId"            TEXT NOT NULL,
    "overallScore"       INTEGER NOT NULL DEFAULT 0,
    "reviewStatus"       TEXT NOT NULL DEFAULT 'incomplete',
    "totalFindings"      INTEGER NOT NULL DEFAULT 0,
    "blockerCount"       INTEGER NOT NULL DEFAULT 0,
    "warningCount"       INTEGER NOT NULL DEFAULT 0,
    "suggestionCount"    INTEGER NOT NULL DEFAULT 0,
    "resolvedCount"      INTEGER NOT NULL DEFAULT 0,
    "unresolvedBlockers" INTEGER NOT NULL DEFAULT 0,
    "reviewJson"         TEXT NOT NULL,
    "createdAt"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          DATETIME NOT NULL,
    CONSTRAINT "ApplicationReview_draftId_fkey"
        FOREIGN KEY ("draftId") REFERENCES "ApplicationDraft"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ApplicationReview_draftId_idx" ON "ApplicationReview"("draftId");
