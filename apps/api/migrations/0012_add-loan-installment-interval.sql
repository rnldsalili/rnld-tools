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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    CONSTRAINT "loan_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loan_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

WITH ranked_installments AS (
    SELECT
        "loanId",
        "dueDate",
        ROW_NUMBER() OVER (PARTITION BY "loanId" ORDER BY "dueDate" ASC) AS "rowNumber"
    FROM "loan_installment"
),
installment_pairs AS (
    SELECT
        first_installment."loanId" AS "loanId",
        first_installment."dueDate" AS "firstDueDate",
        second_installment."dueDate" AS "secondDueDate"
    FROM ranked_installments AS first_installment
    LEFT JOIN ranked_installments AS second_installment
        ON second_installment."loanId" = first_installment."loanId"
        AND second_installment."rowNumber" = 2
    WHERE first_installment."rowNumber" = 1
)
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
    "createdAt",
    "updatedAt",
    "createdByUserId",
    "updatedByUserId"
)
SELECT
    "loan"."id",
    "loan"."borrower",
    "loan"."amount",
    "loan"."currency",
    "loan"."interestRate",
    "loan"."phone",
    "loan"."email",
    "loan"."description",
    CASE
        WHEN installment_pairs."secondDueDate" IS NULL THEN 'monthly'
        WHEN (
            (CAST(strftime('%Y', installment_pairs."secondDueDate") AS INTEGER) - CAST(strftime('%Y', installment_pairs."firstDueDate") AS INTEGER)) * 12
            + (CAST(strftime('%m', installment_pairs."secondDueDate") AS INTEGER) - CAST(strftime('%m', installment_pairs."firstDueDate") AS INTEGER))
        ) = 12 THEN 'annually'
        WHEN (
            (CAST(strftime('%Y', installment_pairs."secondDueDate") AS INTEGER) - CAST(strftime('%Y', installment_pairs."firstDueDate") AS INTEGER)) * 12
            + (CAST(strftime('%m', installment_pairs."secondDueDate") AS INTEGER) - CAST(strftime('%m', installment_pairs."firstDueDate") AS INTEGER))
        ) = 3 THEN 'quarterly'
        ELSE 'monthly'
    END AS "installmentInterval",
    "loan"."createdAt",
    "loan"."updatedAt",
    "loan"."createdByUserId",
    "loan"."updatedByUserId"
FROM "loan"
LEFT JOIN installment_pairs
    ON installment_pairs."loanId" = "loan"."id";

DROP TABLE "loan";
ALTER TABLE "new_loan" RENAME TO "loan";

CREATE INDEX "loan_createdByUserId_idx" ON "loan"("createdByUserId");
CREATE INDEX "loan_updatedByUserId_idx" ON "loan"("updatedByUserId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
