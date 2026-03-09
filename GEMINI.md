# Agent Guide

This repository is a monorepo managed with **Bun Workspaces**. It contains the backend API and the frontend Admin application.

## 🛠 Tech Stack

### Monorepo Root
- **PackageManager**: Bun
- **Workspaces**: `apps/*`, `packages/*`

 ### 🟢 API (`apps/api`)
- **Runtime**: Cloudflare Workers
- **Framework**: Hono (v4.x)
- **Language**: TypeScript
- **Validation**: Zod + `@hono/zod-validator`
- **Deployment**: Wrangler

### 🔵 Admin (`apps/admin`)
- **Framework**: React 19
- **Meta-Framework**: TanStack Start (SSR/ISR)
- **Routing**: TanStack Router
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **UI Architecture**:
    -   Base UI (`@base-ui/react`)
    -   Class Variance Authority (`class-variance-authority`)
    -   Tabler Icons (`@tabler/icons-react`)
    -   Fonts: Noto Sans (Variable)
- **Testing**: Vitest + React Testing Library

 ### 📦 Shared Packages
- `packages/ui`: Shared UI component library (shadcn/ui components).
- `packages/constants`: Shared constants and enums.
- `packages/eslint-config`: Shared ESLint configuration.
- `packages/typescript-config`: Shared `tsconfig` bases.

## 📁 Project Structure

 ```text
/
├── apps
│   ├── admin/       # TanStack Start Frontend
│   └── api/         # Hono + Cloudflare Workers Backend
├── packages
│   ├── ui/              # Shared UI components (shadcn/ui)
│   ├── constants/
│   ├── eslint-config/
│   └── typescript-config/
├── package.json     # Root dependency management
└── bun.lock         # Lockfile
```

 ## 🚀 Development Workflow
 
### Startup
Run the following from the root to start all services:
```bash
bun run dev
```

### Commands
| Command | Description |
| :--- | :--- |
| `bun run dev` | Start development servers for all apps |
| `bun run lint` | Lint all workspaces |
| `bun run lint:fix` | Fix linting errors across workspaces |

## 💡 Implementation Guidelines

 ### API Development
- Use **Hono** for all route handling.
- Define schemas using **Zod** and validate inputs using `@hono/zod-validator`.
- Follow Cloudflare Workers constraints (edge runtime).
- Keep route logic modular (e.g., `routes/<feature>/<feature>.index.ts`).

### Admin Development
- Use **TanStack Start** conventions for routes (`app/routes` or equivalent).
- Use **TanStack Router** for navigation and type-safe routing.
- Use **Tailwind v4** for styling (no `tailwind.config.js` typically required, uses CSS imports).
- Import UI components from `@workspace/ui` (e.g., `import { Button } from '@workspace/ui'`).
- Prefer **Tabler Icons** for iconography.

 ### UI Package Development (`packages/ui`)
- Contains all **shadcn/ui** components built on **Base UI** (`@base-ui/react`).
- Uses `class-variance-authority` (`cva`) and `clsx` for variant management.
- **Adding new components**:
   ```bash
   cd packages/ui
   bunx --bun shadcn@latest add <component-name>
   ```
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
   │   ├── components/     # shadcn/ui components
   │   ├── hooks/          # Shared hooks
   │   ├── lib/utils.ts    # cn() utility
   │   ├── styles/globals.css  # Theme + Tailwind config
   │   └── index.ts        # Barrel exports
   ├── components.json     # shadcn CLI config
   └── package.json
   ```
- **peerDependencies**: `react`, `react-dom`, `tailwindcss`, `@tabler/icons-react` must be provided by consuming apps.
