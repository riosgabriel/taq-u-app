import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { OrderService, OrderServiceLive } from "ordering/services/order-service"
import { OrderRepository, OrderWithPackages } from "ordering/repository/order-repository"
import { CustomerRepository } from "customer/repository/customer-repository"
import { EventPublisher } from "events/event-publisher"
import { DriverId, OrderId } from "@/ids"
import { OrderStatus } from "@prisma/client"

const mockOrder: OrderWithPackages = {
  id: "order-1",
  customerId: "cust-1",
  driverId: null,
  assignedAt: null,
  pickupAddress: "1 Industrial Rd",
  deliveryAddress: "2 Main St",
  pickupDate: new Date("2026-01-01T09:00:00.000Z"),
  deliveryDate: new Date("2026-01-01T17:00:00.000Z"),
  specialInstructions: null,
  priority: "STANDARD",
  status: OrderStatus.PENDING,
  createdAt: new Date("2026-01-01T07:00:00.000Z"),
  updatedAt: new Date("2026-01-01T07:00:00.000Z"),
  packages: [],
}

const mockCustomerRepo = CustomerRepository.of({
  createCustomer: () => Effect.die("unexpected"),
  getCustomers: () => Effect.die("unexpected"),
  getCustomerById: () => Effect.die("unexpected"),
})

const mockEventPublisher = EventPublisher.of({
  writeInTransaction: async (_tx: any, events: any) => events,
  notify: () => Effect.void,
})

describe("OrderService", () => {
  describe("markOrderAssigned", () => {
    it.effect("is idempotent when the order is already assigned to the same driver", () => {
      let order: OrderWithPackages = { ...mockOrder }

      const mockOrderRepo = OrderRepository.of({
        createOrder: () => Effect.die("unexpected"),
        getOrderById: () => Effect.die("unexpected"),
        listOrders: () => Effect.die("unexpected"),
        findByDriverId: () => Effect.die("unexpected"),
        updateOrder: () => Effect.die("unexpected"),
        updateOrderStatus: () => Effect.die("unexpected"),
        markAssigned: (_orderId: OrderId, driverId: DriverId, assignedAt: Date) => {
          if (order.status === OrderStatus.PENDING) {
            order = { ...order, status: OrderStatus.ASSIGNED, driverId, assignedAt }
            return Effect.succeed(order)
          }
          if (order.status === OrderStatus.ASSIGNED && order.driverId === driverId) {
            return Effect.succeed(order)
          }
          return Effect.die("unexpected")
        },
        addPackageToOrder: () => Effect.die("unexpected"),
        findPackageByTrackingNumber: () => Effect.die("unexpected"),
        updatePackageStatus: () => Effect.die("unexpected"),
      })

      const layer = OrderServiceLive.pipe(
        Layer.provide(Layer.succeed(OrderRepository, mockOrderRepo)),
        Layer.provide(Layer.succeed(CustomerRepository, mockCustomerRepo)),
        Layer.provide(Layer.succeed(EventPublisher, mockEventPublisher))
      )

      return Effect.gen(function* () {
        const service = yield* OrderService
        const assignedAt = new Date("2026-01-01T10:00:00.000Z")

        const first = yield* service.markOrderAssigned("order-1" as OrderId, "driver-1" as DriverId, assignedAt)
        expect(first.status).toBe(OrderStatus.ASSIGNED)

        const second = yield* service.markOrderAssigned("order-1" as OrderId, "driver-1" as DriverId, assignedAt)
        expect(second.status).toBe(OrderStatus.ASSIGNED)
      }).pipe(Effect.provide(layer))
    })
  })
})
