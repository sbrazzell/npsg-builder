-- Migration: add AllowedUser table for DB-backed access control

CREATE TABLE IF NOT EXISTS "AllowedUser" (
    "id"      TEXT NOT NULL PRIMARY KEY,
    "email"   TEXT NOT NULL,
    "role"    TEXT NOT NULL DEFAULT 'member',
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "AllowedUser_email_key" ON "AllowedUser"("email");
