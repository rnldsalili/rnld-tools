CREATE TABLE "document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "linkExpiryDays" INTEGER NOT NULL DEFAULT 7,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "document_type_idx" ON "document"("type");

INSERT INTO "document" (
    "id",
    "type",
    "name",
    "description",
    "content",
    "linkExpiryDays",
    "requiresSignature",
    "createdAt",
    "updatedAt"
)
SELECT
    app_configuration."id",
    'LOAN',
    app_configuration."name",
    app_configuration."description",
    COALESCE(content_setting."value", '{}'),
    CASE
        WHEN expiry_setting."value" GLOB '[0-9]*' THEN MAX(CAST(expiry_setting."value" AS INTEGER), 1)
        ELSE 7
    END,
    CASE
        WHEN signature_setting."value" = 'false' THEN false
        ELSE true
    END,
    app_configuration."createdAt",
    app_configuration."updatedAt"
FROM "app_configuration"
LEFT JOIN "app_configuration_setting" AS content_setting
    ON content_setting."configurationId" = app_configuration."id"
   AND content_setting."key" = 'content'
LEFT JOIN "app_configuration_setting" AS expiry_setting
    ON expiry_setting."configurationId" = app_configuration."id"
   AND expiry_setting."key" = 'linkExpiryDays'
LEFT JOIN "app_configuration_setting" AS signature_setting
    ON signature_setting."configurationId" = app_configuration."id"
   AND signature_setting."key" = 'requiresSignature'
WHERE app_configuration."type" = 'DOCUMENT_TEMPLATE';

CREATE TABLE "loan_document_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "signedAt" DATETIME,
    "signatureKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "loan_document_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_document_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "loan_document_new" (
    "id",
    "loanId",
    "templateId",
    "signedAt",
    "signatureKey",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "loanId",
    "templateId",
    "signedAt",
    "signatureKey",
    "createdAt",
    "updatedAt"
FROM "loan_document"
WHERE "templateId" IN (SELECT "id" FROM "document");

DROP TABLE "loan_document";
ALTER TABLE "loan_document_new" RENAME TO "loan_document";

CREATE UNIQUE INDEX "loan_document_loanId_templateId_key" ON "loan_document"("loanId", "templateId");
CREATE INDEX "loan_document_loanId_idx" ON "loan_document"("loanId");
CREATE INDEX "loan_document_templateId_idx" ON "loan_document"("templateId");

DROP TABLE "app_configuration_setting";
DROP TABLE "app_configuration";
