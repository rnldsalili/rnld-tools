PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "notification_template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "contentFormat" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "notification_event_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "emailProvider" TEXT,
    "smsProvider" TEXT,
    "templateId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notification_event_config_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_template" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "notification_event_config_event_channel_key" ON "notification_event_config"("event", "channel");
CREATE INDEX "notification_template_channel_idx" ON "notification_template"("channel");
CREATE INDEX "notification_event_config_templateId_idx" ON "notification_event_config"("templateId");
CREATE INDEX "notification_event_config_channel_idx" ON "notification_event_config"("channel");

PRAGMA foreign_keys=ON;
