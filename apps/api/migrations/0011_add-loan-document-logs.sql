CREATE TABLE "loan_document_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "loanDocumentId" TEXT,
    "token" TEXT,
    "eventType" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "eventData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loan_document_log_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_document_log_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_document_log_loanDocumentId_fkey" FOREIGN KEY ("loanDocumentId") REFERENCES "loan_document" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "loan_document_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "loan_document_log_loanId_createdAt_idx" ON "loan_document_log"("loanId", "createdAt");
CREATE INDEX "loan_document_log_templateId_createdAt_idx" ON "loan_document_log"("templateId", "createdAt");
CREATE INDEX "loan_document_log_loanDocumentId_idx" ON "loan_document_log"("loanDocumentId");
CREATE INDEX "loan_document_log_token_idx" ON "loan_document_log"("token");
CREATE INDEX "loan_document_log_actorUserId_idx" ON "loan_document_log"("actorUserId");
