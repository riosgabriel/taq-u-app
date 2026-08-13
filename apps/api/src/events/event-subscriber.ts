import { Context, Effect, Layer, Fiber, PubSub, Cause } from "effect"
import { EventBus } from "events/event-bus"
import { DriverAssignmentService } from "delivery/services/driver-assignment-service"
import { OrderService } from "ordering/services/order-service"
import { DomainEvent, OrderCreatedPayload, DriverAssignedPayload } from "events/domain-event"
import { DriverId, OrderId } from "@/ids"
import { Schema } from "effect"

type DriverAssignmentServiceShape = Context.Tag.Service<DriverAssignmentService>
type OrderServiceShape = Context.Tag.Service<OrderService>

const FIND_AVAILABLE_DRIVER_TIMEOUT = "10 seconds"

export class EventSubscriber extends Context.Tag("events/EventSubscriber")<
  EventSubscriber,
  { readonly fiber: Fiber.RuntimeFiber<void, never> }
>() {}

export const EventSubscriberLive = Layer.scoped(
  EventSubscriber,
  Effect.gen(function* () {
    const bus = yield* EventBus
    const assignmentService = yield* DriverAssignmentService
    const orderService = yield* OrderService

    const subscription = yield* PubSub.subscribe(bus)

    const fiber = yield* Effect.forkScoped(
      Effect.forever(
        Effect.gen(function* () {
          const event = yield* subscription
          yield* handleEvent(event, assignmentService, orderService)
        }).pipe(
          Effect.catchAllCause((cause) => Effect.logError("EventSubscriber error", { cause: Cause.pretty(cause) }))
        )
      )
    )

    return EventSubscriber.of({ fiber })
  })
)

function handleEvent(
  event: DomainEvent,
  assignmentService: DriverAssignmentServiceShape,
  orderService: OrderServiceShape
): Effect.Effect<void, never> {
  switch (event.type) {
    case "OrderCreated":
      return handleOrderCreated(event, assignmentService)
    case "DriverAssigned":
      return handleDriverAssigned(event, orderService)
    default:
      return Effect.void
  }
}

function handleOrderCreated(
  event: DomainEvent,
  assignmentService: DriverAssignmentServiceShape
): Effect.Effect<void, never> {
  return Effect.gen(function* () {
    // Validate payload with Schema - defines errors out of existence
    const payload = yield* Schema.decodeUnknown(OrderCreatedPayload)(event.payload).pipe(
      Effect.catchAll((error) =>
        Effect.logError("Invalid OrderCreated payload", { event, error: String(error) }).pipe(Effect.as(null))
      )
    )

    if (!payload) {
      return
    }

    const orderId = payload.orderId

    const driver = yield* assignmentService.findAvailableDriver().pipe(
      Effect.timeout(FIND_AVAILABLE_DRIVER_TIMEOUT),
      Effect.catchAll((error) =>
        Effect.logError("Failed to find available driver", { orderId, error }).pipe(Effect.as(null))
      )
    )
    if (!driver) {
      yield* Effect.logWarning("No available driver for order", { orderId })
      return
    }

    yield* Effect.logInfo("Assigning driver to order", { orderId, driverId: driver.id })
    yield* assignmentService
      .assignDriverToOrder(orderId as OrderId, driver.id, new Date())
      .pipe(
        Effect.catchAll((error) => Effect.logError("Failed to assign driver", { orderId, driverId: driver.id, error }))
      )
  })
}

function handleDriverAssigned(event: DomainEvent, orderService: OrderServiceShape): Effect.Effect<void, never> {
  return Effect.gen(function* () {
    const payload = yield* Schema.decodeUnknown(DriverAssignedPayload)(event.payload).pipe(
      Effect.catchAll((error) =>
        Effect.logError("Invalid DriverAssigned payload", { event, error: String(error) }).pipe(Effect.as(null))
      )
    )

    if (!payload) {
      return
    }

    yield* Effect.logInfo("Marking order assigned", { orderId: payload.orderId, driverId: payload.driverId })
    yield* orderService
      .markOrderAssigned(payload.orderId as OrderId, payload.driverId as DriverId, payload.assignedAt)
      .pipe(
        Effect.catchAll((error) =>
          Effect.logError("Failed to mark order assigned", {
            orderId: payload.orderId,
            driverId: payload.driverId,
            error,
          })
        )
      )
  })
}
