import { describe, expect, it } from "@effect/vitest"
import { DriverService, DriverServiceLive } from "delivery/services/driver-service"
import { DriverRepository } from "delivery/repository/driver-repository"
import { OrderRepository, type OrderWithPackages } from "ordering/repository/order-repository"
import { Effect, Layer } from "effect"

const driver = {
  id: "driver-123",
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "555-123-4567",
  licenseNumber: "LIC-12345",
  vehicleType: "CAR" as const,
  isAvailable: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
}

const buildTestLayer = (mockRepo: typeof DriverRepository.Service) => {
  const mockOrderRepo = OrderRepository.of({
    createOrder: () => Effect.die("unexpected"),
    getOrderById: () => Effect.die("unexpected"),
    listOrders: () => Effect.die("unexpected"),
    findByDriverId: () => Effect.die("unexpected"),
    updateOrder: () => Effect.die("unexpected"),
    updateOrderStatus: () => Effect.die("unexpected"),
    assignDriver: () => Effect.die("unexpected"),
    addPackageToOrder: () => Effect.die("unexpected"),
    updatePackageStatus: () => Effect.die("unexpected"),
  })

  return DriverServiceLive.pipe(
    Layer.provide(Layer.merge(Layer.succeed(DriverRepository, mockRepo), Layer.succeed(OrderRepository, mockOrderRepo)))
  )
}

describe("DriverService", () => {
  describe("listAll", () => {
    it.effect("returns all drivers", () =>
      Effect.gen(function* () {
        const service = yield* DriverService
        const result = yield* service.listAll()
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe("driver-123")
        expect(result[0].name).toBe("Jane Smith")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            DriverRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.succeed([driver]),
              getById: () => Effect.die("unexpected"),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })

  describe("getById", () => {
    it.effect("returns the driver when found", () =>
      Effect.gen(function* () {
        const service = yield* DriverService
        const result = yield* service.getById("driver-123")
        expect(result.id).toBe("driver-123")
        expect(result.name).toBe("Jane Smith")
      }).pipe(
        Effect.provide(
          buildTestLayer(
            DriverRepository.of({
              create: () => Effect.die("unexpected"),
              listAll: () => Effect.die("unexpected"),
              getById: () => Effect.succeed(driver),
              update: () => Effect.die("unexpected"),
              delete: () => Effect.die("unexpected"),
            })
          )
        )
      )
    )
  })
})
