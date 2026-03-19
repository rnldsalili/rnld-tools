PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_user_role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roleSlug" TEXT NOT NULL,
    CONSTRAINT "user_role_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_user_role" ("id", "userId", "roleSlug")
SELECT
    "user_role"."id",
    "user_role"."userId",
    "role"."slug"
FROM "user_role"
INNER JOIN "role" ON "role"."id" = "user_role"."roleId";

DROP TABLE "user_role";
DROP TABLE "role_permission";
DROP TABLE "role";

ALTER TABLE "new_user_role" RENAME TO "user_role";

CREATE UNIQUE INDEX "user_role_userId_roleSlug_key" ON "user_role"("userId", "roleSlug");
CREATE INDEX "user_role_userId_idx" ON "user_role"("userId");
CREATE INDEX "user_role_roleSlug_idx" ON "user_role"("roleSlug");

PRAGMA foreign_keys=ON;
