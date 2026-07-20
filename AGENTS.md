## Quick start

```bash
pnpm install
pnpm dev              # api (port 3000) + web (Vite) concurrently
pnpm --filter @taq-u-app/api dev   # api only
pnpm --filter @taq-u-app/web dev   # web only
```

## Commands

```bash
pnpm dev              # api + web concurrently
pnpm dev:api          # api only
pnpm dev:web          # web only (Vite)
pnpm build            # api then web
pnpm build:api        # api only
pnpm build:web        # web only
pnpm lint             # ESLint across all packages
pnpm format           # Prettier --write
pnpm validate         # lint + format --check (no typecheck)
pnpm oc               # opencode helper script

# Prisma (api package)
pnpm db:migrate        # prisma migrate dev
pnpm db:migrate:create # prisma migrate dev --name <name>
pnpm db:deploy         # prisma migrate deploy + generate
pnpm db:reset          # prisma migrate reset
pnpm db:studio         # Prisma Studio

# Docker
pnpm docker:up         # docker-compose up --build -d
pnpm docker:down       # docker-compose down
```

Use `pnpm --filter @taq-u-app/<pkg>` for single-package commands.

## Decisions

These were settled. Don't undo or re-argue them.

| Decision | Reasoning | Commits |
|---|---|---|
| **Centralized runtime** (not per-controller layers) | All layer wiring in `apps/api/src/runtime.ts` via `ManagedRuntime`; controllers import `AppRuntime` and pass programs to `runEffect()` middleware. Eliminates per-controller setup duplication. | `86cb29275` |
| **Three DDD domains** (`ordering/`, `customer/`, `delivery/`) | Bounded contexts with own api/ dto/ services/ repository/ domain/ subdirs. Cross-domain coupling is explicit (e.g. OrderService imports CustomerService). | `67327880f` |
| **Event sourcing via `Event` Prisma model** | Cross-context events published via `EventPublisher` inside Prisma transactions (same tx as the domain write). Events are stored as JSON payload in a single `Event` table with `streamId` + `type`. | `4876581a3` |
| **Effect Schema for input validation** | DTOs are `Schema.Class` decoded via `decodeBody`/`decodeParams` from `@/middleware/validate`. No global validation middleware. | `075db52b0` |
| **Controllers use `runEffect()` not `Effect.runPromise`** | `runEffect` middleware annotates logs (requestId, method, path), handles `ParseError` -> 400, and forwards unhandled errors to the global `effectErrorHandler`. | `686ad2957` |
| **Domain coupling uses FK constraints, not service calls** | Driver validation in order assignment uses DB foreign key constraint rather than calling DriverService from OrderService, avoiding bidirectional module coupling. | `806691fd0` |
| **Config is an injected dependency** | Via `ConfigLive` layer in runtime. Services never read env vars directly. | `4ca7434ff` |

## Domain module template

Adding a new domain? Follow the same structure:

```
src/<domain>/
  api/<domain>-controller.ts    # Express Router, use runEffect() + catchTag per endpoint
  dto/<domain>-dto.ts           # Schema.Class input/output DTOs
  services/<domain>-service.ts  # Context.Tag service interface + impl
  repository/<domain>-repository.ts  # Prisma access via Effect.tryPromise/transaction
  domain/<entity>.ts            # Schema.Class domain entity
```

Existing domains: `ordering`, `customer`, `delivery`.

## Conventions

- **Error tags**: `Data.TaggedError` with `"domain/ErrorName"` format (e.g. `"order/OrderNotFoundError"`, `"delivery/DriverNotFoundError"`, `"customer/CustomerEmailAlreadyExistsError"`). Keep the tag format consistent — error matching in controllers uses it.
- **Controllers**: always use `runEffect(req, res, next, program)`. Never `Effect.runPromise` directly. The middleware handles logging, parse errors -> 400, and forwards unhandled to the global handler.
- **HTTP responses**: use helpers from `@/middleware/http` (`ok`, `notFound`, `badRequest`, `conflict`). Never construct raw `res.status().json()` in business logic.
- **DTOs**: one `Schema.Class` per input/output shape. Include a `fromEntity()` static method for mapping Prisma types to response DTOs.
- **Repositories**: use `prismaService.execute()` for single queries, `prismaService.$transaction()` for multi-step writes (which need a Prisma `TransactionClient`). Repository methods return `Effect`s.
- **Domain entities**: separate `Schema.Class` in `domain/<entity>.ts` with a `fromPrisma()` static. One file per entity.
- **Events**: publish inside the same Prisma transaction as the domain write via `EventPublisher.writeInTransaction()`. Don't publish events outside a transaction.
- **Layer provisioning**: all wiring in `runtime.ts`. Don't create per-controller layers.

