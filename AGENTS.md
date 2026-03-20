# Agent Guidelines

## Project Overview

RTools is a Bun monorepo with a Cloudflare Workers API (Hono) and a TanStack Start frontend. The current product is an auth-enabled utility dashboard with password, UUID, and secret generators, plus health and seeding endpoints.

## Structure

```
apps/api/              # Hono v4 + Cloudflare Workers API (port 3000)
apps/api/prisma/       # Prisma schema
apps/api/scripts/seed/ # Seed user definitions for /api/seed
apps/app/              # TanStack Start + React 19 frontend (port 3010)
packages/
  api-client/          # Typed Hono RPC client inferred from AppType
  auth-client/         # Better Auth browser client + React helpers
  ui/                  # Shared shadcn-based UI package and theme styles
  constants/           # Shared enums and option lists
  eslint-config/
  typescript-config/
```

## Build and Test

```bash
bun install                              # install workspace dependencies
bun run dev                              # start app, API, and api-client type watcher
bun run lint                             # lint workspaces
bun run lint:fix                         # auto-fix lint errors
bun run typecheck                        # type-check workspaces
bun run db:generate                      # regenerate Prisma client for the API
bun run --filter @workspace/app test     # run frontend tests
bun run --filter @workspace/app build    # build the frontend
```

- Unit tests are not required for changes in this repository.
- Do not add or maintain `.test.*` unit test files unless the user explicitly asks for them.

## Architecture

### API (`apps/api`)

- All routes are mounted under `/api` via `createApp()` in `src/app.ts`.
- `src/app.ts` centralizes rate limiting, request logging, CORS, `notFound`, and `onError` handlers.
- `src/routes/index.ts` currently registers only `/auth`, `/health`, and `/seed`.
- `src/routes/example/**` contains reference CRUD patterns, auth middleware usage, and optional R2 flows, but those routes are not currently mounted.
- Route groups generally follow `*.index.ts`, `*.handler.ts`, and `*.schema.ts` when the feature needs handlers and validation.
- `AppType` from `src/routes/index.ts` drives the RPC client in `packages/api-client`.

### Response shape

- Business endpoints should prefer the envelope below:

```ts
c.json({ meta: { code: number, message: string }, data: { ... } }, statusCode)
```

- Current exceptions already in the codebase:
  - `/api/auth/*` delegates directly to Better Auth.
  - `/api/health` returns a lightweight `{ status, timestamp }` object.

### Validation

Use `validate()` from `src/lib/validator.ts` (wraps `@hono/zod-validator`):

```ts
validate('json' | 'query' | 'param', schema)
```

### Database and Seed Flow

- Prisma 7 runs against Cloudflare D1.
- Do not use Prisma transactions (`prisma.$transaction`) in this project because Cloudflare D1 does not support them.
- Initialize Prisma per request in Workers code:

```ts
const prisma = initializePrisma(c.env); // src/lib/db.ts
```

- Prisma schema lives in `apps/api/prisma/schema.prisma`.
- Generated Prisma client is consumed through the `@/prisma/*` alias.
- Seed users are defined in `apps/api/scripts/seed/users.ts`.
- `POST /api/seed` validates `seedToken`, creates missing users, and stores hashed credential accounts for Better Auth.
- If you add database migrations, keep them in `apps/api/migrations/` and apply them with Wrangler. Refer to `apps/api/docs/database-migrations.md` for the full migration workflow.

### Auth and Roles

- Better Auth is configured in `apps/api/src/lib/auth.ts`.
- Email/password sign-in is enabled; self-service sign-up is disabled.
- `packages/auth-client` re-exports `useSession`, `signIn`, `signOut`, `signUp`, and `changePassword` for the frontend.
- Role constants live in `packages/constants/src/auth.ts`.
- Available middlewares in `apps/api/src/middlewares/`:
  - `requireAuth`
  - `requireAdminRole`
  - `requireSuperAdmin`

### Frontend (`apps/app`)

- File-based routing is implemented with TanStack Router in `src/routes/`.
- `src/routes/__root.tsx` wires React Query, the shared header, global styles, and TanStack devtools.
- Active app routes currently include:
  - `/`
  - `/login`
  - `/dashboard`
  - `/health`
  - `/tools/password-generator`
  - `/tools/uuid-generator`
  - `/tools/secret-generator`
