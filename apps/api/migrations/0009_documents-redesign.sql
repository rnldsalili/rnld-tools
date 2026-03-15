-- Step 1: Recreate app_configuration without @unique on type column
CREATE TABLE app_configuration_new (
    id          TEXT     NOT NULL PRIMARY KEY,
    type        TEXT     NOT NULL,
    name        TEXT     NOT NULL,
    description TEXT,
    createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt   DATETIME NOT NULL
);

INSERT INTO app_configuration_new SELECT id, type, name, description, createdAt, updatedAt FROM app_configuration;
DROP TABLE app_configuration;
ALTER TABLE app_configuration_new RENAME TO app_configuration;

CREATE INDEX app_configuration_type_idx ON app_configuration(type);

-- Step 2: Rename AGREEMENT type to DOCUMENT_TEMPLATE
UPDATE app_configuration SET type = 'DOCUMENT_TEMPLATE' WHERE type = 'AGREEMENT';

-- Step 3: Create loan_document table (replaces loan_agreement)
CREATE TABLE loan_document (
    id           TEXT     NOT NULL PRIMARY KEY,
    loanId       TEXT     NOT NULL,
    templateId   TEXT     NOT NULL,
    signedAt     DATETIME,
    signatureKey TEXT,
    createdAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt    DATETIME NOT NULL,
    FOREIGN KEY (loanId) REFERENCES loan(id) ON DELETE CASCADE,
    FOREIGN KEY (templateId) REFERENCES app_configuration(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX loan_document_loanId_templateId_key ON loan_document(loanId, templateId);

-- Step 4: Migrate existing loan_agreement data to loan_document
INSERT INTO loan_document (id, loanId, templateId, signedAt, signatureKey, createdAt, updatedAt)
SELECT
    la.id,
    la.loanId,
    (SELECT id FROM app_configuration WHERE type = 'DOCUMENT_TEMPLATE' LIMIT 1),
    la.signedAt,
    la.signatureKey,
    la.createdAt,
    la.updatedAt
FROM loan_agreement la
WHERE (SELECT id FROM app_configuration WHERE type = 'DOCUMENT_TEMPLATE' LIMIT 1) IS NOT NULL;

-- Step 5: Drop old table
DROP TABLE loan_agreement;
