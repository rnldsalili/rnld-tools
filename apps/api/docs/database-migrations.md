# Database Migrations Guide

This guide covers how to manage database migrations for the Church Members Management System API, which uses Cloudflare D1 (SQLite) with Prisma ORM.

## Overview

Our migration workflow uses:

- **Prisma** for schema definition and type-safe database access
- **Cloudflare D1** for serverless SQLite databases
- **Wrangler** for D1 database management and migrations

## Prerequisites

- Bun runtime installed
- Wrangler CLI configured with Cloudflare credentials
- Access to the project's D1 databases (local and/or remote)
- **Important:** A `migration_lock.toml` file must exist in the `migrations` directory with `provider = "sqlite"` (created automatically if following this guide).

## Database Configuration

The project uses two D1 databases:

### Development Database

- **Name**: `cms_dev`
- **Database ID**: `c3f51c59-6593-4307-8635-fec84ef50dee`
- **Binding**: `DB`

### Production Database

- **Name**: `cms_prod`
- **Database ID**: `93ed50e4-62ed-46ad-9848-0abdbbc59cce`
- **Binding**: `DB`

Configuration is located in `wrangler.jsonc`.

## Migration Workflow

### Step 1: Update Prisma Schema

Edit your Prisma schema file at `prisma/schema.prisma`:

```prisma
model Member {
  id          String    @id @default(cuid())
  firstName   String
  lastName    String
  image       String?   // ← Add new field
  // ... other fields
}
```

### Step 2: Create Migration Placeholder

Create a migration entry in D1:

```bash
bunx --bun wrangler d1 migrations create cms_dev <describe-change>
```

Example:

```bash
bunx --bun wrangler d1 migrations create cms_dev added-image-fields
```

This creates a placeholder file in the `migrations/` directory.

### Step 3: Generate Migration SQL

Generate the actual SQL migration by comparing your schema against the local shadow database (`prisma/db.sqlite`):

```bash
bunx --bun prisma migrate diff \
  --from-config-datasource \
  --to-schema ./prisma/schema.prisma \
  --script \
  --output migrations/000X_<describe-change>.sql
```

Example:

```bash
bunx --bun prisma migrate diff \
  --from-config-datasource \
  --to-schema ./prisma/schema.prisma \
  --script \
  --output migrations/0002_added-image-fields.sql
```

**Important:** We use `--from-config-datasource` which checks `prisma/db.sqlite`. You must ensure this file is updated after every migration (see Step 5).

### Step 4: Review the Migration

**Always review the generated SQL file** before applying it. Ensure it contains only the changes you expect:

✅ **Good migration (incremental changes):**

```sql
-- AlterTable: Add image column to member table
ALTER TABLE "member" ADD COLUMN "image" TEXT;
```

❌ **Bad migration (full schema recreation):**

```sql
-- CreateTable
CREATE TABLE "member" (
  "id" TEXT NOT NULL PRIMARY KEY,
  -- ... all fields
);
```

If you see `CREATE TABLE` statements for existing tables, the migration is incorrect. This usually means:

- Your local database is out of sync
- You used `--from-config-datasource` instead of `--from-migrations`

### Step 5: Apply Migration & Update Shadow DB

1. **Apply the migration to D1:**

   ```bash
   bunx --bun wrangler d1 migrations apply cms_dev --local (and/or --remote)
   ```

2. **IMPORTANT: Update the Shadow DB:**

   To ensure the next `migrate diff` works correctly, you must update the `prisma/db.sqlite` file with the new migration:

   ```bash
   sqlite3 prisma/db.sqlite < migrations/000X_<describe-change>.sql
   ```

   *If `sqlite3` is not available, you can use any SQLite client to execute the SQL against `apps/api/prisma/db.sqlite`.*

### Step 6: Regenerate Prisma Client

After applying migrations, regenerate the Prisma client to get updated types:

```bash
bunx --bun prisma generate
```

This updates the generated Prisma client in `generated/prisma/`.

## Complete Example

Here's a complete example of adding an `image` field to the `Member` model:

```bash
# 1. Edit prisma/schema.prisma (add the field manually)

# 2. Create migration placeholder
bunx --bun wrangler d1 migrations create cms_dev added-member-image

# 3. Generate migration SQL
bunx --bun prisma migrate diff \
  --from-migrations ./migrations \
  --to-schema ./prisma/schema.prisma \
  --script \
  --output migrations/0003_added-member-image.sql

# 4. Review the generated SQL file
cat migrations/0003_added-member-image.sql

# 5. Apply to local database
bunx --bun wrangler d1 migrations apply cms_dev --local

# 6. Apply to remote database
bunx --bun wrangler d1 migrations apply cms_dev --remote

# 7. Regenerate Prisma client
bunx --bun prisma generate
```

