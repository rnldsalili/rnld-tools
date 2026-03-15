-- Drop old combined table
DROP TABLE IF EXISTS "loan_agreement_link";

-- CreateTable: token tracking (ephemeral, KV is authoritative for validity)
CREATE TABLE "loan_agreement_token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "loan_agreement_token_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_agreement_token_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable: persistent signing record per loan
CREATE TABLE "loan_agreement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "signedAt" DATETIME,
    "signatureData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "loan_agreement_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "loan_agreement_token_token_key" ON "loan_agreement_token"("token");
CREATE INDEX "loan_agreement_token_loanId_idx" ON "loan_agreement_token"("loanId");
CREATE INDEX "loan_agreement_token_token_idx" ON "loan_agreement_token"("token");

CREATE UNIQUE INDEX "loan_agreement_loanId_key" ON "loan_agreement"("loanId");
