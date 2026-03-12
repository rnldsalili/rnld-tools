# rnld-tools

RTools is a full-stack Bun monorepo for authenticated utility tools built with Cloudflare Workers, Hono, Better Auth, and React. The current app ships a protected dashboard with password, UUID, and secret generators, plus typed API integration between the frontend and backend.

## Features

- Better Auth email/password sign-in
- Protected dashboard for authenticated users
- Password generator with strength meter and option toggles
- UUID v4 batch generator with copy helpers
- Secret generator with `base64`, `base64url`, and `hex` output modes
- Shared UI package with a global light/dark theme
- Typed Hono RPC client shared across the monorepo

## Stack

| Layer | Technology |
| :--- | :--- |
| API runtime | Cloudflare Workers (Wrangler) |
| API framework | Hono v4 |
| Database | Cloudflare D1 via Prisma 7 |
| Auth | Better Auth |
| Frontend | React 19 + TanStack Start |
| Routing | TanStack Router |
| Data fetching | TanStack Query |
| Styling | Tailwind CSS v4 |
| UI components | Shared `@workspace/ui` package built around shadcn tooling |
| Package manager | Bun |

## Monorepo Structure

```
apps/
  api/                  # Hono + Cloudflare Workers API (port 3000)
  app/                  # TanStack Start frontend (port 3010)
packages/
  api-client/           # Typed Hono RPC client
  auth-client/          # Better Auth browser client + hooks
  ui/                   # Shared UI components and theme styles
  constants/            # Shared enums and option lists
  eslint-config/
  typescript-config/
```

## Active Routes

### Frontend

- `/` - landing page
- `/login` - sign-in form
- `/dashboard` - protected tool launcher
- `/health` - frontend view backed by the API health endpoint
- `/tools/password-generator`
- `/tools/uuid-generator`
- `/tools/secret-generator`

### API

- `/api/auth/*` - Better Auth handlers
- `/api/health` - basic health response
- `/api/seed` - creates missing credential accounts from the seed file

## Local Development

### 1. Install dependencies

```bash
bun install
```

### 2. Configure API secrets

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

Set the following values in `apps/api/.dev.vars`:

- `BETTER_AUTH_SECRET` - generate one with `bun x @better-auth/cli@latest secret`
- `SEED_TOKEN` - any strong random value used by `/api/seed`
- `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` only if you enable R2-backed flows

### 3. Create and configure a D1 database

```bash
bunx wrangler d1 create rnld-tools-dev
```

Copy the printed `database_id` into `apps/api/wrangler.jsonc` under the `DB` binding.

If you maintain local or remote migrations, apply them with Wrangler from `apps/api`.

### 4. Generate the Prisma client

```bash
bun run db:generate
```

### 5. Start the app and API

```bash
bun run dev
```

This starts:

- the API on `http://localhost:3000`
- the frontend on `http://localhost:3010`
- the `@workspace/api-client` type watcher used by the frontend

### 6. Optional: seed an initial account

Sign-up is disabled, so the easiest way to create local users is to seed them.

1. Edit `apps/api/scripts/seed/users.ts` with the users you want.
2. Call the seed endpoint with the token from `apps/api/.dev.vars`:

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "content-type: application/json" \
  -d '{"seedToken":"<your-seed-token>"}'
```

## Commands

| Command | Description |
| :--- | :--- |
| `bun run dev` | Start the frontend, API, and api-client type watcher |
| `bun run lint` | Lint all non-config workspaces |
| `bun run lint:fix` | Auto-fix lint errors |
| `bun run typecheck` | Type-check all non-config workspaces |
| `bun run db:generate` | Regenerate the Prisma client for `apps/api` |
| `bun run --filter @workspace/app test` | Run frontend tests with Vitest |
| `bun run --filter @workspace/app build` | Build the frontend app |
| `bun run --filter @workspace/api deploy` | Deploy the API worker |
| `bun run --filter @workspace/app deploy` | Build and deploy the frontend worker |

## Notes

- Frontend API requests read `VITE_API_URL`, which is configured in `apps/app/wrangler.jsonc`.
- The typed client in `packages/api-client` is inferred from `apps/api/src/routes/index.ts`.
- Example API routes still exist under `apps/api/src/routes/example/`, but they are not mounted in the current app.
