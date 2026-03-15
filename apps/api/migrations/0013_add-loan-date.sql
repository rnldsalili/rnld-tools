PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "borrower" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "interestRate" REAL,
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "installmentInterval" TEXT NOT NULL,
    "loanDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    CONSTRAINT "loan_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loan_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_loan" (
    "id",
    "borrower",
    "amount",
    "currency",
    "interestRate",
    "phone",
    "email",
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
    "borrower",
    "amount",
    "currency",
    "interestRate",
    "phone",
    "email",
    "description",
    "installmentInterval",
    "createdAt",
    "createdAt",
    "updatedAt",
    "createdByUserId",
    "updatedByUserId"
FROM "loan";

DROP TABLE "loan";
ALTER TABLE "new_loan" RENAME TO "loan";

CREATE INDEX "loan_createdByUserId_idx" ON "loan"("createdByUserId");
CREATE INDEX "loan_updatedByUserId_idx" ON "loan"("updatedByUserId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
