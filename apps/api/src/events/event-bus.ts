import { Context, Effect, Layer, PubSub } from "effect"
import { DomainEvent } from "events/domain-event"

export class EventBus extends Context.Tag("events/EventBus")<EventBus, PubSub.PubSub<DomainEvent>>() {}

export const EventBusLive = Layer.scoped(
  EventBus,
  Effect.acquireRelease(PubSub.unbounded<DomainEvent>(), PubSub.shutdown)
)
