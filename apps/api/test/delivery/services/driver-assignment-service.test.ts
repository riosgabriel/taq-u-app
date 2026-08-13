import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { DriverAssignmentService, DriverAssignmentServiceLive } from "delivery/services/driver-assignment-service"
import { DriverRepository } from "delivery/repository/driver-repository"
import { DeliveryRepository } from "delivery/repository/delivery-repository"
import { EventPublisher } from "events/event-publisher"
import { DriverId, OrderId } from "@/ids"
import { DeliveryStatus } from "@prisma/client"
import { RecordNotFoundError } from "@/persistence-errors"
import { OrderNotAssignableError } from "delivery/domain/driver-errors"

describe("DriverAssignmentService", () => {
  const mockDriver = {
    id: "driver-1" as DriverId,
    name: "John",
    email: "john@test.com",
    phone: "123",
    isAvailable: true,
    vehicleType: "CAR" as const,
  }

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

  const mockEventPublisher = EventPublisher.of({
    writeInTransaction: async (_tx: any, events: any) => events,
    notify: () => Effect.void,
  })

  const mockDriverRepo = DriverRepository.of({
    findAvailable: () => Effect.succeed(mockDriver),
    create: () => Effect.die("unexpected"),
    listAll: () => Effect.die("unexpected"),
    getById: () => Effect.die("unexpected"),
    update: () => Effect.die("unexpected"),
    delete: () => Effect.die("unexpected"),
  })

  const mockDeliveryRepo = DeliveryRepository.of({
    createAssignment: (_orderId: OrderId, _driverId: DriverId, _assignedAt: Date) =>
      Effect.succeed({ delivery: mockDeliveryRow, events: [] }),
    createDelivery: () => Effect.die("unexpected"),
    listAll: () => Effect.die("unexpected"),
    listWithDetails: () => Effect.die("unexpected"),
    getById: () => Effect.die("unexpected"),
    updateStatus: () => Effect.die("unexpected"),
    assignDriver: () => Effect.die("unexpected"),
  })

  const testLayer = DriverAssignmentServiceLive.pipe(
    Layer.provide(Layer.succeed(DriverRepository, mockDriverRepo)),
    Layer.provide(Layer.succeed(DeliveryRepository, mockDeliveryRepo)),
    Layer.provide(Layer.succeed(EventPublisher, mockEventPublisher))
  )

  const noDriverRepo = DriverRepository.of({
    findAvailable: () => Effect.succeed(null),
    create: () => Effect.die("unexpected"),
    listAll: () => Effect.die("unexpected"),
    getById: () => Effect.die("unexpected"),
    update: () => Effect.die("unexpected"),
    delete: () => Effect.die("unexpected"),
  })

  const noDriverLayer = DriverAssignmentServiceLive.pipe(
    Layer.provide(Layer.succeed(DriverRepository, noDriverRepo)),
    Layer.provide(Layer.succeed(DeliveryRepository, mockDeliveryRepo)),
    Layer.provide(Layer.succeed(EventPublisher, mockEventPublisher))
  )

  const orderNotFoundRepo = DeliveryRepository.of({
    createAssignment: () =>
      Effect.fail(new RecordNotFoundError({ model: "Order", id: "order-1", message: "Order order-1 not found" })),
    createDelivery: () => Effect.die("unexpected"),
    listAll: () => Effect.die("unexpected"),
    listWithDetails: () => Effect.die("unexpected"),
    getById: () => Effect.die("unexpected"),
    updateStatus: () => Effect.die("unexpected"),
    assignDriver: () => Effect.die("unexpected"),
  })

  const orderNotFoundLayer = DriverAssignmentServiceLive.pipe(
    Layer.provide(Layer.succeed(DriverRepository, mockDriverRepo)),
    Layer.provide(Layer.succeed(DeliveryRepository, orderNotFoundRepo)),
    Layer.provide(Layer.succeed(EventPublisher, mockEventPublisher))
  )

  const orderNotAssignableRepo = DeliveryRepository.of({
    createAssignment: () =>
      Effect.fail(
        new OrderNotAssignableError({
          orderId: "order-1",
          currentStatus: "CONFIRMED",
          message: "Order order-1 is not assignable (current status: CONFIRMED)",
        })
      ),
    createDelivery: () => Effect.die("unexpected"),
    listAll: () => Effect.die("unexpected"),
    listWithDetails: () => Effect.die("unexpected"),
    getById: () => Effect.die("unexpected"),
    updateStatus: () => Effect.die("unexpected"),
    assignDriver: () => Effect.die("unexpected"),
  })

  const orderNotAssignableLayer = DriverAssignmentServiceLive.pipe(
    Layer.provide(Layer.succeed(DriverRepository, mockDriverRepo)),
    Layer.provide(Layer.succeed(DeliveryRepository, orderNotAssignableRepo)),
    Layer.provide(Layer.succeed(EventPublisher, mockEventPublisher))
  )

  describe("findAvailableDriver", () => {
    it.effect("finds first available driver", () =>
      Effect.gen(function* () {
        const service = yield* DriverAssignmentService
        const driver = yield* service.findAvailableDriver()
        expect(driver).toEqual(mockDriver)
      }).pipe(Effect.provide(testLayer))
    )

    it.effect("returns null when no driver available", () =>
      Effect.gen(function* () {
        const service = yield* DriverAssignmentService
        const driver = yield* service.findAvailableDriver()
        expect(driver).toBeNull()
      }).pipe(Effect.provide(noDriverLayer))
    )
  })

  describe("assignDriverToOrder", () => {
    it.effect("claims a driver and creates a delivery for the order", () =>
      Effect.gen(function* () {
        const service = yield* DriverAssignmentService
        const delivery = yield* service.assignDriverToOrder(
          "order-1" as OrderId,
          "driver-1" as DriverId,
          fixedAssignedAt
        )
        expect(delivery.driverId).toBe("driver-1")
        expect(delivery.status).toBe(DeliveryStatus.ASSIGNED)
      }).pipe(Effect.provide(testLayer))
    )

    it.effect("fails with RecordNotFoundError when the order does not exist", () =>
      Effect.gen(function* () {
        const service = yield* DriverAssignmentService
        const failure = yield* service
          .assignDriverToOrder("order-1" as OrderId, "driver-1" as DriverId, fixedAssignedAt)
          .pipe(Effect.flip)
        expect(failure._tag).toBe("persistence/RecordNotFoundError")
      }).pipe(Effect.provide(orderNotFoundLayer))
    )

    it.effect("fails with OrderNotAssignableError when the order is not PENDING", () =>
      Effect.gen(function* () {
        const service = yield* DriverAssignmentService
        const failure = yield* service
          .assignDriverToOrder("order-1" as OrderId, "driver-1" as DriverId, fixedAssignedAt)
          .pipe(Effect.flip)
        expect(failure._tag).toBe("delivery/OrderNotAssignableError")
        expect((failure as OrderNotAssignableError).currentStatus).toBe("CONFIRMED")
      }).pipe(Effect.provide(orderNotAssignableLayer))
    )
  })
})
