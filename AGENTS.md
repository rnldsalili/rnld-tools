# Agent Guide: Church Members Management System

This repository is a monorepo managed with Bun workspaces. It contains a Cloudflare Workers API, a TanStack Start Admin app, a TanStack Start App, and shared packages.

## Tech Stack

### Monorepo Root

- **Package Manager**: Bun
- **Workspaces**: `apps/*`, `packages/*`

### API (`apps/api`)

- **Runtime**: Cloudflare Workers (Wrangler)
- **Framework**: Hono (v4.x)
- **Language**: TypeScript
- **Validation**: Zod + `@hono/zod-validator`
- **Auth**: Better Auth (Prisma adapter)
- **Database**: Prisma 7.x client generated in `apps/api/generated/prisma` with `@prisma/adapter-d1` for Cloudflare D1 (SQLite)
- **Deployment**: Wrangler

### Admin (`apps/admin`)

- **Framework**: React 19
- **Meta-Framework**: TanStack Start (SSR/ISR)
- **Routing**: TanStack Router
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS v4
- **UI Architecture**:
  - Base UI (`@base-ui/react`)
  - Class Variance Authority (`class-variance-authority`)
  - Tabler Icons (`@tabler/icons-react`)
  - Fonts: Noto Sans (Variable)
- **Testing**: Vitest + React Testing Library

### App (`apps/app`)

- **Framework**: React 19
- **Meta-Framework**: TanStack Start (SSR/ISR)
- **Routing**: TanStack Router
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS v4
- **UI Architecture**:
  - Base UI (`@base-ui/react`)
  - Class Variance Authority (`class-variance-authority`)
  - Tabler Icons (`@tabler/icons-react`)
  - Fonts: Noto Sans (Variable)
- **Testing**: Vitest + React Testing Library

### Shared Packages

- `packages/api-client`: Hono RPC client and type generation helpers.
- `packages/auth-client`: Better Auth client and React helpers.
- `packages/ui`: Shared UI component library (shadcn/ui on Base UI).
- `packages/constants`: Shared constants and enums.
- `packages/eslint-config`: Shared ESLint configuration.
- `packages/typescript-config`: Shared `tsconfig` bases.

## Project Structure

```text
/
├── apps
│   ├── admin/       # TanStack Start frontend (admin)
│   ├── app/         # TanStack Start frontend (app)
│   └── api/         # Hono + Cloudflare Workers backend
├── packages
│   ├── api-client/      # Hono RPC client
│   ├── auth-client/     # Better Auth client
│   ├── ui/              # Shared UI components (shadcn/ui)
│   ├── constants/
│   ├── eslint-config/
│   └── typescript-config/
├── package.json     # Root dependency management
└── bun.lock         # Lockfile
```

## Development Workflow

### Startup

Run the following from the root to start all services:

```bash
bun run dev
```

Admin runs on `http://localhost:3010`, App runs on `http://localhost:3011`, and API on `http://localhost:3000` by default.

### Environment Setup

**1. Cloudflare Workers dev (`apps/api`)**:

```bash
cd apps/api
cp .dev.vars.example .dev.vars
# Set DATABASE_URL, CORS_ORIGINS, BETTER_AUTH_SECRET, BETTER_AUTH_URL
```

**2. Admin app (`apps/admin`)**:

```bash
cd apps/admin
cp .env.example .env
# Set VITE_API_URL (defaults to http://localhost:3000)
```

**3. App (`apps/app`)**:

```bash
cd apps/app
cp .env.example .env
# Set VITE_API_URL (defaults to http://localhost:3000)
```

**Optional: Prisma CLI in `apps/api`**:

```bash
cd apps/api
cp .env.example .env
# Set DATABASE_URL and DIRECT_URL if running Prisma commands here
```

### Commands

| Command | Description |
| :--- | :--- |
| `bun run dev` | Start development servers for all apps |
| `bun run dev:types` | Watch API types for `@workspace/api-client` |
| `bun run lint` | Lint all workspaces |
| `bun run lint:fix` | Fix linting errors across workspaces |
| `bun run typecheck` | Run type checking across workspaces |

### Code Change Validation

When making code changes, run the following from the repository root before finishing:

