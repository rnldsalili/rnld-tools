-- CreateTable
CREATE TABLE "app_configuration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "app_configuration_setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configurationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "app_configuration_setting_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "app_configuration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "loan_agreement_link" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "signedAt" DATETIME,
    "signatureData" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "loan_agreement_link_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_agreement_link_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "app_configuration_type_key" ON "app_configuration"("type");

-- CreateIndex
CREATE INDEX "app_configuration_setting_configurationId_idx" ON "app_configuration_setting"("configurationId");

-- CreateIndex
CREATE UNIQUE INDEX "app_configuration_setting_configurationId_key_key" ON "app_configuration_setting"("configurationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "loan_agreement_link_token_key" ON "loan_agreement_link"("token");

-- CreateIndex
CREATE INDEX "loan_agreement_link_loanId_idx" ON "loan_agreement_link"("loanId");

-- CreateIndex
CREATE INDEX "loan_agreement_link_token_idx" ON "loan_agreement_link"("token");
