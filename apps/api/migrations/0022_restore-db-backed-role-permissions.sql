CREATE TABLE "role_permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleSlug" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL
);

CREATE UNIQUE INDEX "role_permission_roleSlug_module_action_key" ON "role_permission"("roleSlug", "module", "action");
CREATE INDEX "role_permission_roleSlug_idx" ON "role_permission"("roleSlug");

INSERT INTO "role_permission" ("id", "roleSlug", "module", "action")
VALUES
    ('role_permission_017', 'admin', 'clients', 'view'),
    ('role_permission_018', 'admin', 'clients', 'create'),
    ('role_permission_019', 'admin', 'clients', 'update'),
    ('role_permission_020', 'admin', 'loans', 'view'),
    ('role_permission_021', 'admin', 'loans', 'create'),
    ('role_permission_022', 'admin', 'loans', 'update'),
    ('role_permission_023', 'admin', 'loans', 'delete'),
    ('role_permission_024', 'admin', 'documents', 'view'),
    ('role_permission_025', 'admin', 'documents', 'create'),
    ('role_permission_026', 'admin', 'documents', 'update'),
    ('role_permission_027', 'admin', 'documents', 'delete'),
    ('role_permission_028', 'admin', 'notifications', 'view'),
    ('role_permission_029', 'admin', 'notifications', 'manage'),
    ('role_permission_030', 'admin', 'users', 'view'),
    ('role_permission_031', 'admin', 'users', 'create'),
    ('role_permission_032', 'admin', 'users', 'assign-roles');
