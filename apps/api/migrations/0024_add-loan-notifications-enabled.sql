ALTER TABLE "loan" ADD COLUMN "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "loan"
SET "notificationsEnabled" = true;
