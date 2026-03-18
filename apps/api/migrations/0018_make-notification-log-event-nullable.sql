PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_notification_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL,
    "event" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "isTestSend" BOOLEAN NOT NULL DEFAULT false,
    "emailProvider" TEXT,
    "smsProvider" TEXT,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "subject" TEXT,
    "messageContent" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorMessage" TEXT,
    "queuedAt" DATETIME NOT NULL,
    "lastAttemptAt" DATETIME,
    "sentAt" DATETIME,
    "failedAt" DATETIME,
    "queuedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notification_log_queuedByUserId_fkey" FOREIGN KEY ("queuedByUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_notification_log" (
    "id",
    "channel",
    "event",
    "status",
    "isTestSend",
    "emailProvider",
    "smsProvider",
    "recipientEmail",
    "recipientName",
    "recipientPhone",
    "subject",
    "messageContent",
    "attemptCount",
    "lastErrorMessage",
    "queuedAt",
    "lastAttemptAt",
    "sentAt",
    "failedAt",
    "queuedByUserId",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "channel",
    CASE
        WHEN "isTestSend" = 1 THEN NULL
        ELSE "event"
    END,
    "status",
    "isTestSend",
    "emailProvider",
    "smsProvider",
    "recipientEmail",
    "recipientName",
    "recipientPhone",
    "subject",
    "messageContent",
    "attemptCount",
    "lastErrorMessage",
    "queuedAt",
    "lastAttemptAt",
    "sentAt",
    "failedAt",
    "queuedByUserId",
    "createdAt",
    "updatedAt"
FROM "notification_log";

DROP TABLE "notification_log";
ALTER TABLE "new_notification_log" RENAME TO "notification_log";

CREATE INDEX "notification_log_channel_queuedAt_idx" ON "notification_log"("channel", "queuedAt");
CREATE INDEX "notification_log_event_queuedAt_idx" ON "notification_log"("event", "queuedAt");
CREATE INDEX "notification_log_status_queuedAt_idx" ON "notification_log"("status", "queuedAt");
CREATE INDEX "notification_log_queuedByUserId_idx" ON "notification_log"("queuedByUserId");

PRAGMA foreign_keys=ON;
