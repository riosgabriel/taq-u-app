import { Context, Effect, Layer, PubSub } from "effect"
import { DomainEvent } from "events/domain-event"
import { EventBus } from "events/event-bus"
import { EventStore } from "events/event-store"
import { Prisma } from "@prisma/client"

export class EventPublisher extends Context.Tag("events/EventPublisher")<
  EventPublisher,
  {
    readonly writeInTransaction: (
      tx: Prisma.TransactionClient,
      events: ReadonlyArray<DomainEvent>
    ) => Promise<ReadonlyArray<DomainEvent>>
    readonly notify: (events: ReadonlyArray<DomainEvent>) => Effect.Effect<void>
  }
>() {}

export const EventPublisherLive = Layer.effect(
  EventPublisher,
  Effect.gen(function* () {
    const store = yield* EventStore
    const bus = yield* EventBus

    return EventPublisher.of({
      writeInTransaction: async (tx: Prisma.TransactionClient, events: ReadonlyArray<DomainEvent>) => {
        if (events.length === 0) return events
        await store.write(tx, events)
        return events
      },

      notify: (events: ReadonlyArray<DomainEvent>) => {
        if (events.length === 0) return Effect.void
        return PubSub.publishAll(bus, events).pipe(
          Effect.tapError((e) => Effect.logError("PubSub publish failed", e)),
          Effect.fork,
          Effect.asVoid
        )
      },
    })
  })
)
