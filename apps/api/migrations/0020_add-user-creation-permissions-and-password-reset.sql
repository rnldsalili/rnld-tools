ALTER TABLE "user" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

INSERT OR IGNORE INTO "role_permission" ("id", "roleId", "module", "action")
VALUES
    ('role_permission_014', 'role_admin', 'users', 'view'),
    ('role_permission_015', 'role_admin', 'users', 'create'),
    ('role_permission_016', 'role_admin', 'users', 'assign-roles');