- The shared header manages tool navigation, auth state, and the light/dark theme toggle.
- API requests use `packages/api-client` via `apps/app/src/lib/api.ts`.
- `routeTree.gen.ts` is auto-generated; do not edit it manually.
- `VITE_API_URL` is configured through `apps/app/wrangler.jsonc`.

### UI Components (`packages/ui`)

The shared UI library lives in `packages/ui`. When working on UI tasks:

- Use the shadcn registry tools (`shadcn_search_items_in_registries`, `shadcn_view_items_in_registries`, `shadcn_get_item_examples_from_registries`, `shadcn_get_add_command_for_items`) to discover and inspect components before building custom ones.
- Run `shadcn_get_audit_checklist` after adding or modifying shared UI components.
- Add reusable components to `packages/ui` and export them from `packages/ui/src/index.ts`.
- Prefer composing existing shared primitives over creating one-off app-local UI when reuse is likely.
- Keep global theme tokens in `packages/ui/src/styles/globals.css`.

## Integration Points

| Service | Binding / Config | Purpose |
|---|---|---|
| Cloudflare D1 | `env.DB` | Primary auth and app data store |
| Cloudflare KV Rate Limiter | `env.RATE_LIMITER` | Global API rate limiting |
| Cloudflare R2 (optional) | `env.STORAGE` | File and image storage for example routes |
| Better Auth | `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` | Session auth endpoints and cookies |

- CORS allowlist comes from comma-separated `env.CORS_ORIGINS`.
- Optional R2 presigning helpers live in `apps/api/src/lib/r2-presigner.ts` and `apps/api/src/lib/storage.ts`.
- Frontend API base URL comes from `VITE_API_URL` in `apps/app/wrangler.jsonc`.

## Code Style

- TypeScript is strict across the workspace.
- Path aliases are package-specific:
  - `@/app/*` -> `apps/app/src/*`
  - `@/api/*` -> `apps/api/src/*`
  - `@/prisma/*` -> `apps/api/generated/prisma/*`
- Use Zod v4 for schema validation. Always use Zod v4 APIs and avoid deprecated methods (e.g. use `z.string().nonempty()` → `z.string().min(1)`, `z.object().nonstrict()` → `z.object()`, `.merge()` on non-objects → use `z.intersection()` or spread, etc.).
- Follow the existing formatting style in the file you touch instead of reformatting unrelated code.
- ESLint config comes from `packages/eslint-config`; run `bun run lint` before committing.

### Types

- Co-locate feature types with their hook file (e.g., types for `use-loan.ts` live in `use-loan.ts`). Components import them via `import { useHook, type SomeType } from '@/app/hooks/use-feature'`.
- Types derived from `InferRequestType` / `InferResponseType` belong in the hook file because they reference `apiClient` directly and are tightly coupled to the hook's query/mutation logic.
- Only move types to a dedicated `types/` folder when they are shared across multiple hook files or the hook file grows unwieldy.

### Naming Conventions

- **Clear and Descriptive**: Prefer verbose, descriptive names over short, cryptic ones (e.g., `loanPayload` instead of `payload`, `authenticatedUser` instead of `user`).
- **Context-Specific**: Ensure variable names reflect their specific role within the context (e.g., `totalLoans` instead of `total` in a loan listing handler).
- **Boolean Naming**: Use prefixes like `is`, `has`, `should`, or `can` for boolean variables (e.g., `isLoanActive`).
- **Prisma Results**: When fetching from the database, use descriptive names for the results (e.g., `loanFound` for a single record, `loanInstallments` for an array).
- **Handler Variables**: Use specific names for constants in routes (e.g., `loanId`, `installmentFilter`, `skipCount`).
- **Error Handling**: Prefer `dbError` or `validationError` over a generic `error` when the type is known.
- **Avoid Magic Values**: Do not use hardcoded strings or numbers for repeated logic, statuses, or configurations. Instead, define them as enums or constants in `packages/constants` and reuse them across the workspace.
