# TAQ-U App

Logistics delivery management platform — Express 5 + Effect + Prisma (PostgreSQL) backend, React 19 + Vite + Tailwind CSS frontend.

## Quick start

```bash
pnpm install
pnpm dev              # API (port 3000) + web (port 5173) concurrently
```

Requires a PostgreSQL instance. Use Docker for a one-shot DB or `pnpm docker:up` for the full stack.

```bash
# Start just the database
docker compose up -d db

# Deploy migrations
pnpm db:deploy

# Run dev servers
pnpm dev
```

Copy `.env.example` to `.env` and fill in secrets (see **Environment** below).

## Project structure

```
apps/
  api/                  — Express 5 + Effect + Prisma backend
    src/
      ordering/         — Order domain (controller, service, repository, DTO, entity)
      customer/         — Customer domain
      delivery/         — Driver/delivery domain
      events/           — Event sourcing (event bus, publisher, store)
      middleware/       — effect-runner, http helpers, validation, error handler
      runtime.ts        — Centralized layer wiring (ManagedRuntime)
    prisma/
      schema.prisma     — 12 models (Order, Delivery, Driver, Customer, ...)
    test/
      order/services/   — Service-layer tests (mock repositories, no DB needed)
    collections/        — Bruno API request files
  web/                  — React 19 + Vite + Tailwind frontend
```

## Commands

```bash
pnpm dev              # API + web concurrently
pnpm dev:api          # API only
pnpm dev:web          # Web only (Vite)
pnpm build            # Build API then web
pnpm lint             # ESLint across all packages
pnpm format           # Prettier --write
pnpm test             # Run API tests (apps/api)
pnpm validate         # lint + format --check (no typecheck)
pnpm oc               # OpenCode AI assistant (loads .env)
pnpm db:migrate       # Create a new migration
pnpm db:deploy        # Deploy pending migrations + generate client
pnpm db:reset         # Reset database
pnpm db:studio        # Prisma Studio
pnpm docker:up        # docker compose up --build -d
pnpm docker:down      # docker compose down
```

Use `pnpm --filter @taq-u-app/<pkg>` for package-specific commands.

## Environment

Create `.env` from `.env.example`:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/taq-u` | Postgres connection |
| `POSTGRES_DB` | `taq-u` | Docker DB name |
| `LINEAR_API_KEY` | — | Linear API key (for OpenCode) |

## Tests

```bash
pnpm test   # vitest run in apps/api
```

Service-layer tests use mocked repositories — no database required. 8 tests cover customer and driver services. CI runs them on every relevant PR via `.github/workflows/tests.yml`.

## API

Base path: `/api`

| Resource | Endpoints |
|---|---|
| **Orders** | `GET/POST /api/orders`, `GET/DELETE/PATCH /api/orders/:id`, `POST /api/orders/:id/assign`, `POST /api/orders/:id/packages`, `GET /api/orders/:id/status`, `GET .../packages/:packageId`, `PATCH .../packages/:packageId/status` |
| **Customers** | `GET/POST /api/customers`, `GET /api/customers/:id` |
| **Drivers** | `GET/POST/PATCH/DELETE /api/drivers`, `GET /api/drivers/:id`, `GET /api/drivers/:driverId/orders` |

Bruno API collections are at `apps/api/collections/`. Open with the Bruno desktop app.

## Tech stack

- **API**: Express 5, Effect (TypeScript-native algebraic effects), Prisma 6, PostgreSQL 16
- **Web**: React 19, Vite, Tailwind CSS
- **Infra**: Docker Compose, pnpm workspaces
