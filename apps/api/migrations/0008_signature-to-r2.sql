-- Rename signatureData to signatureKey (now stores R2 object key instead of base64)
ALTER TABLE loan_agreement RENAME COLUMN signatureData TO signatureKey;
