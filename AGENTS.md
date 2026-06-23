## Repository Overview

pnpm workspace monorepo (pnpm 8.15.4) with two apps under `apps/*`:
- `@taq-u-app/api` — Express 5 + Effect + Prisma (PostgreSQL) backend
- `@taq-u-app/web` — React 19 + Vite + Tailwind CSS frontend

No test suite exists for application code.

## Commands

```bash
pnpm dev                 # Starts both api and web concurrently
pnpm dev:api             # Starts api only
pnpm dev:web             # Starts web only (Vite dev server)
pnpm build               # Builds api then web (order matters)
pnpm lint                # Runs ESLint across all packages
pnpm format              # Prettier --write with project config
pnpm validate            # lint + format --check (no typecheck)
pnpm db:migrate          # Prisma migrate dev (api package)
pnpm db:migrate:create   # Prisma migrate dev --name <name>
pnpm db:deploy           # Prisma migrate deploy + generate
pnpm db:reset            # Prisma migrate reset
pnpm db:studio           # Prisma Studio
pnpm docker:up           # docker-compose up --build -d
pnpm docker:down         # docker-compose down
```

When running a single package, always use `pnpm --filter @taq-u-app/<pkg> <script>`.

## Architecture

- **API entrypoint**: `apps/api/src/index.ts` — express setup, mounts three routers under `/api`
- **Route controllers**: `@order/api/*-controller.ts` — instantiate layers and run effects with `Effect.runPromise`
- **Layer wiring**: every controller provides `OrderServiceLive`, `OrderRepositoryLive`, `CustomerRepositoryLive`, `PrismaLive` inline
- **Service/repository pattern**: Effect `Context.Tag` services, layers built with `Layer.effect`, repositories use `Effect.tryPromise` for Prisma calls
- **DTO/validation**: `Schema.Class` with `@order/dto/*-dto.ts` — decoded via `Schema.decodeUnknown` in controllers
- **Error handling**: `Data.TaggedError` with string-scoped `_tag` (e.g. `"order/OrderNotFoundError"`), caught with `catchTags`/`catchTag` in controllers
- **Path aliases** (api tsconfig): `@order/*` → `src/order/*`, `@/*` → `src/*`

## Code Style

- **Prettier**: `semi: false`, `singleQuote: false`, `printWidth: 120`, `trailingComma: "es5"`
- **ESLint**: flat config (eslint.config.mjs), `no-explicit-any` off, unused vars with `^_` prefix allowed
- **Import style**: use path aliases (`@order/...`, `@/...`) — never relative imports across layers
- **Effect style**: `Effect.gen` for sequential logic (see `.opencode/skills/effect-best-practices/SKILL.md`)

## Infrastructure

- **Docker**: `docker-compose.yml` at root — PostgreSQL 16.3 + app container (uses `apps/api/Dockerfile`)
- **Prisma schema**: `apps/api/prisma/schema.prisma` — models: Order, Delivery, Driver, Customer, Route, RouteLeg, Package, Location, Payment, Estimate, Carrier
- **Database URL**: `postgres://postgres:postgres@localhost:5432/taq-u` (local) or `@db:5432` (Docker)
- **Environment**: root `.env` (gitignored) — includes DATABASE_URL, POSTGRES_*, LINEAR_API_KEY (secret, prevent committing)

## Tooling

- **Linear**: MCP server configured (see `.opencode/skills/linear-workflow/SKILL.md`). Issue format `TAQ-###`.
- **API testing**: Bruno collections at `apps/api/collections/` — use with Bruno desktop app
- **pnpm-lock.yaml is gitignored** — no lockfile checked in. `pnpm install` fetches latest compatible versions.
- **OpenCode skills**: `effect-best-practices` and `linear-workflow` are loaded automatically when relevant
- **OpenCode subagent**: `effect-implement` for Effect service layer code generation

## Gotchas

- There is no typecheck step in CI or `validate` (only lint + format check)
- Web `lint` runs `tsc --noEmit` — use `pnpm lint` in the web package for type checking
- The `setup.mjs` in apps/web is a Convex scaffolding leftover, not used

## Vendored Repositories

This project vendors external repositories under `@repos/`

- Use vendored repositories as read-only reference material when working with related libraries
- Prefer examples and patterns from the vendored source code over generated guesses or web search results
- Do not edit files under `@repos/` unless explicitly asked
- Do not import from `@repos/` - application code should continue importing from normal package dependencies