## Common Issues and Solutions

### Issue: "table already exists" Error

**Symptom:**

```
Migration failed: table "member" already exists
```

**Cause:** The migration file contains `CREATE TABLE` statements for tables that already exist in the database.

**Solution:**

1. Check if you used `--from-config-datasource` instead of `--from-migrations`
2. Review and manually edit the migration file to only include incremental changes (ALTER TABLE)
3. Ensure your local database is in sync by applying all existing migrations first

### Issue: Local Database Out of Sync

**Symptom:** Generated migrations contain unexpected changes or full schema recreations.

**Solution:**
Apply all existing migrations to your local database:

```bash
bunx --bun wrangler d1 migrations apply cms_dev --local
```

### Issue: Migration Numbering

**Best Practice:** Use sequential numbering for migrations:

- `0001_init-migration.sql`
- `0002_added-image-fields.sql`
- `0003_added-member-status.sql`

This ensures migrations are applied in the correct order.

## Best Practices

### 1. Maintain the Shadow DB

Always update `prisma/db.sqlite` after a migration. This ensures `migrate diff` works reliably against a known state:

```bash
# ✅ Good
sqlite3 prisma/db.sqlite < migrations/000X_change.sql
bunx --bun prisma migrate diff --from-config-datasource ...

# ❌ Avoid
Relying on --from-migrations (can be flaky with D1)
```

### 2. Review Before Applying

Always review the generated SQL before applying migrations. Look for:

- Unexpected `CREATE TABLE` statements
- Missing `ALTER TABLE` statements
- Correct column types and constraints

### 3. Test Locally First

Always apply and test migrations on your local database before applying to remote:

```bash
# Test locally first
bunx --bun wrangler d1 migrations apply cms_dev --local

# Then apply to remote
bunx --bun wrangler d1 migrations apply cms_dev --remote
```

### 4. Keep Migrations Small

Create focused migrations that do one thing. This makes them easier to review, test, and rollback if needed.

### 5. Never Edit Applied Migrations

Once a migration has been applied to production, never edit it. Create a new migration to make additional changes.

### 6. Backup Before Major Migrations

Before applying migrations that modify data or drop columns, backup your database:

```bash
# Export data from D1
bunx --bun wrangler d1 export cms_dev --remote --output backup.sql
```

## Prisma Configuration

The project uses a custom Prisma configuration file at `prisma.config.ts`:

```typescript
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

The `DATABASE_URL` is set in `.env`:

```
DATABASE_URL="file:./prisma/db.sqlite"
```

## Useful Commands

### View Migration Status

```bash
bunx --bun wrangler d1 migrations list cms_dev --local
bunx --bun wrangler d1 migrations list cms_dev --remote
```

### Execute SQL Directly

```bash
# Local
bunx --bun wrangler d1 execute cms_dev --local --command "SELECT * FROM member LIMIT 5"

# Remote
bunx --bun wrangler d1 execute cms_dev --remote --command "SELECT * FROM member LIMIT 5"
```

### Export Database

```bash
bunx --bun wrangler d1 export cms_dev --remote --output backup.sql
```

### Validate Prisma Schema

```bash
bunx --bun prisma validate
```

### Format Prisma Schema

```bash
bunx --bun prisma format
```

## Troubleshooting

### Prisma Client Not Updated

If your code doesn't recognize new fields after a migration:

1. Ensure the migration was applied successfully
2. Regenerate the Prisma client: `bunx --bun prisma generate`
3. Restart your development server

### Migration Conflicts

If multiple developers create migrations simultaneously:

1. Coordinate migration numbering
2. Rebase your branch and renumber your migration if needed
3. Test the combined migrations locally before merging

### Migration Lock Error

**Symptom:**

```
Error: Could not determine the connector from the migrations directory (missing migration_lock.toml).
```

**Cause:** Prisma needs to know the database provider when reading migrations from the filesystem, but this file is not generated by `migrate diff`.

**Solution:**
Create a file named `migration_lock.toml` in your `migrations` directory with the following content:

```toml
provider = "sqlite"
```

### D1 Connection Issues

If you can't connect to D1:

1. Verify your Wrangler authentication: `bunx --bun wrangler whoami`
2. Check your `wrangler.jsonc` configuration
3. Ensure you have the correct database IDs and permissions

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Prisma Migrate Diff Documentation](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-diff)
