import { Context, Effect, Layer, Fiber, PubSub } from "effect"
import { EventBus } from "events/event-bus"
import { DriverAssignmentService } from "delivery/services/driver-assignment-service"
import { EventPublisher } from "events/event-publisher"
import { DomainEvent } from "events/domain-event"
import { OrderId } from "@/ids"

type DriverAssignmentServiceShape = Context.Tag.Service<DriverAssignmentService>
type EventPublisherShape = Context.Tag.Service<EventPublisher>

export class EventSubscriber extends Context.Tag("events/EventSubscriber")<
  EventSubscriber,
  { readonly fiber: Fiber.RuntimeFiber<void, never> }
>() {}

export const EventSubscriberLive = Layer.scoped(
  EventSubscriber,
  Effect.gen(function* () {
    const bus = yield* EventBus
    const assignmentService = yield* DriverAssignmentService
    const eventPublisher = yield* EventPublisher

    const subscription = yield* PubSub.subscribe(bus)

    const fiber = yield* Effect.fork(
      Effect.forever(
        Effect.gen(function* () {
          const event = yield* subscription
          yield* handleEvent(event, assignmentService, eventPublisher)
        }).pipe(Effect.catchAll((error) => Effect.logError("EventSubscriber error", error)))
      )
    )

    return EventSubscriber.of({ fiber })
  })
)

function handleEvent(
  event: DomainEvent,
  assignmentService: DriverAssignmentServiceShape,
  eventPublisher: EventPublisherShape
): Effect.Effect<void, never> {
  if (event.type !== "OrderCreated") {
    return Effect.void
  }

  return Effect.gen(function* () {
    const payload = event.payload as { orderId?: string; customerId?: string }
    const orderId = payload.orderId
    if (!orderId) {
      yield* Effect.logWarning("OrderCreated event missing orderId", { event })
      return
    }

    const driver = yield* assignmentService
      .findAvailableDriver()
      .pipe(
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
      .assignDriverToOrder(orderId as OrderId, driver.id)
      .pipe(
        Effect.catchAll((error) => Effect.logError("Failed to assign driver", { orderId, driverId: driver.id, error }))
      )

    // Notify subscribers of the assignment (DriverAssigned event published by repository)
    yield* eventPublisher.notify([])
  })
}
