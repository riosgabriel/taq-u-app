import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { DriverAssignmentService, DriverAssignmentServiceLive } from "delivery/services/driver-assignment-service"
import { DriverRepository } from "delivery/repository/driver-repository"
import { OrderRepository } from "ordering/repository/order-repository"
import { DriverId, OrderId } from "@/ids"
import { OrderStatus } from "@prisma/client"

describe("DriverAssignmentService", () => {
  const mockDriver = {
    id: "driver-1" as DriverId,
    name: "John",
    email: "john@test.com",
    phone: "123",
    isAvailable: true,
    vehicleType: "CAR" as const,
  }

  const mockOrder = {
    id: "order-1" as OrderId,
    driverId: "driver-1" as DriverId,
    status: OrderStatus.ASSIGNED,
    packages: [],
    customerId: "customer-1",
    pickupAddress: "123 Pickup St",
    deliveryAddress: "456 Delivery Ave",
    pickupDate: new Date(),
    deliveryDate: null,
    specialInstructions: null,
    priority: "STANDARD" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    assignedAt: new Date(),
  }

  const mockDriverRepo = DriverRepository.of({
    findAvailable: () => Effect.succeed(mockDriver),
    create: () => Effect.die("unexpected"),
    listAll: () => Effect.die("unexpected"),
    getById: () => Effect.die("unexpected"),
    update: () => Effect.die("unexpected"),
    delete: () => Effect.die("unexpected"),
  })

  const mockOrderRepo = OrderRepository.of({
    assignDriver: (_orderId: OrderId, _driverId: DriverId, _assignedAt: Date, _status: any) =>
      Effect.succeed({ order: mockOrder, events: [] }),
    createOrder: () => Effect.die("unexpected"),
    getOrderById: () => Effect.die("unexpected"),
    listOrders: () => Effect.die("unexpected"),
    findByDriverId: () => Effect.die("unexpected"),
    updateOrder: () => Effect.die("unexpected"),
    updateOrderStatus: () => Effect.die("unexpected"),
    addPackageToOrder: () => Effect.die("unexpected"),
    findPackageByTrackingNumber: () => Effect.die("unexpected"),
    updatePackageStatus: () => Effect.die("unexpected"),
  })

  const testLayer = DriverAssignmentServiceLive.pipe(
    Layer.provide(Layer.succeed(DriverRepository, mockDriverRepo)),
    Layer.provide(Layer.succeed(OrderRepository, mockOrderRepo))
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
    Layer.provide(Layer.succeed(OrderRepository, mockOrderRepo))
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
    it.effect("assigns driver to order", () =>
      Effect.gen(function* () {
        const service = yield* DriverAssignmentService
        const order = yield* service.assignDriverToOrder("order-1" as OrderId, "driver-1" as DriverId)
        expect(order.driverId).toBe("driver-1")
        expect(order.status).toBe(OrderStatus.ASSIGNED)
      }).pipe(Effect.provide(testLayer))
    )
  })
})