```bash
bun run lint
bun run typecheck
```

## Coding Standards

### TypeScript

- Always prefer `type` over `interface` unless the type needs to be extended or merged (declaration merging).
- For React component props, use `interface` instead of `type`.

## Implementation Guidelines

### API Development

- Use **Hono** for all route handling.
- Define schemas using **Zod** and validate inputs using `@hono/zod-validator`.
- Keep route logic modular (e.g., `routes/<feature>/<feature>.index.ts`).
- Prisma client is generated in `apps/api/generated/prisma` and imported via `@/prisma/*`.
- Use `initializePrisma` from `apps/api/src/lib/db.ts` to create a Prisma client with `@prisma/adapter-d1`.
- Use `auth(env)` from `apps/api/src/lib/auth.ts` for Better Auth.
  
Prisma + D1 migrations (from `apps/api`):

1) `bunx --bun wrangler d1 migrations create <db_name> <migration_name>`
2) `bunx --bun prisma migrate diff --from-empty --to-schema ./prisma/schema.prisma --script --output migrations/0001_<migration_name>.sql`
3) `bunx --bun wrangler d1 migrations apply <db_name> --local (and/or --remote)`

Apply migrations to production D1 (from `apps/api`):

1) `bunx --bun wrangler d1 migrations apply <db_name> --remote --env production`

When you change Prisma models (D1, from `apps/api`):

1) `bunx --bun wrangler d1 migrations create <db_name> <describe-change>`
2) `bunx --bun prisma migrate diff --from-local-d1 --to-schema ./prisma/schema.prisma --script --output migrations/000X_<describe-change>.sql`
3) `bunx --bun wrangler d1 migrations apply <db_name> --local (and/or --remote)`
4) `bunx --bun prisma generate`

### Admin Development

- Routes live in `apps/admin/src/routes`.
- Use **TanStack Router** for navigation and type-safe routing.
- Use **Tailwind v4** for styling (CSS imports + `@tailwindcss/vite`).
- Import UI components from `@workspace/ui` (e.g., `import { Button } from '@workspace/ui'`).
- Prefer **Tabler Icons** for iconography.
- Use `@workspace/api-client` for API calls and `@workspace/auth-client` for auth UI.
- When building UI, call **shadcn** mcp and check component examples before implementing.

### App Development

- Routes live in `apps/app/src/routes`.
- Use **TanStack Router** for navigation and type-safe routing.
- Use **Tailwind v4** for styling (CSS imports + `@tailwindcss/vite`).
- Import UI components from `@workspace/ui` (e.g., `import { Button } from '@workspace/ui'`).
- Prefer **Tabler Icons** for iconography.
- Use `@workspace/api-client` for API calls and `@workspace/auth-client` for auth UI.
- When building UI, call **shadcn** mcp and check component examples before implementing.

### UI Package Development (`packages/ui`)

- Contains all **shadcn/ui** components built on **Base UI** (`@base-ui/react`).
- Uses `class-variance-authority` (`cva`) and `clsx` for variant management.
- When creating a reusable component, follow the patterns and structure in `packages/ui/src/components/`.
- Avoid modifying the raw shadcn components in `packages/ui/src/components/` whenever possible.
- **Adding new components**:

  ```bash
  cd packages/ui
  bunx --bun shadcn@latest add <component-name>
  ```

  When adding components with the shadcn CLI, avoid overwriting existing components unless explicitly requested.
- After adding a component, update the barrel export in `packages/ui/src/index.ts`.
- **Importing components**:

  ```tsx
  // Barrel import (recommended)
  import { Button, Card, Input, cn } from '@workspace/ui';

  // Individual import
  import { Button } from '@workspace/ui/components/button';
  ```

- **Structure**:

  ```
  packages/ui/
  ├── src/
  │   ├── components/         # shadcn/ui components
  │   ├── hooks/              # Shared hooks
  │   ├── lib/utils.ts        # cn() utility
  │   ├── styles/globals.css  # Theme + Tailwind config
  │   └── index.ts            # Barrel exports
  ├── components.json         # shadcn CLI config
  └── package.json
  ```

- **peerDependencies**: `react`, `react-dom`, `tailwindcss`, `@tabler/icons-react` must be provided by consuming apps.
