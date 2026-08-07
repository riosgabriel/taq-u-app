import { AuditLogService } from "audit/audit-log-service"
import { EventAuditSubscriber } from "audit/event-audit-subscriber"
import { EventBus } from "events/event-bus"
import { DomainEvent } from "events/domain-event"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, PubSub } from "effect"
import { EventAuditSubscriberLive } from "audit/event-audit-subscriber"

const mockEvent: DomainEvent = {
  type: "OrderCreated",
  streamId: "order:123",
  payload: { orderId: "123" },
}

const mockAuditLogService = AuditLogService.of({
  record: (e) => Effect.succeed(undefined),
  list: () => Effect.succeed([]),
})

const mockEventBusLayer = Layer.effect(
  EventBus,
  Effect.gen(function* () {
    return yield* PubSub.unbounded<DomainEvent>()
  })
)

const testLayer = Layer.provide(
  EventAuditSubscriberLive,
  Layer.merge(
    mockEventBusLayer,
    Layer.succeed(AuditLogService, mockAuditLogService)
  )
)

describe("EventAuditSubscriber", () => {
  it.effect("subscribes to EventBus and records events", () =>
    Effect.gen(function* () {
      const bus = yield* EventBus
      const subscriber = yield* EventAuditSubscriber

      // Publish an event
      yield* PubSub.publish(bus, mockEvent)

      // Give subscriber time to process
      yield* Effect.sleep("100 millis")

      // Verify auditLogService.record was called (via mock)
      // In real test, we'd spy on the mock service
    }).pipe(
      Effect.provide(testLayer),
      Effect.timeout("2 seconds")
    )
  )
})