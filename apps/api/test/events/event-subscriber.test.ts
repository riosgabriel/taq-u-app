import { describe, expect, it } from "@effect/vitest"
import { Context, Effect, Layer, PubSub, Schedule } from "effect"
import { DeliveryStatus, OrderStatus } from "@prisma/client"
import { DriverId } from "@/ids"
import { Delivery } from "delivery/domain/delivery"
import { OrderNotAssignableError } from "delivery/domain/driver-errors"
import { DriverAssignmentService } from "delivery/services/driver-assignment-service"
import { DomainEvent } from "events/domain-event"
import { EventBus } from "events/event-bus"
import { EventSubscriberLive } from "events/event-subscriber"
import { OrderService, OrderServiceShape } from "ordering/services/order-service"
import { OrderWithPackages } from "ordering/repository/order-repository"

const availableDriver = {
  id: "driver-1" as DriverId,
  name: "John",
  email: "john@test.com",
  phone: "123",
  isAvailable: true,
  vehicleType: "CAR" as const,
}

const mockPrismaDeliveryRow = {
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

const mockDelivery = Delivery.fromDelivery(mockPrismaDeliveryRow)

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
  status: OrderStatus.ASSIGNED,
  createdAt: new Date("2026-01-01T07:00:00.000Z"),
  updatedAt: new Date("2026-01-01T07:00:00.000Z"),
  packages: [],
}

const FIXED_ASSIGNED_AT = new Date("2026-01-01T10:00:00.000Z")

const orderCreatedEvent = (): DomainEvent => ({
  type: "OrderCreated",
  streamId: "order:order-1",
  payload: { orderId: "order-1", customerId: "cust-1" },
})

const driverAssignedEvent = (assignedAt: Date): DomainEvent => ({
  type: "DriverAssigned",
  streamId: "order:order-1",
  payload: { orderId: "order-1", driverId: "driver-1", assignedAt },
})

// Bounded deterministic wait: poll the condition with immediate repeats, yielding
// to the runtime each iteration so the subscriber fiber can make progress. Fails
// after the bound instead of hanging.
const waitFor = <A>(check: () => A | null): Effect.Effect<A, Error> =>
  Effect.retry(
    Effect.gen(function* () {
      yield* Effect.yieldNow()
      const value = check()
      if (value === null) return yield* Effect.fail(new Error("subscriber did not record the call within the bound"))
      return value
    }),
    Schedule.recurs(1000)
  )

const untouchedOrderService = (): OrderServiceShape =>
  OrderService.of({
    createOrder: () => Effect.die("unexpected"),
    getOrderById: () => Effect.die("unexpected"),
    listOrders: () => Effect.die("unexpected"),
    getOrdersByCustomer: () => Effect.die("unexpected"),
    updateOrder: () => Effect.die("unexpected"),
    cancelOrder: () => Effect.die("unexpected"),
    confirmOrder: () => Effect.die("unexpected"),
    assignDriver: () => Effect.die("unexpected"),
    markOrderAssigned: () => Effect.die("unexpected"),
    pickupOrder: () => Effect.die("unexpected"),
    deliverOrder: () => Effect.die("unexpected"),
    addPackageToOrder: () => Effect.die("unexpected"),
    findPackageByTrackingNumber: () => Effect.die("unexpected"),
    updatePackageStatus: () => Effect.die("unexpected"),
  })

const untouchedAssignmentService = () =>
  DriverAssignmentService.of({
    findAvailableDriver: () => Effect.die("unexpected"),
    assignDriverToOrder: () => Effect.die("unexpected"),
  })

// The subscriber subscribes to the bus created here; publishing via the same
// bus exercises the real EventSubscriber orchestration end to end.
const buildLayers = (
  bus: PubSub.PubSub<DomainEvent>,
  assignmentService: Context.Tag.Service<DriverAssignmentService>,
  orderService: Context.Tag.Service<OrderService>
) =>
  EventSubscriberLive.pipe(
    Layer.provide(Layer.succeed(EventBus, bus)),
    Layer.provide(Layer.succeed(DriverAssignmentService, assignmentService)),
    Layer.provide(Layer.succeed(OrderService, orderService))
  )

