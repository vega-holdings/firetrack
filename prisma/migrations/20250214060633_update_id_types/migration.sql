/*
  Warnings:

  - The primary key for the `abstracts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `other_identifiers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `other_titles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `sources` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_abstracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_id" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "abstracts_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_abstracts" ("abstract", "bill_id", "id", "note") SELECT "abstract", "bill_id", "id", "note" FROM "abstracts";
DROP TABLE "abstracts";
ALTER TABLE "new_abstracts" RENAME TO "abstracts";
CREATE TABLE "new_other_identifiers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    CONSTRAINT "other_identifiers_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_other_identifiers" ("bill_id", "id", "identifier") SELECT "bill_id", "id", "identifier" FROM "other_identifiers";
DROP TABLE "other_identifiers";
ALTER TABLE "new_other_identifiers" RENAME TO "other_identifiers";
CREATE TABLE "new_other_titles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "other_titles_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_other_titles" ("bill_id", "id", "note", "title") SELECT "bill_id", "id", "note", "title" FROM "other_titles";
DROP TABLE "other_titles";
ALTER TABLE "new_other_titles" RENAME TO "other_titles";
CREATE TABLE "new_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "sources_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_sources" ("bill_id", "id", "note", "url") SELECT "bill_id", "id", "note", "url" FROM "sources";
DROP TABLE "sources";
ALTER TABLE "new_sources" RENAME TO "sources";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
