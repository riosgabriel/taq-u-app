import { AuditLogService } from "audit/audit-log-service"
import { Context, Effect, Layer, PubSub, Queue } from "effect"
import { DomainEvent } from "events/domain-event"
import { EventBus } from "events/event-bus"

export class EventAuditSubscriber extends Context.Tag("audit/EventAuditSubscriber")<
  EventAuditSubscriber,
  { readonly start: Effect.Effect<void, never> }
>() {}

export const EventAuditSubscriberLive = Layer.scoped(
  EventAuditSubscriber,
  Effect.gen(function* () {
    const bus = yield* EventBus
    const auditLogService = yield* AuditLogService

    const subscription = yield* PubSub.subscribe(bus)

    const handleEvent = (event: DomainEvent) =>
      auditLogService.record(event).pipe(
        Effect.catchAll((error) => Effect.logError("AuditLog record failed", { event: event.type, error })),
        Effect.fork
      )

    const run = Effect.gen(function* () {
      yield* Effect.logInfo("EventAuditSubscriber started")
      while (true) {
        const event = yield* Queue.take(subscription)
        yield* handleEvent(event)
      }
    }).pipe(
      Effect.catchAll((error) => Effect.logError("EventAuditSubscriber crashed", error)),
      Effect.forkScoped
    )

    yield* run

    return EventAuditSubscriber.of({ start: Effect.void })
  })
)