describe("EventSubscriber", () => {
  describe("OrderCreated", () => {
    it.scoped("assigns an available driver to the order", () =>
      Effect.gen(function* () {
        const bus = yield* PubSub.unbounded<DomainEvent>()
        const assignCalls: Array<{ orderId: string; driverId: string; assignedAt: Date }> = []
        const assignmentService = DriverAssignmentService.of({
          findAvailableDriver: () => Effect.succeed(availableDriver),
          assignDriverToOrder: (orderId, driverId, assignedAt) =>
            Effect.sync(() => {
              assignCalls.push({ orderId, driverId, assignedAt })
              return mockDelivery
            }),
        })

        yield* Effect.gen(function* () {
          yield* PubSub.publishAll(bus, [orderCreatedEvent()])
          const calls = yield* waitFor(() => (assignCalls.length > 0 ? assignCalls : null))
          expect(calls).toHaveLength(1)
          expect(calls[0].orderId).toBe("order-1")
          expect(calls[0].driverId).toBe("driver-1")
          expect(calls[0].assignedAt).toBeInstanceOf(Date)
        }).pipe(Effect.provide(buildLayers(bus, assignmentService, untouchedOrderService())))
      })
    )

    it.scoped("does not assign a driver when none is available", () =>
      Effect.gen(function* () {
        const bus = yield* PubSub.unbounded<DomainEvent>()
        const findCalls: Array<null> = []
        const assignCalls: Array<unknown> = []
        const assignmentService = DriverAssignmentService.of({
          findAvailableDriver: () =>
            Effect.sync(() => {
              findCalls.push(null)
              return null
            }),
          assignDriverToOrder: () => {
            assignCalls.push("unexpected")
            return Effect.die("unexpected")
          },
        })

        yield* Effect.gen(function* () {
          yield* PubSub.publishAll(bus, [orderCreatedEvent()])
          yield* waitFor(() => (findCalls.length > 0 ? findCalls : null))
          expect(assignCalls).toHaveLength(0)
        }).pipe(Effect.provide(buildLayers(bus, assignmentService, untouchedOrderService())))
      })
    )
  })

  describe("DriverAssigned", () => {
    it.scoped("marks the order assigned with the payload's driver and timestamp", () =>
      Effect.gen(function* () {
        const bus = yield* PubSub.unbounded<DomainEvent>()
        const markCalls: Array<{ orderId: string; driverId: string; assignedAt: Date }> = []
        const orderService = OrderService.of({
          createOrder: () => Effect.die("unexpected"),
          getOrderById: () => Effect.die("unexpected"),
          listOrders: () => Effect.die("unexpected"),
          getOrdersByCustomer: () => Effect.die("unexpected"),
          updateOrder: () => Effect.die("unexpected"),
          cancelOrder: () => Effect.die("unexpected"),
          confirmOrder: () => Effect.die("unexpected"),
          assignDriver: () => Effect.die("unexpected"),
          markOrderAssigned: (orderId, driverId, assignedAt) =>
            Effect.sync(() => {
              markCalls.push({ orderId, driverId, assignedAt })
              return mockOrder
            }),
          pickupOrder: () => Effect.die("unexpected"),
          deliverOrder: () => Effect.die("unexpected"),
          addPackageToOrder: () => Effect.die("unexpected"),
          findPackageByTrackingNumber: () => Effect.die("unexpected"),
          updatePackageStatus: () => Effect.die("unexpected"),
        })

        yield* Effect.gen(function* () {
          yield* PubSub.publishAll(bus, [driverAssignedEvent(FIXED_ASSIGNED_AT)])
          const calls = yield* waitFor(() => (markCalls.length > 0 ? markCalls : null))
          expect(calls).toHaveLength(1)
          expect(calls[0].orderId).toBe("order-1")
          expect(calls[0].driverId).toBe("driver-1")
          expect(calls[0].assignedAt.getTime()).toBe(FIXED_ASSIGNED_AT.getTime())
        }).pipe(Effect.provide(buildLayers(bus, untouchedAssignmentService(), orderService)))
      })
    )

    it.scoped("drops a DriverAssigned event with an invalid payload", () =>
      Effect.gen(function* () {
        const bus = yield* PubSub.unbounded<DomainEvent>()
        const markCalls: Array<{ orderId: string; driverId: string; assignedAt: Date }> = []
        const orderService = OrderService.of({
          createOrder: () => Effect.die("unexpected"),
          getOrderById: () => Effect.die("unexpected"),
          listOrders: () => Effect.die("unexpected"),
          getOrdersByCustomer: () => Effect.die("unexpected"),
          updateOrder: () => Effect.die("unexpected"),
          cancelOrder: () => Effect.die("unexpected"),
          confirmOrder: () => Effect.die("unexpected"),
          assignDriver: () => Effect.die("unexpected"),
          markOrderAssigned: (orderId, driverId, assignedAt) =>
            Effect.sync(() => {
              markCalls.push({ orderId, driverId, assignedAt })
              return mockOrder
            }),
          pickupOrder: () => Effect.die("unexpected"),
          deliverOrder: () => Effect.die("unexpected"),
          addPackageToOrder: () => Effect.die("unexpected"),
          findPackageByTrackingNumber: () => Effect.die("unexpected"),
          updatePackageStatus: () => Effect.die("unexpected"),
        })

        const invalidEvent: DomainEvent = {
          type: "DriverAssigned",
          streamId: "order:order-1",
          payload: { orderId: "order-1", driverId: "driver-1", assignedAt: 123 },
        }

        yield* Effect.gen(function* () {
          // FIFO processing: the invalid event is consumed and dropped before the
          // valid one, so markOrderAssigned being called exactly once with the
          // valid payload proves the invalid event never reached it.
          yield* PubSub.publishAll(bus, [invalidEvent, driverAssignedEvent(FIXED_ASSIGNED_AT)])
          const calls = yield* waitFor(() => (markCalls.length > 0 ? markCalls : null))
          expect(calls).toHaveLength(1)
          expect(calls[0].orderId).toBe("order-1")
          expect(calls[0].driverId).toBe("driver-1")
          expect(calls[0].assignedAt.getTime()).toBe(FIXED_ASSIGNED_AT.getTime())
        }).pipe(Effect.provide(buildLayers(bus, untouchedAssignmentService(), orderService)))
      })
    )
  })

  describe("resilience", () => {
    it.scoped("keeps processing events after a handler failure", () =>
      Effect.gen(function* () {
        const bus = yield* PubSub.unbounded<DomainEvent>()
        const markCalls: Array<{ orderId: string; driverId: string; assignedAt: Date }> = []
        const assignmentService = DriverAssignmentService.of({
          findAvailableDriver: () => Effect.succeed(availableDriver),
          assignDriverToOrder: () =>
            Effect.fail(
              new OrderNotAssignableError({
                orderId: "order-1",
                currentStatus: "CONFIRMED",
                message: "Order order-1 is not assignable (current status: CONFIRMED)",
              })
            ),
        })
        const orderService = OrderService.of({
          createOrder: () => Effect.die("unexpected"),
          getOrderById: () => Effect.die("unexpected"),
          listOrders: () => Effect.die("unexpected"),
          getOrdersByCustomer: () => Effect.die("unexpected"),
          updateOrder: () => Effect.die("unexpected"),
          cancelOrder: () => Effect.die("unexpected"),
          confirmOrder: () => Effect.die("unexpected"),
          assignDriver: () => Effect.die("unexpected"),
          markOrderAssigned: (orderId, driverId, assignedAt) =>
            Effect.sync(() => {
              markCalls.push({ orderId, driverId, assignedAt })
              return mockOrder
            }),
          pickupOrder: () => Effect.die("unexpected"),
          deliverOrder: () => Effect.die("unexpected"),
          addPackageToOrder: () => Effect.die("unexpected"),
          findPackageByTrackingNumber: () => Effect.die("unexpected"),
          updatePackageStatus: () => Effect.die("unexpected"),
        })

        yield* Effect.gen(function* () {
          yield* PubSub.publishAll(bus, [orderCreatedEvent(), driverAssignedEvent(FIXED_ASSIGNED_AT)])
          const calls = yield* waitFor(() => (markCalls.length > 0 ? markCalls : null))
          expect(calls).toHaveLength(1)
          expect(calls[0].orderId).toBe("order-1")
          expect(calls[0].driverId).toBe("driver-1")
        }).pipe(Effect.provide(buildLayers(bus, assignmentService, orderService)))
      })
    )
  })
})
