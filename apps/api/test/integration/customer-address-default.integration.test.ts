/* -----------------------------------------------------------------------------
 * INTEGRATION TEST — CustomerAddressRepository default-flag swap
 *
 * Pins the trickiest persistence logic in the address book: the
 * `updateMany`->`update` isDefault swap and the `Either.left` not-owned
 * rollback in `customer/repository/customer-address-repository.ts`. Exercises
 * the REAL `CustomerAddressRepositoryLive` against the local Postgres.
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

import { CustomerAddressId, CustomerId } from "@/ids"
import { RecordNotFoundError } from "@/persistence-errors"
import { describe, expect, it } from "@effect/vitest"
import { ConfigService } from "config-service"
import {
  CustomerAddressRepository,
  CustomerAddressRepositoryLive,
} from "customer/repository/customer-address-repository"
import { Effect, Layer, Schema } from "effect"
import { PrismaLive } from "prisma-service"
import { afterAll, beforeEach } from "vitest"
import { prisma } from "./prisma"

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/taq-u"

const configLayer = Layer.succeed(
  ConfigService,
  ConfigService.of({
    databaseUrl: DATABASE_URL,
    dbPoolSize: 5,
    dbConnectTimeout: 10,
    logLevel: "info",
    jwtSecret: "test-secret",
  })
)

const serviceLayer = PrismaLive.pipe(Layer.provide(configLayer))

const addressRepoLayer = CustomerAddressRepositoryLive.pipe(Layer.provide(serviceLayer))

const CUSTOMER_A = "customer-addr-default-a"
const CUSTOMER_B = "customer-addr-default-b"
const EMAIL_A = "addr-default-a@example.com"
const EMAIL_B = "addr-default-b@example.com"

const customerIdA = Schema.decodeSync(CustomerId)(CUSTOMER_A)
const customerIdB = Schema.decodeSync(CustomerId)(CUSTOMER_B)

const decodeAddressId = (id: string) => Schema.decodeSync(CustomerAddressId)(id)

beforeEach(async () => {
  await prisma.customerAddress.deleteMany({ where: { customerId: { in: [CUSTOMER_A, CUSTOMER_B] } } })
  await prisma.customer.deleteMany({ where: { id: { in: [CUSTOMER_A, CUSTOMER_B] } } })
})

const seedCustomer = (id: string, email: string) =>
  Effect.promise(() =>
    prisma.customer.create({
      data: {
        id,
        name: "Address Default Test",
        email,
        phone: "555-0000",
        passwordHash: "scrypt$integration-test-hash",
      },
    })
  )

const listByCustomer = (customerId: string) =>
  Effect.promise(() => prisma.customerAddress.findMany({ where: { customerId } }))

describe("CustomerAddressRepository default-flag swap (integration)", () => {
  it.effect("creating a second default address clears the first one's default", () =>
    Effect.gen(function* () {
      yield* seedCustomer(CUSTOMER_A, EMAIL_A)
      const repository = yield* CustomerAddressRepository

      const first = yield* repository.create(customerIdA, { label: "Home", address: "1 A Way", isDefault: true })
      const second = yield* repository.create(customerIdA, { label: "Work", address: "2 A Way", isDefault: true })
      expect(first.isDefault).toBe(true)
      expect(second.isDefault).toBe(true)

      const rows = yield* listByCustomer(CUSTOMER_A)
      const defaults = rows.filter((row) => row.isDefault)
      expect(defaults).toHaveLength(1)
      expect(defaults[0].id).toBe(second.id)
    }).pipe(Effect.provide(addressRepoLayer))
  )

  it.effect("update with isDefault swaps the default flag", () =>
    Effect.gen(function* () {
      yield* seedCustomer(CUSTOMER_A, EMAIL_A)
      const repository = yield* CustomerAddressRepository

      const first = yield* repository.create(customerIdA, { label: "Home", address: "1 A Way", isDefault: true })
      const second = yield* repository.create(customerIdA, { label: "Work", address: "2 A Way" })
      expect(first.isDefault).toBe(true)
      expect(second.isDefault).toBe(false)

      const updated = yield* repository.update(customerIdA, decodeAddressId(second.id), { isDefault: true })
      expect(updated.isDefault).toBe(true)

      const rows = yield* listByCustomer(CUSTOMER_A)
      const defaults = rows.filter((row) => row.isDefault)
      expect(defaults).toHaveLength(1)
      expect(defaults[0].id).toBe(second.id)
    }).pipe(Effect.provide(addressRepoLayer))
  )

  it.effect("a not-owned update does not clear the caller's defaults (rollback rolls back)", () =>
    Effect.gen(function* () {
      yield* seedCustomer(CUSTOMER_A, EMAIL_A)
      yield* seedCustomer(CUSTOMER_B, EMAIL_B)
      const repository = yield* CustomerAddressRepository

      const callerDefault = yield* repository.create(customerIdA, {
        label: "Home",
        address: "1 A Way",
        isDefault: true,
      })
      const other = yield* repository.create(customerIdB, { label: "Other", address: "1 B Way", isDefault: true })

      const failure = yield* repository
        .update(customerIdA, decodeAddressId(other.id), { isDefault: true })
        .pipe(Effect.flip)
      expect(failure).toBeInstanceOf(RecordNotFoundError)

      // The pre-step `updateMany` unset the caller's defaults inside the
      // transaction; the failed ownership check must have rolled it back.
      const callerRows = yield* listByCustomer(CUSTOMER_A)
      const callerDefaults = callerRows.filter((row) => row.isDefault)
      expect(callerDefaults).toHaveLength(1)
      expect(callerDefaults[0].id).toBe(callerDefault.id)

      const otherRows = yield* listByCustomer(CUSTOMER_B)
      const otherDefaults = otherRows.filter((row) => row.isDefault)
      expect(otherDefaults).toHaveLength(1)
      expect(otherDefaults[0].id).toBe(other.id)
    }).pipe(Effect.provide(addressRepoLayer))
  )
})

afterAll(async () => {
  await prisma.customerAddress.deleteMany({ where: { customerId: { in: [CUSTOMER_A, CUSTOMER_B] } } })
  await prisma.customer.deleteMany({ where: { id: { in: [CUSTOMER_A, CUSTOMER_B] } } })
  await prisma.$disconnect()
})
