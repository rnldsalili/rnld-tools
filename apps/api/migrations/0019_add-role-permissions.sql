PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "role_permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    CONSTRAINT "role_permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "user_role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "user_role_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_role_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "role" ("id", "slug", "name", "description", "isSystem", "createdAt", "updatedAt")
VALUES
    ('role_admin', 'admin', 'Admin', 'Default administrator role.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role_super_admin', 'super-admin', 'Super Admin', 'Protected role with full access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "role_permission" ("id", "roleId", "module", "action")
VALUES
    ('role_permission_001', 'role_admin', 'clients', 'view'),
    ('role_permission_002', 'role_admin', 'clients', 'create'),
    ('role_permission_003', 'role_admin', 'clients', 'update'),
    ('role_permission_004', 'role_admin', 'loans', 'view'),
    ('role_permission_005', 'role_admin', 'loans', 'create'),
    ('role_permission_006', 'role_admin', 'loans', 'update'),
    ('role_permission_007', 'role_admin', 'loans', 'delete'),
    ('role_permission_008', 'role_admin', 'documents', 'view'),
    ('role_permission_009', 'role_admin', 'documents', 'create'),
    ('role_permission_010', 'role_admin', 'documents', 'update'),
    ('role_permission_011', 'role_admin', 'documents', 'delete'),
    ('role_permission_012', 'role_admin', 'notifications', 'view'),
    ('role_permission_013', 'role_admin', 'notifications', 'manage');

INSERT INTO "user_role" ("id", "userId", "roleId")
SELECT
    'user_role_' || lower(hex(randomblob(8))),
    "id",
    CASE
        WHEN "role" = 'SUPER_ADMIN' THEN 'role_super_admin'
        ELSE 'role_admin'
    END
FROM "user";

ALTER TABLE "user" DROP COLUMN "role";

CREATE UNIQUE INDEX "role_slug_key" ON "role"("slug");
CREATE UNIQUE INDEX "role_permission_roleId_module_action_key" ON "role_permission"("roleId", "module", "action");
CREATE INDEX "role_permission_roleId_idx" ON "role_permission"("roleId");
CREATE UNIQUE INDEX "user_role_userId_roleId_key" ON "user_role"("userId", "roleId");
CREATE INDEX "user_role_userId_idx" ON "user_role"("userId");
CREATE INDEX "user_role_roleId_idx" ON "user_role"("roleId");

PRAGMA foreign_keys=ON;
