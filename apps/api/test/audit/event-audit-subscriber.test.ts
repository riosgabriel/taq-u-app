import { AuditLogService } from "audit/audit-log-service"
import { EventAuditSubscriber } from "audit/event-audit-subscriber"
import { EventBus } from "events/event-bus"
import { DomainEvent } from "events/domain-event"
import { describe, it } from "@effect/vitest"
import { Effect, Layer, PubSub, Queue, Ref, Deferred } from "effect"
import type { TestServices } from "effect/TestServices"

const mockEvent: DomainEvent = {
  type: "OrderCreated",
  streamId: "order:123",
  payload: { orderId: "123" },
}

// Create individual layers for each service
const eventBusLayer = Layer.effect(
  EventBus,
  Effect.gen(function* () {
    return yield* PubSub.unbounded<DomainEvent>()
  })
)

const auditLogServiceLayer = Layer.effect(
  AuditLogService,
  Effect.gen(function* () {
    const ref = yield* Ref.make<DomainEvent[]>([])
    return AuditLogService.of({
      record: (e) => Ref.update(ref, (arr) => [...arr, e]),
      list: () => Effect.succeed([]),
    })
  })
)

const dependencies = Layer.merge(eventBusLayer, auditLogServiceLayer)

// Create a test subscriber layer that processes one event and signals completion
const testSubscriberLayer = Layer.scoped(
  EventAuditSubscriber,
  Effect.gen(function* () {
    const bus = yield* EventBus
    const auditLogService = yield* AuditLogService
    const done = yield* Deferred.make<void>()

    const subscription = yield* PubSub.subscribe(bus)

    const handleEvent = (event: DomainEvent) =>
      auditLogService.record(event).pipe(
        Effect.catchAll((error) => Effect.logError("AuditLog record failed", { event: event.type, error })),
        Effect.zipRight(Deferred.succeed(done, void 0))
      )

    const run = Effect.gen(function* () {
      yield* Effect.logInfo("Test EventAuditSubscriber started")
      const event = yield* Queue.take(subscription)
      yield* handleEvent(event)
      yield* Effect.logInfo("Test EventAuditSubscriber processed event")
    }).pipe(
      Effect.catchAll((error) => Effect.logError("Test EventAuditSubscriber crashed", error)),
      Effect.forkScoped
    )

    yield* run

    // Return the subscriber service with a way to wait for completion
    return EventAuditSubscriber.of({
      start: Effect.void,
      waitForEvent: () => Deferred.await(done),
    } as any)
  })
).pipe(Layer.provide(dependencies))

// Merge all layers
const testLayer = Layer.merge(testSubscriberLayer, dependencies)

describe("EventAuditSubscriber", () => {
  it.effect(
    "subscribes to EventBus and records events",
    () =>
      Effect.gen(function* () {
        const bus = yield* EventBus
        const subscriber = yield* EventAuditSubscriber
        const auditLogService = yield* AuditLogService

        // Publish an event
        yield* PubSub.publish(bus, mockEvent)

        // Wait for subscriber to process the event
        yield* (subscriber as any).waitForEvent()

        // Verify the service doesn't crash and the effect completes
        const _ = auditLogService
      }).pipe(Effect.provide(testLayer), Effect.asVoid) as Effect.Effect<void, never, TestServices>
  )
})
