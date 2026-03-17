PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ENABLED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    CONSTRAINT "client_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "client_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "client" (
    "id",
    "name",
    "phone",
    "email",
    "address",
    "status",
    "createdAt",
    "updatedAt",
    "createdByUserId",
    "updatedByUserId"
)
SELECT
    "id",
    "borrower",
    "phone",
    "email",
    NULL,
    'ENABLED',
    "createdAt",
    "updatedAt",
    "createdByUserId",
    "updatedByUserId"
FROM "loan";

CREATE TABLE "new_loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "interestRate" REAL,
    "description" TEXT,
    "installmentInterval" TEXT NOT NULL,
    "loanDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    CONSTRAINT "loan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loan_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loan_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_loan" (
    "id",
    "clientId",
    "amount",
    "currency",
    "interestRate",
    "description",
    "installmentInterval",
    "loanDate",
    "createdAt",
    "updatedAt",
    "createdByUserId",
    "updatedByUserId"
)
SELECT
    "id",
    "id",
    "amount",
    "currency",
    "interestRate",
    "description",
    "installmentInterval",
    "loanDate",
    "createdAt",
    "updatedAt",
    "createdByUserId",
    "updatedByUserId"
FROM "loan";

DROP TABLE "loan";
ALTER TABLE "new_loan" RENAME TO "loan";

CREATE INDEX "client_status_idx" ON "client"("status");
CREATE INDEX "client_createdByUserId_idx" ON "client"("createdByUserId");
CREATE INDEX "client_updatedByUserId_idx" ON "client"("updatedByUserId");
CREATE INDEX "loan_clientId_idx" ON "loan"("clientId");
CREATE INDEX "loan_createdByUserId_idx" ON "loan"("createdByUserId");
CREATE INDEX "loan_updatedByUserId_idx" ON "loan"("updatedByUserId");

PRAGMA foreign_keys=ON;
