import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { OrderService, OrderServiceLive, OrderStatusError } from "ordering/services/order-service"
import { OrderRepository, OrderWithPackages } from "ordering/repository/order-repository"
import { CustomerRepository } from "customer/repository/customer-repository"
import { EventPublisher } from "events/event-publisher"
import { DriverAssignmentService } from "delivery/services/driver-assignment-service"
import { OrderNotAssignableError } from "delivery/domain/driver-errors"
import { InvalidOrderStatusTransitionError } from "ordering/domain/order-status"
import { Delivery } from "delivery/domain/delivery"
import { RecordNotFoundError } from "@/persistence-errors"
import { CustomerId, DriverId, OrderId } from "@/ids"
import { DeliveryStatus, OrderStatus } from "@prisma/client"

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
        findByCustomerId: () => Effect.die("unexpected"),
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

  describe("assignDriver", () => {
    const mockDeliveryRow = {
      id: "delivery-1",
      driverId: "driver-1",
      routeId: null,
      estimatedPickupTime: null,
      estimatedDeliveryTime: null,
      actualPickupTime: null,
      actualDeliveryTime: null,
      status: DeliveryStatus.ASSIGNED,
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
      updatedAt: new Date("2026-01-01T10:00:00.000Z"),
    }
    const mockDelivery = Delivery.fromDelivery(mockDeliveryRow)

    const assignedOrder: OrderWithPackages = {
      ...mockOrder,
      status: OrderStatus.ASSIGNED,
      driverId: "driver-1" as DriverId,
      assignedAt: new Date("2026-01-01T10:00:00.000Z"),
    }

    const mockAssignmentService = DriverAssignmentService.of({
      findAvailableDriver: () => Effect.die("unexpected"),
      assignDriverToOrder: () => Effect.succeed(mockDelivery),
    })

    const provideAssignDriverLayers =
      (orderRepo: typeof OrderRepository.Service, assignmentService: typeof DriverAssignmentService.Service) =>
      <A, E>(effect: Effect.Effect<A, E, OrderService | DriverAssignmentService>): Effect.Effect<A, E, never> =>
        effect.pipe(
          Effect.provide(
            OrderServiceLive.pipe(
              Layer.provide(Layer.succeed(OrderRepository, orderRepo)),
              Layer.provide(Layer.succeed(CustomerRepository, mockCustomerRepo)),
              Layer.provide(Layer.succeed(EventPublisher, mockEventPublisher))
            )
          ),
          Effect.provide(Layer.succeed(DriverAssignmentService, assignmentService))
        )

    const successfulOrderRepo = OrderRepository.of({
      createOrder: () => Effect.die("unexpected"),
      getOrderById: () => Effect.succeed(mockOrder),
      listOrders: () => Effect.die("unexpected"),
      findByDriverId: () => Effect.die("unexpected"),
      findByCustomerId: () => Effect.die("unexpected"),
      updateOrder: () => Effect.die("unexpected"),
      updateOrderStatus: () => Effect.die("unexpected"),
      markAssigned: () => Effect.succeed(assignedOrder),
      addPackageToOrder: () => Effect.die("unexpected"),
      findPackageByTrackingNumber: () => Effect.die("unexpected"),
      updatePackageStatus: () => Effect.die("unexpected"),
    })

    const orderNotFoundRepo = OrderRepository.of({
      createOrder: () => Effect.die("unexpected"),
      getOrderById: () =>
        Effect.fail(new RecordNotFoundError({ model: "Order", id: "order-1", message: "Order order-1 not found" })),
      listOrders: () => Effect.die("unexpected"),
      findByDriverId: () => Effect.die("unexpected"),
      findByCustomerId: () => Effect.die("unexpected"),
      updateOrder: () => Effect.die("unexpected"),
      updateOrderStatus: () => Effect.die("unexpected"),
      markAssigned: () => Effect.die("unexpected"),
      addPackageToOrder: () => Effect.die("unexpected"),
      findPackageByTrackingNumber: () => Effect.die("unexpected"),
      updatePackageStatus: () => Effect.die("unexpected"),
    })

    it.effect("claims the driver and returns the order with ASSIGNED status", () =>
      Effect.gen(function* () {
        const service = yield* OrderService
        const order = yield* service.assignDriver("order-1" as OrderId, "driver-1" as DriverId)
        expect(order.status).toBe(OrderStatus.ASSIGNED)
        expect(order.driverId).toBe("driver-1")
      }).pipe(provideAssignDriverLayers(successfulOrderRepo, mockAssignmentService))
    )

    it.effect("fails with OrderNotFoundError when the order does not exist", () =>
      Effect.gen(function* () {
        const service = yield* OrderService
        const failure = yield* service.assignDriver("order-1" as OrderId, "driver-1" as DriverId).pipe(Effect.flip)
        expect(failure._tag).toBe("order/OrderNotFoundError")
      }).pipe(provideAssignDriverLayers(orderNotFoundRepo, mockAssignmentService))
    )

    it.effect("fails with OrderStatusError when delivery assignment rejects the order", () =>
      Effect.gen(function* () {
        const service = yield* OrderService
        const failure = yield* service.assignDriver("order-1" as OrderId, "driver-1" as DriverId).pipe(Effect.flip)
        expect(failure._tag).toBe("order/OrderStatusError")
        expect((failure as OrderStatusError).currentStatus).toBe("CONFIRMED")
      }).pipe(
        provideAssignDriverLayers(
          successfulOrderRepo,
          DriverAssignmentService.of({
            findAvailableDriver: () => Effect.die("unexpected"),
            assignDriverToOrder: () =>
              Effect.fail(
                new OrderNotAssignableError({
                  orderId: "order-1",
                  currentStatus: "CONFIRMED",
                  message: "Order order-1 is not assignable (current status: CONFIRMED)",
                })
              ),
          })
        )
      )
    )

    it.effect("fails with OrderStatusError when markAssigned rejects the status transition", () =>
      Effect.gen(function* () {
        const service = yield* OrderService
        const failure = yield* service.assignDriver("order-1" as OrderId, "driver-1" as DriverId).pipe(Effect.flip)
        expect(failure._tag).toBe("order/OrderStatusError")
        expect((failure as OrderStatusError).currentStatus).toBe("CONFIRMED")
      }).pipe(
        provideAssignDriverLayers(
          OrderRepository.of({
            createOrder: () => Effect.die("unexpected"),
            getOrderById: () => Effect.succeed(mockOrder),
            listOrders: () => Effect.die("unexpected"),
            findByDriverId: () => Effect.die("unexpected"),
            findByCustomerId: () => Effect.die("unexpected"),
            updateOrder: () => Effect.die("unexpected"),
            updateOrderStatus: () => Effect.die("unexpected"),
            markAssigned: () =>
              Effect.fail(
                new InvalidOrderStatusTransitionError({
                  currentStatus: "CONFIRMED",
                  targetStatus: OrderStatus.ASSIGNED,
                  message: "Order order-1 is not in PENDING status (current: CONFIRMED)",
                })
              ),
            addPackageToOrder: () => Effect.die("unexpected"),
            findPackageByTrackingNumber: () => Effect.die("unexpected"),
            updatePackageStatus: () => Effect.die("unexpected"),
          }),
          mockAssignmentService
        )
      )
    )

    it.effect("fails with OrderNotFoundError when markAssigned cannot find the order", () =>
      Effect.gen(function* () {
        const service = yield* OrderService
        const failure = yield* service.assignDriver("order-1" as OrderId, "driver-1" as DriverId).pipe(Effect.flip)
        expect(failure._tag).toBe("order/OrderNotFoundError")
      }).pipe(
        provideAssignDriverLayers(
          OrderRepository.of({
            createOrder: () => Effect.die("unexpected"),
            getOrderById: () => Effect.succeed(mockOrder),
            listOrders: () => Effect.die("unexpected"),
            findByDriverId: () => Effect.die("unexpected"),
            findByCustomerId: () => Effect.die("unexpected"),
            updateOrder: () => Effect.die("unexpected"),
            updateOrderStatus: () => Effect.die("unexpected"),
            markAssigned: () =>
              Effect.fail(
                new RecordNotFoundError({ model: "Order", id: "order-1", message: "Order order-1 not found" })
              ),
            addPackageToOrder: () => Effect.die("unexpected"),
            findPackageByTrackingNumber: () => Effect.die("unexpected"),
            updatePackageStatus: () => Effect.die("unexpected"),
          }),
          mockAssignmentService
        )
      )
    )
  })

  describe("getOrdersByCustomer", () => {
    it.effect("returns only the orders belonging to the customer", () =>
      Effect.gen(function* () {
        const service = yield* OrderService
        const result = yield* service.getOrdersByCustomer("cust-1" as CustomerId)
        expect(result).toHaveLength(1)
        expect(result[0].customerId).toBe("cust-1")
      }).pipe(
        Effect.provide(
          OrderServiceLive.pipe(
            Layer.provide(
              Layer.succeed(
                OrderRepository,
                OrderRepository.of({
                  createOrder: () => Effect.die("unexpected"),
                  getOrderById: () => Effect.die("unexpected"),
                  listOrders: () => Effect.die("unexpected"),
                  findByDriverId: () => Effect.die("unexpected"),
                  findByCustomerId: () => Effect.succeed([mockOrder]),
                  updateOrder: () => Effect.die("unexpected"),
                  updateOrderStatus: () => Effect.die("unexpected"),
                  markAssigned: () => Effect.die("unexpected"),
                  addPackageToOrder: () => Effect.die("unexpected"),
                  findPackageByTrackingNumber: () => Effect.die("unexpected"),
                  updatePackageStatus: () => Effect.die("unexpected"),
                })
              )
            ),
            Layer.provide(Layer.succeed(CustomerRepository, mockCustomerRepo)),
            Layer.provide(Layer.succeed(EventPublisher, mockEventPublisher))
          )
        )
      )
    )
  })
})
