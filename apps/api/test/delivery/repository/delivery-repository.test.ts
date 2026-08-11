import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { DeliveryRepository, DeliveryRepositoryLive } from "delivery/repository/delivery-repository"
import { EventPublisher } from "events/event-publisher"
import { DriverId, OrderId } from "@/ids"
import { DeliveryStatus, Prisma } from "@prisma/client"
import { UnexpectedPersistenceError } from "@/persistence-errors"
import { PrismaService } from "prisma-service"
import { mockPrismaServiceWith } from "../../helpers/mock-prisma-service"

describe("DeliveryRepository.createAssignment", () => {
  const prismaWith = mockPrismaServiceWith

  const mockEventPublisher = EventPublisher.of({
    writeInTransaction: async (_tx: any, events: any) => events,
    notify: () => Effect.void,
  })

  const mockDeliveryRow = {
    id: "delivery-1",
    driverId: "driver-1",
    routeId: null,
    estimatedPickupTime: null,
    estimatedDeliveryTime: null,
    actualPickupTime: null,
    actualDeliveryTime: null,
    status: DeliveryStatus.ASSIGNED,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const fixedAssignedAt = new Date("2026-01-01T10:00:00.000Z")

  const makeTx = (overrides: {
    order?: Record<string, any>
    driver?: Record<string, any>
    delivery?: Record<string, any>
  }) => ({
    order: { findUnique: async () => null, ...overrides.order },
    driver: { updateMany: async () => ({ count: 0 }), findUnique: async () => null, ...overrides.driver },
    delivery: { create: async () => mockDeliveryRow, ...overrides.delivery },
  })

  const layerWith = (tx: unknown) =>
    DeliveryRepositoryLive.pipe(
      Layer.provide(Layer.succeed(PrismaService, prismaWith(tx))),
      Layer.provide(Layer.succeed(EventPublisher, mockEventPublisher))
    )

  const failingEventPublisher = EventPublisher.of({
    writeInTransaction: async () => {
      throw new UnexpectedPersistenceError({ cause: "event write failed" })
    },
    notify: () => Effect.void,
  })

  const layerWithFailingPublisher = (tx: unknown) =>
    DeliveryRepositoryLive.pipe(
      Layer.provide(Layer.succeed(PrismaService, prismaWith(tx))),
      Layer.provide(Layer.succeed(EventPublisher, failingEventPublisher))
    )

  it.effect("fails with RecordNotFoundError when the order does not exist", () =>
    Effect.gen(function* () {
      const repo = yield* DeliveryRepository
      const failure = yield* repo
        .createAssignment("order-1" as OrderId, "driver-1" as DriverId, fixedAssignedAt)
        .pipe(Effect.flip)
      expect(failure._tag).toBe("persistence/RecordNotFoundError")
    }).pipe(Effect.provide(layerWith(makeTx({}))))
  )

  it.effect("fails with OrderNotAssignableError when the order is not PENDING", () =>
    Effect.gen(function* () {
      const repo = yield* DeliveryRepository
      const failure = yield* repo
        .createAssignment("order-1" as OrderId, "driver-1" as DriverId, fixedAssignedAt)
        .pipe(Effect.flip)
      expect(failure._tag).toBe("delivery/OrderNotAssignableError")
    }).pipe(
      Effect.provide(
        layerWith(
          makeTx({
            order: { findUnique: async () => ({ status: "CONFIRMED" }) },
          })
        )
      )
    )
  )

  it.effect("fails with DriverNotFoundError when the driver does not exist", () =>
    Effect.gen(function* () {
      const repo = yield* DeliveryRepository
      const failure = yield* repo
        .createAssignment("order-1" as OrderId, "driver-1" as DriverId, fixedAssignedAt)
        .pipe(Effect.flip)
      expect(failure._tag).toBe("delivery/DriverNotFoundError")
    }).pipe(
      Effect.provide(
        layerWith(
          makeTx({
            order: { findUnique: async () => ({ status: "PENDING" }) },
          })
        )
      )
    )
  )

  it.effect("fails with DriverNotAvailableError when the driver is unavailable", () =>
    Effect.gen(function* () {
      const repo = yield* DeliveryRepository
      const failure = yield* repo
        .createAssignment("order-1" as OrderId, "driver-1" as DriverId, fixedAssignedAt)
        .pipe(Effect.flip)
      expect(failure._tag).toBe("delivery/DriverNotAvailableError")
    }).pipe(
      Effect.provide(
        layerWith(
          makeTx({
            order: { findUnique: async () => ({ status: "PENDING" }) },
            driver: { findUnique: async () => ({ id: "driver-1", isAvailable: false }) },
          })
        )
      )
    )
  )

  it.effect("creates a delivery and publishes a DriverAssigned event", () =>
    Effect.gen(function* () {
      const repo = yield* DeliveryRepository
      const result = yield* repo.createAssignment("order-1" as OrderId, "driver-1" as DriverId, fixedAssignedAt)
      expect(result.delivery.status).toBe(DeliveryStatus.ASSIGNED)
      expect(result.events).toHaveLength(1)
      expect(result.events[0].type).toBe("DriverAssigned")
    }).pipe(
      Effect.provide(
        layerWith(
          makeTx({
            order: { findUnique: async () => ({ status: "PENDING" }) },
            driver: { updateMany: async () => ({ count: 1 }) },
          })
        )
      )
    )
  )

  it.effect("maps a real Prisma error from delivery.create to ForeignKeyViolation", () =>
    Effect.gen(function* () {
      const repo = yield* DeliveryRepository
      const failure = yield* repo
        .createAssignment("order-1" as OrderId, "driver-1" as DriverId, fixedAssignedAt)
        .pipe(Effect.flip)
      expect(failure._tag).toBe("persistence/ForeignKeyViolation")
    }).pipe(
      Effect.provide(
        layerWith(
          makeTx({
            order: { findUnique: async () => ({ status: "PENDING" }) },
            driver: { updateMany: async () => ({ count: 1 }) },
            delivery: {
              create: async () => {
                throw new Prisma.PrismaClientKnownRequestError("Foreign key violation", {
                  code: "P2003",
                  clientVersion: "test",
                  meta: { field_name: "driverId" },
                })
              },
            },
          })
        )
      )
    )
  )

  it.effect("maps a pre-mapped persistence error from the event publisher to a typed failure", () =>
    Effect.gen(function* () {
      const repo = yield* DeliveryRepository
      const failure = yield* repo
        .createAssignment("order-1" as OrderId, "driver-1" as DriverId, fixedAssignedAt)
        .pipe(Effect.flip)
      expect(failure._tag).toBe("persistence/UnexpectedPersistenceError")
    }).pipe(
      Effect.provide(
        layerWithFailingPublisher(
          makeTx({
            order: { findUnique: async () => ({ status: "PENDING" }) },
            driver: { updateMany: async () => ({ count: 1 }) },
          })
        )
      )
    )
  )
})
