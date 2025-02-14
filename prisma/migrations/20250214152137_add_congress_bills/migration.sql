-- CreateTable
CREATE TABLE "congress_bills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "congress" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "shortTitle" TEXT,
    "introducedDate" DATETIME,
    "originChamber" TEXT,
    "status" TEXT,
    "policyArea" TEXT,
    "subjects" TEXT,
    "summary" TEXT,
    "latestActionDate" DATETIME,
    "latestActionText" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "congress_sponsors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_id" TEXT NOT NULL,
    "bioguideId" TEXT,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "party" TEXT,
    "district" TEXT,
    "sponsorType" TEXT,
    CONSTRAINT "congress_sponsors_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "congress_bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "congress_actions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_id" TEXT NOT NULL,
    "actionDate" DATETIME NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT,
    "actionCode" TEXT,
    "sourceSystem" TEXT,
    "actionChamber" TEXT,
    CONSTRAINT "congress_actions_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "congress_bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "congress_committees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chamber" TEXT NOT NULL,
    "type" TEXT,
    "activity" TEXT,
    CONSTRAINT "congress_committees_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "congress_bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
