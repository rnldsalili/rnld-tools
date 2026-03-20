ALTER TABLE "loan" ADD COLUMN "excessBalance" REAL NOT NULL DEFAULT 0;
ALTER TABLE "loan_installment" ADD COLUMN "paidAmount" REAL NOT NULL DEFAULT 0;

UPDATE "loan_installment"
SET "paidAmount" = CASE
    WHEN "status" = 'PAID' THEN "amount"
    ELSE 0
END;

CREATE TABLE "loan_installment_payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "cashAmount" REAL NOT NULL,
    "excessAppliedAmount" REAL NOT NULL DEFAULT 0,
    "excessCreatedAmount" REAL NOT NULL DEFAULT 0,
    "appliedAmount" REAL NOT NULL,
    "remarks" TEXT,
    "voidedAt" DATETIME,
    "voidReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "voidedByUserId" TEXT,
    CONSTRAINT "loan_installment_payment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_installment_payment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "loan_installment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_installment_payment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loan_installment_payment_voidedByUserId_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "loan_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "installmentId" TEXT,
    "paymentId" TEXT,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "eventData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loan_log_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_log_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "loan_installment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "loan_log_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "loan_installment_payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "loan_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "loan_installment_payment_loanId_createdAt_idx" ON "loan_installment_payment"("loanId", "createdAt");
CREATE INDEX "loan_installment_payment_installmentId_createdAt_idx" ON "loan_installment_payment"("installmentId", "createdAt");
CREATE INDEX "loan_installment_payment_createdByUserId_idx" ON "loan_installment_payment"("createdByUserId");
CREATE INDEX "loan_installment_payment_voidedByUserId_idx" ON "loan_installment_payment"("voidedByUserId");

CREATE INDEX "loan_log_loanId_createdAt_idx" ON "loan_log"("loanId", "createdAt");
CREATE INDEX "loan_log_installmentId_createdAt_idx" ON "loan_log"("installmentId", "createdAt");
CREATE INDEX "loan_log_paymentId_idx" ON "loan_log"("paymentId");
CREATE INDEX "loan_log_actorUserId_idx" ON "loan_log"("actorUserId");
