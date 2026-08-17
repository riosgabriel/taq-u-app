/* -----------------------------------------------------------------------------
 * INTEGRATION TEST — atomic order claim in DeliveryRepository.createAssignment
 *
 * Pins that two concurrent assignments of the same PENDING order cannot both
 * win: the conditional `updateMany` inside the transaction is the mutual
 * exclusion (Postgres row lock), so exactly one assignment succeeds and the
 * loser fails with a typed `delivery/OrderNotAssignableError`, leaving the
 * loser's driver available. Exercises the REAL `PrismaLive` implementation.
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
import { Effect, Exit, Layer } from "effect"
import { afterAll, beforeEach } from "vitest"
import { DeliveryRepository, DeliveryRepositoryLive } from "delivery/repository/delivery-repository"
import { EventPublisher } from "events/event-publisher"
import { DriverId, OrderId } from "@/ids"
import { OrderStatus } from "@prisma/client"
import { PrismaLive } from "prisma-service"
import { ConfigService } from "config-service"
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

const mockEventPublisher = EventPublisher.of({
  writeInTransaction: async (_tx: any, events: any) => events,
  notify: () => Effect.void,
})

const deliveryRepoLayer = DeliveryRepositoryLive.pipe(
  Layer.provide(Layer.succeed(EventPublisher, mockEventPublisher)),
  Layer.provide(serviceLayer)
)

const FIXED_CUSTOMER_ID = "customer-race-1"
const FIXED_EMAIL = "race-customer@example.com"
const FIXED_ORDER_ID = "order-race-1"
const FIXED_DRIVER_A = "driver-race-a"
const FIXED_DRIVER_B = "driver-race-b"
const FIXED_DATE = new Date("2026-01-01T10:00:00.000Z")

beforeEach(async () => {
  await prisma.delivery.deleteMany({ where: { orders: { some: { id: FIXED_ORDER_ID } } } })
  await prisma.order.deleteMany({ where: { id: FIXED_ORDER_ID } })
  await prisma.driver.deleteMany({ where: { id: { in: [FIXED_DRIVER_A, FIXED_DRIVER_B] } } })
  await prisma.customer.deleteMany({ where: { id: FIXED_CUSTOMER_ID } })
})

describe("DeliveryRepository.createAssignment race (integration)", () => {
  it.effect("only one concurrent assignment of the same order wins", () =>
    Effect.gen(function* () {
      yield* Effect.promise(() =>
        prisma.customer.create({
          data: {
            id: FIXED_CUSTOMER_ID,
            name: "Race Customer",
            email: FIXED_EMAIL,
            phone: "555-0100",
            address: "1 Race Way",
            passwordHash: "scrypt$integration-test-hash",
          },
        })
      )
      yield* Effect.promise(() =>
        prisma.driver.create({
          data: {
            id: FIXED_DRIVER_A,
            name: "Driver A",
            email: "race-driver-a@example.com",
            phone: "555-0101",
            vehicleType: "CAR",
          },
        })
      )
      yield* Effect.promise(() =>
        prisma.driver.create({
          data: {
            id: FIXED_DRIVER_B,
            name: "Driver B",
            email: "race-driver-b@example.com",
            phone: "555-0102",
            vehicleType: "CAR",
          },
        })
      )
      yield* Effect.promise(() =>
        prisma.order.create({
          data: {
            id: FIXED_ORDER_ID,
            customer: { connect: { id: FIXED_CUSTOMER_ID } },
            pickupAddress: "1 Race Way",
            deliveryAddress: "2 Race Way",
            pickupDate: new Date("2026-01-02T09:00:00.000Z"),
            status: OrderStatus.PENDING,
          },
        })
      )

      const deliveryRepository = yield* DeliveryRepository
      const exits = yield* Effect.all(
        [
          deliveryRepository.createAssignment(FIXED_ORDER_ID as OrderId, FIXED_DRIVER_A as DriverId, FIXED_DATE),
          deliveryRepository.createAssignment(FIXED_ORDER_ID as OrderId, FIXED_DRIVER_B as DriverId, FIXED_DATE),
        ].map((effect) => Effect.exit(effect)),
        { concurrency: "unbounded" }
      )

      const successExits = exits.filter(Exit.isSuccess)
      const failureExits = exits.filter(Exit.isFailure)
      expect(successExits).toHaveLength(1)
      expect(failureExits).toHaveLength(1)

      const loserCause = failureExits[0].cause
      expect(loserCause._tag).toBe("Fail")
      if (loserCause._tag === "Fail") {
        expect((loserCause.error as { _tag: string })._tag).toBe("delivery/OrderNotAssignableError")
      }

      const winnerDriverId = successExits[0].value.delivery.driverId
      const loserDriverId = winnerDriverId === FIXED_DRIVER_A ? FIXED_DRIVER_B : FIXED_DRIVER_A

      const deliveries = yield* Effect.promise(() =>
        prisma.delivery.findMany({ where: { orders: { some: { id: FIXED_ORDER_ID } } } })
      )
      expect(deliveries).toHaveLength(1)

      const winnerDriver = yield* Effect.promise(() => prisma.driver.findUnique({ where: { id: winnerDriverId } }))
      const loserDriver = yield* Effect.promise(() => prisma.driver.findUnique({ where: { id: loserDriverId } }))
      expect(winnerDriver?.isAvailable).toBe(false)
      expect(loserDriver?.isAvailable).toBe(true)

      const order = yield* Effect.promise(() => prisma.order.findUnique({ where: { id: FIXED_ORDER_ID } }))
      expect(order?.status).toBe(OrderStatus.ASSIGNED)
      expect(order?.driverId).toBe(winnerDriverId)
    }).pipe(Effect.provide(deliveryRepoLayer))
  )
})

afterAll(async () => {
  await prisma.delivery.deleteMany({ where: { orders: { some: { id: FIXED_ORDER_ID } } } })
  await prisma.order.deleteMany({ where: { id: FIXED_ORDER_ID } })
  await prisma.driver.deleteMany({ where: { id: { in: [FIXED_DRIVER_A, FIXED_DRIVER_B] } } })
  await prisma.customer.deleteMany({ where: { id: FIXED_CUSTOMER_ID } })
  await prisma.$disconnect()
})
