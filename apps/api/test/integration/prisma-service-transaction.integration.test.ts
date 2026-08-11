/* -----------------------------------------------------------------------------
 * INTEGRATION TEST — PrismaService.$transaction rollback & typed-error semantics
 *
 * Pins the contract that a transaction callback returning `Either.left` both
 * rolls back the transaction (Prisma commits only on callback resolution) and
 * surfaces as a typed Effect failure, while genuine Prisma errors still map to
 * typed failures. Exercises the REAL `PrismaLive` implementation.
 *
 * PREREQUISITES
 *   1. Start the local Postgres:  pnpm docker:up   (see docker-compose.yml)
 *   2. Run the migrations:        pnpm --filter @taq-u-app/api db:deploy
 *   3. Run the integration test script — see apps/api/package.json.
 *
 * The default `pnpm test` does NOT run this file. Integration tests are
 * excluded from the default run by the `*.integration.test.ts` pattern in
 * vitest.config.ts and are run via `pnpm --filter @taq-u-app/api test:integration`.
 */

import { describe, expect, it } from "@effect/vitest"
import { Effect, Either, Layer } from "effect"
import { afterAll, beforeAll, beforeEach } from "vitest"
import { PrismaLive, PrismaService } from "prisma-service"
import { ConfigService } from "config-service"
import { UnexpectedPersistenceError } from "@/persistence-errors"
import { prisma } from "./prisma"

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/taq-u"

const configLayer = Layer.succeed(
  ConfigService,
  ConfigService.of({
    databaseUrl: DATABASE_URL,
    dbPoolSize: 5,
    dbConnectTimeout: 10,
    logLevel: "info",
  })
)

const serviceLayer = PrismaLive.pipe(Layer.provide(configLayer))

const FIXED_EMAIL = "itest-prisma-service-transaction@example.com"

beforeAll(async () => {
  await prisma.$executeRawUnsafe("CREATE TABLE IF NOT EXISTS tx_integration_probe (id serial primary key, v text)")
})

beforeEach(async () => {
  await prisma.$executeRawUnsafe("DELETE FROM tx_integration_probe")
  await prisma.customer.deleteMany({ where: { email: FIXED_EMAIL } })
})

describe("PrismaService.$transaction rollback semantics (integration)", () => {
  it.effect("a Left aborts the transaction and surfaces as a typed error", () =>
    Effect.gen(function* () {
      const prismaService = yield* PrismaService
      const failure = yield* prismaService
        .$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`INSERT INTO tx_integration_probe (v) VALUES ('will-vanish')`)
          return Either.left(new UnexpectedPersistenceError({ cause: "probe abort" }))
        })
        .pipe(Effect.flip)
      expect(failure._tag).toBe("persistence/UnexpectedPersistenceError")

      const rows = yield* Effect.promise(() =>
        prisma.$queryRawUnsafe<Array<{ c: number }>>(
          `SELECT count(*)::int AS c FROM tx_integration_probe WHERE v = 'will-vanish'`
        )
      )
      expect(rows[0].c).toBe(0)
    }).pipe(Effect.provide(serviceLayer))
  )

  it.effect("a Right commits the transaction", () =>
    Effect.gen(function* () {
      const prismaService = yield* PrismaService
      const result = yield* prismaService.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`INSERT INTO tx_integration_probe (v) VALUES ('will-stay')`)
        return Either.right("ok")
      })
      expect(result).toBe("ok")

      const rows = yield* Effect.promise(() =>
        prisma.$queryRawUnsafe<Array<{ c: number }>>(
          `SELECT count(*)::int AS c FROM tx_integration_probe WHERE v = 'will-stay'`
        )
      )
      expect(rows[0].c).toBe(1)
    }).pipe(Effect.provide(serviceLayer))
  )

  it.effect("a genuine Prisma error is still mapped to a typed failure", () =>
    Effect.gen(function* () {
      yield* Effect.promise(() =>
        prisma.customer.create({
          data: { name: "Probe Customer", email: FIXED_EMAIL, phone: "555-0001", address: "1 Probe Way" },
        })
      )

      const prismaService = yield* PrismaService
      const failure = yield* prismaService
        .$transaction(async (tx) => {
          await tx.customer.create({
            data: { name: "Probe Customer 2", email: FIXED_EMAIL, phone: "555-0002", address: "2 Probe Way" },
          })
          return Either.right("unreachable")
        })
        .pipe(Effect.flip)
      expect(failure._tag).toBe("persistence/UniqueConstraintViolation")
    }).pipe(Effect.provide(serviceLayer))
  )
})

afterAll(async () => {
  await prisma.$executeRawUnsafe("DROP TABLE IF EXISTS tx_integration_probe")
  await prisma.$disconnect()
})
