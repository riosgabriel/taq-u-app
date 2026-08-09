import { Context, Effect, Layer, Fiber, PubSub, Cause } from "effect"
import { EventBus } from "events/event-bus"
import { DriverAssignmentService } from "delivery/services/driver-assignment-service"
import { DomainEvent, OrderCreatedPayload } from "events/domain-event"
import { OrderId } from "@/ids"
import { Schema } from "effect"

type DriverAssignmentServiceShape = Context.Tag.Service<DriverAssignmentService>

export class EventSubscriber extends Context.Tag("events/EventSubscriber")<
  EventSubscriber,
  { readonly fiber: Fiber.RuntimeFiber<void, never> }
>() {}

export const EventSubscriberLive = Layer.scoped(
  EventSubscriber,
  Effect.gen(function* () {
    const bus = yield* EventBus
    const assignmentService = yield* DriverAssignmentService

    const subscription = yield* PubSub.subscribe(bus)

    const fiber = yield* Effect.forkScoped(
      Effect.forever(
        Effect.gen(function* () {
          const event = yield* subscription
          yield* handleEvent(event, assignmentService)
        }).pipe(
          Effect.catchAllCause((cause) => Effect.logError("EventSubscriber error", { cause: Cause.pretty(cause) }))
        )
      )
    )

    return EventSubscriber.of({ fiber })
  })
)

function handleEvent(event: DomainEvent, assignmentService: DriverAssignmentServiceShape): Effect.Effect<void, never> {
  if (event.type !== "OrderCreated") {
    return Effect.void
  }

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
      Effect.timeout("10 seconds"),
      Effect.catchAll((error) =>
        Effect.logError("Failed to find available driver", { orderId, error }).pipe(Effect.as(null))
      )
    )
    if (!driver) {
      yield* Effect.logWarning("No available driver for order", { orderId })
      return
    }

    yield* Effect.logInfo("Assigning driver to order", { orderId, driverId: driver.id })
    yield* assignmentService.assignDriverToOrder(orderId as OrderId, driver.id).pipe(
      Effect.timeout("10 seconds"),
      Effect.catchAll((error) => Effect.logError("Failed to assign driver", { orderId, driverId: driver.id, error }))
    )
  })
}