## Agent hazards

Things an agent would confidently do wrong:

- **`Effect.runPromise()` in controllers**: Don't. Always use `runEffect()`. The middleware provides request-log annotation and ParseResult -> 400 mapping.
- **Prisma enum + Effect Schema mismatch**: If you add a new enum value to Prisma, you must update both the Prisma schema enum and the Effect Schema that decodes it. They're not automatically synchronized. Verify by checking `as OrderStatus` / `as PackageStatus` casts in repositories.
- **Cross-domain imports**: Ordering domain can import customer/delivery services. But delivery and customer should not import ordering services. The dependency direction is: events ← ordering → customer/delivery.
- **Layer ordering in runtime.ts**: `runtime.ts` provisions layers in dependency order. Adding a new service layer means adding it to the correct dependency chain. Look at existing patterns before adding.
- **Vendored `@repos/`**: Read-only reference material. Don't edit, don't import from in app code. Only use for studying Effect patterns.
- **No global catch-all validation**: `decodeBody`/`decodeParams` are called per-endpoint. If you add a new endpoint, make sure to decode its inputs — there's no safety net.
- **Bruno collection drift**: If you add/change an endpoint, update the matching `.bru` file in `apps/api/collections/`. The collections are the only API testing tool.
- **Missing error tag in controller**: When you add a new domain error (`Data.TaggedError`), you must add a corresponding `Effect.catchTag` in the controller or it hits the global `effectErrorHandler` -> 500.

## State & risks

- **No auth**: 8 PII fields exposed (customer name/email/phone/address, driver name/email/phone, location address). Anyone can hit any endpoint. Don't add auth unilaterally — there may be a planned approach.
- **OTel installed, DB not instrumented**: OpenTelemetry middleware is wired but database queries (`prismaService.execute`) aren't traced. Don't assume OTel is complete.
- **Known correctness footguns in @repos/effect**: Serialization trap in RpcSerialization.ts (Map/Set -> `{}`), shared reference leaks in FiberMap/FiberSet iterators. If working with serialization or fiber management, inspect the vendored source for these patterns.
- **No typecheck in validate**: `pnpm validate` is lint + format only. Web has typecheck (web `lint` runs `tsc --noEmit`), api does not.
- **Test suite**: API has 8 tests under `apps/api/test/order/services/` using `@effect/vitest`. Mock repository layer — no DB needed. Run with `pnpm test`. CI runs them in `.github/workflows/tests.yml`. Currently coverage is limited to customer & driver service tests.

## Boundaries

- `@repos/` is read-only — don't edit files there
- `setup.mjs` in `apps/web` is a Convex scaffolding leftover — ignore it
- Don't add typecheck to `validate` — deliberate. API typecheck is intentionally excluded from CI.
- Don't use `Effect.runPromise` in controllers — always `runEffect()`
- Don't add global validation middleware — validation is per-endpoint by design

## Infrastructure

- **Docker**: `docker-compose.yml` at root — PostgreSQL 16.3 + app container (`apps/api/Dockerfile`). Prefer `pnpm dev` for local iteration; Docker is for integration/production.
- **Prisma schema**: `apps/api/prisma/schema.prisma` — 12 models (Order, Delivery, Driver, Customer, Route, RouteLeg, Package, Location, Payment, Estimate, Carrier, Event)
- **DB URL**: `postgres://postgres:postgres@localhost:5432/taq-u` (local) / `@db:5432` (Docker)
- **Env**: root `.env` (gitignored) — DATABASE_URL, POSTGRES_\*, LINEAR_API_KEY
- **pnpm-lock.yaml**: tracked, reproducible installs
