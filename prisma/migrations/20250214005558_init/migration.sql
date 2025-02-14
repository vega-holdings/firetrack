-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "title" TEXT,
    "session" TEXT,
    "classification" TEXT,
    "subject" TEXT,
    "extras" TEXT,
    "openstates_url" TEXT,
    "first_action_date" DATETIME,
    "latest_action_date" DATETIME,
    "latest_action_description" TEXT,
    "latest_passage_date" DATETIME,
    "jurisdiction_id" TEXT,
    "jurisdiction_name" TEXT,
    "jurisdiction_classification" TEXT,
    "from_organization_id" TEXT,
    "from_organization_name" TEXT,
    "from_organization_classification" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primary" BOOLEAN,
    CONSTRAINT "sponsors_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_id" TEXT NOT NULL,
    "note" TEXT,
    "date" DATETIME,
    "links" TEXT,
    CONSTRAINT "documents_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_id" TEXT NOT NULL,
    "note" TEXT,
    "date" DATETIME,
    "links" TEXT,
    CONSTRAINT "versions_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sources" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bill_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "sources_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "abstracts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bill_id" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "abstracts_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "other_titles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bill_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "other_titles_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "other_identifiers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bill_id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    CONSTRAINT "other_identifiers_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "related_bills" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bill_id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "legislative_session" TEXT,
    "relation_type" TEXT,
    CONSTRAINT "related_bills_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "actions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "classification" TEXT,
    "order" INTEGER NOT NULL,
    "organization_name" TEXT,
    CONSTRAINT "actions_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vote_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "motion_text" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "result" TEXT NOT NULL,
    CONSTRAINT "vote_events_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vote_event_id" TEXT NOT NULL,
    "option" TEXT NOT NULL,
    "voter_name" TEXT NOT NULL,
    "voter_id" TEXT,
    "voter_party" TEXT,
    CONSTRAINT "votes_vote_event_id_fkey" FOREIGN KEY ("vote_event_id") REFERENCES "vote_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vote_counts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vote_event_id" TEXT NOT NULL,
    "option" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    CONSTRAINT "vote_counts_vote_event_id_fkey" FOREIGN KEY ("vote_event_id") REFERENCES "vote_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bill_comments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bill_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bill_comments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bill_annotations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bill_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bill_annotations_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
