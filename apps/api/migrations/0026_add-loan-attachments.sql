CREATE TABLE "loan_attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    CONSTRAINT "loan_attachment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_attachment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "loan_attachment_loanId_createdAt_idx" ON "loan_attachment"("loanId", "createdAt");
CREATE INDEX "loan_attachment_createdByUserId_idx" ON "loan_attachment"("createdByUserId");
