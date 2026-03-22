-- CreateTable
CREATE TABLE "loan_assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    CONSTRAINT "loan_assignment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loan_assignment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "loan_assignment_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "loan_assignment_loanId_idx" ON "loan_assignment"("loanId");

-- CreateIndex
CREATE INDEX "loan_assignment_userId_idx" ON "loan_assignment"("userId");

-- CreateIndex
CREATE INDEX "loan_assignment_createdByUserId_idx" ON "loan_assignment"("createdByUserId");

-- CreateIndex
CREATE INDEX "loan_assignment_updatedByUserId_idx" ON "loan_assignment"("updatedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "loan_assignment_loanId_userId_key" ON "loan_assignment"("loanId", "userId");
