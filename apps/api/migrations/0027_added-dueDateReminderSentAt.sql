-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_loan_installment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "dueReminderSentAt" DATETIME,
    "dueDateReminderSentAt" DATETIME,
    "overdueReminderSentAt" DATETIME,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    CONSTRAINT "loan_installment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_installment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loan_installment_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_loan_installment" ("amount", "createdAt", "createdByUserId", "dueDate", "dueReminderSentAt", "id", "loanId", "overdueReminderSentAt", "paidAmount", "paidAt", "remarks", "status", "updatedAt", "updatedByUserId") SELECT "amount", "createdAt", "createdByUserId", "dueDate", "dueReminderSentAt", "id", "loanId", "overdueReminderSentAt", "paidAmount", "paidAt", "remarks", "status", "updatedAt", "updatedByUserId" FROM "loan_installment";
DROP TABLE "loan_installment";
ALTER TABLE "new_loan_installment" RENAME TO "loan_installment";
CREATE INDEX "loan_installment_loanId_idx" ON "loan_installment"("loanId");
CREATE INDEX "loan_installment_createdByUserId_idx" ON "loan_installment"("createdByUserId");
CREATE INDEX "loan_installment_updatedByUserId_idx" ON "loan_installment"("updatedByUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
