# Agent Guidelines

## Project Overview

Monorepo template: Cloudflare Workers API (Hono) + React frontend (TanStack Start). Package manager: **Bun**.

## Structure

```
apps/api/      # Hono v4 + Cloudflare Workers backend (port 3000)
apps/admin/    # TanStack Start + React 19 frontend (port 3010)
apps/app/      # TanStack Start + React 19 frontend
packages/
  api-client/        # Hono RPC client (inferred from AppType)
  auth-client/       # Better Auth browser client
  ui/                # Shared component library (Base UI + shadcn/ui)
  constants/
  eslint-config/
  typescript-config/
```

## Build and Test

```bash
bun install            # install all workspace dependencies
bun run dev            # start all services in parallel
bun run lint           # lint all workspaces
bun run lint:fix       # auto-fix lint errors
bun run typecheck      # type-check all workspaces
bun run db:generate    # regenerate Prisma client after schema changes
```

## Architecture

### API (`apps/api`)

- All routes mounted under `/api` base path via `createApp()` in `src/app.ts`
- Route files follow a three-file pattern per resource:
  - `*.index.ts` — wire middleware + handlers to router
  - `*.handler.ts` — business logic using `createHandlers()`
  - `*.schema.ts` — Zod schemas for validation
- Register new route groups in `src/routes/index.ts` via `registerRoutes()`
- `AppType` export from `src/routes/index.ts` drives the RPC client in `packages/api-client`

### Response shape

All responses use this envelope—never deviate:

```ts
c.json({ meta: { code: number, message: string }, data: { ... } }, statusCode)
```

### Validation

Use `validate()` from `src/lib/validator.ts` (wraps `@hono/zod-validator`):

```ts
validate('json' | 'query' | 'param', schema)
```

### Database

Prisma 7 + Cloudflare D1. Initialize per-request (required by Workers I/O model):

```ts
const prisma = initializePrisma(c.env); // src/lib/db.ts
```

Migrations live in `apps/api/migrations/`. Apply locally with `wrangler d1 migrations apply`.

### Auth & Roles

- `requireAuth` — validates Better Auth session, sets `c.get('user')`
- `requireAdminRole` — role check middleware
- `requireSuperAdmin` — super-admin check middleware

Source: `src/middlewares/`

### Frontend (`apps/admin`, `apps/app`)

- File-based routing via TanStack Router (`src/routes/`)
- `routeTree.gen.ts` is auto-generated — do not edit manually
- Use `packages/api-client` for type-safe API calls via Hono RPC

## Integration Points

| Service | Binding | Purpose |
|---|---|---|
| Cloudflare D1 | `env.DB` | Primary database |
| Cloudflare R2 | `env.STORAGE` | File/image storage |
| Cloudflare KV | `env.RATE_LIMITER` | Rate limiting |

- R2 presigned URLs via AWS SDK: `src/lib/r2-presigner.ts`, `src/lib/storage.ts`
- CORS allowed origins: comma-separated `env.CORS_ORIGINS`

## Code Style

- TypeScript strict mode throughout; path aliases `@/api/` → `apps/api/src/`, `@/prisma/` → Prisma client
- Zod v4 for all schema definitions (coerce for query params)
- ESLint config from `packages/eslint-config`; run `bun run lint` before committing
